# RapCap Freestyle Session / Max for Live Prototype

An isolated, metadata-first experiment for turning long Ableton freestyle sets
into a playable session library.

This folder does not depend on, import from, or modify the current RapCap app.
It prototypes the workflow described in
`2026-07-16-rapcap-lean-mvp-audit`:

1. A runnable Max Audio Effect device marks the Ableton session and emits a
   manifest.
2. Long sessions are divided into labeled beat blocks.
3. Verse timestamps are aligned to those blocks.
4. A reviewer edits transcription, rates takes, and navigates the timeline.
5. The result becomes a visual library entry that can be reopened.

## Hard boundary: YouTube is metadata only

The prototype stores a YouTube URL/video ID, title, channel, and timeline
annotations. It does **not** download, extract, copy, bundle, or export YouTube
audio. A local beat-reference recording may be used ephemerally inside the
creator's Ableton set, but it is not included in the RapCap manifest or export.
Only a user-selected local vocal file can be attached to the browser preview,
and that attachment remains in memory.

## Run

Requires Node.js 18+.

```bash
cd rapcap-freestyle-session-max-for-live-prototype
npm test
npm run serve
```

Then open `http://localhost:4179/web/`.

The browser prototype loads `fixtures/demo-session.json`. Use **Import
manifest** to try another JSON file, or **Load local vocal** to synchronize a
vocal recording with the visual transport. **Export metadata** downloads JSON
only.

## Folder map

```text
contracts/       JSON Schema and Max/browser handoff contract
fixtures/        synthetic demo manifest (no audio)
max-for-live/    Max JS bridge scaffold and device notes
src/             pure timeline/session logic
tests/           focused Node unit tests
web/             standalone visual prototype
```

## Current prototype boundary

Implemented:

- metadata-only YouTube reference contract;
- a genuine `RapCap Freestyle Session.amxd` Max Audio Effect container;
- stereo audio pass-through (the device does not record or alter audio);
- capture start/stop, verse in/out, block in/out/type, last-verse rating;
- passive session capture tied to Live transport, with raw event preservation;
- automatic tempo-change blocks and separate verse candidates;
- Live track/locator scan and metadata JSON write from the device;
- beat/ad/interlude/silence blocks with BPM and key changes;
- verse-to-block alignment;
- visual transport and seek;
- optional in-memory local vocal playback;
- transcript editing and 1–5 ratings;
- filterable library card;
- metadata-only JSON import/export;
- Max for Live manifest bridge scaffold;
- read-only Ableton `.als` parsing with Session View scene-row membership;
- a scene-by-scene analysis presentation for the first real session;
- focused contract/timeline tests.

Not implemented yet:

- audio classification or BPM/key detection;
- automatic transcription;
- persistent storage;
- waveform extraction;
- cloud sync or YouTube playback.

See [SPEC.md](./SPEC.md) for the workflow and next gates.

Storage decisions live in [PROJECT-MEMORY.json](./PROJECT-MEMORY.json). The
Max device build copies that configurable project-owned destination into its
companion config.

The current source of truth is the real read-only
`2026-07-26_Freestyle-Session-01 Project`, including its read-only links to
Scene 1 samples in `Untitled Project`. See
[ACTUAL-SESSION-INTEGRATION.md](./ACTUAL-SESSION-INTEGRATION.md), open the
[scene analysis](./analysis/2026-07-26-freestyle-session-01/index.html), and
run `npm run inspect:actual-session` for a metadata-only inspection.
