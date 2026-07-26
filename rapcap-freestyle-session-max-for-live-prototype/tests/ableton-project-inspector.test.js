import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  inspectAbletonProject,
  parseAbletonSetXml
} from "../src/ableton-project-inspector.js";

const memory = JSON.parse(
  await readFile(new URL("../PROJECT-MEMORY.json", import.meta.url), "utf8")
);

test("parses track, clip, tempo, and locator metadata from ALS XML", () => {
  const parsed = parseAbletonSetXml(`
    <Ableton MajorVersion="5" MinorVersion="12.0_12000" Creator="Ableton Live 12">
      <AudioTrack Id="21">
        <EffectiveName Value="RECORD YOUTUBE" />
        <UserName Value="RECORD YOUTUBE" />
        <AudioClip Id="1">
          <CurrentStart Value="0" />
          <CurrentEnd Value="1760" />
          <Name Value="Reference" />
          <RelativePath Value="Samples/Recorded/RECORD YOUTUBE.wav" />
          <OriginalFileSize Value="232848080" />
          <DefaultDuration Value="38808000" />
          <DefaultSampleRate Value="44100" />
        </AudioClip>
      </AudioTrack>
      <Tempo><Manual Value="120" /></Tempo>
      <Locator Id="1"><Name Value="Verse" /><Time Value="64" /></Locator>
    </Ableton>
  `);
  assert.equal(parsed.tempoBpm, 120);
  assert.equal(parsed.tracks[0].effectiveName, "RECORD YOUTUBE");
  assert.equal(
    parsed.tracks[0].clips[0].referenceHandling,
    "metadata-only-do-not-copy-or-export"
  );
  assert.deepEqual(parsed.locators, [{ name: "Verse", timeBeat: 64 }]);
});

test("recognizes the actual Untitled Project layout read-only", async () => {
  const inspection = await inspectAbletonProject(
    memory.currentSourceOfTruth.projectDirectory
  );
  assert.equal(inspection.access, "read-only");
  assert.equal(inspection.set.fileName, "Untitled.als");
  assert.equal(inspection.samples.directory, "Samples");
  assert.equal(inspection.safety.prototypeMayWriteSource, false);
  assert.ok(
    inspection.set.tracks.some(
      (track) => track.effectiveName === "RECORD YOUTUBE"
    )
  );
  assert.ok(
    inspection.samples.inventory.some(
      (sample) =>
        sample.role === "beat-reference-recording" &&
        sample.handling === "metadata-only-do-not-copy-or-export"
    )
  );
});

