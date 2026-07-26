/*
  RapCap Freestyle Session — Max for Live metadata bridge.

  The device observes Live set metadata and the transport position. It never
  reads audio buffers, clip file paths, or YouTube media.
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
  tempo: 120,
  tracks: [],
  locators: []
};
var captureActive = false;
var captureOriginBeat = 0;
var captureTempo = 120;
var captureDurationMs = 0;
var openVerseBeat = null;
var openBlockBeat = null;
var selectedBlockType = "beat";
var verseCandidates = [];
var rawEvents = [];
var completedSessions = [];
var passiveEnabled = true;
var lastIsPlaying = false;
var lastPolledBeat = null;
var lastPolledTempo = null;
var lastPollWallMs = null;
var lastTrackSignature = "";
var lastTrackScanWallMs = 0;
var activeEventStartIndex = 0;
var autoBlockStartBeat = null;
var autoBlockTempo = null;
var checkpointFilePath = "";
var storageRoot =
  "/Users/syrianhammer/Library/Mobile Documents/com~apple~CloudDocs/Documents/Projects/RapCap/RapCap Sessions";
var storageConfigPath = "";
var configuredProjectDirectory = "";
var configuredSetFileName = "";
var configuredSamplesDirectoryName = "";
var passiveTask = new Task(pollTransport, this);
passiveTask.interval = 250;

function status(message) {
  outlet(1, String(message));
}

function safeNumber(value, fallback) {
  var number = Number(value);
  return isFinite(number) ? number : fallback;
}

function liveSet() {
  return new LiveAPI("live_set");
}

function liveApiAvailable() {
  try {
    var set = liveSet();
    return Number(set.id) > 0 && set.get("is_playing") !== null;
  } catch (error) {
    return false;
  }
}

function currentBeat() {
  try {
    return safeNumber(liveSet().get("current_song_time"), 0);
  } catch (error) {
    status("transport unavailable: " + error.message);
    return 0;
  }
}

function relativeBeat(absoluteBeat) {
  return Math.max(0, absoluteBeat - captureOriginBeat);
}

function approximateMs(absoluteBeat) {
  return Math.max(
    0,
    Math.round((relativeBeat(absoluteBeat) * 60000) / captureTempo)
  );
}

function createSessionId() {
  var now = new Date();
  function part(value) {
    return String(value).length === 1 ? "0" + value : String(value);
  }
  return (
    "rapcap-" +
    now.getFullYear() +
    part(now.getMonth() + 1) +
    part(now.getDate()) +
    "-" +
    part(now.getHours()) +
    part(now.getMinutes()) +
    part(now.getSeconds())
  );
}

function applyStorageRoot(value) {
  var root = String(value || "").replace(/\/+$/, "");
  if (!root) return false;
  storageRoot = root;
  checkpointFilePath = storageRoot + "/inbox/rapcap-live-events.ndjson";
  return true;
}

function storage_root() {
  var value = arrayfromargs(arguments).join(" ").trim();
  if (applyStorageRoot(value)) {
    status("storage root updated: " + storageRoot);
  }
}

function initializeStorageConfig() {
  try {
    var patchPath = String(this.patcher.filepath || "");
    var separator = Math.max(
      patchPath.lastIndexOf("/"),
      patchPath.lastIndexOf("\\")
    );
    if (separator >= 0) {
      storageConfigPath =
        patchPath.substring(0, separator + 1) +
        "rapcap-storage-config.json";
      var config = new Dict("rapcap_storage_config_runtime");
      config.import_json(storageConfigPath);
      var configuredRoot = config.get("storage::resolvedRootMacOS");
      applyStorageRoot(configuredRoot);
      configuredProjectDirectory = String(
        config.get("currentSourceOfTruth::projectDirectory") || ""
      );
      configuredSetFileName = String(
        config.get("currentSourceOfTruth::setFileName") || ""
      );
      configuredSamplesDirectoryName = String(
        config.get("currentSourceOfTruth::samplesDirectoryName") || ""
      );
    }
  } catch (error) {
    applyStorageRoot(storageRoot);
  }
}

function appendCheckpoint(event) {
  if (!checkpointFilePath) return false;
  try {
    var file = new File(checkpointFilePath, "write", "TEXT");
    if (!file.isopen) return false;
    file.position = file.eof;
    file.writeline(JSON.stringify(event));
    file.close();
    return true;
  } catch (error) {
    return false;
  }
}

function recordRawEvent(type, absoluteBeat, details) {
  var event = {
    id: "event-" + String(rawEvents.length + 1),
    type: String(type),
    sessionId: sessionId,
    atSongBeat: Number(absoluteBeat.toFixed(6)),
    atBeat: Number(relativeBeat(absoluteBeat).toFixed(6)),
    atMs: approximateMs(absoluteBeat),
    tempo: safeNumber(lastPolledTempo, captureTempo),
    observedAt: new Date().toISOString(),
    details: details || {}
  };
  rawEvents.push(event);
  appendCheckpoint(event);
  publish();
  return event;
}

function session_id(value) {
  sessionId = String(value);
  status("session id updated");
}

function youtube(videoId, url) {
  youtube_id(videoId);
  youtube_url(url);
}

function youtube_id() {
  youtubeMetadata.videoId = arrayfromargs(arguments).join("").trim();
  status("YouTube ID set (metadata only)");
}

function youtube_url() {
  var url = arrayfromargs(arguments).join(" ").trim();
  youtubeMetadata.url = url;

  if (!youtubeMetadata.videoId && url) {
    var watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{6,20})/);
    var shortMatch = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,20})/);
    var match = watchMatch || shortMatch;
    if (match) youtubeMetadata.videoId = match[1];
  }
  status("YouTube URL set; no media requested");
}

function youtube_title() {
  youtubeMetadata.title = arrayfromargs(arguments).join(" ").trim();
}

function referenceReady() {
  return Boolean(youtubeMetadata.videoId && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(youtubeMetadata.url));
}

function scan() {
  try {
    var set = liveSet();
    scanned.tempo = safeNumber(set.get("tempo"), 120);
    scanned.tracks = snapshotTracks(set);
    scanned.locators = [];
    var trackCount = set.getcount("tracks");
    var index;
    var locatorCount = set.getcount("cue_points");
    for (index = 0; index < locatorCount; index += 1) {
      var locator = new LiveAPI("live_set cue_points " + index);
      scanned.locators.push({
        name: String(locator.get("name")),
        timeBeat: safeNumber(locator.get("time"), 0)
      });
    }
    status(
      "scan: " +
        trackCount +
        " tracks / " +
        locatorCount +
        " locators / metadata only"
    );
  } catch (error) {
    status("scan failed: " + error.message);
  }
}

function snapshotTracks(set) {
  var tracks = [];
  var trackCount = set.getcount("tracks");
  var index;
  for (index = 0; index < trackCount; index += 1) {
    var track = new LiveAPI("live_set tracks " + index);
    var item = {
      index: index,
      name: String(track.get("name"))
    };
    try {
      item.arm = Number(track.get("arm")) === 1;
    } catch (error) {
      item.arm = false;
    }
    try {
      item.mute = Number(track.get("mute")) === 1;
    } catch (error) {
      item.mute = false;
    }
    tracks.push(item);
  }
  return tracks;
}

function beginPassiveCapture(beat, tempo) {
  blocks = [];
  verses = [];
  verseCandidates = [];
  captureActive = true;
  captureOriginBeat = beat;
  captureTempo = tempo;
  captureDurationMs = 0;
  openVerseBeat = null;
  openBlockBeat = null;
  autoBlockStartBeat = beat;
  autoBlockTempo = tempo;
  activeEventStartIndex = rawEvents.length;
  sessionId = createSessionId();
  scan();
  recordRawEvent("transport-start", beat, {
    mode: "passive",
    trackCount: scanned.tracks.length
  });
  status("PASSIVE CAPTURE / recording raw timeline");
}

function closeAutoBlock(endBeat, reason) {
  if (autoBlockStartBeat === null || endBeat <= autoBlockStartBeat) return;
  var blockId = "block-" + String(blocks.length + 1);
  blocks.push({
    id: blockId,
    type: "beat",
    label: "Tempo " + Number(autoBlockTempo.toFixed(2)) + " BPM",
    startBeat: Number(relativeBeat(autoBlockStartBeat).toFixed(6)),
    endBeat: Number(relativeBeat(endBeat).toFixed(6)),
    startMs: approximateMs(autoBlockStartBeat),
    endMs: approximateMs(endBeat),
    bpm: autoBlockTempo,
    source: "transport",
    confidence: 1
  });
  verseCandidates.push({
    id: "candidate-" + String(verseCandidates.length + 1),
    startBeat: Number(relativeBeat(autoBlockStartBeat).toFixed(6)),
    endBeat: Number(relativeBeat(endBeat).toFixed(6)),
    startMs: approximateMs(autoBlockStartBeat),
    endMs: approximateMs(endBeat),
    beatBlockIds: [blockId],
    reason: reason || "tempo-stable-span",
    status: "unreviewed"
  });
}

function endPassiveCapture(beat, reason) {
  if (!captureActive) return;
  if (openVerseBeat !== null) closeVerse(beat);
  if (openBlockBeat !== null) closeBlock(beat);
  closeAutoBlock(beat, "transport-stop");
  captureDurationMs = approximateMs(beat);
  recordRawEvent("transport-stop", beat, {
    reason: reason || "transport-stopped"
  });
  captureActive = false;
  completedSessions.push({
    id: sessionId,
    durationMs: captureDurationMs,
    eventStartIndex: activeEventStartIndex,
    eventEndIndex: rawEvents.length - 1,
    beatBlocks: blocks.slice(0),
    verseCandidates: verseCandidates.slice(0),
    manualVerses: verses.slice(0)
  });
  autoBlockStartBeat = null;
  autoBlockTempo = null;
  publish();
  status("PASSIVE CAPTURE COMPLETE / raw session preserved");
}

function handleTempoChange(beat, tempo) {
  closeAutoBlock(beat, "tempo-change");
  recordRawEvent("tempo-change", beat, {
    fromBpm: lastPolledTempo,
    toBpm: tempo
  });
  autoBlockStartBeat = beat;
  autoBlockTempo = tempo;
}

function pollTransport() {
  if (!passiveEnabled) return;
  try {
    var set = liveSet();
    var nowMs = new Date().getTime();
    var isPlaying = Number(set.get("is_playing")) === 1;
    var beat = safeNumber(set.get("current_song_time"), 0);
    var tempo = safeNumber(set.get("tempo"), 120);

    if (isPlaying && !lastIsPlaying) {
      beginPassiveCapture(beat, tempo);
    } else if (!isPlaying && lastIsPlaying) {
      endPassiveCapture(lastPolledBeat === null ? beat : lastPolledBeat);
    } else if (isPlaying && captureActive) {
      if (
        lastPolledTempo !== null &&
        Math.abs(tempo - lastPolledTempo) >= 0.1
      ) {
        handleTempoChange(beat, tempo);
      }

      if (lastPolledBeat !== null && lastPollWallMs !== null) {
        var elapsedMinutes = (nowMs - lastPollWallMs) / 60000;
        var expectedBeatDelta = elapsedMinutes * lastPolledTempo;
        var actualBeatDelta = beat - lastPolledBeat;
        if (
          actualBeatDelta < -0.25 ||
          Math.abs(actualBeatDelta - expectedBeatDelta) >
            Math.max(1, expectedBeatDelta * 4)
        ) {
          recordRawEvent("transport-seek", beat, {
            fromSongBeat: lastPolledBeat,
            toSongBeat: beat
          });
          closeAutoBlock(lastPolledBeat, "transport-seek");
          autoBlockStartBeat = beat;
          autoBlockTempo = tempo;
        }
      }

      if (nowMs - lastTrackScanWallMs >= 1000) {
        var tracks = snapshotTracks(set);
        var signature = JSON.stringify(tracks);
        if (lastTrackSignature && signature !== lastTrackSignature) {
          scanned.tracks = tracks;
          recordRawEvent("track-state-change", beat, { tracks: tracks });
        }
        lastTrackSignature = signature;
        lastTrackScanWallMs = nowMs;
      }
    }

    lastIsPlaying = isPlaying;
    lastPolledBeat = beat;
    lastPolledTempo = tempo;
    lastPollWallMs = nowMs;
  } catch (error) {
    passiveEnabled = false;
    passiveTask.cancel();
    status("passive monitor error: " + error.message);
  }
}

function passive_toggle() {
  passiveEnabled = !passiveEnabled;
  if (!passiveEnabled && captureActive) {
    endPassiveCapture(
      lastPolledBeat === null ? currentBeat() : lastPolledBeat,
      "monitor-disabled"
    );
  }
  if (passiveEnabled) {
    passiveTask.repeat();
    status("PASSIVE MONITOR ON / starts with Live transport");
  } else {
    passiveTask.cancel();
    status("PASSIVE MONITOR OFF");
  }
}

function capture_toggle() {
  var beat = currentBeat();
  if (!captureActive) {
    blocks = [];
    verses = [];
    captureActive = true;
    captureOriginBeat = beat;
    captureTempo = safeNumber(liveSet().get("tempo"), 120);
    captureDurationMs = 0;
    openVerseBeat = null;
    openBlockBeat = null;
    sessionId = createSessionId();
    scan();
    status("CAPTURE ON @ beat " + beat.toFixed(2));
    return;
  }

  if (openVerseBeat !== null) closeVerse(beat);
  if (openBlockBeat !== null) closeBlock(beat);
  captureDurationMs = approximateMs(beat);
  captureActive = false;
  publish();
  status("CAPTURE STOPPED / " + verses.length + " verses");
}

function verse_toggle() {
  var beat = currentBeat();
  if (!captureActive) {
    status("start capture before marking a verse");
    return;
  }
  if (openVerseBeat === null) {
    openVerseBeat = beat;
    status("VERSE IN @ +" + relativeBeat(beat).toFixed(2) + " beats");
    return;
  }
  closeVerse(beat);
}

function closeVerse(endBeat) {
  if (endBeat <= openVerseBeat) {
    status("verse end must follow verse start");
    return;
  }
  verses.push({
    id: "verse-" + String(verses.length + 1),
    startBeat: Number(relativeBeat(openVerseBeat).toFixed(6)),
    endBeat: Number(relativeBeat(endBeat).toFixed(6)),
    startMs: approximateMs(openVerseBeat),
    endMs: approximateMs(endBeat),
    transcript: "",
    rating: 0,
    status: "raw"
  });
  openVerseBeat = null;
  status("VERSE OUT / verse " + verses.length + " captured");
}

function block_type(value) {
  var types = ["beat", "ad", "transition", "silence", "unknown"];
  var index = Number(value);
  selectedBlockType = isFinite(index)
    ? types[Math.max(0, Math.min(types.length - 1, index))]
    : String(value);
  status("block type: " + selectedBlockType);
}

function block_toggle() {
  var beat = currentBeat();
  if (!captureActive) {
    status("start capture before marking a block");
    return;
  }
  if (openBlockBeat === null) {
    openBlockBeat = beat;
    status(
      selectedBlockType.toUpperCase() +
        " IN @ +" +
        relativeBeat(beat).toFixed(2) +
        " beats"
    );
    return;
  }
  closeBlock(beat);
}

function closeBlock(endBeat) {
  if (endBeat <= openBlockBeat) {
    status("block end must follow block start");
    return;
  }
  blocks.push({
    id: "block-" + String(blocks.length + 1),
    type: selectedBlockType,
    label: selectedBlockType + " " + String(blocks.length + 1),
    startBeat: Number(relativeBeat(openBlockBeat).toFixed(6)),
    endBeat: Number(relativeBeat(endBeat).toFixed(6)),
    startMs: approximateMs(openBlockBeat),
    endMs: approximateMs(endBeat),
    bpm: safeNumber(liveSet().get("tempo"), captureTempo),
    source: "manual",
    confidence: 1
  });
  openBlockBeat = null;
  status("BLOCK OUT / " + blocks.length + " blocks");
}

function block(type, startBeat, endBeat, label, bpm, key) {
  var start = safeNumber(startBeat, 0);
  var end = safeNumber(endBeat, start);
  blocks.push({
    id: "block-" + String(blocks.length + 1),
    type: String(type),
    label: String(label || type).replace(/_/g, " "),
    startBeat: start,
    endBeat: end,
    startMs: Math.round((start * 60000) / captureTempo),
    endMs: Math.round((end * 60000) / captureTempo),
    bpm: safeNumber(bpm, captureTempo),
    key: String(key || "unknown"),
    source: "manual",
    confidence: 1
  });
  status("block added");
}

function verse(startBeat, endBeat, language) {
  var start = safeNumber(startBeat, 0);
  var end = safeNumber(endBeat, start);
  verses.push({
    id: "verse-" + String(verses.length + 1),
    startBeat: start,
    endBeat: end,
    startMs: Math.round((start * 60000) / captureTempo),
    endMs: Math.round((end * 60000) / captureTempo),
    language: String(language || "unknown"),
    transcript: "",
    rating: 0,
    status: "raw"
  });
  status("verse added");
}

function rating(value) {
  if (!verses.length) {
    status("capture a verse before rating");
    return;
  }
  var score = Math.max(0, Math.min(5, Math.round(Number(value))));
  verses[verses.length - 1].rating = score;
  verses[verses.length - 1].status = score >= 4 ? "keep" : "review";
  status("last verse rating: " + score + "/5");
}

function rate(index, value, state) {
  var verseIndex = Number(index);
  if (!verses[verseIndex]) {
    status("rate failed: verse index not found");
    return;
  }
  verses[verseIndex].rating = Math.max(0, Math.min(5, Number(value)));
  verses[verseIndex].status = String(state || "review");
  status("verse rating updated");
}

function manifestObject() {
  var durationMs = captureDurationMs;
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
        locators: scanned.locators,
        projectDirectory: configuredProjectDirectory,
        setFile: configuredSetFileName,
        samplesDirectory: configuredSamplesDirectoryName,
        sourceAccess: "read-only"
      }
    },
    beatReference: youtubeMetadata,
    timeline: {
      clock: "ableton-song-beats+approx-ms",
      originSongBeat: captureOriginBeat,
      tempoAtCapture: captureTempo,
      durationMs: durationMs,
      vocalOffsetMs: 0
    },
    beatBlocks: blocks,
    verses: verses,
    verseCandidates: verseCandidates,
    rawCapture: {
      mode: "passive-liveapi",
      monitorEnabled: passiveEnabled,
      captureActive: captureActive,
      samplingIntervalMs: passiveTask.interval,
      checkpoint: checkpointFilePath || null,
      storageRoot: storageRoot,
      events: rawEvents,
      completedSessions: completedSessions
    },
    analysis: {
      status: "pending",
      audioInspected: false,
      transcriptionStatus: "not-started"
    },
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
}

function write_manifest() {
  if (!referenceReady()) {
    status("export blocked: enter YouTube ID and URL");
    return;
  }
  var dict = new Dict("rapcap_freestyle_session");
  dict.clear();
  dict.parse(JSON.stringify(manifestObject()));
  outlet(0, "dictionary", dict.name);
  dict.write();
  status("metadata-only manifest save requested");
}

function clear_annotations() {
  if (captureActive) {
    status("clear blocked while passive capture is active");
    return;
  }
  blocks = [];
  verses = [];
  verseCandidates = [];
  rawEvents = [];
  completedSessions = [];
  openVerseBeat = null;
  openBlockBeat = null;
  status("annotations cleared");
}

function loadbang() {
  initializeStorageConfig();
  if (liveApiAvailable()) {
    passiveEnabled = true;
    passiveTask.repeat();
    status("PASSIVE MONITOR ON / waiting for Live transport");
  } else {
    passiveEnabled = false;
    passiveTask.cancel();
    status("LiveAPI unavailable — load this device inside Ableton Live");
  }
}
