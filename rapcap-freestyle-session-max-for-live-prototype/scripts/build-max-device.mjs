import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const deviceDir = join(root, "max-for-live");
const memoryPath = join(root, "PROJECT-MEMORY.json");
const deviceConfigPath = join(deviceDir, "rapcap-storage-config.json");
const sourcePath = join(deviceDir, "RapCap Freestyle Session.maxpat");
const outputPath = join(deviceDir, "RapCap Freestyle Session.amxd");

function maxBox(id, maxclass, patchingRect, attributes = {}) {
  return {
    box: {
      id,
      maxclass,
      patching_rect: patchingRect,
      ...attributes
    }
  };
}

function line(source, destination, order) {
  const patchline = { source, destination };
  if (order !== undefined) patchline.order = order;
  return { patchline };
}

function button(id, label, patchingRect, presentationRect, color) {
  return maxBox(id, "textbutton", patchingRect, {
    numinlets: 1,
    numoutlets: 3,
    outlettype: ["int", "", "int"],
    mode: 0,
    text: label,
    texton: label,
    presentation: 1,
    presentation_rect: presentationRect,
    bgcolor: color,
    bgcoloron: color,
    textcolor: [0.08, 0.08, 0.07, 1],
    textcoloron: [0.08, 0.08, 0.07, 1]
  });
}

