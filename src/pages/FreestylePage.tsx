/**
 * Freestyle Recording Page - Unified Logic
 */
import { useState, useRef, useEffect, useMemo } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useTranscription } from '../hooks/useTranscription'
import BeatPlayer from '../components/freestyle/BeatPlayer'
import RecordingControls from '../components/freestyle/RecordingControls'
import WordDropControls, { type WordDropSettings } from '../components/freestyle/WordDropControls'
import ReviewSessionModal from '../components/freestyle/ReviewSessionModal'
import { MicrophoneSetupModal } from '../components/shared/MicrophoneSetupModal'
import { db } from '../db/db'
import { ArrowLeft, MoreHorizontal, Mic, Sparkles, Hash, Link as LinkIcon, Check, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { commonWordsHe, commonWordsEn } from '../data/wordBank'

// Better static ID: 'HAFijG6kyRk' (User provided beat)
const STATIC_BEAT_ID = 'HAFijG6kyRk'

export default function FreestylePage() {
    const navigate = useNavigate()
    const {
        initializeStream,
        permissionError,
        startRecording,
        stopRecording,
        isRecording,
        duration,
        analyser,
        // deviceLabel,
        availableDevices,
        selectedDeviceId,
        setDeviceId,
        audioConstraints,
        setAudioConstraints,
        // New Effects & Output
        availableOutputDevices,
        selectedOutputId,
        setOutputId,
        vocalEffects,
        setVocalEffects,
        resetAudioState
    } = useAudioRecorder()

    // Language State
    const [language, setLanguage] = useState<'he' | 'en'>('he')

    // Transcription State (Decoupled from recording to allow immediate start on user gesture)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const { transcript, interimTranscript, segments, wordSegments, resetTranscript } = useTranscription(isTranscribing, language)

    // Beat State
    const [videoId, setVideoId] = useState(STATIC_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)

    // Auto-scroll ref
    const transcriptEndRef = useRef<HTMLDivElement>(null)

    // Buffering Guard State
    const wasPausedByBuffering = useRef(false)

    const handlePlayerStateChange = (event: any) => {
        const state = event.data
        // State 3 = Buffering
        if (state === 3 && flowState === 'recording') {
            console.warn("⚠️ Beat Buffering detected! Pausing flow to maintain sync.")
            wasPausedByBuffering.current = true
            handlePauseFlow()
            alert(language === 'he' ? 'האינטרנט איטי. ההקלטה הושהתה כדי לשמור על סנכרון.' : 'Network Slow. Recording paused to maintain sync.')
        }
        // State 1 = Playing
        if (state === 1 && flowState === 'paused' && wasPausedByBuffering.current) {
            console.log("✅ Beat buffered and ready.")
            // Optional: We could auto-resume, but user might be confused. Better to let them resume manually.
            // But we reset the flag so next pause isn't treated as buffering
            wasPausedByBuffering.current = false
        }
    }

    // Auto-scroll logic
    useEffect(() => {
        if (segments.length > 0 || interimTranscript) {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
    }, [segments, interimTranscript])
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState('')

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlSubmit = () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowUrlInput(false)
            setUrlInput('')
        } else {
            alert(language === 'he' ? 'קישור לא תקין' : 'Invalid YouTube URL')
        }
    }
    // Flow State Machine
    type FlowState = 'idle' | 'preroll' | 'recording' | 'paused'
    const [flowState, setFlowState] = useState<FlowState>('idle')

    // Feature: Moments (Markers)
    const [moments, setMoments] = useState<number[]>([])

    // Feature: Review Modal
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [pendingSessionBlob, setPendingSessionBlob] = useState<Blob | null>(null)

    // Mic Setup Modal State
    const [showMicSetup, setShowMicSetup] = useState(false)

    // Trigger modal on error
    useEffect(() => {
        if (permissionError) {
            setShowMicSetup(true)
        }
    }, [permissionError])

    // Feature: Random Words
    const [wordDropSettings, setWordDropSettings] = useState<WordDropSettings>({
        enabled: false,
        interval: 4,
        quantity: 1
    })
    const [currentRandomWords, setCurrentRandomWords] = useState<string[]>([])
    const randomIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Pool of all words
    const allWords = useMemo(() => {
        const source = language === 'he' ? commonWordsHe : commonWordsEn
        return source.map(w => w.word)
    }, [language])

    // Polling Ref for Pre-Roll Check
    const preRollCheckRef = useRef<number | null>(null)

    // Ensure stream is initialized on mount
    useEffect(() => {
        initializeStream().catch(err => console.error("Stream init failed", err))
    }, [initializeStream])

    // Random Word Effect
    // Random Word Effect
    useEffect(() => {
        if (wordDropSettings.enabled && flowState === 'recording') {
            const tick = () => {
                const words = []
                for (let i = 0; i < wordDropSettings.quantity; i++) {
                    words.push(allWords[Math.floor(Math.random() * allWords.length)])
                }
                setCurrentRandomWords(words)

                // Random variance (approx +/- 25% of interval)
                // e.g. 4s -> 3s to 5s range
                const variance = (wordDropSettings.interval * 1000) * 0.5
                const base = wordDropSettings.interval * 1000
                const nextInterval = base - (variance / 2) + Math.random() * variance

                randomIntervalRef.current = setTimeout(tick, nextInterval)
            }
            tick()
            return () => {
                if (randomIntervalRef.current) clearTimeout(randomIntervalRef.current)
            }
        } else {
            // Clear words when not recording
            setTimeout(() => {
                setCurrentRandomWords(prev => prev.length > 0 ? [] : prev)
            }, 0)
            if (randomIntervalRef.current) clearTimeout(randomIntervalRef.current)
        }
    }, [wordDropSettings.enabled, wordDropSettings.interval, wordDropSettings.quantity, flowState, allWords])

    // UNIFIED CONTROL LOGIC


    const handlePauseFlow = () => {
        console.log('⏸️ Pausing Flow...')
        setFlowState('paused')
        setIsTranscribing(false) // Pause transcription
        if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
            youtubePlayer.pauseVideo()
        }
        // Note: Recording continues in background in this MVP implementation
        // or we could stop and stitch later. For now, we assume simple pause interactions.
    }

    const handleResumeFlow = () => {
        console.log('▶️ Resuming Flow...')
        setFlowState('recording')
        setIsTranscribing(true) // Resume transcription
        if (youtubePlayer) youtubePlayer.playVideo()
    }

    const handleFinishFlow = async () => {
        console.log('🛑 Finishing Flow...')
        setFlowState('idle')
        setIsTranscribing(false) // Stop transcription
        if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)
        if (youtubePlayer) youtubePlayer.pauseVideo()

        if (isRecording) {
            const blob = await stopRecording()
            if (blob.size > 0) {
                setPendingSessionBlob(blob)
                setShowReviewModal(true)
            }
        }
    }

    const handleConfirmSave = () => {
        if (pendingSessionBlob) {
            // Calculate offset (Pre-Roll Duration)
            const offset = Math.max(0, recordingStartTimeRef.current - transcriptionStartTimeRef.current) / 1000

            // Correct Segments
            const correctedSegments = segments
                .map(s => ({ ...s, timestamp: s.timestamp - offset }))
                .filter(s => s.timestamp >= 0)

            const correctedWordSegments = wordSegments
                .map(s => ({ ...s, timestamp: s.timestamp - offset }))
                .filter(s => s.timestamp >= 0)

            saveSession(pendingSessionBlob, correctedSegments, correctedWordSegments)
            setShowReviewModal(false)
            setPendingSessionBlob(null)
        }
    }

    const handleDiscard = () => {
        if (confirm('Are you sure you want to discard this session?')) {
            setShowReviewModal(false)
            setPendingSessionBlob(null)
            resetTranscript()
            setMoments([])
        }
    }

    // Precise timing ref
    const recordingStartTimeRef = useRef<number>(0)
    const transcriptionStartTimeRef = useRef<number>(0)

    // Update start logic to set this ref
    const handleStartFlow = async () => {
        console.log('🎤 Starting Flow...')

        // Start transcription IMMEDIATELY to capture user gesture
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
            // Alert removed here, relying on permissionError state -> Modal
            // But we still set idle
            setFlowState('idle')
            setIsTranscribing(false) // Revert if failed
            if (youtubePlayer) youtubePlayer.pauseVideo()
        }
    }

    const monitorPreRoll = () => {
        // Fallback safety timeout
        const safetyTimeout = setTimeout(() => {
            if (preRollCheckRef.current) {
                console.warn("⚠️ Pre-roll timed out, forcing start...");
                cancelAnimationFrame(preRollCheckRef.current);
                startRecording().then(() => {
                    recordingStartTimeRef.current = Date.now()
                    setFlowState('recording')
                });
            }
        }, 4000); // 4s max wait

        const check = () => {
            if (!youtubePlayer) return;

            const currentTime = youtubePlayer.getCurrentTime();
            if (currentTime >= 2.0) { // 2s Pre-Roll
                console.log('✅ Pre-Roll Complete! Recording...');
                clearTimeout(safetyTimeout);
                startRecording().then(() => {
                    recordingStartTimeRef.current = Date.now() // Capture exact start
                    setFlowState('recording')
                });
                if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current);
            } else {
                preRollCheckRef.current = requestAnimationFrame(check);
            }
        };
        preRollCheckRef.current = requestAnimationFrame(check);
    }

    const handleSaveMoment = () => {
        const now = Date.now()
        // If we have a start time, use it. Fallback to duration if needed (mostly for safety)
        const preciseTime = recordingStartTimeRef.current > 0
            ? (now - recordingStartTimeRef.current) / 1000
            : duration
        setMoments(prev => [...prev, preciseTime])
    }

    const saveSession = async (blob: Blob, finalSegments: any[], finalWordSegments: any[]) => {
        try {
            await db.sessions.add({
                title: `Freestyle ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
                blob: blob,
                duration: duration,
                beatId: videoId,
                createdAt: new Date(),
                type: 'freestyle',
                syncOffset: 2000,
                metadata: {
                    moments: moments, // Renamed to capture correctly

                    lyrics: transcript + (interimTranscript ? ' ' + interimTranscript : ''),
                    lyricsSegments: finalSegments, // Use corrected segments
                    lyricsWords: finalWordSegments, // Use corrected words
                    language: language
                }
            })
            // Reset UI
            setMoments([])
            resetTranscript()
            alert('האימון נשמר בהצלחה בספריה!')
        } catch (e) {
            console.error('Failed to save session', e)
            alert('שגיאה בשמירת ההקלטה')
        }
    }



    // Format time helper
    // Format time helper (unused for now in UI but kept for reference if needed, or remove)
    // const fmt = (s: number) => {
    //     const min = Math.floor(s / 60)
    //     const sec = Math.floor(s % 60)
    //     return `${min}:${sec.toString().padStart(2, '0')}`
    // }

    return (
        <div className="h-[100dvh] flex flex-col relative overflow-hidden bg-black text-white px-4" dir={language === 'he' ? 'rtl' : 'ltr'}>
            {/* Header */}
            <header className="flex-none z-40 flex items-center justify-between py-2 bg-[#121212] -mx-4 px-4 mb-2 border-b border-[#282828]">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/')} className="btn-icon">
                        <ArrowLeft size={24} className={language === 'he' ? '' : 'rotate-180'} />
                    </button>
                    {/* Language Toggle */}
                    <button
                        onClick={() => setLanguage(l => l === 'he' ? 'en' : 'he')}
                        className="text-xl hover:scale-110 transition-transform"
                        title="Switch Language"
                    >
                        {language === 'he' ? '🇮🇱' : '🇺🇸'}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    <h1 className="text-base font-bold">Live Studio</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowMicSetup(true)}
                        className={`btn-icon ${permissionError ? 'text-red-500 animate-pulse' : ''}`}
                        title={language === 'he' ? 'הגדרת מיקרופון' : 'Microphone Setup'}
                    >
                        <Mic size={24} />
                    </button>
                    <button onClick={() => navigate('/settings')} className="btn-icon">
                        <MoreHorizontal size={24} />
                    </button>
                </div>
            </header>

            {/* Main Content Area - Fill remaining space */}
            <div className="flex-1 flex flex-col gap-2 min-h-0 pb-4">

                {/* Upper Content Area: Left Column (Player+Words) | Right Column (Volume) */}
                <div className="flex-1 flex gap-2 min-h-0 relative">

                    {/* Left Column: Player & Words */}
                    <div className="flex-1 flex flex-col gap-2 min-h-0">

                        {/* 1. Beat Player (Compact) */}
                        <div className="h-20 flex-none bg-[#181818] rounded-xl overflow-hidden relative border border-[#282828] group">
                            <BeatPlayer
                                videoId={videoId}
                                isPlaying={flowState !== 'idle' && flowState !== 'paused'}
                                volume={beatVolume}
                                onReady={(player) => setYoutubePlayer(player)}
                                onStateChange={handlePlayerStateChange}
                            />

                            {/* Status Overlay */}
                            <div className="absolute top-2 left-2 flex gap-2 pointer-events-none z-10">
                                {flowState === 'preroll' && (
                                    <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded animate-pulse">
                                        מתכונן...
                                    </span>
                                )}
                                {flowState === 'recording' && (
                                    <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
                                        REC
                                    </span>
                                )}
                            </div>

                            {/* URL Input Overlay */}
                            {showUrlInput ? (
                                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in">
                                    <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl space-y-4">
                                        <h3 className="text-lg font-bold text-white text-center">
                                            {language === 'he' ? 'בחר ביט מיוטיוב' : 'Select YouTube Beat'}
                                        </h3>
                                        <div className="flex w-full gap-2">
                                            <input
                                                type="text"
                                                placeholder="Paste YouTube Link..."
                                                className="flex-1 bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954] w-full"
                                                value={urlInput}
                                                onChange={e => setUrlInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                                                autoFocus
                                            />
                                            <button onClick={handleUrlSubmit} className="bg-[#1DB954] text-black p-1.5 rounded hover:bg-[#1ed760] transition-colors"><Check size={14} /></button>
                                            <button onClick={() => setShowUrlInput(false)} className="bg-[#333] text-white p-1.5 rounded hover:bg-[#444] transition-colors"><X size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowUrlInput(true)}
                                    className="absolute top-2 right-2 bg-black/80 hover:bg-[#1DB954] hover:text-black text-white px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all flex items-center gap-2 z-20 border border-white/10 backdrop-blur-sm"
                                    title="Change Beat"
                                >
                                    <LinkIcon size={12} />
                                    <span>{language === 'he' ? 'שנה ביט' : 'Change Beat'}</span>
                                </button>
                            )}
                        </div>

                        {/* 2. Main Stage (Words) - Fills remaining vertical space */}
                        <div className="flex-1 bg-[#181818] rounded-xl border border-[#282828] relative min-h-0 z-0">

                            {/* Word Drop Controls - Allow Overflow for Menu */}
                            <div className="absolute top-2 right-2 z-50">
                                <WordDropControls
                                    settings={wordDropSettings}
                                    onUpdate={setWordDropSettings}
                                    language={language}
                                />
                            </div>

                            {/* Words Container (Responsive Fixed) */}
                            <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-start pt-14 p-4 min-h-[160px]">
                                {wordDropSettings.enabled && flowState === 'recording' ? (
                                    currentRandomWords.length > 0 ? (
                                        <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300 pb-8">
                                            {currentRandomWords.map((word, i) => (
                                                <span key={i} className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#1DB954] to-[#1ED760] drop-shadow-[0_0_15px_rgba(29,185,84,0.4)] leading-tight tracking-tight text-center break-words">
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-subdued opacity-20 animate-pulse mt-4">
                                            <Sparkles size={64} />
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center gap-4 text-subdued/30 select-none mt-4">
                                        <span className="text-sm font-medium uppercase tracking-widest text-center">{language === 'he' ? 'אזור מילים' : 'Word Drop Area'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Vertical Beat Settings (Tall) */}
                    <div className="w-16 bg-[#181818] rounded-xl flex flex-col items-center py-4 gap-4 border border-[#282828] h-full">
                        <div className="text-[10px] text-subdued font-bold uppercase tracking-wider -rotate-90 mt-2">VOL</div>
                        <div className="flex-1 w-full flex justify-center py-2 min-h-0">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={beatVolume}
                                onChange={(e) => {
                                    const val = Number(e.target.value)
                                    setBeatVolume(val)
                                    if (youtubePlayer) youtubePlayer.setVolume(val)
                                }}
                                className="h-full w-1 accent-[#1DB954] bg-[#3E3E3E] rounded appearance-none cursor-pointer"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                        </div>

                    </div>

                </div>

                {/* Controls Area (Swapped Position) */}
                <div className="relative flex-none py-2 flex flex-col items-center gap-2 z-30">

                    {/* Moments List (Top Right of Controls) - Only this remains here or move? Keep it simpler. */}
                    {moments.length > 0 && (
                        <div className="absolute top-0 right-4 flex items-center gap-2 text-xs text-subdued bg-[#181818] px-2 py-1 rounded-lg border border-[#282828] z-20">
                            <Hash size={10} />
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
                        // New Props
                        availableOutputDevices={availableOutputDevices}
                        selectedOutputId={selectedOutputId}
                        onOutputChange={setOutputId}
                        vocalEffects={vocalEffects}
                        setVocalEffects={setVocalEffects}
                    />
                </div>

                {/* Secondary: Live Transcript (Spotify-Style Teleprompter) */}
                <div className="flex-1 min-h-[160px] bg-[#121212]/50 rounded-xl border border-[#282828] p-4 overflow-y-auto no-scrollbar relative mx-0 mb-safe flex flex-col gap-4 shadow-inner">
                    <div className="absolute top-2 right-2 opacity-50 z-10 pointer-events-none">
                        <Mic size={16} className="text-subdued/20" />
                    </div>

                    {/* Placeholder if empty */}
                    {segments.length === 0 && !interimTranscript && (
                        <div className="h-full flex flex-col items-center justify-center text-subdued/30 italic gap-2 min-h-[120px]">
                            <Sparkles size={24} className="opacity-20" />
                            <span className="text-lg font-medium">
                                {language === 'he' ? 'המילים שלך יופיעו כאן בזמן אמת...' : 'Your lyrics will appear here in real-time...'}
                            </span>
                        </div>
                    )}

                    {/* Final Segments */}
                    {segments.map((seg, i) => (
                        <div key={i} className="text-xl md:text-2xl text-white/60 font-bold transition-all duration-500 ease-out hover:text-white/90">
                            <span className="text-sm font-mono text-[#1DB954]/50 mr-2 align-middle select-none">
                                [{Math.floor(seg.timestamp / 60)}:{Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}]
                            </span>
                            <p className="inline leading-snug">{seg.text}</p>
                        </div>
                    ))}

                    {/* Active Interim Segment (The "Current Line") */}
                    {interimTranscript && (
                        <div className="text-2xl md:text-3xl text-white font-black leading-tight animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <span className="text-[#1DB954] drop-shadow-[0_0_15px_rgba(29,185,84,0.4)]">
                                {interimTranscript}
                            </span>
                        </div>
                    )}

                    {/* Auto-scroll anchor */}
                    <div ref={transcriptEndRef} className="h-4 flex-none" />
                </div>
            </div>

            {/* Review Modal */}
            <ReviewSessionModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSave={handleConfirmSave}
                onDiscard={handleDiscard}
                data={{
                    transcript: transcript,
                    duration: duration,
                    beatId: videoId,
                    date: new Date(),
                    // Apply offset visualization in review? 
                    // Ideally we pass corrected data, but `segments` state is raw.
                    // We can do on-the-fly correction here for the modal view if needed, 
                    // or just accept that review might be slightly off until saved?
                    // BETTER: Pass corrected data.
                    segments: segments.map(s => ({
                        ...s,
                        timestamp: s.timestamp - (Math.max(0, recordingStartTimeRef.current - transcriptionStartTimeRef.current) / 1000)
                    })).filter(s => s.timestamp >= 0),
                    wordSegments: wordSegments.map(s => ({
                        ...s,
                        timestamp: s.timestamp - (Math.max(0, recordingStartTimeRef.current - transcriptionStartTimeRef.current) / 1000)
                    })).filter(s => s.timestamp >= 0)
                }}
            />

            {/* Microphone Setup / Troubleshooting Modal */}
            <MicrophoneSetupModal
                isOpen={showMicSetup}
                onClose={() => setShowMicSetup(false)}
                permissionError={permissionError}
                initializeStream={initializeStream}
                audioAnalyser={analyser} // Use the one from recorderState
                availableDevices={availableDevices}
                selectedDeviceId={selectedDeviceId}
                setDeviceId={setDeviceId}
                resetAudioState={resetAudioState}
            />
        </div>
    )
}
