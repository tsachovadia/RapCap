/**
 * Dicta API Service
 * Wraps calls to Dicta Wordplay API endpoints.
 */

import type { DictaApiRequest, DictaApiResponse, DictaCacheEntry, RhymeGroup } from '../types/dicta';

const DICTA_BASE_URL = 'https://charuzit-4-0.loadbalancer.dicta.org.il';

/**
 * Get vocalization options for a raw word.
 * @param rawWord - Unvocalized Hebrew word (e.g., "חבר")
 * @returns Array of vocalized options (e.g., ["חָבֵר", "חֶבֶר"])
 */
export async function getVocalizations(rawWord: string): Promise<string[]> {
    const response = await fetch(`${DICTA_BASE_URL}/tipsoundplay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ w: rawWord }),
    });

    if (!response.ok) {
        throw new Error(`Dicta vocalization failed: ${response.status}`);
    }

    return response.json();
}

/**
 * Search for rhymes using a vocalized word.
 * Filters out Biblical results (Rhyme_Tanakh).
 * 
 * @param vocalizedWord - Word with nikud (e.g., "חָבֵר")
 * @param options - Optional search configuration
 * @returns Filtered rhyme groups (Modern only)
 */
export async function searchRhymes(
    vocalizedWord: string,
    options: Partial<DictaApiRequest> = {}
): Promise<RhymeGroup[]> {
    const payload: DictaApiRequest = {
        soundplay_keyword: vocalizedWord,
        rhyme_mode: options.rhyme_mode ?? 'half',
        alit_num_of_lets: options.alit_num_of_lets ?? 2,
        model: options.model ?? 'Rhyme',
        soundplay_settings: {
            allowletswap: true,
            allowvocswap: true,
            ...options.soundplay_settings,
        },
        semantic_keywords: options.semantic_keywords ?? [],
        semantic_models: options.semantic_models ?? 'both',
        tavnit_search: options.tavnit_search ?? [],
        morph_filter: {
            pos: 0,
            person: 0,
            status: 0,
            number: 0,
            gender: 0,
            tense: 0,
            suffix_person: 0,
            suffix_number: 0,
            suffix_gender: 0,
            ...options.morph_filter,
        },
        return_settings: {
            min_syl: 1,
            max_syl: 7,
            accreturnsettings: 'matchinput',
            returnpropernames: false,
            ignoreLoazi: false,
            baseOnly: false,
            ...options.return_settings,
        },
    };

    const response = await fetch(`${DICTA_BASE_URL}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error(`Dicta API failed: ${response.status}`);
    }

    const data: DictaApiResponse = await response.json();

    // Filter out Biblical results (Rhyme_Tanakh) and transform
    const modernResults = data.results
        .filter(group => group.mode === 'Rhyme')
        .map(group => ({
            mode: 'Rhyme' as const,
            results: group.results.map(r => ({
                lex: r.lex,
                forms: r.forms,
                hasMoreForms: r.has_more_forms,
            })),
        }));

    return modernResults;
}

/**
 * Create a complete DictaCacheEntry from a word search.
 */
export async function fetchWordData(rawWord: string, vocalizedWord: string): Promise<DictaCacheEntry> {
    const [vocalizations, rhymeResults] = await Promise.all([
        getVocalizations(rawWord),
        searchRhymes(vocalizedWord),
    ]);

    return {
        vocalizedWord,
        rawWord,
        vocalizations,
        rhymeResults,
        hitCount: 1,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
    };
}
