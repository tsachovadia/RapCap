import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const gunzipAsync = promisify(gunzip);

function attribute(source, tag) {
  const match = source.match(
    new RegExp(`<${tag}(?:\\s+[^>]*)?\\s+Value="([^"]*)"\\s*\\/>`)
  );
  return match ? decodeXml(match[1]) : null;
}

function decodeXml(value) {
  return String(value)
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function numberAttribute(source, tag) {
  const value = attribute(source, tag);
  return value === null ? null : Number(value);
}

function classifySample(relativePath, sizeBytes) {
  if (sizeBytes === 0) return "incomplete-recording";
  if (extname(relativePath).toLowerCase() === ".asd") return "analysis-sidecar";
  if (/RECORD YOUTUBE/i.test(relativePath)) return "beat-reference-recording";
  if (/\/(?:10|11)-Audio/i.test(relativePath)) return "candidate-vocal";
  return "unclassified-audio";
}

async function listFiles(root, directory = root) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await listFiles(root, absolutePath)));
    } else if (entry.isFile()) {
      const metadata = await stat(absolutePath);
      const relativePath = relative(root, absolutePath);
      const role = classifySample(relativePath, metadata.size);
      output.push({
        relativePath,
        extension: extname(entry.name).toLowerCase(),
        sizeBytes: metadata.size,
        role,
        handling:
          role === "beat-reference-recording"
            ? "metadata-only-do-not-copy-or-export"
            : role === "analysis-sidecar"
              ? "metadata-only"
              : "source-owned-read-only"
      });
    }
  }
  return output.sort((a, b) =>
    a.relativePath.localeCompare(b.relativePath, "en")
  );
}

function parseClips(trackXml) {
  const clips = [];
  const slotPattern =
    /<ClipSlot\s+Id="([^"]+)"[^>]*>([\s\S]*?)<\/ClipSlot>\s*<HasStop\b/g;
  for (const [, slotId, slotXml] of trackXml.matchAll(slotPattern)) {
    const clipMatch = slotXml.match(
      /<AudioClip\b[^>]*>([\s\S]*?)<\/AudioClip>/
    );
    if (!clipMatch) continue;
    const clipXml = clipMatch[1];
    const relativePath = attribute(clipXml, "RelativePath");
    clips.push({
      sessionViewSceneId: Number(slotId),
      sessionViewSceneRow: Number(slotId) + 1,
      name: attribute(clipXml, "Name"),
      currentStartBeat: numberAttribute(clipXml, "CurrentStart"),
      currentEndBeat: numberAttribute(clipXml, "CurrentEnd"),
      relativeSamplePath: relativePath,
      originalFileSize: numberAttribute(clipXml, "OriginalFileSize"),
      defaultDurationSamples: numberAttribute(clipXml, "DefaultDuration"),
      defaultSampleRate: numberAttribute(clipXml, "DefaultSampleRate"),
      referenceHandling: /RECORD YOUTUBE/i.test(relativePath || "")
        ? "metadata-only-do-not-copy-or-export"
        : "source-owned-read-only"
    });
  }
  return clips;
}

export function parseAbletonSetXml(xml) {
  const tracks = [];
  const trackPattern =
    /<(AudioTrack|MidiTrack|GroupTrack|ReturnTrack)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  for (const match of xml.matchAll(trackPattern)) {
    const [, type, opening, trackXml] = match;
    const idMatch = opening.match(/\bId="([^"]+)"/);
    tracks.push({
      trackOrdinal: tracks.length + 1,
      id: idMatch ? idMatch[1] : null,
      type,
      effectiveName: attribute(trackXml, "EffectiveName"),
      userName: attribute(trackXml, "UserName"),
      clips: parseClips(trackXml)
    });
  }

  const locatorMatches = [
    ...xml.matchAll(/<Locator\b[^>]*>([\s\S]*?)<\/Locator>/g)
  ];
  const tempoMatch = xml.match(
    /<Tempo>\s*[\s\S]*?<Manual\s+Value="([^"]+)"\s*\/>/
  );

  return {
    abletonSchema: {
      majorVersion: Number(
        xml.match(/MajorVersion="([^"]+)"/)?.[1] || 0
      ),
      minorVersion: xml.match(/MinorVersion="([^"]+)"/)?.[1] || null,
      creator: xml.match(/Creator="([^"]+)"/)?.[1] || null
    },
    tempoBpm: tempoMatch ? Number(tempoMatch[1]) : null,
    locators: locatorMatches.map(([, locatorXml]) => ({
      name: attribute(locatorXml, "Name"),
      timeBeat: numberAttribute(locatorXml, "Time")
    })),
    tracks
  };
}

export async function inspectAbletonProject(projectDirectory) {
  const entries = await readdir(projectDirectory, { withFileTypes: true });
  const setFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".als"))
    .map((entry) => entry.name)
    .sort();
  const samplesDirectory = entries.find(
    (entry) => entry.isDirectory() && entry.name === "Samples"
  );

  if (setFiles.length !== 1 || !samplesDirectory) {
    throw new Error(
      "Expected exactly one .als file and a sibling Samples directory"
    );
  }

  const setPath = join(projectDirectory, setFiles[0]);
  const setStat = await stat(setPath);
  const compressed = await readFile(setPath);
  const xml = (await gunzipAsync(compressed)).toString("utf8");
  const parsed = parseAbletonSetXml(xml);
  const sampleInventory = await listFiles(
    join(projectDirectory, samplesDirectory.name)
  );

  return {
    schemaVersion: 1,
    fixtureKind: "ableton-project-layout",
    access: "read-only",
    projectDirectory,
    set: {
      fileName: setFiles[0],
      relativePath: setFiles[0],
      encoding: "gzip-xml",
      compressedSizeBytes: setStat.size,
      uncompressedSizeBytes: Buffer.byteLength(xml),
      ...parsed
    },
    samples: {
      directory: "Samples",
      recordedDirectory: "Samples/Recorded",
      fileCount: sampleInventory.length,
      nonEmptyWavCount: sampleInventory.filter(
        (item) => item.extension === ".wav" && item.sizeBytes > 0
      ).length,
      emptyWavCount: sampleInventory.filter(
        (item) => item.extension === ".wav" && item.sizeBytes === 0
      ).length,
      inventory: sampleInventory
    },
    safety: {
      setAndSamplesAreSourceOwned: true,
      prototypeMayWriteSource: false,
      youtubeReferenceAudioMayBeCopied: false,
      youtubeReferenceAudioMayBeExported: false
    }
  };
}

export function summarizeProjectInspection(inspection) {
  const clips = inspection.set.tracks.flatMap((track) =>
    track.clips.map((clip) => ({
      trackId: track.id,
      trackOrdinal: track.trackOrdinal,
      trackName: track.effectiveName,
      ...clip
    }))
  );
  return {
    projectName: basename(inspection.projectDirectory),
    setFile: inspection.set.fileName,
    tempoBpm: inspection.set.tempoBpm,
    trackCount: inspection.set.tracks.length,
    locatorCount: inspection.set.locators.length,
    clipCount: clips.length,
    clips,
    sampleFileCount: inspection.samples.fileCount,
    emptyWavCount: inspection.samples.emptyWavCount
  };
}
