/**
 * Dicta Cache Service
 * 3-tier caching: IndexedDB (local) → Supabase (global) → Dicta API
 * 
 * For MVP: Local-only. Supabase integration added when project is set up.
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

// =========== Supabase Integration (Placeholder) ===========
// TODO: Add Supabase client when project is created
// import { supabase } from './supabase';

async function getSupabaseCache(_word: string): Promise<DictaCacheEntry | null> {
    // TODO: Implement when Supabase is set up
    // const { data } = await supabase.from('dicta_cache').select('*').eq('vocalized_word', word).single();
    // return data;
    return null;
}

async function saveSupabaseCache(_entry: DictaCacheEntry): Promise<void> {
    // TODO: Implement when Supabase is set up
    // await supabase.from('dicta_cache').upsert({ ... });
}

async function incrementSupabaseHitCount(_word: string): Promise<void> {
    // TODO: Implement when Supabase is set up
}

// =========== Main Cache Interface ===========

/**
 * Get vocalization options for a raw word.
 * Checks local cache first.
 */
export async function getCachedVocalizations(rawWord: string): Promise<string[] | null> {
    const localEntries = await getLocalCacheByRawWord(rawWord);
    if (localEntries.length > 0) {
        return localEntries[0].vocalizations;
    }
    return null;
}

/**
 * Get cached rhyme data for a vocalized word.
 * Uses 3-tier lookup: Local → Supabase → null (cache miss).
 */
export async function getCachedWord(vocalizedWord: string): Promise<DictaCacheEntry | null> {
    // 1. Check local IndexedDB
    const localEntry = await getLocalCacheEntry(vocalizedWord);
    if (localEntry) {
        // Update hit count locally
        await updateLocalCacheHit(vocalizedWord);
        await incrementSupabaseHitCount(vocalizedWord);
        return localEntry;
    }

    // 2. Check Supabase (global cache)
    const supabaseEntry = await getSupabaseCache(vocalizedWord);
    if (supabaseEntry) {
        // Sync to local cache
        await saveLocalCacheEntry(supabaseEntry);
        await incrementSupabaseHitCount(vocalizedWord);
        return supabaseEntry;
    }

    // 3. Cache miss
    return null;
}

/**
 * Search for rhymes with full caching.
 * If not cached, fetches from Dicta and caches the result.
 */
export async function searchWithCache(rawWord: string, vocalizedWord: string): Promise<DictaCacheEntry> {
    // Check cache first
    const cached = await getCachedWord(vocalizedWord);
    if (cached) {
        return cached;
    }

    // Cache miss: fetch from Dicta API
    const entry = await fetchWordData(rawWord, vocalizedWord);

    // Save to both caches
    await saveLocalCacheEntry(entry);
    await saveSupabaseCache(entry);

    return entry;
}

/**
 * Get most popular (most searched) words.
 */
export async function getPopularWords(limit: number = 20): Promise<DictaCacheEntry[]> {
    return getPopularWordsLocal(limit);
}

/**
 * Manually cache a word entry (for preloading/seeding).
 */
export async function cacheWord(entry: DictaCacheEntry): Promise<void> {
    await saveLocalCacheEntry(entry);
    await saveSupabaseCache(entry);
}
