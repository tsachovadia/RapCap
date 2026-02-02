/**
 * Whisper Transcription Service
 * Fallback transcription using OpenAI Whisper API
 * Used when Web Speech API fails (common on iOS Safari)
 */

import type { TranscriptSegment, WordSegment } from '../types/transcription';

export interface WhisperResponse {
    text: string;
    segments?: Array<{
        id: number;
        start: number;
        end: number;
        text: string;
    }>;
    words?: Array<{
        word: string;
        start: number;
        end: number;
    }>;
}

export interface WhisperTranscriptResult {
    text: string;
    segments: TranscriptSegment[];
    wordSegments: WordSegment[];
}

/**
 * Transcribe audio using Whisper API
 * @param audioBlob - The recorded audio blob
 * @param language - 'he' or 'en'
 * @returns Transcript with segments and word timestamps
 */
export async function transcribeWithWhisper(
    audioBlob: Blob,
    language: 'he' | 'en' = 'he'
): Promise<WhisperTranscriptResult> {
    console.log('🎙️ Sending to Whisper API...', {
        size: audioBlob.size,
        type: audioBlob.type,
        language
    });

    const formData = new FormData();

    // Determine file extension based on MIME type
    const ext = audioBlob.type.includes('mp4') ? 'mp4'
        : audioBlob.type.includes('aac') ? 'aac'
            : audioBlob.type.includes('webm') ? 'webm'
                : 'webm';

    formData.append('file', audioBlob, `recording.${ext}`);
    formData.append('language', language);

    const response = await fetch('/api/whisper', {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Whisper API failed: ${response.status}`);
    }

    const data: WhisperResponse = await response.json();
    console.log('✅ Whisper response received:', data.text?.substring(0, 50) + '...');

    // Convert Whisper response to our format
    const segments: TranscriptSegment[] = data.segments?.map(seg => ({
        text: seg.text.trim(),
        timestamp: seg.start
    })) || [{ text: data.text, timestamp: 0 }];

    const wordSegments: WordSegment[] = data.words?.map(word => ({
        word: word.word,
        timestamp: word.start, // backward compat
        start: word.start,
        end: word.end
    })) || [];

    return {
        text: data.text,
        segments,
        wordSegments
    };
}

/**
 * Check if Whisper transcription is needed
 * Returns true if live transcription likely failed
 */
export function shouldUseWhisperFallback(
    liveTranscript: string,
    recordingDuration: number
): boolean {
    // If recording was > 5 seconds but we got very little transcript, likely failed
    if (recordingDuration > 5 && liveTranscript.trim().length < 10) {
        console.log('⚠️ Live transcription seems to have failed, using Whisper fallback');
        return true;
    }
    return false;
}
