/**
 * Transcript Processor - Word timing interpolation and segment chunking
 */

import type { WordSegment, TranscriptSegment } from '../types/transcription'

/**
 * Interpolate word-level timestamps from phrase timing
 * Since Web Speech API doesn't give per-word timestamps, we estimate them
 * based on the phrase start time and duration
 */
export function interpolateWordTimestamps(
    text: string,
    phraseStartMs: number,
    phraseEndMs: number,
    recordingStartMs: number
): WordSegment[] {
    const words = text.split(/\s+/).filter(w => w.length > 0)
    if (words.length === 0) return []

    const duration = phraseEndMs - phraseStartMs
    const step = duration / words.length

    return words.map((word, idx) => ({
        word,
        timestamp: ((phraseStartMs + (idx * step)) - recordingStartMs) / 1000
    }))
}

/**
 * Chunk words into segments based on punctuation and max chunk size
 * This creates natural-feeling segments for display
 */
export function chunkIntoSegments(
    words: string[],
    wordSegments: WordSegment[],
    maxChunkSize: number = 4
): TranscriptSegment[] {
    if (words.length === 0 || wordSegments.length === 0) return []

    const segments: TranscriptSegment[] = []
    let currentChunk: string[] = []
    let currentTimestamp = wordSegments[0].timestamp

    words.forEach((word, idx) => {
        currentChunk.push(word)

        const hasPunctuation = /[.,!?;:]/.test(word)
        const isChunkFull = currentChunk.length >= maxChunkSize
        const isLastWord = idx === words.length - 1

        if (hasPunctuation || isChunkFull || isLastWord) {
            segments.push({
                text: currentChunk.join(' '),
                timestamp: currentTimestamp
            })
            currentChunk = []

            if (idx < words.length - 1) {
                currentTimestamp = wordSegments[idx + 1].timestamp
            }
        }
    })

    return segments
}

/**
 * Estimate phrase start time based on text length
 * Fallback when we don't have exact timing
 */
export function estimatePhraseStart(text: string, endTimeMs: number): number {
    // Estimate ~80ms per character, max 5 seconds
    const estimatedDuration = Math.min(text.length * 80, 5000)
    return endTimeMs - estimatedDuration
}
