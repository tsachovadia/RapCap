
import { getVocalization, stripNikkud } from './dicta';
import { Syllabifier } from './phonetic/Syllabifier';
import { db } from '../db/db';
import type { HebrewVowel, VerseSyllable, VerseWord } from '../db/db';

// Nikkud → Vowel mapping (from PhoneticEngine.ts)
const NIKKUD_MAP: Record<string, HebrewVowel> = {
    '\u05B8': 'A', // Qamats
    '\u05B7': 'A', // Patah
    '\u05B2': 'A', // Hataf Patah
    '\u05B3': 'O', // Hataf Qamats (usually O)
    '\u05B5': 'E', // Tsere
    '\u05B6': 'E', // Segol
    '\u05B1': 'E', // Hataf Segol
    '\u05B0': 'E', // Sheva (vocal)
    '\u05B4': 'I', // Hiriq
    '\u05B9': 'O', // Holam
    '\u05BA': 'O', // Holam Haser
    '\u05BB': 'U', // Qubuts
    '\u05BC': '',   // Dagesh (not a vowel)
    '\u05C1': '',   // Shin dot
    '\u05C2': '',   // Sin dot
};

const HEBREW_CONSONANT_RANGE = /[\u05D0-\u05EA]/;
const HAS_HEBREW = /[\u05D0-\u05EA]/;

/**
 * Extract vowel, onset, and coda from a vocalized syllable string.
 */
export function extractSyllableDetails(syllableText: string): VerseSyllable {
    let vowel: HebrewVowel = '';
    let onset = '';
    let coda = '';
    let foundVowel = false;

    for (const char of syllableText) {
        const mappedVowel = NIKKUD_MAP[char];
        if (mappedVowel !== undefined) {
            if (mappedVowel !== '') {
                vowel = mappedVowel;
                foundVowel = true;
            }
            // Skip nikkud marks in onset/coda
            continue;
        }

        if (HEBREW_CONSONANT_RANGE.test(char)) {
            if (!foundVowel) {
                onset += char;
            } else {
                coda += char;
            }
        }
    }

    return { text: syllableText, vowel, onset, coda };
}

/**
 * Get vowel signature for a VerseWord (e.g., "A-O" for שָׁלוֹם)
 */
export function getVowelSignature(word: VerseWord): string {
    return word.syllables
        .map(s => s.vowel)
        .filter(v => v !== '')
        .join('-');
}

/**
 * Get cached vocalization or fetch from Dicta API
 */
async function getCachedOrFetchVocalization(word: string): Promise<string> {
    const clean = stripNikkud(word).trim();
    if (!clean) return word;

    // Check cache
    const cached = await db.vocalizationCache.get(clean);
    if (cached) return cached.vocalized;

    // Fetch from Dicta
    try {
        const results = await getVocalization(clean);
        const vocalized = results[0] || clean;

        // Cache it
        await db.vocalizationCache.put({ word: clean, vocalized });
        return vocalized;
    } catch (e) {
        console.error(`Failed to vocalize "${clean}"`, e);
        return clean;
    }
}

/**
 * Main API: Takes raw Hebrew text, returns fully analyzed VerseWord array.
 * Each word is vocalized via Dicta (cached) and syllabified.
 */
export async function vocalizeAndSyllabify(text: string): Promise<VerseWord[]> {
    const rawWords = text.trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    const results: VerseWord[] = [];

    // Process in batches of 5 to avoid overloading Dicta
    const BATCH_SIZE = 5;
    for (let i = 0; i < rawWords.length; i += BATCH_SIZE) {
        const batch = rawWords.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batch.map(async (rawWord) => {
                const clean = stripNikkud(rawWord).trim();
                if (!HAS_HEBREW.test(clean)) {
                    return { text: clean, vocalized: clean, syllables: [] } satisfies VerseWord;
                }
                const vocalized = await getCachedOrFetchVocalization(clean);

                // Syllabify the vocalized form
                const rawSyllables = Syllabifier.syllabify(vocalized);
                const syllables = rawSyllables.map(s => extractSyllableDetails(s));

                return {
                    text: clean,
                    vocalized,
                    syllables,
                } satisfies VerseWord;
            })
        );
        results.push(...batchResults);
    }

    return results;
}