const boxes = [
  maxBox("title", "comment", [25, 22, 250, 20], {
    numinlets: 1,
    numoutlets: 0,
    text: "RAPCAP / FREESTYLE SESSION",
    fontface: 1,
    fontsize: 13,
    textcolor: [0.85, 1, 0.25, 1],
    presentation: 1,
    presentation_rect: [14, 9, 250, 20]
  }),
  maxBox("subtitle", "comment", [25, 44, 270, 18], {
    numinlets: 1,
    numoutlets: 0,
    text: "metadata capture • audio passes through unchanged",
    fontsize: 9,
    textcolor: [0.65, 0.65, 0.61, 1],
    presentation: 1,
    presentation_rect: [14, 29, 280, 18]
  }),
  button("scan-button", "SCAN SET", [25, 80, 78, 28], [14, 54, 78, 28], [0.85, 1, 0.25, 1]),
  button("capture-button", "PASSIVE ON/OFF", [110, 80, 92, 28], [98, 54, 92, 28], [1, 0.39, 0.28, 1]),
  button("verse-button", "VERSE IN/OUT", [195, 80, 100, 28], [182, 54, 104, 28], [0.28, 0.84, 0.81, 1]),
  button("block-button", "BLOCK IN/OUT", [302, 80, 100, 28], [292, 54, 104, 28], [0.65, 0.55, 1, 1]),
  maxBox("block-menu", "umenu", [409, 80, 84, 28], {
    numinlets: 1,
    numoutlets: 3,
    outlettype: ["int", "", ""],
    items: ["beat", ",", "ad", ",", "transition", ",", "silence", ",", "unknown"],
    presentation: 1,
    presentation_rect: [402, 54, 84, 28]
  }),
  maxBox("rating-label", "comment", [500, 72, 52, 16], {
    numinlets: 1,
    numoutlets: 0,
    text: "RATING",
    fontsize: 8,
    textcolor: [0.65, 0.65, 0.61, 1],
    presentation: 1,
    presentation_rect: [494, 48, 52, 16]
  }),
  maxBox("rating-number", "number", [500, 88, 45, 24], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["", "bang"],
    minimum: 0,
    maximum: 5,
    presentation: 1,
    presentation_rect: [494, 62, 45, 20]
  }),
  button("export-button", "EXPORT JSON", [553, 80, 94, 28], [547, 54, 94, 28], [0.85, 1, 0.25, 1]),
  button("clear-button", "CLEAR", [654, 80, 58, 28], [647, 54, 58, 28], [0.45, 0.45, 0.42, 1]),
  maxBox("id-label", "comment", [25, 122, 38, 18], {
    numinlets: 1,
    numoutlets: 0,
    text: "YT ID",
    fontsize: 8,
    textcolor: [1, 0.39, 0.28, 1],
    presentation: 1,
    presentation_rect: [14, 95, 38, 18]
  }),
  maxBox("id-edit", "textedit", [62, 120, 118, 22], {
    numinlets: 1,
    numoutlets: 4,
    outlettype: ["", "int", "", ""],
    text: "",
    presentation: 1,
    presentation_rect: [52, 92, 118, 22]
  }),
  maxBox("url-label", "comment", [190, 122, 45, 18], {
    numinlets: 1,
    numoutlets: 0,
    text: "YT URL",
    fontsize: 8,
    textcolor: [1, 0.39, 0.28, 1],
    presentation: 1,
    presentation_rect: [180, 95, 45, 18]
  }),
  maxBox("url-edit", "textedit", [235, 120, 286, 22], {
    numinlets: 1,
    numoutlets: 4,
    outlettype: ["", "int", "", ""],
    text: "",
    presentation: 1,
    presentation_rect: [225, 92, 286, 22]
  }),
  maxBox("status-label", "comment", [25, 153, 44, 18], {
    numinlets: 1,
    numoutlets: 0,
    text: "STATUS",
    fontsize: 8,
    textcolor: [0.65, 0.65, 0.61, 1],
    presentation: 1,
    presentation_rect: [14, 128, 44, 18]
  }),
  maxBox("status-message", "message", [72, 151, 575, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "ready — scan set, enter YouTube metadata, start capture",
    presentation: 1,
    presentation_rect: [58, 124, 647, 24]
  }),
  maxBox("plugin", "newobj", [25, 490, 55, 22], {
    numinlets: 2,
    numoutlets: 2,
    outlettype: ["signal", "signal"],
    text: "plugin~"
  }),
  maxBox("plugout", "newobj", [25, 548, 58, 22], {
    numinlets: 2,
    numoutlets: 2,
    outlettype: ["signal", "signal"],
    text: "plugout~"
  }),
  maxBox("thisdevice", "newobj", [780, 25, 92, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "live.thisdevice"
  }),
  maxBox("loadbang", "newobj", [780, 60, 58, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: ["bang"],
    text: "loadbang"
  }),
  maxBox("deferlow", "newobj", [780, 95, 56, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "deferlow"
  }),
  maxBox("load-scan-message", "message", [780, 130, 38, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "scan"
  }),
  maxBox("bridge", "newobj", [410, 350, 205, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["", ""],
    text: "js rapcap_session_bridge.js"
  }),
  maxBox("dict-view", "dict.view", [410, 405, 350, 150], {
    numinlets: 1,
    numoutlets: 0
  }),
  maxBox("status-prepend", "newobj", [640, 350, 76, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "prepend set"
  }),
  maxBox("scan-sel", "newobj", [25, 215, 36, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["bang", ""],
    text: "sel 1"
  }),
  maxBox("scan-message", "message", [25, 250, 38, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "scan"
  }),
  maxBox("capture-sel", "newobj", [110, 215, 36, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["bang", ""],
    text: "sel 1"
  }),
  maxBox("capture-message", "message", [110, 250, 88, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "passive_toggle"
  }),
  maxBox("verse-sel", "newobj", [210, 215, 36, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["bang", ""],
    text: "sel 1"
  }),
  maxBox("verse-message", "message", [210, 250, 78, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "verse_toggle"
  }),
  maxBox("block-sel", "newobj", [310, 215, 36, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["bang", ""],
    text: "sel 1"
  }),
  maxBox("block-message", "message", [310, 250, 78, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "block_toggle"
  }),
  maxBox("block-prepend", "newobj", [405, 215, 112, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "prepend block_type"
  }),
  maxBox("rating-prepend", "newobj", [525, 215, 92, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "prepend rating"
  }),
  maxBox("export-sel", "newobj", [635, 215, 36, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["bang", ""],
    text: "sel 1"
  }),
  maxBox("export-message", "message", [635, 250, 90, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "write_manifest"
  }),
  maxBox("clear-sel", "newobj", [735, 215, 36, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["bang", ""],
    text: "sel 1"
  }),
  maxBox("clear-message", "message", [735, 250, 102, 22], {
    numinlets: 2,
    numoutlets: 1,
    outlettype: [""],
    text: "clear_annotations"
  }),
  maxBox("id-route", "newobj", [35, 305, 62, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["", ""],
    text: "route text"
  }),
  maxBox("id-prepend", "newobj", [105, 305, 108, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "prepend youtube_id"
  }),
  maxBox("url-route", "newobj", [230, 305, 62, 22], {
    numinlets: 1,
    numoutlets: 2,
    outlettype: ["", ""],
    text: "route text"
  }),
  maxBox("url-prepend", "newobj", [300, 305, 115, 22], {
    numinlets: 1,
    numoutlets: 1,
    outlettype: [""],
    text: "prepend youtube_url"
  })
];

