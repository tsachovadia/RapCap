/**
 * Speech Recognition Service - Web Speech API wrapper
 * Handles browser-native speech recognition with restart logic
 */

import type { RecognitionConfig, RecognitionCallbacks } from '../types/transcription'

interface SpeechRecognitionResultLike {
    isFinal: boolean
    0: { transcript: string }
}

interface SpeechRecognitionEventLike {
    resultIndex: number
    results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
    error: string
    message?: string
}

export interface SpeechRecognitionInstance {
    continuous: boolean
    interimResults: boolean
    lang: string
    onstart: (() => void) | null
    onresult: ((event: SpeechRecognitionEventLike) => void) | null
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
    abort: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

function getSpeechWindow() {
    return window as Window & {
        webkitSpeechRecognition?: SpeechRecognitionConstructor
        SpeechRecognition?: SpeechRecognitionConstructor
    }
}

/** Check if Speech Recognition is supported */
export function isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false
    const speechWindow = getSpeechWindow()
    return Boolean(speechWindow.webkitSpeechRecognition || speechWindow.SpeechRecognition)
}

/** Get the SpeechRecognition constructor */
function getSpeechRecognition(): SpeechRecognitionConstructor | null {
    const speechWindow = getSpeechWindow()
    return speechWindow.webkitSpeechRecognition || speechWindow.SpeechRecognition || null
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

    recognition.onresult = (event) => {
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

    recognition.onerror = (event) => {
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
