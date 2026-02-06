
import { getVocalization } from './dicta';
import { Syllabifier } from './phonetic/Syllabifier';

// --- Types ---

export interface PhoneticAnalysisResult {
    timestamp: number;
    lines: AnalyzedLine[];
    rhymeGroups: RhymeGroup[];
}

export interface AnalyzedLine {
    id: string; // generated or provided
    text: string;
    words: AnalyzedWord[];
}

export interface Syllable {
    text: string;      // The visual text of the syllable (e.g. "Sha")
    vowel: Vowel;      // The core vowel sound (e.g. "A")
    isStressed: boolean;
    startIndex: number; // Index in the word's string
    endIndex: number;
}

export interface AnalyzedWord {
    text: string;       // Original text
    clean: string;      // Clean text for keying
    vocalized: string;  // Full Nikkud version
    syllables: Syllable[];
    vowelSignature: string; // "A-O"
    anchorSignature: string; // Last syllable phonetic rep (e.g. "L-O-M")

    // Positioning
    startIndex: number;
    endIndex: number;
    lineId?: string;
}

export interface RhymeGroup {
    id: string;
    signature: string; // The common denominator
    words: {
        lineId: string;
        wordIndex: number;
        text: string;
        syllables?: string[];   // NEW
        phonemes?: string[];    // NEW (Vowels)
    }[];
    type: 'perfect' | 'slant' | 'multi' | 'anchor' | 'assonance';
    confidence: number;
    color?: string;
}

// --- Constants & Mappings ---

const CACHE_KEY = 'rapcap_phonetic_cache_v2'; // Bumped version

// Base Vowels
type Vowel = 'A' | 'E' | 'I' | 'O' | 'U' | '';

// Unicode Map for Nikkud -> Vowel
const NIKKUD_MAP: Record<string, Vowel> = {
    '\u05B8': 'A', // Qamats
    '\u05B7': 'A', // Patah
    '\u05B2': 'A', // Hataf Patah

    '\u05B5': 'E', // Tsere
    '\u05B6': 'E', // Segol
    '\u05B0': 'E', // Sheva (Often silent, but treated as E if vocal)

    '\u05B4': 'I', // Hiriq

    '\u05B9': 'O', // Holam
    '\u05BA': 'O', // Holam Haser
    '\u05C1': '',  // Shin Dot
    '\u05C2': '',  // Sin Dot

    '\u05BB': 'U', // Qubuts
    '\u05BC': '', // Dagesh (handled specially)
};

interface CacheEntry {
    vocalized: string;
    syllables: Syllable[];
    vowelSignature: string;
    anchorSignature: string;
}

// --- Engine Class ---

class PhoneticEngine {
    private wordCache: Map<string, CacheEntry>;

    constructor() {
        this.wordCache = this.loadCache();
    }

    private loadCache(): Map<string, CacheEntry> {
        try {
            const stored = localStorage.getItem(CACHE_KEY);
            return stored ? new Map(JSON.parse(stored)) : new Map();
        } catch (e) {
            console.warn("Failed to load phonetic cache", e);
            return new Map();
        }
    }

    private saveCache() {
        try {
            // Convert Map to array for JSON serialization
            const array = Array.from(this.wordCache.entries());
            localStorage.setItem(CACHE_KEY, JSON.stringify(array));
        } catch (e) {
            console.warn("Failed to save phonetic cache", e);
        }
    }

    /**
     * Main Entry Point
     */
    async analyze(text: string): Promise<PhoneticAnalysisResult> {
        const lines = text.split('\n').map((line, idx) => ({
            id: `line-${idx}`,
            text: line,
            words: this.tokenize(line, `line-${idx}`)
        }));

        // 1. Identify unknown words
        const allWords = lines.flatMap(l => l.words);
        const uniqueWordsToFetch = Array.from(new Set(
            allWords
                .filter(w => !this.wordCache.has(w.clean))
                .map(w => w.clean)
        ));

        // 2. Batch Fetch & Process
        if (uniqueWordsToFetch.length > 0) {
            await this.fetchAndCacheWords(uniqueWordsToFetch);
        }

        // 3. Hydrate Words from Cache
        allWords.forEach(w => {
            const entry = this.wordCache.get(w.clean);
            if (entry) {
                w.vocalized = entry.vocalized;
                w.syllables = entry.syllables;
                w.vowelSignature = entry.vowelSignature;
                w.anchorSignature = entry.anchorSignature;
            } else {
                // Fallback for failed fetches
                w.vocalized = w.clean;
                w.syllables = [];
                w.vowelSignature = '';
                w.anchorSignature = '';
            }
        });

        // 4. Find Groups (The 3-Layer Logic)
        const groups = this.findRhymeGroups(allWords);

        return {
            timestamp: Date.now(),
            lines,
            rhymeGroups: groups
        };
    }

