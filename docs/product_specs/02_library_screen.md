# Library Screen & Navigation

## 1. Core Structure
The Library screen is the central hub for all user content.
With the new navigation structure, it is accessible via the "Library" tab in the bottom navigation.

## 2. Filtering & Tabs
To organize the different types of creative output, the library uses a tabbed filter system:

*   **All**: Shows everything chronologically.
*   **Freestyle**: Recorded freestyle sessions (audio + optional beat).
*   **Writing (Verses)**: Written verses (text).
*   **Thoughts**: Audio/Text captures from the "Thoughts" mode.

## 3. List Item Design
*   **Session Card**:
    *   **Icon**: Differentiates the type (Mic for Freestyle, Pen for Write, Brain for Thoughts).
    *   **Title**: User defined or Auto-generated (e.g., "Freestyle 10:23").
    *   **Metadata**: Date, Duration, and a snippet of lyrics/text if available.
    *   **Quick Actions**: Play, Delete, Share.

## 4. MVP Decisions (V1)
*   **Search**: textual search across Titles and Lyric content.
*   **Multi-select**: Bulk delete capabilities.
*   **Playback**: Clicking a session navigates to the specific Detail/Player view.
