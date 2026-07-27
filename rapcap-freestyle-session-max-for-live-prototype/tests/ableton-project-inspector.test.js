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
        <ClipSlot Id="2">
          <ClipSlot><Value>
            <AudioClip Id="1">
              <CurrentStart Value="0" />
              <CurrentEnd Value="1760" />
              <Name Value="Reference" />
              <RelativePath Value="Samples/Recorded/RECORD YOUTUBE.wav" />
              <OriginalFileSize Value="232848080" />
              <DefaultDuration Value="38808000" />
              <DefaultSampleRate Value="44100" />
            </AudioClip>
          </Value></ClipSlot>
          <HasStop Value="true" />
        </ClipSlot>
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
  assert.equal(parsed.tracks[0].trackOrdinal, 1);
  assert.equal(parsed.tracks[0].clips[0].sessionViewSceneRow, 3);
  assert.deepEqual(parsed.locators, [{ name: "Verse", timeBeat: 64 }]);
});

test("recognizes the latest saved Session View layout read-only", async () => {
  const inspection = await inspectAbletonProject(
    memory.currentSourceOfTruth.projectDirectory
  );
  assert.equal(inspection.access, "read-only");
  assert.equal(
    inspection.set.fileName,
    "2026-07-26_Freestyle-Session-01.als"
  );
  assert.equal(inspection.samples.directory, "Samples");
  assert.equal(inspection.safety.prototypeMayWriteSource, false);
  const referenceTrack = inspection.set.tracks.find(
    (track) => track.trackOrdinal === 9
  );
  const vocalTracks = inspection.set.tracks.filter((track) =>
    [11, 12].includes(track.trackOrdinal)
  );
  assert.equal(referenceTrack.trackOrdinal, 9);
  for (const sceneRow of [1, 2, 3]) {
    assert.ok(
      referenceTrack.clips.some(
        (clip) => clip.sessionViewSceneRow === sceneRow
      )
    );
    assert.ok(
      vocalTracks.some((track) =>
        track.clips.some((clip) => clip.sessionViewSceneRow === sceneRow)
      )
    );
  }
  assert.ok(
    inspection.samples.inventory.some(
      (sample) =>
        sample.role === "beat-reference-recording" &&
        sample.handling === "metadata-only-do-not-copy-or-export"
    )
  );
});
