/**
 * useFlowState - Manages recording flow state machine
 * States: idle → preroll → recording → paused
 */
import { useState, useRef, useCallback } from 'react'

export type FlowState = 'idle' | 'preroll' | 'recording' | 'paused'

interface UseFlowStateOptions {
    onStartRecording: () => Promise<void>
    onStopRecording: () => Promise<Blob | undefined>
    youtubePlayer: any
    beatVolume: number
    resetTranscript: () => void
    initializeStream: () => Promise<void>
    setIsTranscribing: (v: boolean) => void
}

export function useFlowState({
    onStartRecording,
    onStopRecording,
    youtubePlayer,
    beatVolume,
    resetTranscript,
    initializeStream,
    setIsTranscribing
}: UseFlowStateOptions) {
    const [flowState, setFlowState] = useState<FlowState>('idle')
    const [moments, setMoments] = useState<number[]>([])

    const recordingStartTimeRef = useRef<number>(0)
    const transcriptionStartTimeRef = useRef<number>(0)
    const preRollCheckRef = useRef<number | null>(null)
    const wasPausedByBuffering = useRef(false)

    const handlePlayerStateChange = useCallback((event: any) => {
        const state = event.data
        // State 3 = Buffering
        if (state === 3 && flowState === 'recording') {
            console.warn("⚠️ Beat Buffering detected! Pausing flow to maintain sync.")
            wasPausedByBuffering.current = true
            handlePauseFlow()
            alert('האינטרנט איטי. ההקלטה הושהתה כדי לשמור על סנכרון.')
        }
        // State 1 = Playing
        if (state === 1 && flowState === 'paused' && wasPausedByBuffering.current) {
            console.log("✅ Beat buffered and ready.")
            wasPausedByBuffering.current = false
        }
    }, [flowState])

    const handlePauseFlow = useCallback(() => {
        console.log('⏸️ Pausing Flow...')
        setFlowState('paused')
        setIsTranscribing(false)
        if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo()
        }
    }, [youtubePlayer, setIsTranscribing])

    const handleResumeFlow = useCallback(() => {
        console.log('▶️ Resuming Flow...')
        setFlowState('recording')
        setIsTranscribing(true)
        if (youtubePlayer) youtubePlayer.playVideo()
    }, [youtubePlayer, setIsTranscribing])

    const handleFinishFlow = useCallback(async () => {
        console.log('🛑 Finishing Flow...')

        // Stop playback immediately
        if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)
        if (youtubePlayer) youtubePlayer.pauseVideo()

        // Stop transcription first
        setIsTranscribing(false)

        // Stop recording (this clears the timer)
        const blob = await onStopRecording()

        // Only after recording is stopped, update flow state
        setFlowState('idle')

        return blob
    }, [youtubePlayer, onStopRecording, setIsTranscribing])

    const monitorPreRoll = useCallback(() => {
        const safetyTimeout = setTimeout(() => {
            if (preRollCheckRef.current) {
                console.warn("⚠️ Pre-roll timed out, forcing start...")
                cancelAnimationFrame(preRollCheckRef.current)
                onStartRecording().then(() => {
                    recordingStartTimeRef.current = Date.now()
                    setFlowState('recording')
                })
            }
        }, 4000)

        const check = () => {
            if (!youtubePlayer) return

            const currentTime = youtubePlayer.getCurrentTime()
            if (currentTime >= 2.0) {
                console.log('✅ Pre-Roll Complete! Recording...')
                clearTimeout(safetyTimeout)
                onStartRecording().then(() => {
                    recordingStartTimeRef.current = Date.now()
                    setFlowState('recording')
                })
                if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)
            } else {
                preRollCheckRef.current = requestAnimationFrame(check)
            }
        }
        preRollCheckRef.current = requestAnimationFrame(check)
    }, [youtubePlayer, onStartRecording])

    const handleStartFlow = useCallback(async () => {
        console.log('🎤 Starting Flow...')

        setIsTranscribing(true)
        transcriptionStartTimeRef.current = Date.now()

        if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
            try {
                youtubePlayer.setVolume(beatVolume)
                youtubePlayer.seekTo(0)
                youtubePlayer.playVideo()
            } catch (e) {
                console.warn("Player error ignored", e)
            }
        }

        try {
            await initializeStream()
            setFlowState('preroll')
            resetTranscript()
            setMoments([])
            monitorPreRoll()
        } catch (e) {
            console.error('Failed to start flow:', e)
            setFlowState('idle')
            setIsTranscribing(false)
            if (youtubePlayer) youtubePlayer.pauseVideo()
        }
    }, [youtubePlayer, beatVolume, initializeStream, resetTranscript, monitorPreRoll, setIsTranscribing])

    const handleSaveMoment = useCallback(() => {
        const now = Date.now()
        const preciseTime = recordingStartTimeRef.current > 0
            ? (now - recordingStartTimeRef.current) / 1000
            : 0
        setMoments(prev => [...prev, preciseTime])
    }, [])

    const handleDiscard = useCallback(() => {
        resetTranscript()
        setMoments([])
    }, [resetTranscript])

    return {
        flowState,
        setFlowState,
        moments,
        setMoments,
        recordingStartTimeRef,
        transcriptionStartTimeRef,
        handleStartFlow,
        handlePauseFlow,
        handleResumeFlow,
        handleFinishFlow,
        handleSaveMoment,
        handlePlayerStateChange,
        handleDiscard
    }
}
