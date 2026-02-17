import type { VerseWord } from '../db/db';

export type StudioMode = 'freestyle' | 'write' | 'verse' | 'review';

export interface StudioBar {
    id: string;
    text: string;
    timestamp?: number;      // Freestyle: seconds from recording start
    startTime?: number;      // Word-level start (seconds)
    endTime?: number;        // Word-level end (seconds)
    audioId?: string;        // Writing: per-bar recording reference
    words?: VerseWord[];     // Verse: vocalized syllables
    source?: 'transcription' | 'manual' | 'import';
}
