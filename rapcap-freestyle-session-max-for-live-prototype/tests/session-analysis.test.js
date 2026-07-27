import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import vm from "node:vm";

const analysisUrl = new URL(
  "../analysis/2026-07-26-freestyle-session-01/",
  import.meta.url
);
const analysis = JSON.parse(
  await readFile(new URL("analysis.json", analysisUrl), "utf8")
);

test("analysis groups takes by Session View scene row", () => {
  assert.equal(analysis.groupingModel.view, "session");
  assert.equal(analysis.groupingModel.referenceTrackOrdinal, 9);
  assert.deepEqual(analysis.groupingModel.vocalTrackOrdinals, [10, 11, 12]);
  assert.deepEqual(
    analysis.scenes.map((scene) => scene.sceneRow),
    [1, 2, 3]
  );
  assert.match(analysis.groupingModel.neverTreatAs, /arrangement/i);
});

test("saved evidence and derived musical estimates remain distinct", () => {
  assert.equal(
    analysis.scenes[0].membershipStatus,
    "saved-clip-slot-confirmed"
  );
  assert.ok(
    analysis.scenes.every(
      (scene) => scene.membershipStatus === "saved-clip-slot-confirmed"
    )
  );
  assert.deepEqual(
    analysis.scenes.map(
      (scene) => scene.musicalAnalysis.tempoBpmEstimate
    ),
    [95.2, 90.9, 90.9]
  );
  assert.ok(
    analysis.scenes.every(
      (scene) => scene.musicalAnalysis.bar1Beat1SecondsEstimate > 0
    )
  );
  assert.notEqual(
    analysis.source.setTempoBpm,
    analysis.scenes[0].musicalAnalysis.tempoBpmEstimate
  );
});

test("analysis artifact contains no bundled audio", async () => {
  const files = await readdir(analysisUrl);
  assert.deepEqual(files.sort(), [
    "README.md",
    "analysis.json",
    "index.html",
    "transcript-draft.js"
  ]);
  assert.ok(
    files.every(
      (file) => !/\.(wav|aif|aiff|mp3|m4a|flac|ogg)$/i.test(file)
    )
  );
  assert.match(
    analysis.source.youtubeReferenceHandling,
    /do-not-copy-or-export-audio/
  );
});

test("simple report exposes the M4L device and clickable timed words", async () => {
  const html = await readFile(new URL("index.html", analysisUrl), "utf8");
  assert.match(html, /RapCap%20Freestyle%20Session\.amxd/);
  assert.match(html, /המילים שלך — לחץ על מילה/);

  const transcriptSource = await readFile(
    new URL("transcript-draft.js", analysisUrl),
    "utf8"
  );
  const context = { window: {} };
  vm.runInNewContext(transcriptSource, context);
  const transcripts = context.window.RAPCAP_TRANSCRIPTS;
  assert.deepEqual(Object.keys(transcripts), ["scene1", "scene2", "scene3"]);
  assert.ok(
    Object.values(transcripts).every(
      (scene) =>
        scene.audioUrl.startsWith("file:///") &&
        scene.words.length > 0 &&
        scene.words.every((word) => word.start >= 0 && word.end >= word.start)
    )
  );
});
