import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Session } from '../types';
import type { DictaCacheEntry } from '../types/dicta';

interface RapCapDB extends DBSchema {
    sessions: {
        key: string;
        value: Session;
        indexes: { 'by-date': number };
    };
    dictaCache: {
        key: string; // vocalizedWord
        value: DictaCacheEntry;
        indexes: {
            'by-raw-word': string;
            'by-hit-count': number;
            'by-last-accessed': number;
        };
    };
}

const DB_NAME = 'rapcap-db';
const DB_VERSION = 2; // Bumped for schema migration

let dbPromise: Promise<IDBPDatabase<RapCapDB>>;

export const initDB = () => {
    if (!dbPromise) {
        dbPromise = openDB<RapCapDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                // Sessions store (existing)
                if (oldVersion < 1) {
                    const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                    sessionStore.createIndex('by-date', 'createdAt');
                }

                // Dicta Cache store (new in v2)
                if (oldVersion < 2) {
                    const dictaStore = db.createObjectStore('dictaCache', { keyPath: 'vocalizedWord' });
                    dictaStore.createIndex('by-raw-word', 'rawWord');
                    dictaStore.createIndex('by-hit-count', 'hitCount');
                    dictaStore.createIndex('by-last-accessed', 'lastAccessedAt');
                }
            },
        });
    }
    return dbPromise;
};

// =========== Session Methods ===========

export const saveSession = async (session: Session) => {
    const db = await initDB();
    return db.put('sessions', session);
};

export const getAllSessions = async () => {
    const db = await initDB();
    return db.getAllFromIndex('sessions', 'by-date');
};

export const getSessionById = async (id: string) => {
    const db = await initDB();
    return db.get('sessions', id);
};

export const deleteSession = async (id: string) => {
    const db = await initDB();
    return db.delete('sessions', id);
};

// =========== Dicta Cache Methods (Local) ===========

export const getLocalCacheEntry = async (vocalizedWord: string): Promise<DictaCacheEntry | undefined> => {
    const db = await initDB();
    return db.get('dictaCache', vocalizedWord);
};

export const getLocalCacheByRawWord = async (rawWord: string): Promise<DictaCacheEntry[]> => {
    const db = await initDB();
    return db.getAllFromIndex('dictaCache', 'by-raw-word', rawWord);
};

export const saveLocalCacheEntry = async (entry: DictaCacheEntry) => {
    const db = await initDB();
    return db.put('dictaCache', entry);
};

export const updateLocalCacheHit = async (vocalizedWord: string) => {
    const db = await initDB();
    const entry = await db.get('dictaCache', vocalizedWord);
    if (entry) {
        entry.hitCount += 1;
        entry.lastAccessedAt = Date.now();
        await db.put('dictaCache', entry);
    }
};

export const getPopularWords = async (limit: number = 20): Promise<DictaCacheEntry[]> => {
    const db = await initDB();
    const all = await db.getAllFromIndex('dictaCache', 'by-hit-count');
    // Index is ascending, so we reverse and slice
    return all.reverse().slice(0, limit);
};
