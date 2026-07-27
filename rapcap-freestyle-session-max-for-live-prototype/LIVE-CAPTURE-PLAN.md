# Live capture plan

## Outcome

The device stays on the microphone track, passes audio through unchanged, and
observes Live while the artist works. Playback starts a raw capture session;
playback stop finalizes it in memory. No import, Save command, or recording
interruption is required.

## Implemented foundation

The Max JavaScript companion runs a 250 ms `Task`:

1. Detect `is_playing` rising edge → open a session at the current song beat.
2. Snapshot track names/arm/mute state and cue points.
3. Log append-only raw events for transport start/stop, tempo change, seek, and
   track-state change.
4. Detect Live tempo changes ≥ 0.1 BPM.
5. Close/open beat blocks at tempo boundaries.
6. Create a separate `verseCandidate` for each tempo-stable span.
7. Publish the full raw manifest to a Max `Dict` after every meaningful event.
8. Attempt an NDJSON append-only checkpoint in the configured project-owned
   `RapCap Sessions/inbox` directory.
9. Keep analysis/transcription status explicitly `pending` and never mutate raw
   capture records.

Manual **VERSE IN/OUT** and **BLOCK IN/OUT** remain available as zero-stop
corrections while the performance continues.

## Why candidates are separate from verses

LiveAPI exposes transport and track state, not semantic verse boundaries.
A tempo-stable span is evidence for a potential verse region, not proof of a
verse. The device therefore records it as `verseCandidates[]`; later vocal
activity/transcription analysis can promote or dismiss it without rewriting
the raw event log.

## Next increments

1. Validate `is_playing`, `current_song_time`, track arm state, and cue-point
   access inside Live 12.4.2 / Max 9.1.4.
2. Add an explicit mic-track selector and reference-track selector.
3. Replace best-effort Max `File` checkpointing with a durable persistence
   adapter while keeping the project-owned destination in `PROJECT-MEMORY.json`.
4. Sample Live's tempo map so beat→millisecond conversion remains exact under
   automation.
5. Add a passive vocal-activity envelope observer. Keep it local and store only
   timestamps/features; do not copy audio.
6. Run beat/ad/BPM/key analysis after capture in a separate worker. Never
   overwrite `rawCapture.events`, raw blocks, or the Ableton source set.
7. Promote reviewed candidates to editable/transcribed verses in the browser
   companion or a wider Max review window.

## Known limits of the safe foundation

- A YouTube/beat change with no corresponding Live tempo change is invisible
  to LiveAPI metadata. Audio analysis is required later.
- Key and ads are not inferred by the passive loop.
- Approximate milliseconds use the tempo at capture start; beat positions are
  the authoritative raw timestamps.
- The NDJSON checkpoint is best-effort and depends on the configured inbox
  being writable. The in-memory Max `Dict` remains available while the device
  lives, but crash-grade persistence needs the next adapter.
- The device does not record the mic and does not inspect the beat-reference
  signal. Ableton remains the audio recorder/source of truth.