const lines = [
  line(["plugin", 0], ["plugout", 0]),
  line(["plugin", 1], ["plugout", 1]),
  line(["thisdevice", 0], ["deferlow", 0]),
  line(["loadbang", 0], ["deferlow", 0]),
  line(["deferlow", 0], ["load-scan-message", 0]),
  line(["load-scan-message", 0], ["bridge", 0]),
  line(["bridge", 0], ["dict-view", 0]),
  line(["bridge", 1], ["status-prepend", 0]),
  line(["status-prepend", 0], ["status-message", 1]),
  line(["scan-button", 0], ["scan-sel", 0]),
  line(["scan-sel", 0], ["scan-message", 0]),
  line(["scan-message", 0], ["bridge", 0]),
  line(["capture-button", 0], ["capture-sel", 0]),
  line(["capture-sel", 0], ["capture-message", 0]),
  line(["capture-message", 0], ["bridge", 0]),
  line(["verse-button", 0], ["verse-sel", 0]),
  line(["verse-sel", 0], ["verse-message", 0]),
  line(["verse-message", 0], ["bridge", 0]),
  line(["block-button", 0], ["block-sel", 0]),
  line(["block-sel", 0], ["block-message", 0]),
  line(["block-message", 0], ["bridge", 0]),
  line(["block-menu", 0], ["block-prepend", 0]),
  line(["block-prepend", 0], ["bridge", 0]),
  line(["rating-number", 0], ["rating-prepend", 0]),
  line(["rating-prepend", 0], ["bridge", 0]),
  line(["export-button", 0], ["export-sel", 0]),
  line(["export-sel", 0], ["export-message", 0]),
  line(["export-message", 0], ["bridge", 0]),
  line(["clear-button", 0], ["clear-sel", 0]),
  line(["clear-sel", 0], ["clear-message", 0]),
  line(["clear-message", 0], ["bridge", 0]),
  line(["id-edit", 0], ["id-route", 0]),
  line(["id-route", 0], ["id-prepend", 0]),
  line(["id-prepend", 0], ["bridge", 0]),
  line(["url-edit", 0], ["url-route", 0]),
  line(["url-route", 0], ["url-prepend", 0]),
  line(["url-prepend", 0], ["bridge", 0])
];

const patch = {
  patcher: {
    fileversion: 1,
    appversion: {
      major: 9,
      minor: 1,
      revision: 4,
      architecture: "x64",
      modernui: 1
    },
    classnamespace: "box",
    rect: [100, 100, 900, 610],
    openrect: [0, 0, 720, 170],
    bglocked: 0,
    openinpresentation: 1,
    default_fontsize: 10,
    default_fontface: 0,
    default_fontname: "Arial Bold",
    gridonopen: 1,
    gridsize: [8, 8],
    gridsnaponopen: 1,
    objectsnaponopen: 1,
    toolbarvisible: 1,
    enablehscroll: 1,
    enablevscroll: 1,
    devicewidth: 720,
    description: "Metadata-first freestyle session capture for RapCap",
    digest: "Marks beat blocks and verses against the Ableton transport.",
    tags: "RapCap freestyle session metadata",
    boxes,
    lines,
    dependency_cache: [
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
    ],
    latency: 0,
    project: {
      version: 1,
      creationdate: 3857568000,
      modificationdate: 3857568000,
      viewrect: [0, 0, 300, 500],
      autoorganize: 1,
      hideprojectwindow: 1,
      showdependencies: 1,
      autolocalize: 0,
      contents: { patchers: {} },
      layout: {},
      searchpath: {},
      detailsvisible: 0,
      amxdtype: 1633771873,
      readonly: 0,
      devpathtype: 0,
      devpath: ".",
      sortmode: 0,
      viewmode: 0
    },
    autosave: 0
  }
};

const maxpat = `${JSON.stringify(patch, null, "\t")}\n`;
const memory = JSON.parse(await readFile(memoryPath, "utf8"));
if (!memory.storage?.resolvedRootMacOS || !memory.storage?.configurable) {
  throw new Error("PROJECT-MEMORY.json must define a configurable storage root");
}
await writeFile(
  deviceConfigPath,
  `${JSON.stringify(memory, null, 2)}\n`,
  "utf8"
);
await writeFile(sourcePath, maxpat, "utf8");
const payload = Buffer.from(await readFile(sourcePath), "utf8");
const header = Buffer.alloc(32);
header.write("ampf", 0, "ascii");
header.writeUInt32LE(4, 4);
header.write("aaaa", 8, "ascii");
header.write("meta", 12, "ascii");
header.writeUInt32LE(4, 16);
header.writeUInt32LE(0, 20);
header.write("ptch", 24, "ascii");
header.writeUInt32LE(payload.length, 28);
await writeFile(outputPath, Buffer.concat([header, payload]));

console.log(
  `Built ${outputPath} (${payload.length} byte Max patch payload, ${boxes.length} objects)`
);
