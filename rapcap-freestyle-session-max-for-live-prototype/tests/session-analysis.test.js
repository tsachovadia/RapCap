import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

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
  assert.match(analysis.scenes[1].membershipStatus, /unsaved-in-als/);
  assert.match(analysis.scenes[2].membershipStatus, /unsaved-in-als/);
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
  assert.deepEqual(files.sort(), ["README.md", "analysis.json", "index.html"]);
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
