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

    useEffect(() => {
        // Initialize SpeechRecognition
        if (!('webkitSpeechRecognition' in window)) {
            console.warn("Speech Recognition not supported")
            return
        }

        const recognition = new (window as any).webkitSpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = language === 'he' ? 'he-IL' : 'en-US'

        recognition.onstart = () => {
            console.log("🎤 Speech Recognition Started")
            setIsListening(true)
            consecutiveErrorsRef.current = 0 // Reset on successful start
        }

        recognition.onresult = (event: any) => {
            let finalTranscript = ''
            let localInterim = ''

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript.trim()
                    finalTranscript += text + ' '
                    console.log("📝 Final Result:", text)

                    // Capture timestamp for this segment (relative to start)
                    const now = Date.now()

                    // WORD LEVEL LOGIC & CHUNKING
                    const estimatedDuration = Math.min(text.length * 80, 5000) // 80ms per char, max 5s fallback
                    const phraseStart = phraseStartTimeRef.current || (now - estimatedDuration)

                    const duration = now - phraseStart
                    lastSegmentEndRef.current = now
                    const words = text.split(/\s+/) // Split by whitespace

                    if (words.length > 0) {
                        const step = duration / words.length
                        const newWordSegments = words.map((w: string, idx: number) => ({
                            word: w,
                            timestamp: ((phraseStart + (idx * step)) - startTimeRef.current) / 1000
                        }))
                        setWordSegments(prev => [...prev, ...newWordSegments])

                        // VISUAL CHUNKING: Break into lines of ~5 words for better UI granularity
                        const CHUNK_SIZE = 5
                        for (let j = 0; j < words.length; j += CHUNK_SIZE) {
                            const chunkWords = words.slice(j, j + CHUNK_SIZE)
                            const chunkText = chunkWords.join(' ')
                            // Timestamp is the timestamp of the first word in the chunk
                            const chunkTimestamp = newWordSegments[j]?.timestamp || ((now - startTimeRef.current) / 1000)

                            setSegments(prev => [...prev, { text: chunkText, timestamp: chunkTimestamp }])
                        }
                    }

                    // Reset phrase tracking
                    isPhraseActiveRef.current = false
                    phraseStartTimeRef.current = 0

                } else {
                    localInterim += event.results[i][0].transcript
                }
            }

            // Detect phrase start
            if (localInterim.length > 0 && !isPhraseActiveRef.current) {
                isPhraseActiveRef.current = true
                phraseStartTimeRef.current = Date.now()
            }

            if (localInterim) console.log("🗣️ Interim:", localInterim)

            setTranscript(prev => prev + finalTranscript)
            setInterimTranscript(localInterim)
        }

        recognition.onerror = (event: any) => {
            console.error("Transcription error detail:", event.error)

            // If denied, kill the loop
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                isRecordingRef.current = false
            }

            if (event.error === 'network') {
                consecutiveErrorsRef.current++
            }
        }

        recognition.onend = () => {
            console.log("🛑 Speech Recognition Ended")

            // Limit restarts on network errors to avoid tight loops
            if (consecutiveErrorsRef.current > 5) {
                console.warn("Too many consecutive transcription errors, stopping auto-restart")
                setIsListening(false)
                return
            }

            // Auto-restart if we are still supposedly recording
            if (isRecordingRef.current) {
                const delay = Math.min(200 * Math.pow(1.5, consecutiveErrorsRef.current), 5000)
                console.log(`🔄 Restarting transcription in ${Math.round(delay)}ms...`)

                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)

                restartTimeoutRef.current = setTimeout(() => {
                    if (!isRecordingRef.current) return;
                    try {
                        console.log("🔄 Attempting restart...")
                        recognition.start()
                        // Reset errors if start succeeds (or we'll catch it in next onerror)
                    } catch (e) {
                        console.warn("Restart failed:", e)
                    }
                }, delay)
            } else {
                setIsListening(false)
            }
        }

        recognitionRef.current = recognition

        return () => {
            // Cleanup on unmount or language change
            if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
            recognition.abort()
        }
    }, [language])

    // Keep ref synced
    const isRecordingRef = useRef(isRecording)
    useEffect(() => {
        isRecordingRef.current = isRecording
    }, [isRecording])

    useEffect(() => {
        if (isRecording) {
            try {
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
                startTimeRef.current = Date.now()
                recognitionRef.current?.start()
                setIsListening(true)
            } catch (e) {
                // Ignore if already started
            }
        } else {
            try {
                if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current)
                recognitionRef.current?.stop()
                setIsListening(false)
                setInterimTranscript('')
            } catch (e) { }
        }
    }, [isRecording])

    const resetTranscript = () => {
        setTranscript('')
        setInterimTranscript('')
        setSegments([])
        setWordSegments([])
    }

    return { transcript, interimTranscript, segments, wordSegments, isListening, resetTranscript }
}
