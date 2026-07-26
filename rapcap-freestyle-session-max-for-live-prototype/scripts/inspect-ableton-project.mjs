import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectAbletonProject,
  summarizeProjectInspection
} from "../src/ableton-project-inspector.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const memory = JSON.parse(
  await readFile(join(root, "PROJECT-MEMORY.json"), "utf8")
);
const projectDirectory =
  process.argv.find((argument) => !argument.startsWith("--") && argument !== process.argv[0] && argument !== process.argv[1]) ||
  memory.currentSourceOfTruth.projectDirectory;
const inspection = await inspectAbletonProject(projectDirectory);

if (process.argv.includes("--write-fixture")) {
  const outputPath = join(root, "fixtures", "current-project-layout.json");
  await writeFile(outputPath, `${JSON.stringify(inspection, null, 2)}\n`);
  console.error(`Wrote read-only layout fixture: ${outputPath}`);
}

const output = process.argv.includes("--summary")
  ? summarizeProjectInspection(inspection)
  : inspection;
console.log(JSON.stringify(output, null, 2));
