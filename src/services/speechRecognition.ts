/**
 * Speech Recognition Service - Web Speech API wrapper
 * Handles browser-native speech recognition with restart logic
 */

import type { RecognitionConfig, RecognitionCallbacks } from '../types/transcription'

// Use any for browser-specific SpeechRecognition (not in all TS libs)
type SpeechRecognitionInstance = any

/** Check if Speech Recognition is supported */
export function isSpeechRecognitionSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
}

/** Get the SpeechRecognition constructor */
function getSpeechRecognition(): any {
    if ('webkitSpeechRecognition' in window) {
        return (window as any).webkitSpeechRecognition
    }
    if ('SpeechRecognition' in window) {
        return (window as any).SpeechRecognition
    }
    return null
}

/**
 * Create and configure a SpeechRecognition instance
 */
export function createRecognition(
    config: RecognitionConfig,
    callbacks: RecognitionCallbacks
): SpeechRecognitionInstance | null {
    const SpeechRecognitionClass = getSpeechRecognition()
    if (!SpeechRecognitionClass) {
        console.warn('Speech Recognition not supported in this browser')
        return null
    }

    const recognition = new SpeechRecognitionClass()

    // Configuration
    recognition.continuous = config.continuous ?? true
    recognition.interimResults = config.interimResults ?? true
    recognition.lang = config.language === 'he' ? 'he-IL' : 'en-US'

    // Event handlers
    recognition.onstart = () => {
        console.log(`🎤 [SpeechRecognition] Started (${config.language})`)
        callbacks.onStart()
    }

    recognition.onresult = (event: any) => {
        // console.log('🎤 [SpeechRecognition] Result event', event.results.length)
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            const text = result[0].transcript.trim()

            if (result.isFinal) {
                console.log('🎤 [SpeechRecognition] Final:', text)
                callbacks.onFinal(text, i)
            } else {
                console.log('🎤 [SpeechRecognition] Interim:', text)
                callbacks.onInterim(text)
            }
        }
    }

    recognition.onerror = (event: any) => {
        // Ignore 'no-speech' which is common and not an error
        if (event.error !== 'no-speech') {
            console.error('❌ [SpeechRecognition] Error:', event.error, event.message)
            callbacks.onError(event.error)
        } else {
            console.log('⚠️ [SpeechRecognition] No Speech Detected')
        }
    }

    recognition.onend = () => {
        console.log('🛑 [SpeechRecognition] Ended')
        callbacks.onEnd()
    }

    return recognition
}

/**
 * Calculate restart delay with exponential backoff
 */
export function getRestartDelay(errorCount: number, isPlannedRestart: boolean): number {
    if (isPlannedRestart) return 50
    return Math.min(200 * Math.pow(1.5, errorCount), 5000)
}

/**
 * Maximum consecutive errors before giving up
 */
export const MAX_CONSECUTIVE_ERRORS = 10
