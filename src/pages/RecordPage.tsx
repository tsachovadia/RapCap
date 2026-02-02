import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useTranscription } from '../hooks/useTranscription'
import { db } from '../db/db'
import { convertBlobToMp3 } from '../services/audioEncoder'
import { syncService } from '../services/dbSync'
import { getCalibratedLatency } from '../services/latencyCalibration'
import ReviewSessionModal from '../components/freestyle/ReviewSessionModal'
import { MicrophoneSetupModal } from '../components/shared/MicrophoneSetupModal'
import FreestyleModeUI from '../components/record/FreestyleModeUI'
import ThoughtsModeUI from '../components/record/ThoughtsModeUI'
import RhymeTrainingModeUI from '../components/record/RhymeTrainingModeUI'
import RecordingHeader from '../components/record/RecordingHeader'
import RecordingControls from '../components/freestyle/RecordingControls'
import { useAuth } from '../contexts/AuthContext'
import { Music, Mic, GraduationCap } from 'lucide-react'
import { DEFAULT_BEAT_ID } from '../data/beats'

export type RecordingMode = 'freestyle' | 'thoughts' | 'training'
export type FlowState = 'idle' | 'preroll' | 'recording' | 'paused'

export default function RecordPage() {
    const [searchParams] = useSearchParams()
    const mode = (searchParams.get('mode') as RecordingMode) || 'freestyle'
    const navigate = useNavigate()
    const { user } = useAuth()

    // --- Core Hooks ---
    const {
        initializeStream,
        permissionError,
        startRecording,
        stopRecording,
        isRecording,
        duration,
        analyser,
        availableDevices,
        selectedDeviceId,
        setDeviceId,
        audioConstraints,
        setAudioConstraints,
        availableOutputDevices,
        selectedOutputId,
        setOutputId,
        resetAudioState
    } = useAudioRecorder()

    const [language, setLanguage] = useState<'he' | 'en'>('he')
    const [isTranscribing, setIsTranscribing] = useState(false)
    const { transcript, interimTranscript, segments, wordSegments, resetTranscript } = useTranscription(isTranscribing, language)

    // --- Flow State ---
    const [flowState, setFlowState] = useState<FlowState>('idle')
    const [moments, setMoments] = useState<number[]>([])
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [pendingSessionBlob, setPendingSessionBlob] = useState<Blob | null>(null)
    const [showMicSetup, setShowMicSetup] = useState(false)
    const [enhancedTranscriptData, setEnhancedTranscriptData] = useState<{ text: string, segments: any[], wordSegments: any[] } | null>(null)
    const [currentBeatId, setCurrentBeatId] = useState(DEFAULT_BEAT_ID)
    const [capturedBeatStartTime, setCapturedBeatStartTime] = useState<number>(0)

    // Precise timing refs
    const recordingStartTimeRef = useRef<number>(0)
    const transcriptionStartTimeRef = useRef<number>(0)

    // Ensure stream is initialized
    useEffect(() => {
        if (flowState === 'idle' && !isRecording) {
            initializeStream().catch(err => console.error("Stream init failed", err))
        }
    }, [initializeStream, flowState, isRecording])

    // Trigger mic setup on error
    useEffect(() => {
        if (permissionError) setShowMicSetup(true)
    }, [permissionError])

    // --- Shared Actions ---
    const handleStartFlow = async () => {
        // Prevent double-start or re-entry while active
        if (flowState !== 'idle' || isRecording) {
            console.warn("⚠️ handleStartFlow called while active. Ignoring.")
            return
        }

        setIsTranscribing(true)
        transcriptionStartTimeRef.current = Date.now()

        try {
            await initializeStream()
            // different modes might have different pre-roll needs
            if (mode === 'freestyle') {
                setFlowState('preroll')
            } else {
                await startRecording()
                recordingStartTimeRef.current = Date.now()
                setFlowState('recording')
            }
            resetTranscript()
            setMoments([])
        } catch (e) {
            console.error('Failed to start flow:', e)
            setFlowState('idle')
            setIsTranscribing(false)
        }
    }

    const handlePauseFlow = () => {
        setFlowState('paused')
        setIsTranscribing(false)
    }

    const handleResumeFlow = () => {
        setFlowState('recording')
        setIsTranscribing(true)
    }

    const handleFinishFlow = async () => {
        setFlowState('idle')
        setIsTranscribing(false)
        if (isRecording) {
            const blob = await stopRecording()
            if (blob.size > 0) {
                setPendingSessionBlob(blob)
                setShowReviewModal(true)
            }
        }
    }

    const handleSaveMoment = () => {
        if (flowState !== 'recording') return // Prevent saving moments during pre-roll
        const now = Date.now()
        const preciseTime = recordingStartTimeRef.current > 0
            ? (now - recordingStartTimeRef.current) / 1000
            : duration

        // Ensure we don't save 0 or negative values if the clock is weird
        const finalTime = Math.max(0.01, preciseTime)
        setMoments(prev => [...prev, finalTime])
    }

    const handleConfirmSave = async () => {
        if (!pendingSessionBlob) return

        let finalBlob = pendingSessionBlob
        try {
            finalBlob = await convertBlobToMp3(pendingSessionBlob, duration * 1000)
        } catch (e) {
            console.error("MP3 conversion failed", e)
        }

        const offset = Math.max(0, recordingStartTimeRef.current - transcriptionStartTimeRef.current) / 1000

        // Correct segments if needed (shared logic)
        const processSegments = (segs: any[]) => segs
            .map(s => ({ ...s, timestamp: s.timestamp - offset }))
            .filter(s => s.timestamp >= 0)

        let finalSegments = enhancedTranscriptData ? enhancedTranscriptData.segments : processSegments(segments)
        let finalWordSegments = enhancedTranscriptData ? enhancedTranscriptData.wordSegments : processSegments(wordSegments)
        let finalText = enhancedTranscriptData ? enhancedTranscriptData.text : (transcript + (interimTranscript ? ' ' + interimTranscript : ''))

        // Manual Fallback: if there's still interim text not in segments
        if (!enhancedTranscriptData && interimTranscript.trim()) {
            const hasInterim = segments.some(s => s.text.includes(interimTranscript.trim().split(' ')[0]))
            if (!hasInterim) {
                const ts = (Date.now() - transcriptionStartTimeRef.current) / 1000
                const processedTs = Math.max(0, ts - offset)
                finalSegments = [...finalSegments, { text: interimTranscript.trim(), timestamp: processedTs }]
            }
        }

        try {
            await db.sessions.add({
                title: `${mode === 'freestyle' ? 'Freestyle' : 'Thoughts'} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
                blob: finalBlob,
                duration: duration,
                createdAt: new Date(),
                date: new Date(),
                updatedAt: new Date(),
                type: mode,
                beatId: currentBeatId,
                // Apply calibrated latency offset to compensate for roundtrip audio delay
                beatStartTime: capturedBeatStartTime + (getCalibratedLatency() / 1000),
                metadata: {
                    moments,
                    lyrics: finalText,
                    lyricsSegments: finalSegments,
                    lyricsWords: finalWordSegments,
                    language
                }
            })

            if (user) {
                syncService.syncSessions(user.uid).catch(console.error);
            }

            navigate('/library')
        } catch (e) {
            console.error('Failed to save session', e)
            alert('Error saving session')
        }
    }

    const handleDiscard = () => {
        if (confirm('Discard this session?')) {
            setShowReviewModal(false)
            setPendingSessionBlob(null)
            setEnhancedTranscriptData(null)
            resetTranscript()
            setMoments([])
        }
    }

    // Modal Callback for Pre-roll complete (Used by FreestyleModeUI)
    const onPreRollComplete = async (beatTime: number) => {
        if (flowState !== 'preroll') return
        await startRecording()
        setCapturedBeatStartTime(beatTime) // Capture the exact time
        recordingStartTimeRef.current = Date.now()
        setFlowState('recording')
    }

    return (
        <div className="h-[100dvh] flex flex-col relative overflow-hidden bg-black text-white px-4" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <RecordingHeader
                mode={mode}
                language={language}
                onLanguageToggle={() => setLanguage(l => l === 'he' ? 'en' : 'he')}
                onShowMicSetup={() => setShowMicSetup(true)}
                permissionError={!!permissionError}
            />

            {/* Mode Switcher */}
            <div className="flex-none flex justify-center py-2">
                <div className="bg-[#1a1a1a] p-1 rounded-2xl flex items-center gap-1 border border-white/5 shadow-xl">
                    <button
                        onClick={() => navigate('/record?mode=freestyle')}
                        disabled={flowState !== 'idle'}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative
                            ${mode === 'freestyle' ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20' : 'text-white/40 hover:text-white/60'}
                            ${flowState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <Music size={14} />
                        <span>{language === 'he' ? 'פריסטייל' : 'Freestyle'}</span>
                    </button>
                    <button
                        onClick={() => navigate('/record?mode=thoughts')}
                        disabled={flowState !== 'idle'}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative
                            ${mode === 'thoughts' ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20' : 'text-white/40 hover:text-white/60'}
                            ${flowState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <Mic size={14} />
                        <span>{language === 'he' ? 'מחשבות' : 'Thoughts'}</span>
                    </button>
                    <button
                        onClick={() => navigate('/record?mode=training')}
                        disabled={flowState !== 'idle'}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all relative
                            ${mode === 'training' ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/20' : 'text-white/40 hover:text-white/60'}
                            ${flowState !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        <GraduationCap size={14} />
                        <span>{language === 'he' ? 'אימון' : 'Training'}</span>
                    </button>
                </div>
            </div>

            <main className="flex-1 flex flex-col gap-2 min-h-0 pb-4">
                {mode === 'freestyle' && (
                    <FreestyleModeUI
                        flowState={flowState}
                        language={language}
                        onPreRollComplete={onPreRollComplete}
                        onBeatChange={setCurrentBeatId}
                        segments={segments}
                        interimTranscript={interimTranscript}
                    />
                )}
                {mode === 'thoughts' && (
                    <ThoughtsModeUI
                        flowState={flowState}
                        language={language}
                        segments={segments}
                        interimTranscript={interimTranscript}
                    />
                )}
                {mode === 'training' && (
                    <RhymeTrainingModeUI />
                )}
            </main>

            <footer className="relative flex-none py-2 flex flex-col items-center gap-2 z-30">
                {moments.length > 0 && (
                    <div className="absolute top-0 right-4 flex items-center gap-2 text-xs text-subdued bg-[#181818] px-2 py-1 rounded-lg border border-[#282828] z-20">
                        <span>{moments.length} Saved</span>
                    </div>
                )}
                <RecordingControls
                    flowState={flowState}
                    duration={duration}
                    onStart={handleStartFlow}
                    onPause={handlePauseFlow}
                    onResume={handleResumeFlow}
                    onFinish={handleFinishFlow}
                    onSaveMarker={handleSaveMoment}
                    analyser={analyser}
                    availableDevices={availableDevices}
                    selectedDeviceId={selectedDeviceId}
                    onDeviceChange={setDeviceId}
                    audioConstraints={audioConstraints}
                    setAudioConstraints={setAudioConstraints}
                    availableOutputDevices={availableOutputDevices}
                    selectedOutputId={selectedOutputId}
                    onOutputChange={setOutputId}
                />
            </footer>

            <ReviewSessionModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSave={handleConfirmSave}
                onDiscard={handleDiscard}
                audioBlob={pendingSessionBlob}
                onUpdateTranscript={(text, segs, words) => setEnhancedTranscriptData({ text, segments: segs, wordSegments: words })}
                data={{
                    transcript: enhancedTranscriptData ? enhancedTranscriptData.text : transcript,
                    duration,
                    beatId: currentBeatId,
                    date: new Date(),
                    segments: enhancedTranscriptData ? enhancedTranscriptData.segments : segments
                }}
            />

            <MicrophoneSetupModal
                isOpen={showMicSetup}
                onClose={() => setShowMicSetup(false)}
                permissionError={permissionError}
                initializeStream={initializeStream}
                audioAnalyser={analyser}
                availableDevices={availableDevices}
                selectedDeviceId={selectedDeviceId}
                setDeviceId={setDeviceId}
                resetAudioState={resetAudioState}
            />
        </div>
    )
}
