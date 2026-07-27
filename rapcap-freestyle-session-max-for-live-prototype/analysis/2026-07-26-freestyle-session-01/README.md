# 2026-07-26 freestyle session analysis

Open `index.html` for the simple Hebrew scene-by-scene presentation.
`analysis.json` is the detailed machine-readable result.

The simple presentation includes:

- a direct link to the real Max for Live `.amxd` artifact;
- a local vocal player for each scene;
- draft word-level Hebrew transcription;
- clickable words that seek the matching local vocal recording;
- plain-language BPM and proposed downbeat summaries.

`transcript-draft.js` contains timestamps and draft text only. It does not
contain audio. Low-confidence words are shown with a dashed outline and should
be edited after listening.

The analysis is deliberately Session View-first:

- one horizontal scene row is one freestyle session/take;
- track 9 is the beat/reference;
- tracks 10–12 are candidate vocal/take tracks;
- rows are never concatenated into one Arrangement timeline.

The source Ableton set and WAV files were read in place. This folder contains
only metadata, derived timestamps, confidence labels, and presentation markup.
It contains no copied, decoded, transcoded, or exported reference audio.

The BPM values describe the recorded beat, not Live's saved 120 BPM grid:

| Scene | Saved membership | File-start alignment | Beat BPM | Bar 1 / Beat 1 |
| --- | --- | ---: | ---: | ---: |
| 1 | Confirmed in ALS row 1 | 0 s review model; verify launch timing | 95.2 | 00:30.83 |
| 2 | Paired files; not serialized in ALS | 0 s | 90.9 | 00:29.89 |
| 3 | Paired files; not serialized in ALS | 0 s | 90.9 | 00:01.17 |

All downbeats remain review candidates until a short listening confirmation.