    /**
     * Tokenizes a line into AnalyzedWords (Shells)
     */
    private tokenize(line: string, lineId: string): AnalyzedWord[] {
        const words: AnalyzedWord[] = [];
        const regex = /[\u0590-\u05FF]+/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            words.push({
                text: match[0],
                clean: match[0],
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineId: lineId,
                vocalized: '',
                syllables: [],
                vowelSignature: '',
                anchorSignature: ''
            });
        }
        return words;
    }

    /**
     * Fetches, Analyzes, and Caches words
     */
    private async fetchAndCacheWords(words: string[]) {
        const BATCH_SIZE = 5;
        for (let i = 0; i < words.length; i += BATCH_SIZE) {
            const batch = words.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (word) => {
                try {
                    const results = await getVocalization(word);
                    const bestOption = results[0] || word;

                    // Deep Analysis of the single word
                    const analysis = this.analyzeSingleWord(bestOption);

                    this.wordCache.set(word, {
                        vocalized: bestOption,
                        ...analysis
                    });
                } catch (e) {
                    console.error(`Failed to vocalize ${word}`, e);
                    // Cache empty to avoid retry loops implies "unknown"
                    this.wordCache.set(word, {
                        vocalized: word,
                        syllables: [],
                        vowelSignature: '',
                        anchorSignature: ''
                    });
                }
            }));
        }
        this.saveCache();
    }

    /**
     * Helper: Analyzes a single vocalized word to extract signatures
     */
    private analyzeSingleWord(vocalized: string): { syllables: Syllable[], vowelSignature: string, anchorSignature: string } {
        const syllables = this.syllabify(vocalized);

        // Vowel Signature (e.g. "A-O")
        const vowels = syllables
            .map(s => s.vowel)
            .filter(v => v !== '')
            .join('-');

        // Anchor Signature (Last Syllable Phonetic)
        // This is a naive approximation: we take the last vowels + surrounding consonants if possible.
        // Ideally, we'd transcribe to IPA, but for now, we use the last syllable's vowel + basic sound index.
        const lastSyllable = syllables[syllables.length - 1];
        const anchorSignature = lastSyllable ? lastSyllable.vowel : '';
        // Note: For "Elohim" vs "Milim", we need the "im" sound. 
        // Our current 'syllabify' extracts the vowel. We might need the 'ending consonant'. 
        // Let's refine 'syllabify' later to capture coda.

        return { syllables, vowelSignature: vowels, anchorSignature };
    }

    /**
     * Naive Hebrew Syllabification
     * Splits by vowels/Nikkud logic.
     */
    private syllabify(text: string): Syllable[] {
        const rawSyllables = Syllabifier.syllabify(text);
        let currentIndex = 0;

        return rawSyllables.map((text, idx) => {
            const start = currentIndex;
            currentIndex += text.length;

            // Extract dominant vowel
            let vowel: Vowel = '';
            for (const char of text) {
                if (NIKKUD_MAP[char]) {
                    vowel = NIKKUD_MAP[char];
                    break;
                }
            }

            return {
                text,
                vowel,
                isStressed: idx === rawSyllables.length - 1, // Naive default: Ultimate stress
                startIndex: start,
                endIndex: currentIndex
            };
        });
    }


    /**
     * The 3-Layer Clustering Logic
     */
    private findRhymeGroups(words: AnalyzedWord[]): RhymeGroup[] {
        const groups: Map<string, RhymeGroup> = new Map();

        // Helper to add word to group
        const addToGroup = (key: string, type: RhymeGroup['type'], word: AnalyzedWord, confidence: number) => {
            if (!groups.has(key)) {
                groups.set(key, {
                    id: `group-${key}`,
                    signature: key,
                    words: [],
                    type,
                    confidence
                });
            }
            const g = groups.get(key)!;
            // Dedup
            if (!g.words.some(w => w.lineId === word.lineId && w.wordIndex === word.startIndex)) {
                g.words.push({
                    lineId: word.lineId || '',
                    wordIndex: word.startIndex,
                    text: word.text,
                    syllables: word.syllables.map(s => s.text), // Map Syllable objects to strings
                    phonemes: word.syllables.map(s => s.vowel)  // Map Vowels as phonemes
                });
            }
        };

        words.forEach(word => {
            if (!word.vowelSignature) return;

            // Layer 1: Multi-Syllabic (Last 2+ Vowels match)
            // e.g. "A-A-E" -> matches "X-A-A-E"
            const vowels = word.vowelSignature.split('-');
            if (vowels.length >= 2) {
                const signature = vowels.slice(-2).join('-');
                // We use this as a 'Multi' key
                addToGroup(`Multi:${signature}`, 'multi', word, 0.95);
            }

            // Layer 2: Anchor (Last Vowel + Specific Checking)
            // Ideally should check Consonant too. For now, strict last vowel.
            if (vowels.length >= 1) {
                const lastVowel = vowels[vowels.length - 1];
                addToGroup(`Assonance:${lastVowel}`, 'assonance', word, 0.6);
            }

            // Layer 3: Anchor Rhyme (e.g. "im")
            // This requires capturing the final sound in 'syllabify'.
            // If the word ends with 'Mem' (Mel) or 'Nun' (N), it's a strong anchor.
            // Check original text for final letters?
            const lastChar = word.text.trim().slice(-1);
            if (['ם', 'ן', 'ך'].includes(lastChar)) {
                // Suffix Rhyme
                const lastVowel = vowels[vowels.length - 1] || '';
                const suffixKey = `${lastVowel}-${lastChar}`; // e.g. "I-ם"
                addToGroup(`Suffix:${suffixKey}`, 'anchor', word, 0.85);
            }
        });

        // Filtering: Remove singleton groups and select Best fit
        // A word can be in multiple groups tentatively. We need to pick the "Best" one?
        // Or present all? Usually we want the Strongest match.

        // Flatten to array
        const allGroups = Array.from(groups.values()).filter(g => g.words.length >= 2);

        return allGroups;
    }
}

export const phoneticEngine = new PhoneticEngine();
