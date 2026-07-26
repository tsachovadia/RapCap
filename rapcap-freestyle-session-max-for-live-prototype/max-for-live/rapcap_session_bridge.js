/*
  RapCap metadata bridge for a Max [js] object.
  No audio buffers, clip files, or media URLs are read or exported.
*/

autowatch = 1;
inlets = 1;
outlets = 2;

var sessionId = "rapcap-unset";
var youtubeMetadata = { kind: "youtube", videoId: "", url: "" };
var blocks = [];
var verses = [];
var scanned = {
  setName: "Ableton Live Set",
  tempo: null,
  tracks: [],
  locators: []
};

function status(message) {
  outlet(1, String(message));
}

function session_id(value) {
  sessionId = String(value);
  status("session id updated");
}

function youtube(videoId, url) {
  youtubeMetadata.videoId = String(videoId);
  youtubeMetadata.url = String(url);
  status("YouTube metadata updated; audio is never read");
}

function youtube_title() {
  youtubeMetadata.title = arrayfromargs(arguments).join(" ");
}

function scan() {
  scanned.tracks = [];
  scanned.locators = [];
  try {
    var set = new LiveAPI("live_set");
    scanned.tempo = Number(set.get("tempo"));
    var trackCount = set.getcount("tracks");
    var index;
    for (index = 0; index < trackCount; index += 1) {
      var track = new LiveAPI("live_set tracks " + index);
      scanned.tracks.push({
        index: index,
        name: String(track.get("name"))
      });
    }

    var locatorCount = set.getcount("cue_points");
    for (index = 0; index < locatorCount; index += 1) {
      var locator = new LiveAPI("live_set cue_points " + index);
      scanned.locators.push({
        name: String(locator.get("name")),
        timeSec: Number(locator.get("time"))
      });
    }
    status("scan complete: metadata only");
  } catch (error) {
    status("scan failed: " + error.message);
  }
}

function block(type, startSec, endSec, label, bpm, key) {
  blocks.push({
    id: "block-" + String(blocks.length + 1),
    type: String(type),
    label: String(label).replace(/_/g, " "),
    startMs: Math.round(Number(startSec) * 1000),
    endMs: Math.round(Number(endSec) * 1000),
    bpm: Number(bpm) || undefined,
    key: String(key || "unknown"),
    source: "manual",
    confidence: 1
  });
  status("block added");
}

function verse(startSec, endSec, language) {
  verses.push({
    id: "verse-" + String(verses.length + 1),
    startMs: Math.round(Number(startSec) * 1000),
    endMs: Math.round(Number(endSec) * 1000),
    language: String(language || "unknown"),
    transcript: "",
    rating: 0,
    status: "raw"
  });
  status("verse added");
}

function rate(index, rating, state) {
  var verseIndex = Number(index);
  if (!verses[verseIndex]) {
    status("rate failed: verse index not found");
    return;
  }
  verses[verseIndex].rating = Math.max(0, Math.min(5, Number(rating)));
  verses[verseIndex].status = String(state || "review");
  status("verse rating updated");
}

function manifestObject() {
  var durationMs = 0;
  var index;
  for (index = 0; index < blocks.length; index += 1) {
    durationMs = Math.max(durationMs, blocks[index].endMs);
  }
  for (index = 0; index < verses.length; index += 1) {
    durationMs = Math.max(durationMs, verses[index].endMs);
  }
  return {
    schemaVersion: 1,
    id: sessionId,
    title: scanned.setName,
    source: {
      ableton: {
        setName: scanned.setName,
        tempo: scanned.tempo,
        tracks: scanned.tracks,
        locators: scanned.locators
      }
    },
    beatReference: youtubeMetadata,
    timeline: {
      clock: "ableton-set-ms",
      durationMs: durationMs,
      vocalOffsetMs: 0
    },
    beatBlocks: blocks,
    verses: verses,
    export: {
      kind: "metadata-only",
      excluded: [
        "youtube-audio",
        "beat-reference-recording",
        "vocal-audio"
      ]
    }
  };
}

function publish() {
  var dict = new Dict("rapcap_freestyle_session");
  dict.clear();
  dict.parse(JSON.stringify(manifestObject()));
  outlet(0, "dictionary", dict.name);
  status("manifest published");
}

function write_manifest() {
  var dict = new Dict("rapcap_freestyle_session");
  dict.clear();
  dict.parse(JSON.stringify(manifestObject()));
  dict.write();
  status("metadata-only manifest save requested");
}

function clear_annotations() {
  blocks = [];
  verses = [];
  status("annotations cleared");
}
