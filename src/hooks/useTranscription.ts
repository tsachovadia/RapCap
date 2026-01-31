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

    // Logic to commit interim transcript as a finalized segment
    const commitInterim = () => {
        const text = interimTranscriptRef.current.trim()
        if (!text) return

        console.log("📤 Committing interim segment:", text)
        const now = Date.now()

        // Use phraseStartTime if available, otherwise estimate based on duration
        const phraseStart = phraseStartTimeRef.current || (now - Math.min(text.length * 80, 5000))
        const duration = now - phraseStart
        const words = text.split(/\s+/)

        if (words.length > 0) {
            const step = duration / words.length
            const newWordSegments = words.map((w: string, idx: number) => ({
                word: w,
                timestamp: ((phraseStart + (idx * step)) - startTimeRef.current) / 1000
            }))

            setWordSegments(prev => [...prev, ...newWordSegments])

            // Add the final segment
            const ts = (phraseStart - startTimeRef.current) / 1000
            setSegments(prev => [...prev, { text, timestamp: ts }])
            console.log(`📦 Segment added via commitInterim: "${text}" at ${ts.toFixed(2)}s`)
        }

        setTranscript(prev => prev + text + " ")
        setInterimTranscript('')
        interimTranscriptRef.current = ''
        phraseStartTimeRef.current = 0
    }

    // Silence detection: if interim transcript doesn't change for a while, commit it
    useEffect(() => {
        if (!isListening || !interimTranscript) return

        const timeout = setTimeout(() => {
            console.log("🤫 Silence detected in interim...")
            commitInterim()
        }, 2500) // Commit if silent for 2.5s

        return () => clearTimeout(timeout)
    }, [interimTranscript, isListening])

    useEffect(() => {
        isRecordingRef.current = isRecording
        if (!isRecording && interimTranscriptRef.current) {
            commitInterim()
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
                    if (!text) continue

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
                        let currentChunk: string[] = []
                        let currentTimestamp = newWordSegments[0].timestamp

                        words.forEach((word: string, idx: number) => {
                            currentChunk.push(word)
                            const hasPunctuation = /[.,!?;:]/.test(word)
                            const isChunkFull = currentChunk.length >= 4

                            if (hasPunctuation || isChunkFull || idx === words.length - 1) {
                                const chunkText = currentChunk.join(' ')
                                console.log(`📦 Adding Segment: "${chunkText}" at ${currentTimestamp.toFixed(2)}s`)
                                setSegments(prev => [...prev, {
                                    text: chunkText,
                                    timestamp: currentTimestamp
                                }])
                                currentChunk = []
                                if (idx < words.length - 1) {
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

            // If it ended while we have interim, commit it before restarting
            if (interimTranscriptRef.current) {
                console.log("⚠️ End detected with pending interim. Committing.")
                commitInterim()
            }

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

            try {
                recognition.stop() // Better than abort() - allows final results
            } catch (e) { /* ignore */ }
            setIsListening(false)
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
