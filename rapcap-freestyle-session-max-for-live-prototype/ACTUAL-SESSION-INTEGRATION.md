# Actual session integration: 2026-07-26 Freestyle Session 01

## Source of truth

Read-only saved project:

```text
RapCap Sessions/
  sessions/
    2026-07-26_Freestyle-Session-01 Project/
      2026-07-26_Freestyle-Session-01.als
      Ableton Project Info/
      Samples/
        Recorded/
```

The saved set also references Scene 1 recordings in the sibling read-only
`Untitled Project/Samples/Recorded` directory. Exact absolute paths live in
`PROJECT-MEMORY.json`. The prototype must not modify, move, rename, delete,
normalize, collect, or export either project or any sample beneath them.

## Session View is the grouping model

One horizontal scene row is one freestyle session/take:

- track 9 (`RECORD YOUTUBE`) contains the beat/reference;
- tracks 10–12 contain matching vocals or additional takes;
- scene rows 1, 2, and 3 are the current review sessions;
- rows must never be concatenated into one inferred Arrangement timeline.

The saved ALS proves that track 9, track 10, and track 11 clips occupy scene
row 1 (`ClipSlot Id 0`). The saved file predates the complete row-2 and row-3
recordings, so those rows are paired from the user-authoritative row order plus
identical Ableton recording stamps and exactly matching durations. They should
be serialized by the next save or captured live before becoming self-contained
ALS evidence.

## Current scene result

| Scene row | Membership evidence | Reference/vocal alignment | Recorded beat | Bar 1 / Beat 1 candidate |
| --- | --- | --- | --- | --- |
| 1 | Saved ClipSlot row 1 | Start-to-start review model; exact launch offset absent | 95.2 BPM for first stable block | 00:30.83 |
| 2 | Same `163423` stamp and 60.414512 s duration | 0.000 s | 90.9 BPM after mixed opening | 00:29.89 |
| 3 | Same `165951` stamp and 54.685896 s duration | 0.000 s | 90.9 BPM | 00:01.17 |

The saved Live tempo is 120 BPM and all saved scene tempo fields are 120 BPM.
That is grid metadata, not proof of the recorded beat tempo. The musical values
above come from in-memory onset autocorrelation and four-beat phase scoring.
They are candidates until one short listening pass confirms the bar phase.

Open the presentation at
`analysis/2026-07-26-freestyle-session-01/index.html`; the same result is
machine-readable in `analysis.json`. Neither artifact includes audio.

## Safely extractable from saved files

- Ableton schema/creator metadata;
- track order, names, and Session View ClipSlot scene rows;
- saved clip names, start/end beats, and sample references;
- saved tempo, scene tempo, and locator metadata;
- WAV duration, channels, sample rate, bit depth, and byte size;
- paired recording stamps encoded by Ableton in filenames;
- derived onset/tempo/downbeat timestamps without persisting audio.

## Requires a running M4L device during future recording

- exact scene-fire and clip-record start/stop events;
- the order of launches, seeks, and jumps;
- track arm/mute state changes;
- live tempo changes and user beat/verse taps;
- subsecond offsets for independently recorded tracks 11 and 12;
- append-only checkpoints before the Live set is saved.

## Requires later review/analysis

- listening confirmation of each proposed Bar 1 / Beat 1;
- ad, intro, silence, beat-change, and key-change labels;
- vocal activity/verse boundaries;
- transcription, editing, and ratings.

Those remain derived annotations. They must never rewrite raw event logs or
source Ableton projects.

## Command

Inspect the current saved set without writing:

```bash
npm run inspect:actual-session
```
