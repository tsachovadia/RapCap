# Wordplay Dicta (חרוזית דיקטה) - Feature Overview

**URL**: [wordplay.dicta.org.il](https://wordplay.dicta.org.il)

## 1. Core Capabilities
Wordplay Dicta is not just a rhyme dictionary; it is a computational linguistics engine designed for Hebrew poetry and lyrics. It goes beyond simple phonetic matching to understand **meter, grammar, and semantics**.

### Main Search Modes
1.  **Rhymes (חרוזים)**
    *   Finds words that rhyme with your input.
    *   **Precision Levels**: "Full" (perfect rhymes) vs. "Half" (sounds alike).
    *   **Phonetic Flexibility**: Can ignore differences between letters that sound the same (e.g., Tet/Tav, Kof/Kuf).

2.  **Assonance (מצלול)**
    *   Finds words with matching **vowel patterns** (e.g., `A-E-A`) regardless of the consonants.
    *   *Why it matters for Rap*: Great for "slant rhymes" and creating a continuous flow without forcing exact rhymes.

3.  **Alliteration (אליטרציה)**
    *   Finds words that start with the same sounds or letters.
    *   *Usage*: Creating punchy, percussive opening lines or tongue-twisters.

4.  **Word Pattern (תבנית מילה)**
    *   Advanced mode allowing you to build a "template" with specific letters and vowels (e.g., `?ָ?ֵ?`).

## 2. The "Killer Feature": Meter & Weight (Mishkal)
The engine groups results by their **Grammatical Weight (Mishkal)**.
*   It doesn't just list words; it lists *groups* of words that share the same rhythm.
*   **Example**: If you search for "חָבֵר" (Kha-ver), it will group results like "נוֹצֵר" (No-tzer) and "יוֹצֵר" (Yo-tzer) together because they share the exact same stress pattern and syllable structure (X-X).

## 3. Biblical Integration (Tanakh Verse Finder)
This is unique to Dicta.
*   **"Rhymes from the Bible"**: A dedicated category that finds rhymes *specifically existing in the Tanakh*.
*   **Context**: It provides the actual verse snippet.
*   *Rap Application*: Incredible for sampling ancient text, adding depth/heritage to lyrics, or finding "high register" rhymes.

## 4. Advanced Filters
You can filter results to get exactly what fits your line:
*   **Syllable Count**: Slider to specifically ask for "3-syllable rhymes only".
*   **Part of Speech**: "Show me only *Verbs* that rhyme with this".
*   **Semantics (Thesaurus)**: (Beta) "Show me rhymes that are related to the concept of *Joy*".
*   **Gender/Number**: Match the grammar of your subject (e.g., only feminine plural).

## 5. Vocalization (Nikkud)
*   **Smart Disambiguation**: When you type a word (e.g., "ספר"), it asks you to choose the meaning: `סֵפֶר` (Book), `סַפָּר` (Barber), or `סָפַר` (Counted).
*   Ensures the rhyme is based on how the word is *actually pronounced*.

## 6. Performance
*   **Average Latency**: ~3.8 seconds for a full round-trip result.
*   **Recommendation**: Not instant real-time typing, but perfect for a "Generate Ideas" button.
