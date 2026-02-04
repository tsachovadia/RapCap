
import { getVocalization } from './dicta';

// --- Types ---

export interface PhoneticAnalysisResult {
    timestamp: number;
    lines: AnalyzedLine[];
    rhymeGroups: PhoneticRhymeGroup[];
}

export interface AnalyzedLine {
    id: string; // generated or provided
    text: string;
    words: AnalyzedWord[];
}

export interface AnalyzedWord {
    text: string;
    clean: string; // no punctuation
    vocalized?: string; // from Dicta
    signature?: string; // "A-O"
    startIndex: number;
    endIndex: number;
    lineId?: string;
}

export interface PhoneticRhymeGroup {
    id: string;
    signature: string; // "A-O"
    words: { lineId: string; wordIndex: number; text: string }[];
    type: 'perfect' | 'slant' | 'assonance' | 'none';
    color?: string; // Suggested UI color
}

// --- Constants & Mappings ---

const CACHE_KEY = 'rapcap_phonetic_cache_v1';

// Base Vowels
type Vowel = 'A' | 'E' | 'I' | 'O' | 'U' | '';

// Unicode Map for Nikkud -> Vowel
// Reference: https://en.wikipedia.org/wiki/Unicode_phonemes_for_Hebrew
const NIKKUD_MAP: Record<string, Vowel> = {
    '\u05B8': 'A', // Qamats
    '\u05B7': 'A', // Patah
    '\u05B2': 'A', // Hataf Patah

    '\u05B5': 'E', // Tsere
    '\u05B6': 'E', // Segol
    '\u05B0': 'E', // Sheva (Treating as Na/E for simplicity initially, or ignorable?) -> User said E

    '\u05B4': 'I', // Hiriq

    '\u05B9': 'O', // Holam
    '\u05BA': 'O', // Holam Haser for Vav
    '\u05C1': '',  // Shin Dot (Ignore)
    '\u05C2': '',  // Sin Dot (Ignore)

    '\u05BB': 'U', // Qubuts
    // Shuruq is handled via Vav + Dagesh logic usually, but sometimes represented as distinct in vocalized strings
};

// --- Engine Class ---

class PhoneticEngine {
    private wordCache: Map<string, string>; // word -> signature

    constructor() {
        this.wordCache = this.loadCache();
    }

    private loadCache(): Map<string, string> {
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
            localStorage.setItem(CACHE_KEY, JSON.stringify(Array.from(this.wordCache.entries())));
        } catch (e) {
            console.warn("Failed to save phonetic cache", e);
        }
    }

    /**
     * Main Entry Point: Analyzes raw text for rhymes.
     * Uses caching to minimize API calls.
     */
    async analyze(text: string): Promise<PhoneticAnalysisResult> {
        const lines = text.split('\n').map((line, idx) => ({
            id: `line-${idx}`,
            text: line,
            words: this.tokenize(line, `line-${idx}`)
        }));

        // 1. Identify unknown words (missing from cache)
        const allWords = lines.flatMap(l => l.words);
        const uniqueWordsToFetch = Array.from(new Set(
            allWords
                .filter(w => !this.wordCache.has(w.clean))
                .map(w => w.clean)
        ));

        // 2. Batch Fetch Vocalization
        if (uniqueWordsToFetch.length > 0) {
            await this.fetchAndCacheWords(uniqueWordsToFetch);
        }

        // 3. Apply Signatures
        allWords.forEach(w => {
            w.signature = this.wordCache.get(w.clean) || '';
        });

        // 4. Find Groups
        const groups = this.findRhymeGroups(allWords);

        return {
            timestamp: Date.now(),
            lines,
            rhymeGroups: groups
        };
    }

    /**
     * Tokenizes a line into AnalyzedWords
     */
    private tokenize(line: string, lineId: string): AnalyzedWord[] {
        const words: AnalyzedWord[] = [];
        // Regex to capture Hebrew words, ignoring punctuation
        const regex = /[\u0590-\u05FF]+/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            words.push({
                text: match[0],
                clean: match[0], // Already clean due to regex
                startIndex: match.index,
                endIndex: match.index + match[0].length,
                lineId: lineId // Context for grouping
            } as any); // Type assertion needed or update interface
        }
        return words;
    }

    /**
     * Fetches vocalization for words and computes their signature
     */
    private async fetchAndCacheWords(words: string[]) {
        // Limit concurrency
        const BATCH_SIZE = 5;
        for (let i = 0; i < words.length; i += BATCH_SIZE) {
            const batch = words.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (word) => {
                try {
                    // Call Dicta
                    const results = await getVocalization(word);
                    // Take the first option (usually most common) or the one matching "word" structure best
                    const bestOption = results[0] || word;

                    // Compute Signature
                    const signature = this.extractPhoneticSignature(bestOption);

                    // Cache it
                    this.wordCache.set(word, signature);
                } catch (e) {
                    console.error(`Failed to vocalize ${word}`, e);
                    this.wordCache.set(word, ""); // Mark as failed to avoid refetching immediately
                }
            }));
        }
        this.saveCache();
    }

    /**
     * The Magic: Maps vocalized Hebrew to Vowel Signature
     * "שָׁלוֹם" -> "A-O"
     */
    public extractPhoneticSignature(vocalizedWord: string): string {
        const vowels: Vowel[] = [];

        for (let i = 0; i < vocalizedWord.length; i++) {
            const char = vocalizedWord[i];

            // Check for straight Nikkud map
            if (NIKKUD_MAP[char]) {
                vowels.push(NIKKUD_MAP[char]);
                continue;
            }

            // Special Case: Vav with Shuruq (\u05BC inside \u05D5)? 
            // Often represented as \u05D5\u05BC in Unicode normalized forms.
            if (char === '\u05D5') { // Vav
                // Look ahead for Dagesh/Mapiq \u05BC
                if (vocalizedWord[i + 1] === '\u05BC') {
                    vowels.push('U');
                    i++; // Skip the dagesh
                }
                // Holam Haser on Vav is sometimes implicit or specific char, tricky.
                // Assuming standard Nikkud for now.
            }
        }

        return vowels.join('-');
    }

    /**
     * Clustering Algorithm
     * Groups words by shared signatures, focusing on End Rhymes and loose Internal Rhymes
     */
    private findRhymeGroups(words: AnalyzedWord[]): PhoneticRhymeGroup[] {
        const groups: Map<string, PhoneticRhymeGroup> = new Map();

        // 1. Group by exact signature
        words.forEach((word) => {
            if (!word.signature || word.signature.length < 3) return; // Need at least "X-Y" (len 3)

            if (!groups.has(word.signature)) {
                groups.set(word.signature, {
                    id: `group-${word.signature}`,
                    signature: word.signature,
                    words: [],
                    type: 'assonance'
                });
            }

            const group = groups.get(word.signature);
            if (group && word.lineId) {
                group.words.push({
                    lineId: word.lineId,
                    wordIndex: word.startIndex, // Using start index as ID for now
                    text: word.text
                });
            }
        });

        // Filter out single-word "groups"
        return Array.from(groups.values()).filter(g => g.words.length >= 2);
    }
}

export const phoneticEngine = new PhoneticEngine();
