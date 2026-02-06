import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useTranscription } from '../hooks/useTranscription'
import { db } from '../db/db'
import { convertBlobToMp3 } from '../services/audioEncoder'
import { syncService } from '../services/dbSync'
import { getCalibratedLatency } from '../services/latencyCalibration'
import ReviewSessionModal from '../components/freestyle/ReviewSessionModal'
import { MicrophoneSetupModal } from '../components/shared/MicrophoneSetupModal'
import type { SessionAnalysis } from '../db/db';
import FreestyleModeUI from '../components/record/FreestyleModeUI'
import ThoughtsModeUI from '../components/record/ThoughtsModeUI'
import RhymeTrainingModeUI from '../components/record/RhymeTrainingModeUI'
import RecordingHeader from '../components/record/RecordingHeader'
import RecordingControls from '../components/freestyle/RecordingControls'
import { useAuth } from '../contexts/AuthContext'
import { Music, Mic, GraduationCap, Upload, Clock } from 'lucide-react'
import { DEFAULT_BEAT_ID } from '../data/beats'
import { analyzeFreestyleLyrics } from '../services/gemini'

export type RecordingMode = 'freestyle' | 'thoughts' | 'training'
export type FlowState = 'idle' | 'preroll' | 'recording' | 'paused'

export default function RecordPage() {
    const [searchParams] = useSearchParams()
    const mode = (searchParams.get('mode') as RecordingMode) || 'freestyle'
    const navigate = useNavigate()
    const { user } = useAuth()

    const fileInputRef = useRef<HTMLInputElement>(null)

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
    const { transcript, interimTranscript, segments, wordSegments, resetTranscript, transcriptRef } = useTranscription(isTranscribing, language)

    // --- Flow State ---
    const [flowState, setFlowState] = useState<FlowState>('idle')
    const [moments, setMoments] = useState<number[]>([])
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [pendingSessionBlob, setPendingSessionBlob] = useState<Blob | null>(null)
    const [showMicSetup, setShowMicSetup] = useState(false)
    const [enhancedTranscriptData, setEnhancedTranscriptData] = useState<{ text: string, segments: any[], wordSegments: any[] } | null>(null)
    const [currentBeatId, setCurrentBeatId] = useState(DEFAULT_BEAT_ID)
    const [capturedBeatStartTime, setCapturedBeatStartTime] = useState<number>(0)

    // NEW: Notes & AI State
    const [notes, setNotes] = useState('')
    const [aiKeywords, setAiKeywords] = useState<string[]>([])
    const [sessionAnalysis, setSessionAnalysis] = useState<SessionAnalysis | null>(null)

    // Precise timing refs
    const recordingStartTimeRef = useRef<number>(0)
    const transcriptionStartTimeRef = useRef<number>(0)


    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Set blob
        setPendingSessionBlob(file)

        // Reset analysis
        setSessionAnalysis(null)
        setAiKeywords([])

        // Mock transcript (since we can't transcribe existing file easily client-side yet)
        resetTranscript()
        setEnhancedTranscriptData({
            text: "",
            segments: [],
            wordSegments: []
        })

        // Open Modal
        setShowReviewModal(true)

        // Reset input
        e.target.value = ''
    }

    // --- Recent Sessions Logic ---
    const recentSessions = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().limit(5).toArray(), [])
    const [showHistory, setShowHistory] = useState(false)
    const [loadedSessionId, setLoadedSessionId] = useState<number | null>(null)
    const [loadedSessionDuration, setLoadedSessionDuration] = useState(0)

    const handleLoadSession = (session: any) => {
        setPendingSessionBlob(session.blob)
        setSessionAnalysis(session.analysis || null)
        setAiKeywords(session.metadata?.aiKeywords || [])
        setLoadedSessionId(session.id)
        setLoadedSessionDuration(session.duration || 0)
        setCurrentBeatId(session.beatId || DEFAULT_BEAT_ID)

        // Load transcript data
        setEnhancedTranscriptData({
            text: session.metadata?.lyrics || "",
            segments: session.metadata?.lyricsSegments || [],
            wordSegments: session.metadata?.lyricsWords || []
        })

        setShowReviewModal(true)
        setShowHistory(false)
    }

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
            setAiKeywords([]) // Reset keywords
            setLoadedSessionId(null) // Clear any loaded session
            setLoadedSessionDuration(0)
            setEnhancedTranscriptData(null) // Clear enhanced data too
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
                setSessionAnalysis(null) // Reset analysis for new session
                setShowReviewModal(true)

                // Trigger AI analysis for the modal
                // Use Ref to avoid stale closure
                const fullText = transcriptRef.current + (interimTranscript ? ' ' + interimTranscript : '');

                console.log("📝 Finalizing Flow - Transcript Length:", fullText.length, "Text:", fullText.substring(0, 50) + "...");

                if (fullText.trim().length > 20) {
                    analyzeFreestyleLyrics(fullText)
                        .then(keywords => setAiKeywords(keywords))
                        .catch(err => console.warn("AI Analysis failed", err))
                }
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

    const handleAnalysisComplete = useCallback((analysis: SessionAnalysis) => {
        setSessionAnalysis(analysis);
    }, []);

    const handleConfirmSave = async (overrides?: Partial<import('../db/db').DbSession>) => {
        if (!pendingSessionBlob) return

        let finalBlob = pendingSessionBlob

        if (!loadedSessionId) {
            try {
                finalBlob = await convertBlobToMp3(pendingSessionBlob, duration * 1000)
            } catch (e) {
                console.error("MP3 conversion failed", e)
            }
        }

        const offset = Math.max(0, recordingStartTimeRef.current - transcriptionStartTimeRef.current) / 1000

        // Correct segments if needed (shared logic)
        const processSegments = (segs: any[]) => segs
            .map(s => ({ ...s, timestamp: s.timestamp - offset }))
            .filter(s => s.timestamp >= 0)

        // If overrides has metadata, respect it, otherwise fallback to local calculation
        let finalSegments = enhancedTranscriptData ? enhancedTranscriptData.segments : processSegments(segments)
        let finalWordSegments = enhancedTranscriptData ? enhancedTranscriptData.wordSegments : processSegments(wordSegments)
        let finalText = enhancedTranscriptData ? enhancedTranscriptData.text : (transcript + (interimTranscript ? ' ' + interimTranscript : ''))

        if (overrides && overrides.metadata) {
            if (overrides.metadata.lyrics) finalText = overrides.metadata.lyrics;
            if (overrides.metadata.lyricsSegments) finalSegments = overrides.metadata.lyricsSegments;
            if (overrides.metadata.lyricsWords) finalWordSegments = overrides.metadata.lyricsWords;
        }

        // Manual Fallback: if there's still interim text not in segments
        if (!enhancedTranscriptData && interimTranscript.trim() && !(overrides && overrides.metadata && overrides.metadata.lyrics)) {
            const hasInterim = segments.some(s => s.text.includes(interimTranscript.trim().split(' ')[0]))
            if (!hasInterim) {
                const ts = (Date.now() - transcriptionStartTimeRef.current) / 1000
                const processedTs = Math.max(0, ts - offset)
                finalSegments = [...finalSegments, { text: interimTranscript.trim(), timestamp: processedTs }]
            }
        }

        // AI Analysis (if not already done, or just do it here)
        let finalKeywords = aiKeywords
        if (!(overrides && overrides.metadata && overrides.metadata.aiKeywords) && finalKeywords.length === 0 && finalText.trim().length > 20) {
            try {
                finalKeywords = await analyzeFreestyleLyrics(finalText)
            } catch (e) {
                console.warn("AI Analysis failed", e)
            }
        }

        if (overrides && overrides.metadata && overrides.metadata.aiKeywords) {
            finalKeywords = overrides.metadata.aiKeywords;
        }

        try {
            const sessionData = {
                title: loadedSessionId ? undefined : `${mode === 'freestyle' ? 'Freestyle' : 'Thoughts'} ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
                blob: finalBlob,
                duration: duration > 0 ? duration : (finalSegments?.[finalSegments.length - 1]?.timestamp || 0),
                updatedAt: new Date(),
                // Only set these on creation
                ...(loadedSessionId ? {} : {
                    createdAt: new Date(),
                    date: new Date(),
                    type: mode,
                    beatId: currentBeatId,
                    beatStartTime: capturedBeatStartTime + (getCalibratedLatency() / 1000),
                }),
                ...overrides,
                metadata: {
                    moments,
                    lyrics: finalText,
                    lyricsSegments: finalSegments,
                    lyricsWords: finalWordSegments,
                    language,
                    notes,
                    aiKeywords: finalKeywords,
                    ...(overrides ? overrides.metadata : {})
                },
                analysis: (overrides && overrides.metadata && overrides.metadata.analysis) ? overrides.metadata.analysis : sessionAnalysis
            }

            if (loadedSessionId) {
                await db.sessions.update(loadedSessionId, sessionData)
                if (user) syncService.syncSessions(user.uid).catch(console.error);
            } else {
                await db.sessions.add({ ...sessionData, title: sessionData.title!, createdAt: new Date(), date: new Date(), type: mode, beatId: currentBeatId, beatStartTime: 0 } as any)
                if (user) syncService.syncSessions(user.uid).catch(console.error);
            }

            navigate('/library')
        } catch (e) {
            console.error('Failed to save session', e)
        }
    }

    const handleDiscard = () => {
        if (confirm('Discard changes?')) {
            setShowReviewModal(false)
            setPendingSessionBlob(null)
            setEnhancedTranscriptData(null)
            resetTranscript()
            setMoments([])
            setAiKeywords([])
            setNotes('')
            setLoadedSessionId(null)
            setLoadedSessionDuration(0)
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

    const sessionForModal = {
        id: loadedSessionId || undefined,
        title: loadedSessionId ? "Loaded Session" : "New Session",
        type: mode,
        duration: loadedSessionId ? loadedSessionDuration : duration,
        beatId: currentBeatId,
        date: new Date(),
        createdAt: new Date(),
        metadata: {
            lyrics: enhancedTranscriptData ? enhancedTranscriptData.text : (transcript + (interimTranscript ? ' ' + interimTranscript : '')).trim(),
            lyricsSegments: enhancedTranscriptData ? enhancedTranscriptData.segments : segments,
            lyricsWords: enhancedTranscriptData ? enhancedTranscriptData.wordSegments : wordSegments,
            aiKeywords: aiKeywords,
            analysis: sessionAnalysis || undefined,
            moments: moments
        }
    } as any as import('../db/db').DbSession;

    return (
        <div className="h-[100dvh] flex flex-col relative overflow-hidden bg-black text-white px-4" dir={language === 'he' ? 'rtl' : 'ltr'}>
            <RecordingHeader
                mode={mode}
                language={language}
                onLanguageToggle={() => setLanguage(l => l === 'he' ? 'en' : 'he')}
                onShowMicSetup={() => setShowMicSetup(true)}
                permissionError={!!permissionError}
            />

            {/* Hidden File Input for Testing/Importing */}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="audio/*,video/*"
                onChange={handleFileImport}
            />

            {/* Test/Debug Controls (Only in Freestyle Mode) */}
            {mode === 'freestyle' && flowState === 'idle' && (
                <div className="flex justify-center -mt-2 mb-2 gap-2 relative z-50">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] text-subdued hover:text-white flex items-center gap-1 bg-[#282828] px-2 py-1 rounded-full opacity-50 hover:opacity-100 transition-all"
                    >
                        <Upload size={10} />
                        Import File
                    </button>

                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-[10px] text-subdued hover:text-white flex items-center gap-1 bg-[#282828] px-2 py-1 rounded-full opacity-50 hover:opacity-100 transition-all relative"
                    >
                        <Clock size={10} />
                        Recent Sessions
                    </button>

                    {/* Quick History Dropdown */}
                    {showHistory && recentSessions && (
                        <div className="absolute top-8 bg-[#181818] border border-[#282828] rounded-xl p-2 w-64 shadow-2xl flex flex-col gap-1">
                            <h3 className="text-xs font-bold text-subdued px-2 mb-1">Recent Recordings</h3>
                            {recentSessions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleLoadSession(s)}
                                    className="text-left px-2 py-2 hover:bg-white/10 rounded flex justify-between items-center group"
                                >
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="text-xs font-bold truncate text-white">{s.title}</span>
                                        <span className="text-[10px] text-subdued">{new Date(s.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 bg-[#1DB954] text-black text-[10px] px-1.5 py-0.5 rounded font-bold">
                                        Analyze
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

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
                        notes={notes}
                        setNotes={setNotes}
                        onSaveMoment={handleSaveMoment}
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
                onAnalysisComplete={handleAnalysisComplete}
                data={sessionForModal}
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
