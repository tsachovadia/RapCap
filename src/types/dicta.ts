// Dicta API Types for Rhyme Cache

/**
 * A cached entry from the Dicta Wordplay API.
 * Stored both locally (IndexedDB) and globally (Supabase).
 */
export interface DictaCacheEntry {
    /** Vocalized word with nikud (PRIMARY KEY), e.g., "חָבֵר" */
    vocalizedWord: string;

    /** Original unvocalized input, e.g., "חבר" */
    rawWord: string;

    /** All possible vocalizations from /tipsoundplay */
    vocalizations: string[];

    /** Grouped rhyme results by Mishkal (grammatical weight) */
    rhymeResults: RhymeGroup[];

    /** Number of times this word was looked up */
    hitCount: number;

    /** First time this word was cached */
    createdAt: number;

    /** Last time this word was accessed */
    lastAccessedAt: number;
}

/**
 * A group of rhymes sharing the same Mishkal (grammatical weight/pattern).
 */
export interface RhymeGroup {
    /** Mode: "Rhyme" (Modern) - we filter out "Rhyme_Tanakh" */
    mode: 'Rhyme';

    /** Results grouped by lexical weight */
    results: {
        /** Grammatical weight tag, e.g., "חור_הפעיל" */
        lex: string;

        /** Words matching this weight */
        forms: string[];

        /** Whether there are more forms available */
        hasMoreForms: boolean;
    }[];
}

/**
 * Dicta API request payload for /api endpoint.
 */
export interface DictaApiRequest {
    soundplay_keyword: string;
    rhyme_mode: 'half' | 'full';
    alit_num_of_lets: number;
    model: 'Rhyme' | 'Assonance' | 'Alliteration';
    soundplay_settings: {
        allowletswap: boolean;
        allowvocswap: boolean;
    };
    semantic_keywords: string[];
    semantic_models: string;
    tavnit_search: string[];
    morph_filter: {
        pos: number;
        person: number;
        status: number;
        number: number;
        gender: number;
        tense: number;
        suffix_person: number;
        suffix_number: number;
        suffix_gender: number;
    };
    return_settings: {
        min_syl: number;
        max_syl: number;
        accreturnsettings: 'matchinput' | 'returnall' | 'acc0' | 'acc1';
        returnpropernames: boolean;
        ignoreLoazi: boolean;
        baseOnly: boolean;
    };
}

/**
 * Raw Dicta API response structure.
 */
export interface DictaApiResponse {
    fKnownInputAccent: boolean;
    results: {
        mode: string;
        results: {
            lex: string;
            forms: string[];
            has_more_forms: boolean;
        }[];
    }[];
}
