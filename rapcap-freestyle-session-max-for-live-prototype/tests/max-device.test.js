import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const artifactUrl = new URL(
  "../max-for-live/RapCap Freestyle Session.amxd",
  import.meta.url
);

async function readDevice() {
  const file = await readFile(artifactUrl);
  assert.equal(file.subarray(0, 4).toString("ascii"), "ampf");
  assert.equal(file.readUInt32LE(4), 4);
  assert.equal(file.subarray(24, 28).toString("ascii"), "ptch");
  const payloadLength = file.readUInt32LE(28);
  const payload = file.subarray(32, 32 + payloadLength).toString("utf8");
  return { file, payloadLength, patch: JSON.parse(payload) };
}

test("builds a genuine AMPF Max for Live container", async () => {
  const { file, payloadLength } = await readDevice();
  assert.equal(file.length, 32 + payloadLength);
});

test("device is a stereo pass-through Max Audio Effect", async () => {
  const { patch } = await readDevice();
  const texts = patch.patcher.boxes
    .map(({ box }) => box.text)
    .filter(Boolean);
  assert.ok(texts.includes("plugin~"));
  assert.ok(texts.includes("plugout~"));
  assert.equal(patch.patcher.project.amxdtype, 1633771873);
});

test("device contains the capture and review workflow controls", async () => {
  const { patch } = await readDevice();
  const labels = patch.patcher.boxes
    .map(({ box }) => box.text)
    .filter(Boolean);
  for (const label of [
    "SCAN SET",
    "PASSIVE ON/OFF",
    "VERSE IN/OUT",
    "BLOCK IN/OUT",
    "EXPORT JSON",
    "js rapcap_session_bridge.js"
  ]) {
    assert.ok(labels.includes(label), `missing device object: ${label}`);
  }
});

test("device keeps the JavaScript bridge as an explicit companion", async () => {
  const { patch } = await readDevice();
  assert.deepEqual(patch.patcher.dependency_cache, [
    {
      name: "rapcap_session_bridge.js",
      bootpath: ".",
      patcherrelativepath: ".",
      type: "TEXT",
      implicit: 1
    },
    {
      name: "rapcap-storage-config.json",
      bootpath: ".",
      patcherrelativepath: ".",
      type: "JSON",
      implicit: 1
    }
  ]);
});

test("passive polling is guarded when the device is opened outside Live", async () => {
  const bridge = await readFile(
    new URL("../max-for-live/rapcap_session_bridge.js", import.meta.url),
    "utf8"
  );
  assert.match(bridge, /function liveApiAvailable\(\)/);
  assert.match(bridge, /if \(liveApiAvailable\(\)\)/);
  assert.match(bridge, /passiveTask\.cancel\(\)/);
});
