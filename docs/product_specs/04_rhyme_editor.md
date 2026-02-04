# Rhyme Editor / Rhyme Pad

## Overview
The Rhyme Editor is a dedicated space for writing lyrics, organizing rhyme groups, and building mnemonic stories. It is designed to act as a "Rhyme Pad" where artists can prepare their material before hitting the studio.

## Core Features
*   **Word Bank**: A list of rhyming words (the "Deck") that serves as the foundation for the session.
*   **Dicta Integration**: Built-in rhyme finder powered by Dicta API to expand the word bank.
*   **Mnemonic Story**: A section to generate or write a story involving the words, helping with memorization.
*   **Bars / Lyrics Area**: A text editor for writing the actual verses.

## Rhyme Library View
The entry point for managing rhyme groups.
*   **Dynamic Search**: A central search bar that filters groups and offers to create new ones if they don't exist.
*   **Grid Layout**: Rhyme groups are displayed in a dense, 2-column grid for efficient scanning.
*   **Quick Actions**: Start a new writing session directly from the library.

## Writing Session (Zen Mode)
A dedicated, distraction-free environment for writing.
*   **Standalone Page**: Located at `/rhyme-library/session`, providing a full-page immersive experience.
*   **Auto-Save**: Sessions are automatically saved to prevent data list.
*   **Horizontal Decks**: Displays multiple rhyme groups side-by-side in a horizontally scrollable view. This allows the user to bring in unlimited context (e.g., "Battle Rhymes", "Multies", "Fillers").
*   **Auto-Highlighting**: As the user types in the lyrics area, words that appear in any of the visible rhyme decks are automatically highlighted in real-time. This provides immediate visual feedback on rhyme usage.
*   **Deck Management**: Users can dynamically add or remove rhyme decks from the view without leaving Zen Mode.
