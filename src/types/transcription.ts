/**
 * Transcription Types - Shared across transcription services
 */

/** A single word with its timestamp */
export interface WordSegment {
    word: string
    timestamp: number // seconds from start (required for backward compat)
    start?: number // seconds from start (Whisper format, optional)
    end?: number // seconds (Whisper format, optional)
}

/** A text segment (phrase/sentence) with timestamp */
export interface TranscriptSegment {
    text: string
    timestamp: number // seconds from start
}

/** Full transcription state exposed by hooks */
export interface TranscriptionState {
    transcript: string
    interimTranscript: string
    segments: TranscriptSegment[]
    wordSegments: WordSegment[]
    isListening: boolean
}

/** Speech Recognition event handlers */
export interface RecognitionCallbacks {
    onInterim: (text: string) => void
    onFinal: (text: string, resultIndex: number) => void
    onStart: () => void
    onEnd: () => void
    onError: (error: string) => void
}

/** Configuration for speech recognition */
export interface RecognitionConfig {
    language: 'he' | 'en'
    continuous?: boolean
    interimResults?: boolean
}
