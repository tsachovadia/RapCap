/**
 * useTranscription Hook - Live speech-to-text transcription
 * Uses Web Speech API for real-time transcription during recording
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { WordSegment, TranscriptSegment } from '../types/transcription'
import {
    createRecognition,
    isSpeechRecognitionSupported,
    getRestartDelay,
    MAX_CONSECUTIVE_ERRORS
} from '../services/speechRecognition'
import {
    interpolateWordTimestamps,
    chunkIntoSegments,
    estimatePhraseStart
} from '../services/transcriptProcessor'
import { hasReliableSpeechRecognition } from '../utils/platformDetection'

/** Silence threshold in ms - commit interim if no change */
const SILENCE_THRESHOLD_MS = 2500

export function useTranscription(isRecording: boolean, language: 'he' | 'en' = 'he') {
    // State
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [wordSegments, setWordSegments] = useState<WordSegment[]>([])
    const [segments, setSegments] = useState<TranscriptSegment[]>([])
    const [isListening, setIsListening] = useState(false)

    // Refs for callbacks (avoid stale closures)
    const recognitionRef = useRef<any>(null)
    const startTimeRef = useRef<number>(0)
    const phraseStartRef = useRef<number>(0)
    const isRecordingRef = useRef(isRecording)
    const interimRef = useRef('')
    const errorCountRef = useRef(0)
    const processedIndexes = useRef<Set<number>>(new Set())
    const isRestartingRef = useRef(false)
    const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Sync ref with prop
    useEffect(() => {
        isRecordingRef.current = isRecording
    }, [isRecording])

    // Commit interim transcript as final segment
    const commitInterim = useCallback((reason: string = 'manual') => {
        const text = interimRef.current.trim()
        if (!text) return

        console.log(`📤 Committing interim (${reason}):`, text)
        const now = Date.now()
        const phraseStart = phraseStartRef.current || estimatePhraseStart(text, now)

        // Create word segments
        const newWordSegments = interpolateWordTimestamps(
            text,
            phraseStart,
            now,
            startTimeRef.current
        )
        setWordSegments(prev => [...prev, ...newWordSegments])

        // Create segment
        const timestamp = (phraseStart - startTimeRef.current) / 1000
        setSegments(prev => [...prev, { text, timestamp }])
        setTranscript(prev => prev + text + ' ')

        // Reset interim state
        setInterimTranscript('')
        interimRef.current = ''
        phraseStartRef.current = 0

        // Restart recognition to clear buffer (prevent duplicate finals)
        if (reason !== 'stop' && recognitionRef.current) {
            isRestartingRef.current = true
            try {
                recognitionRef.current.stop()
            } catch (e) {
                console.warn('Failed to stop for restart:', e)
            }
        }
    }, [])

    // Silence detection - commit if no change for threshold
    useEffect(() => {
        if (!isListening || !interimTranscript) return

        const timeout = setTimeout(() => {
            console.log('🤫 Silence detected')
            commitInterim('silence')
        }, SILENCE_THRESHOLD_MS)

        return () => clearTimeout(timeout)
    }, [interimTranscript, isListening, commitInterim])

    // Commit on stop
    useEffect(() => {
        if (!isRecording && interimRef.current) {
            commitInterim('stop')
        }
    }, [isRecording, commitInterim])

    // Main recognition effect
    useEffect(() => {
        // If API is missing OR we are on iOS Chrome (unreliable), skip native logic
        if (!isSpeechRecognitionSupported() || !hasReliableSpeechRecognition()) {
            console.warn('Speech Recognition not supported or unreliable (using fallback)')
            return
        }

        let isActive = true

        // Cleanup previous
        if (recognitionRef.current) {
            try { recognitionRef.current.abort() } catch (e) { /* ignore */ }
        }

        const recognition = createRecognition(
            { language },
            {
                onStart: () => {
                    if (!isActive) return
                    setIsListening(true)
                    errorCountRef.current = 0
                    isRestartingRef.current = false
                },

                onInterim: (text) => {
                    if (!isActive) return
                    if (!phraseStartRef.current) {
                        phraseStartRef.current = Date.now()
                    }
                    if (text !== interimRef.current) {
                        interimRef.current = text
                        setInterimTranscript(text)
                    }
                },

                onFinal: (text, resultIndex) => {
                    if (!isActive || !text) return
                    if (processedIndexes.current.has(resultIndex)) {
                        console.log('Duplicate result index, skipping:', resultIndex);
                        return;
                    }
                    processedIndexes.current.add(resultIndex)

                    console.log('📝 Final:', text, 'ResultIndex:', resultIndex)
                    const now = Date.now()
                    const phraseStart = phraseStartRef.current || estimatePhraseStart(text, now)

                    // Word segments
                    const newWordSegments = interpolateWordTimestamps(
                        text,
                        phraseStart,
                        now,
                        startTimeRef.current
                    )
                    setWordSegments(prev => [...prev, ...newWordSegments])

                    // Chunk into segments
                    const words = text.split(/\s+/)
                    const newSegments = chunkIntoSegments(words, newWordSegments)
                    setSegments(prev => [...prev, ...newSegments])
                    setTranscript(prev => prev + text + ' ')

                    // Clear interim
                    setInterimTranscript('')
                    interimRef.current = ''
                    phraseStartRef.current = 0
                },

                onEnd: () => {
                    if (!isActive) return
                    processedIndexes.current.clear()

                    if (errorCountRef.current > MAX_CONSECUTIVE_ERRORS) {
                        console.warn('Too many errors, stopping auto-restart')
                        setIsListening(false)
                        return
                    }

                    if (isRecordingRef.current) {
                        const delay = getRestartDelay(errorCountRef.current, isRestartingRef.current)
                        console.log(`🔄 Restarting in ${Math.round(delay)}ms...`)

                        if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
                        restartTimeoutRef.current = setTimeout(() => {
                            if (!isActive || !isRecordingRef.current) return
                            try {
                                recognition?.start()
                            } catch (e) { /* already started */ }
                        }, delay)
                    } else {
                        setIsListening(false)
                    }
                    isRestartingRef.current = false
                },

                onError: (error) => {
                    if (!isActive) return
                    if (error === 'not-allowed' || error === 'service-not-allowed') {
                        isRecordingRef.current = false
                    }
                    errorCountRef.current++
                }
            }
        )

        recognitionRef.current = recognition

        // Start if recording
        if (isRecording && recognition) {
            startTimeRef.current = Date.now()
            try {
                recognition.start()
            } catch (e) {
                console.error('Failed to start transcription:', e)
            }
        }

        return () => {
            isActive = false
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
            try {
                recognition?.stop()
            } catch (e) { /* ignore */ }
            setIsListening(false)
        }
    }, [language, isRecording])

    // Keep ref in sync
    const transcriptRef = useRef('')
    useEffect(() => {
        transcriptRef.current = transcript
    }, [transcript])

    const resetTranscript = useCallback(() => {
        setTranscript('')
        setInterimTranscript('')
        setSegments([])
        setWordSegments([])
        transcriptRef.current = ''
        processedIndexes.current.clear()
        errorCountRef.current = 0
    }, [])

    return {
        transcript,
        interimTranscript,
        segments,
        wordSegments,
        isListening,
        resetTranscript,
        transcriptRef // Expose Ref for reading inside closures (handleFinishFlow)
    }
}
