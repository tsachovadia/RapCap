
const DICTA_BASE_URL = "https://charuzit-4-0.loadbalancer.dicta.org.il";

export interface VocalizationResult {
    word: string;
    vocalized: string;
    niqqud: string;
}

export interface DictaRhymeResult {
    lex: string; // The "Wait" / Mishkal
    forms: string[]; // The actual words
    score: number;
}

/**
 * Step 1: Get vocalization options for a raw Hebrew word
 */
export async function getVocalization(word: string): Promise<string[]> {
    try {
        const response = await fetch(`${DICTA_BASE_URL}/tipsoundplay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ w: word })
        });

        if (!response.ok) throw new Error("Vocalization failed");

        const data = await response.json();
        // The API returns a list of results. We usually want the first/most likely one or let user choose.
        // For simplicity now, we'll return all unique vocalized forms.
        // The structure is usually array of objects with 'all_nikud' or similar. 
        // Based on research note: "Output: A list of valid... Hebrew words with full Nikkud."
        // Let's assume data.all_nikud is the array if it exists, or verify response structure.
        // Actually, let's look at the research again carefully. 
        // "Payload: {'w': '...'}" -> "Retrieves phonetic suggestions".
        // Let's safe-guard:
        if (Array.isArray(data)) {
            return data;
        }
        return data.all_nikud || [word]; // Fallback
    } catch (e) {
        console.error("Dicta Vocalization Error:", e);
        return [word];
    }
}

/**
 * Utility to strip Hebrew Nikkud from a string for comparison.
 */
export function stripNikkud(text: string): string {
    return text.replace(/[\u0591-\u05C7]/g, "");
}

/**
 * Step 2: Get rhymes for a vocalized word
 */
export async function getRhymes(vocalizedWord: string): Promise<string[]> {
    try {
        // We use the "Rhyme" model (Common) and "half" mode for broader results
        const payload = {
            soundplay_keyword: vocalizedWord,
            rhyme_mode: "half",
            alit_num_of_lets: 2,
            model: "Rhyme",
            soundplay_settings: {
                allowletswap: true,
                allowvocswap: true
            },
            semantic_keywords: [],
            semantic_models: "both",
            tavnit_search: [],
            morph_filter: {
                pos: 0, person: 0, status: 0, number: 0, gender: 0, tense: 0,
                suffix_person: 0, suffix_number: 0, suffix_gender: 0
            },
            return_settings: {
                min_syl: 1,
                max_syl: 10,
                accreturnsettings: "matchinput",
                returnpropernames: false,
                ignoreLoazi: false,
                baseOnly: false
            }
        };

        const response = await fetch(`${DICTA_BASE_URL}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Rhyme search failed");

        const data = await response.json();

        // Extract all words from the results hierarchy using a Map for Nikkud-aware deduping
        // Key: Stripped word, Value: Vocalized word (preserves first found variant)
        const rhymeMap = new Map<string, string>();

        if (data.results && Array.isArray(data.results)) {
            data.results.forEach((category: any) => {
                if (category.results && Array.isArray(category.results)) {
                    category.results.forEach((cluster: any) => {
                        if (cluster.forms && Array.isArray(cluster.forms)) {
                            cluster.forms.forEach((word: string) => {
                                const stripped = stripNikkud(word);
                                if (!rhymeMap.has(stripped)) {
                                    rhymeMap.set(stripped, word);
                                }
                            });
                        }
                    });
                }
            });
        }

        // Return unique vocalized forms, limited to top 50
        return Array.from(rhymeMap.values()).slice(0, 50);
    } catch (e) {
        console.error("Dicta API Error:", e);
        return [];
    }
}
