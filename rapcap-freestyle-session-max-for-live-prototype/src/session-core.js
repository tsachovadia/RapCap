export const BLOCK_TYPES = new Set([
  "beat",
  "ad",
  "transition",
  "silence",
  "unknown"
]);

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;

export function normalizeSession(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("Session must be an object");
  }
  if (input.schemaVersion !== 1) {
    throw new Error("Unsupported schemaVersion");
  }
  if (!input.id || !input.title) {
    throw new Error("Session id and title are required");
  }

  const session = structuredClone(input);
  session.timeline = {
    clock: "ableton-set-ms",
    vocalOffsetMs: 0,
    ...session.timeline
  };
  session.beatBlocks = [...(session.beatBlocks || [])].sort(
    (a, b) => a.startMs - b.startMs
  );
  session.verses = [...(session.verses || [])].sort(
    (a, b) => a.startMs - b.startMs
  );

  validateBeatReference(session.beatReference);
  validateRegions(session.beatBlocks, "beat block");
  validateRegions(session.verses, "verse");

  for (const block of session.beatBlocks) {
    if (!BLOCK_TYPES.has(block.type)) {
      throw new Error(`Unknown beat block type: ${block.type}`);
    }
  }

  session.timeline.durationMs = Math.max(
    Number(session.timeline.durationMs || 0),
    ...session.beatBlocks.map((block) => block.endMs),
    ...session.verses.map((verse) => verse.endMs),
    0
  );
  session.verses = alignVerses(session.verses, session.beatBlocks);
  return session;
}

export function validateBeatReference(reference) {
  if (!reference || typeof reference !== "object") {
    throw new Error("beatReference is required");
  }
  if (reference.kind === "youtube") {
    if (!YOUTUBE_ID.test(reference.videoId || "")) {
      throw new Error("YouTube reference requires a valid-looking videoId");
    }
    if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(reference.url || "")) {
      throw new Error("YouTube reference requires an https YouTube URL");
    }
    const forbidden = [
      "audio",
      "audioData",
      "audioUrl",
      "downloadUrl",
      "blob",
      "filePath",
      "media"
    ];
    for (const key of forbidden) {
      if (key in reference) {
        throw new Error(`YouTube reference cannot contain ${key}`);
      }
    }
    return true;
  }
  if (reference.kind === "localLicensed" && reference.rightsConfirmed === true) {
    return true;
  }
  throw new Error("Unsupported beat reference");
}

export function validateRegions(regions, label) {
  let previousEnd = -1;
  for (const region of regions) {
    if (!region.id) throw new Error(`${label} id is required`);
    if (!Number.isInteger(region.startMs) || !Number.isInteger(region.endMs)) {
      throw new Error(`${label} timestamps must be integer milliseconds`);
    }
    if (region.startMs < 0 || region.endMs <= region.startMs) {
      throw new Error(`${label} has an invalid range`);
    }
    if (region.startMs < previousEnd) {
      throw new Error(`${label}s cannot overlap`);
    }
    previousEnd = region.endMs;
  }
}

export function alignVerses(verses, blocks) {
  return verses.map((verse) => {
    const blockIds = blocks
      .filter(
        (block) =>
          block.startMs < verse.endMs && block.endMs > verse.startMs
      )
      .map((block) => block.id);
    return { ...verse, beatBlockIds: blockIds };
  });
}

export function regionAt(regions, positionMs) {
  return (
    regions.find(
      (region) => region.startMs <= positionMs && positionMs < region.endMs
    ) || null
  );
}

export function timelineRatio(positionMs, durationMs) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return 0;
  return Math.min(1, Math.max(0, positionMs / durationMs));
}

export function formatTime(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function metadataOnlyExport(session) {
  const normalized = normalizeSession(session);
  return {
    ...normalized,
    export: {
      kind: "metadata-only",
      createdAt: new Date().toISOString(),
      excluded: ["youtube-audio", "beat-reference-recording", "vocal-audio"]
    },
    assets: {
      ...normalized.assets,
      vocal: normalized.assets?.vocal
        ? { ...normalized.assets.vocal, localObjectUrl: undefined }
        : undefined
    }
  };
}

