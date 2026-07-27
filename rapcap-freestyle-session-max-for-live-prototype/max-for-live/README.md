# RapCap Freestyle Session — Max for Live device

This folder now contains a runnable Max Audio Effect artifact:

- `RapCap Freestyle Session.amxd` — Max 9 AMPF device container;
- `RapCap Freestyle Session.maxpat` — generated editable patch source;
- `rapcap_session_bridge.js` — required LiveAPI/manifest companion.
- `rapcap-storage-config.json` — generated configurable product-data location.

Keep all four files in the same folder. The device is metadata-only and passes
stereo audio from `plugin~` directly to `plugout~`.

## Build

From the prototype root:

```bash
npm run build:m4l
```

The build script generates the editable `.maxpat`, packages its JSON payload in
the same AMPF container shape used by Ableton's Max Audio Effect template, and
writes the `.amxd`.

## Install and open

1. Add this folder to **Places** in Ableton Live, or copy the whole folder into
   the User Library under `Presets/Audio Effects/Max Audio Effect/RapCap/`.
2. Drag `RapCap Freestyle Session.amxd` onto the microphone/vocal audio track.
3. Leave `rapcap_session_bridge.js` next to it.
4. Enter the YouTube video ID and normal HTTPS URL. These are metadata only.
5. Click **SCAN SET** if you want an immediate status check. The device also
   scans automatically.
6. Start Live playback/recording. Passive capture begins automatically.
7. Use **VERSE IN/OUT** only when you want to add a manual region.
8. Choose a block type and use **BLOCK IN/OUT** around a beat, ad, transition,
   or silence region.
9. Enter a `0–5` rating after completing a verse.
10. Stop Live when the performance is over; the raw session closes
    automatically. **EXPORT JSON** is optional and can happen later.

Export opens Max's save dialog and writes a metadata manifest. It does not
export audio of any kind.

Live checkpoints use the configured `RapCap Sessions/inbox` destination.
Change `storage.resolvedRootMacOS` in `PROJECT-MEMORY.json` and rebuild, or
change that same field in the installed `rapcap-storage-config.json`. The
current project-owned root is:

```text
/Users/syrianhammer/Library/Mobile Documents/com~apple~CloudDocs/Documents/Projects/RapCap/RapCap Sessions
```

Its required subfolders are `inbox`, `sessions`, `exports`, and `templates`.

## Current device scope

Working in the patch:

- stereo audio pass-through;
- LiveAPI scan of track names, tempo, and cue-point/locator metadata;
- capture origin and duration against Live's song transport;
- automatic passive session start/stop with the Live transport;
- append-only raw events for tempo, seek, and track-state changes;
- automatic tempo-bound beat blocks and separate verse candidates;
- best-effort NDJSON checkpoints next to the device;
- manual verse and block in/out markers;
- block labels for beat/ad/transition/silence/unknown;
- rating of the last completed verse;
- YouTube ID/URL metadata input;
- Max `Dict` publication and metadata-only JSON write;
- explicit status display.

Not implemented:

- recording audio inside the device;
- waveform rendering or audio classification;
- automatic BPM/key/ad detection;
- transcription inside Max;
- transcript editing inside the narrow device panel;
- a frozen/self-contained device with the JS embedded;
- tempo-map conversion for precise milliseconds during tempo automation.

## M4L-specific limitation

`current_song_time` is measured in beats. The device stores exact relative beat
positions and approximate milliseconds using the tempo at capture start.
Millisecond values drift if the Live set automates tempo. The next device
iteration should sample/serialize the tempo map or use a transport conversion
adapter before milliseconds become an interchange guarantee.

The browser companion remains useful for visual review/transcript editing after
the device exports a manifest; it is not the primary deliverable.
