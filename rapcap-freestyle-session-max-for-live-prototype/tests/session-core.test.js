import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  alignVerses,
  formatTime,
  metadataOnlyExport,
  normalizeSession,
  regionAt,
  timelineRatio,
  validateBeatReference
} from "../src/session-core.js";

const base = {
  schemaVersion: 1,
  id: "demo",
  title: "Long freestyle",
  beatReference: {
    kind: "youtube",
    videoId: "abcDEF_1234",
    url: "https://www.youtube.com/watch?v=abcDEF_1234"
  },
  timeline: { durationMs: 20_000 },
  beatBlocks: [
    { id: "b1", type: "beat", startMs: 0, endMs: 10_000 },
    { id: "b2", type: "ad", startMs: 10_000, endMs: 12_000 },
    { id: "b3", type: "beat", startMs: 12_000, endMs: 20_000 }
  ],
  verses: [
    { id: "v1", startMs: 8_000, endMs: 13_000, transcript: "crosses blocks" }
  ]
};

test("normalizes and aligns a verse across every overlapping block", () => {
  const session = normalizeSession(base);
  assert.deepEqual(session.verses[0].beatBlockIds, ["b1", "b2", "b3"]);
  assert.equal(session.timeline.clock, "ableton-set-ms");
});

test("rejects overlapping beat blocks", () => {
  const invalid = structuredClone(base);
  invalid.beatBlocks[1].startMs = 9_000;
  assert.throws(() => normalizeSession(invalid), /cannot overlap/);
});

test("rejects forbidden YouTube audio fields", () => {
  assert.throws(
    () =>
      validateBeatReference({
        ...base.beatReference,
        audioUrl: "https://example.test/audio.mp3"
      }),
    /cannot contain audioUrl/
  );
});

test("metadata export explicitly excludes all audio", () => {
  const exported = metadataOnlyExport({
    ...base,
    assets: { vocal: { fileName: "take.wav", localObjectUrl: "blob:test" } }
  });
  assert.equal(exported.export.kind, "metadata-only");
  assert.deepEqual(exported.export.excluded, [
    "youtube-audio",
    "beat-reference-recording",
    "vocal-audio"
  ]);
  assert.equal(exported.assets.vocal.localObjectUrl, undefined);
});

test("region lookup uses an exclusive end boundary", () => {
  assert.equal(regionAt(base.beatBlocks, 9_999)?.id, "b1");
  assert.equal(regionAt(base.beatBlocks, 10_000)?.id, "b2");
  assert.equal(regionAt(base.beatBlocks, 20_000), null);
});

test("alignVerses leaves gaps explicit", () => {
  const [verse] = alignVerses(
    [{ id: "v-gap", startMs: 30_000, endMs: 31_000 }],
    base.beatBlocks
  );
  assert.deepEqual(verse.beatBlockIds, []);
});

test("timeline ratio clamps out-of-range positions", () => {
  assert.equal(timelineRatio(-2, 10), 0);
  assert.equal(timelineRatio(5, 10), 0.5);
  assert.equal(timelineRatio(12, 10), 1);
});

test("formats both minute and hour positions", () => {
  assert.equal(formatTime(65_000), "1:05");
  assert.equal(formatTime(3_665_000), "1:01:05");
});

test("the shipped demo manifest satisfies the runtime contract", async () => {
  const raw = await readFile(
    new URL("../fixtures/demo-session.json", import.meta.url),
    "utf8"
  );
  const demo = normalizeSession(JSON.parse(raw));
  assert.equal(demo.beatBlocks.length, 7);
  assert.equal(demo.verses.every((verse) => verse.beatBlockIds.length > 0), true);
});
