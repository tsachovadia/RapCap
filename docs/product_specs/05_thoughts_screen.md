# Thoughts Screen (Mode)

## 1. Concept
"Thoughts" is a low-friction capture mode designed for spontaneous ideas that don't necessarily fit a musical structure (beat/bar). It allows mixing voice recording with text typing.

## 2. Core Functionality
*   **Hybrid Input**:
    *   **Voice**: User speaks -> Real-time transcription appends to the text area.
    *   **Text**: User can manually type/edit the text area at any time.
*   **No Beat**: Unlike Freestyle mode, Thoughts mode creates an "Acapella" session by default (no beat context).
*   **Flow**:
    1.  User enters "Thoughts" mode.
    2.  Screen shows a large text area and a Mic button.
    3.  User can type immediately.
    4.  User can toggle Mic on/off to dictate.
    5.  "Save" creates a session of type `thoughts`.

## 3. Storage
*   Saved as a Session in `IndexedDB`.
*   Type: `thoughts`.
*   Content: stored in `metadata.lyrics` (or `notes`).
*   Audio: stored as `blob` (if recorded).
