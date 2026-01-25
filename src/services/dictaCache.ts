/**
 * Dicta Cache Service
 * 2-tier caching: IndexedDB (local) + JSON seed file
 */

import type { DictaCacheEntry } from '../types/dicta';
import {
    getLocalCacheEntry,
    getLocalCacheByRawWord,
    saveLocalCacheEntry,
    updateLocalCacheHit,
    getPopularWords as getPopularWordsLocal,
} from './db';
import { fetchWordData } from './dictaApi';

// =========== JSON Seed Cache ===========

let jsonCacheLoaded = false;

interface JsonCache {
    version: number;
    lastUpdated: string;
    entries: Record<string, DictaCacheEntry>;
}

/**
 * Load the JSON seed cache into IndexedDB on first run.
 */
async function loadJsonSeedCache(): Promise<void> {
    if (jsonCacheLoaded) return;

    try {
        const response = await fetch('/dicta-cache.json');
        if (!response.ok) {
            console.warn('No dicta-cache.json found, starting fresh');
            jsonCacheLoaded = true;
            return;
        }

        const data: JsonCache = await response.json();

        // Seed entries into IndexedDB
        for (const entry of Object.values(data.entries)) {
            const existing = await getLocalCacheEntry(entry.vocalizedWord);
            if (!existing) {
                await saveLocalCacheEntry(entry);
            }
        }

        console.log(`Loaded ${Object.keys(data.entries).length} entries from JSON seed cache`);
        jsonCacheLoaded = true;
    } catch (error) {
        console.warn('Failed to load JSON seed cache:', error);
        jsonCacheLoaded = true;
    }
}

// =========== Main Cache Interface ===========

/**
 * Get vocalization options for a raw word.
 */
export async function getCachedVocalizations(rawWord: string): Promise<string[] | null> {
    await loadJsonSeedCache();

    const localEntries = await getLocalCacheByRawWord(rawWord);
    if (localEntries.length > 0) {
        return localEntries[0].vocalizations;
    }
    return null;
}

/**
 * Get cached rhyme data for a vocalized word.
 */
export async function getCachedWord(vocalizedWord: string): Promise<DictaCacheEntry | null> {
    await loadJsonSeedCache();

    const localEntry = await getLocalCacheEntry(vocalizedWord);
    if (localEntry) {
        await updateLocalCacheHit(vocalizedWord);
        return localEntry;
    }

    return null;
}

/**
 * Search for rhymes with caching.
 */
export async function searchWithCache(rawWord: string, vocalizedWord: string): Promise<DictaCacheEntry> {
    await loadJsonSeedCache();

    // Check cache first
    const cached = await getCachedWord(vocalizedWord);
    if (cached) {
        return cached;
    }

    // Cache miss: fetch from Dicta API
    const entry = await fetchWordData(rawWord, vocalizedWord);
    await saveLocalCacheEntry(entry);

    return entry;
}

/**
 * Get most popular words.
 */
export async function getPopularWords(limit: number = 20): Promise<DictaCacheEntry[]> {
    await loadJsonSeedCache();
    return getPopularWordsLocal(limit);
}

/**
 * Manually cache a word entry.
 */
export async function cacheWord(entry: DictaCacheEntry): Promise<void> {
    await saveLocalCacheEntry(entry);
}

