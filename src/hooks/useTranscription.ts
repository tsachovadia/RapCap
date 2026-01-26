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

        recognition.onresult = (event: any) => {
            let finalTranscript = ''
            let localInterim = ''

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript.trim()
                    finalTranscript += text + ' '

                    // Capture timestamp for this segment (relative to start)
                    const now = Date.now()
                    // const timestamp = (now - startTimeRef.current) / 1000 // OLD BULK TIMESTAMP

                    // WORD LEVEL LOGIC & CHUNKING
                    const estimatedDuration = Math.min(text.length * 80, 5000) // 80ms per char, max 5s fallback
                    const phraseStart = phraseStartTimeRef.current || (now - estimatedDuration)

                    // Ensure we don't overlap strangely with previous segment if we are guessing
                    // const safePhraseStart = Math.max(phraseStart, lastSegmentEndRef.current) 
                    // (Commented out: Overlap is better than cutting off if we guessed late)

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

            setTranscript(prev => prev + finalTranscript)
            setInterimTranscript(localInterim)
        }

        recognition.onerror = (event: any) => {
            console.error("Transcription error", event.error)
        }

        recognition.onend = () => {
            // Auto-restart if we are still supposedly recording
            // Use a ref to check latest state without stale closures
            if (isRecordingRef.current) {
                console.log("🔄 Recognition ended, restarting...")
                try {
                    recognition.start()
                } catch (e) {
                    // ignore already started errors
                }
            }
        }

        recognitionRef.current = recognition
    }, [language])

    // Keep ref synced
    const isRecordingRef = useRef(isRecording)
    useEffect(() => {
        isRecordingRef.current = isRecording
    }, [isRecording])

    useEffect(() => {
        if (isRecording) {
            try {
                startTimeRef.current = Date.now()
                recognitionRef.current?.start()
                setIsListening(true)
            } catch (e) {
                // Ignore if already started
            }
        } else {
            try {
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
