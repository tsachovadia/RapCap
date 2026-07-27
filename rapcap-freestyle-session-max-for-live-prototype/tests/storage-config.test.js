import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const expectedRoot =
  "/Users/syrianhammer/Library/Mobile Documents/com~apple~CloudDocs/Documents/Projects/RapCap/RapCap Sessions";

test("project memory owns the final RapCap Sessions destination", async () => {
  const memory = JSON.parse(
    await readFile(new URL("../PROJECT-MEMORY.json", import.meta.url), "utf8")
  );
  assert.equal(memory.status, "final");
  assert.equal(memory.storage.resolvedRootMacOS, expectedRoot);
  assert.equal(memory.storage.configurable, true);
  assert.deepEqual(memory.storage.subfolders, {
    inbox: "inbox",
    sessions: "sessions",
    exports: "exports",
    templates: "templates"
  });
});

test("device companion receives the same configurable destination", async () => {
  const deviceConfig = JSON.parse(
    await readFile(
      new URL(
        "../max-for-live/rapcap-storage-config.json",
        import.meta.url
      ),
      "utf8"
    )
  );
  assert.equal(deviceConfig.storage.resolvedRootMacOS, expectedRoot);
  assert.equal(deviceConfig.storage.liveCaptureDestination, "inbox");
});

test("prototype contains no superseded storage default", async () => {
  const files = [
    "../PROJECT-MEMORY.json",
    "../max-for-live/rapcap-storage-config.json",
    "../max-for-live/rapcap_session_bridge.js"
  ];
  for (const file of files) {
    const contents = await readFile(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(contents, /Music\/Ableton|Areas\/ABELTON/i);
  }
});

