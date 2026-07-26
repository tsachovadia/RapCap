# Max for Live bridge scaffold

This is a message-contract prototype, not a packaged `.amxd`.

Create a Max for Live MIDI device with:

- one `[js rapcap_session_bridge.js]` object;
- buttons/messages connected to inlet 0;
- `[dict.view]` or `[dict.serialize]` connected to outlet 0;
- a status text connected to outlet 1.

Suggested messages:

```text
scan
session_id rc-2026-07-26-001
youtube 9Q2YHgVqpsQ https://www.youtube.com/watch?v=9Q2YHgVqpsQ
youtube_title Night_Drive
block beat 0.0 198.0 Intro 86 F#m
block ad 482.0 527.0 YouTube_ad 0 unknown
verse 224.0 291.0 he
rate 0 4 keep
publish
write_manifest
```

`write_manifest` opens Max's save dialog and writes JSON metadata. It never
exports clip/audio data. `scan` reads only Live object metadata (track names,
set tempo, and locators).

The device should be tested in the target Ableton Live/Max versions before an
`.amxd` is committed. Live API shape and permissions can vary by version.

