# Prototype spec

## Product question

Can a creator reopen a two-hour freestyle set and quickly answer:

- Which beat was playing?
- Was this an ad, beat, transition, or silence?
- Where did each verse begin and end?
- What did I say?
- Which takes are worth keeping?

The first prototype validates this with a versioned metadata manifest and a
visual review surface. It deliberately postpones signal processing.

## Ingestion contract

The source is an Ableton Live set with:

- a microphone/vocal track;
- a creator-owned or ephemeral beat-reference track;
- locators marking meaningful changes where available;
- optional YouTube reference metadata entered by the creator.

The Max bridge scans names and locators, accepts annotations, and emits a JSON
manifest. It never reads or writes clip audio. The browser may attach a vocal
file selected by the user for the current tab; the file is not serialized into
the manifest.

## Session model

`FreestyleLibrarySession` is the source of truth:

- `source.ableton`: set name, track labels, and source duration;
- `beatReference`: metadata only (`youtube` or `localLicensed`);
- `beatBlocks`: ordered, non-overlapping regions;
- `verses`: timestamped transcript regions with rating and status;
- `timeline`: one monotonic millisecond clock;
- `assets.vocal`: optional descriptor, never a YouTube-derived asset.

Allowed block labels:

- `beat`: a stable musical region;
- `ad`: inserted ad/promo region;
- `transition`: crossfade, seek, or meaningful BPM/key change;
- `silence`: no useful beat;
- `unknown`: awaiting review.

BPM/key changes start a new block even when the YouTube video ID is unchanged.
Automatic detections must carry `source: "detected"` and a confidence score.
Manual edits replace them with `source: "manual"`.

## Review workflow

1. Import manifest from Max for Live.
2. Review the generated block timeline.
3. Split/relabel incorrect regions.
4. Seek through the session; optionally attach the local vocal.
5. Edit transcript and rate verses.
6. Filter for rated/keepable takes.
7. export metadata JSON or hand chosen verses to a future Verse workflow.

## YouTube compliance boundary

For a `youtube` beat reference:

- persist URL, video ID, title, channel, and optional creator notes;
- display a normal outbound link;
- do not request, cache, decode, extract, mix, or export media;
- do not embed a hidden player;
- do not include the ephemeral reference recording in an export;
- label all exports `metadata-only`.

Any future playback integration must use a visible compliant YouTube player.
This prototype intentionally does not play YouTube.

## Alignment rules

- All timestamps are integer milliseconds relative to Ableton set time zero.
- A verse aligns to the block containing its `startMs`.
- A verse spanning multiple blocks receives all overlapping block IDs.
- Gaps are valid and surfaced as `unknown`; overlaps are rejected.
- Timeline duration is the larger of the source duration and last region end.
- Vocal playback offset is explicit and defaults to `0`.

## Max for Live scaffold

`max-for-live/rapcap_session_bridge.js` is intended for a Max `[js]` object.
It can:

- scan Live track names and locators;
- accept YouTube metadata as messages;
- collect explicit block and verse annotations;
- publish the manifest as a Max `Dict`;
- write metadata JSON when the creator chooses a path.

It does not touch device audio buffers. A packaged `.amxd` is deferred until
the message contract is validated in an actual Live/Max environment.

## Next gates

1. Validate the manifest against three real, anonymized Live sets.
2. Decide whether block detection runs:
   - in a Max device from an ephemeral local reference track, or
   - offline from creator-supplied licensed audio.
3. Add a split/merge block editor and undo history.
4. Add a transcription adapter for the vocal track with explicit status.
5. Persist library manifests and user-owned vocal assets locally.
6. Package the Max bridge into `.amxd` only after Live version/API validation.

The next user decision is gate 2: where classification is allowed to inspect a
reference signal. Both paths must preserve the YouTube metadata-only export
contract.

