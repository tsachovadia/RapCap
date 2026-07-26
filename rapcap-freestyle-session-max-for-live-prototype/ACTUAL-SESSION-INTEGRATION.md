# Actual session integration: Untitled Project

## Source of truth

Read-only project:

```text
RapCap Sessions/
  sessions/
    Untitled Project/
      Untitled.als
      Ableton Project Info/
      Samples/
        Recorded/
```

The exact absolute path lives in `PROJECT-MEMORY.json`. The prototype must not
modify, move, rename, delete, normalize, collect, or export this set or any
sample beneath it.

## Safely extractable now from the saved project

The `.als` is gzip-compressed XML, so the read-only inspector can derive:

- Ableton schema/creator metadata;
- track IDs, types, names, and hierarchy hints;
- saved clip names and beat ranges;
- saved tempo and locator/cue-point metadata;
- relative sample references, declared sizes, sample counts, and sample rates;
- file presence, extension, and byte size under `Samples`;
- references to devices/presets (for dependency planning).

Current evidence:

- saved tempo: 120 BPM;
- saved locators: none;
- `RECORD YOUTUBE` clip: 0–1760 beats, stereo 44.1 kHz/24-bit source,
  approximately 880 seconds;
- `10-Audio` clip: 0–1752 beats, mono 44.1 kHz/24-bit source,
  approximately 876 seconds;
- shorter mono takes exist under `11-Audio`;
- current sample inventory: 13 files, including 7 non-empty WAV files and 6
  Ableton analysis sidecars; no zero-byte WAV remains in the saved project.

During the first filesystem observation while Live was active, three zero-byte
recording placeholders briefly existed and then disappeared. They are not part
of the current fixture. This is concrete evidence that polling only the saved
project cannot preserve transient recording lifecycle events.

All `RECORD YOUTUBE` files are classified
`metadata-only-do-not-copy-or-export`. The inspector records file metadata but
does not copy, decode, transcode, mix, or export them.

## Requires a running M4L device during future recording

A saved `.als` cannot reconstruct events that were never persisted. The live
device is required for:

- exact transport start/stop edges during the performance;
- seek/jump events and their order;
- tempo changes as they occur, before a save;
- track arm/mute state changes over time;
- passive session boundaries and manual verse/block taps;
- append-only event checkpoints while recording continues;
- distinguishing raw observations from later derived candidates.

## Requires later analysis, not the live metadata loop

Neither saved XML nor LiveAPI transport metadata can reliably infer:

- beat changes when Live tempo does not change;
- YouTube ads;
- musical key changes;
- vocal activity/verse boundaries;
- transcription or quality rating.

Those belong in a separate post-capture analysis adapter. It may create
derived blocks, verse candidates, and transcript segments, but must never
rewrite the raw event log or source Ableton project.

## Commands

Read the current layout without writing:

```bash
npm run inspect:actual-session
```

Regenerate the isolated metadata fixture:

```bash
npm run fixture:actual-session
```

The latter writes only `fixtures/untitled-project-layout.json` inside this
prototype folder.
