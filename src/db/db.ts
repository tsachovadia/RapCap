import Dexie, { type EntityTable } from 'dexie';

export interface Session {
    id: number;
    title: string;
    blob?: Blob;
    duration: number; // in seconds
    beatId?: string;
    createdAt: Date;
    lyrics?: string; // For freestyle lyrics
    content?: string; // For drill text content
    type: 'freestyle' | 'drill';
    subtype?: string; // e.g., 'object-writing'
    metadata?: any; // Flexible metadata (e.g., prompt word)
    syncOffset?: number; // Time in ms to skip in vocals to align with beat start
}

export interface Beat {
    id: string;
    title: string;
    artist: string;
    youtubeId: string;
    bpm: number;
    genre: string;
}

const db = new Dexie('RapCapDB') as Dexie & {
    sessions: EntityTable<Session, 'id'>,
    beats: EntityTable<Beat, 'id'>
};

// Schema declaration:
db.version(1).stores({
    sessions: '++id, title, createdAt, type', // Primary key and indexed props
    beats: 'id, genre, bpm'
});

export { db };
