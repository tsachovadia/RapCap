import { useState, useEffect, useRef } from 'react'

export function useTranscription(isRecording: boolean, language: 'he' | 'en' = 'he') {
    const [transcript, setTranscript] = useState('')
    const [interimTranscript, setInterimTranscript] = useState('')
    const [wordSegments, setWordSegments] = useState<Array<{ word: string, timestamp: number }>>([])
    const [segments, setSegments] = useState<Array<{ text: string, timestamp: number }>>([])
    const [isListening, setIsListening] = useState(false)
    const recognitionRef = useRef<any>(null)
    const startTimeRef = useRef<number>(0)

    // Logic for word-level timestamps (Interpolation)
    const phraseStartTimeRef = useRef<number>(0)
    const lastSegmentEndRef = useRef<number>(0)
    const isPhraseActiveRef = useRef<boolean>(false)

    // Track restart timeout to prevent loops
    const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const consecutiveErrorsRef = useRef<number>(0)

    // Keep ref synced for callbacks
    const isRecordingRef = useRef(isRecording)
    const interimTranscriptRef = useRef('') // Keep tracked for final flush

    useEffect(() => {
        isRecordingRef.current = isRecording
        if (!isRecording && interimTranscriptRef.current) {
            // Manual Flush: When recording stops, if there's leftover interim, save it
            const text = interimTranscriptRef.current.trim()
            if (text) {
                console.log("📤 Flushing final interim segment:", text)
                const ts = (Date.now() - startTimeRef.current) / 1000
                setSegments(prev => [...prev, { text, timestamp: ts }])
                setTranscript(prev => prev + text + " ")
                setInterimTranscript('')
                interimTranscriptRef.current = ''
            }
        }
    }, [isRecording])

    useEffect(() => {
        // Initialize SpeechRecognition
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Speech Recognition not supported")
            return
        }

        let isEffectActive = true
        const recognition = new (window as any).webkitSpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = language === 'he' ? 'he-IL' : 'en-US'

        recognition.onstart = () => {
            if (!isEffectActive) return
            console.log(`🎤 Speech Recognition Started (${language})`)
            setIsListening(true)
            consecutiveErrorsRef.current = 0
        }

        recognition.onresult = (event: any) => {
            if (!isEffectActive) return
            let finalTranscript = ''
            let localInterim = ''

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript.trim()
                    finalTranscript += text + ' '
                    console.log("📝 Final Result:", text)

                    const now = Date.now()
                    const estimatedDuration = Math.min(text.length * 80, 5000)
                    const phraseStart = phraseStartTimeRef.current || (now - estimatedDuration)
                    const duration = now - phraseStart
                    lastSegmentEndRef.current = now
                    const words = text.split(/\s+/)

                    if (words.length > 0) {
                        const step = duration / words.length
                        const newWordSegments = words.map((w: string, idx: number) => ({
                            word: w,
                            timestamp: ((phraseStart + (idx * step)) - startTimeRef.current) / 1000
                        }))
                        setWordSegments(prev => [...prev, ...newWordSegments])

                        // Optimization: Split segments by punctuation OR fixed chunk size
                        // This makes the UI update faster after natural pauses
                        let currentChunk: string[] = []
                        let currentTimestamp = newWordSegments[0].timestamp

                        words.forEach((word: string, idx: number) => {
                            currentChunk.push(word)
                            const hasPunctuation = /[.,!?;:]/.test(word)
                            const isChunkFull = currentChunk.length >= 4

                            if (hasPunctuation || isChunkFull || idx === words.length - 1) {
                                const text = currentChunk.join(' ')
                                console.log(`📦 Adding Segment: "${text}" at ${currentTimestamp.toFixed(2)}s`)
                                setSegments(prev => [...prev, {
                                    text,
                                    timestamp: currentTimestamp
                                }])
                                currentChunk = []
                                if (idx < words.length - 1) {
                                    // Set the NEXT chunk's timestamp to the next word's timestamp
                                    currentTimestamp = newWordSegments[idx + 1].timestamp
                                }
                            }
                        })
                    }
                    isPhraseActiveRef.current = false
                    phraseStartTimeRef.current = 0
                } else {
                    localInterim += event.results[i][0].transcript
                }
            }

            if (localInterim.length > 0 && !isPhraseActiveRef.current) {
                isPhraseActiveRef.current = true
                phraseStartTimeRef.current = Date.now()
            }

            if (localInterim) console.log("🗣️ Interim:", localInterim)
            interimTranscriptRef.current = localInterim
            setTranscript(prev => prev + finalTranscript)
            setInterimTranscript(localInterim)
        }

        recognition.onerror = (event: any) => {
            if (!isEffectActive) return
            console.error("Transcription error:", event.error)
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                isRecordingRef.current = false
            }
            consecutiveErrorsRef.current++
        }

        recognition.onend = () => {
            if (!isEffectActive) return
            console.log("🛑 Speech Recognition Ended")

            if (consecutiveErrorsRef.current > 10) {
                console.warn("Too many consecutive transcription errors, stopping auto-restart")
                setIsListening(false)
                return
            }

            if (isRecordingRef.current) {
                const delay = Math.min(200 * Math.pow(1.5, consecutiveErrorsRef.current), 5000)
                console.log(`🔄 Restarting in ${Math.round(delay)}ms...`)
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
                restartTimeoutRef.current = setTimeout(() => {
                    if (!isEffectActive || !isRecordingRef.current) return
                    try {
                        recognition.start()
                    } catch (e) {
                        console.warn("Restart failed:", e)
                    }
                }, delay)
            } else {
                setIsListening(false)
            }
        }

        recognitionRef.current = recognition

        // Start if initially recording
        if (isRecording) {
            startTimeRef.current = Date.now()
            try {
                recognition.start()
            } catch (e) {
                console.error("Failed to start initial transcription:", e)
            }
        }

        return () => {
            isEffectActive = false
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)

            // Final Flush: If stopping and we have interim text, try to commit it
            if (isRecordingRef.current) {
                console.log("📝 Finalizing transcription before cleanup...");
                // Note: We can't easily wait for async setState here, 
                // but the parent component (FreestylePage) should have the last state.
            }

            try {
                recognition.stop() // Better than abort() - allows final results
            } catch (e) { /* ignore */ }
            setIsListening(false)
            setInterimTranscript('')
        }
    }, [language, isRecording])


    const resetTranscript = () => {
        setTranscript('')
        setInterimTranscript('')
        setSegments([])
        setWordSegments([])
    }

    return { transcript, interimTranscript, segments, wordSegments, isListening, resetTranscript }
}
