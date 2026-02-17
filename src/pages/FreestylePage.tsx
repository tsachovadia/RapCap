/**
 * Freestyle Recording Page - Modular Architecture
 * Refactored from 825 lines to ~280 lines
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Hash } from 'lucide-react'

// Hooks
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useTranscription } from '../hooks/useTranscription'
import { useFlowState } from '../hooks/useFlowState'
import { useWordDrop } from '../hooks/useWordDrop'

// Components
import { HeaderBar } from '../components/freestyle/HeaderBar'
import { BeatSection } from '../components/freestyle/BeatSection'
import { TrainingModeBar, type TrainingMode } from '../components/freestyle/TrainingModeBar'
import { WordStage } from '../components/freestyle/WordStage'
import { TranscriptPanel } from '../components/freestyle/TranscriptPanel'
import RecordingControls from '../components/freestyle/RecordingControls'
import ReviewSessionModal from '../components/freestyle/ReviewSessionModal'
import { MicrophoneSetupModal } from '../components/shared/MicrophoneSetupModal'
// NOTE: AudioEffectsControls moved to playback in SessionPlayer

// Services & Data
import { db } from '../db/db'
import { convertBlobToMp3 } from '../services/audioEncoder'
import { syncService } from '../services/dbSync'
import { DEFAULT_BEAT_ID } from '../data/beats'
import { useToast } from '../contexts/ToastContext'

export default function FreestylePage() {
    const navigate = useNavigate()
    const { showToast } = useToast()

    // Audio Recorder
    const {
        initializeStream,
        permissionError,
        startRecording,
        stopRecording,
        isRecording: _isRecording,
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
        // NOTE: vocalEffects removed - effects now applied in playback
    } = useAudioRecorder()

    // Language State
    const [language, setLanguage] = useState<'he' | 'en'>('he')

    // Transcription
    const [isTranscribing, setIsTranscribing] = useState(false)
    const { transcript, interimTranscript, segments, wordSegments, resetTranscript } = useTranscription(isTranscribing, language)

    // Beat State
    const [videoId, setVideoId] = useState(DEFAULT_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)

    // Training Mode
    const [trainingMode, setTrainingMode] = useState<TrainingMode>('free')

    // Word Drop Hook
    const {
        settings: wordDropSettings,
        setSettings: setWordDropSettings,
        selectedDeckId,
        setSelectedDeckId,
        currentWords
    } = useWordDrop({
        language,
        isActive: isTranscribing
    })

    // Flow State Hook
    const {
        flowState,
        moments,
        recordingStartTimeRef,
        transcriptionStartTimeRef,
        handleStartFlow,
        handlePauseFlow,
        handleResumeFlow,
        handleFinishFlow,
        handleSaveMoment,
        handlePlayerStateChange,
        handleDiscard: flowDiscard
    } = useFlowState({
        onStartRecording: startRecording,
        onStopRecording: stopRecording,
        youtubePlayer,
        beatVolume,
        resetTranscript,
        initializeStream,
        setIsTranscribing
    })

    // Modals
    const [showReviewModal, setShowReviewModal] = useState(false)
    const [pendingSessionBlob, setPendingSessionBlob] = useState<Blob | null>(null)
    const [showMicSetup, setShowMicSetup] = useState(false)
    const [enhancedTranscriptData, setEnhancedTranscriptData] = useState<{
        text: string
        segments: any[]
        wordSegments: any[]
    } | null>(null)

    // Handle permission errors
    useEffect(() => {
        if (permissionError) setShowMicSetup(true)
    }, [permissionError])

    // Initialize stream on mount
    useEffect(() => {
        initializeStream().catch(err => console.error("Stream init failed", err))
    }, [initializeStream])

    // Handle finish flow - show review modal
    const handleFinish = async () => {
        const blob = await handleFinishFlow()
        if (blob && blob.size > 0) {
            setPendingSessionBlob(blob)
            setShowReviewModal(true)
        }
    }

    // Save session
    const handleConfirmSave = async () => {
        if (!pendingSessionBlob) return

        let finalBlob = pendingSessionBlob
        try {
            console.log("🔄 Converting to MP3...")
            finalBlob = await convertBlobToMp3(pendingSessionBlob)
            console.log("✅ MP3 Conversion Complete:", finalBlob.size, "bytes")
        } catch (e) {
            console.error("⚠️ MP3 Conversion Failed, saving original:", e)
        }

        const offset = Math.max(0, recordingStartTimeRef.current - transcriptionStartTimeRef.current) / 1000
        const correctedSegments = segments
            .map(s => ({ ...s, timestamp: s.timestamp - offset }))
            .filter(s => s.timestamp >= 0)
        const correctedWordSegments = wordSegments
            .map(s => ({ ...s, timestamp: s.timestamp - offset }))
            .filter(s => s.timestamp >= 0)

        const finalData = enhancedTranscriptData || {
            text: transcript + (interimTranscript ? ' ' + interimTranscript : ''),
            segments: correctedSegments,
            wordSegments: correctedWordSegments
        }

        try {
            await db.sessions.add({
                title: `Freestyle ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
                blob: finalBlob,
                duration,
                beatId: videoId,
                createdAt: new Date(),
                date: new Date(),
                type: 'freestyle',
                syncOffset: 2000,
                metadata: {
                    moments,
                    lyrics: finalData.text,
                    lyricsSegments: finalData.segments,
                    lyricsWords: finalData.wordSegments,
                    language
                }
            })

            syncService.syncInBackground()
            navigate('/library')
        } catch (e) {
            console.error('Failed to save session', e)
            showToast('שגיאה בשמירה: ' + (e instanceof Error ? e.message : String(e)), 'error')
        }

        setShowReviewModal(false)
        setPendingSessionBlob(null)
        setEnhancedTranscriptData(null)
    }

    const handleDiscard = () => {
        if (confirm('Are you sure you want to discard this session?')) {
            setShowReviewModal(false)
            setPendingSessionBlob(null)
            setEnhancedTranscriptData(null)
            flowDiscard()
        }
    }

    // [NEW] Seek Handler
    const handleSeek = (time: number) => {
        if (youtubePlayer && youtubePlayer.seekTo) {
            youtubePlayer.seekTo(time, true);
        }
    };

    return (
        <div
            className="h-[100dvh] flex flex-col relative overflow-hidden bg-black text-white px-4"
            dir={language === 'he' ? 'rtl' : 'ltr'}
        >
            {/* Header */}
            <HeaderBar
                language={language}
                onLanguageToggle={() => setLanguage(l => l === 'he' ? 'en' : 'he')}
                onMicSetup={() => setShowMicSetup(true)}
                permissionError={permissionError}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col gap-3 min-h-0 pb-4">
                {/* Training Mode Bar */}
                <TrainingModeBar
                    mode={trainingMode}
                    onModeChange={setTrainingMode}
                    selectedDeckId={selectedDeckId}
                    onDeckSelect={setSelectedDeckId}
                    language={language}
                    wordDropEnabled={wordDropSettings.enabled}
                    onWordDropToggle={(enabled) => setWordDropSettings({ ...wordDropSettings, enabled })}
                />

                {/* Beat Section */}
                <BeatSection
                    videoId={videoId}
                    setVideoId={setVideoId}
                    flowState={flowState}
                    beatVolume={beatVolume}
                    setBeatVolume={setBeatVolume}
                    youtubePlayer={youtubePlayer}
                    setYoutubePlayer={setYoutubePlayer}
                    onPlayerStateChange={handlePlayerStateChange}
                    language={language}
                />

                {/* Word Stage */}
                <WordStage
                    flowState={flowState}
                    trainingMode={trainingMode}
                    wordDropSettings={wordDropSettings}
                    onUpdateSettings={setWordDropSettings}
                    currentWords={currentWords}
                    selectedDeckId={selectedDeckId}
                    onSelectDeck={setSelectedDeckId}
                    language={language}
                />

                {/* NOTE: Audio Effects Controls moved to SessionPlayer in library for post-processing */}

                {/* Recording Controls */}
                <div className="relative flex-none py-2 flex flex-col items-center gap-2 z-30">
                    {moments.length > 0 && (
                        <div className="absolute top-0 right-4 flex items-center gap-2 text-xs text-subdued bg-[#181818] px-2 py-1 rounded-lg border border-[#282828]">
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
                        onFinish={handleFinish}
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
                </div>

                {/* Transcript Panel */}
                <TranscriptPanel
                    flowState={flowState}
                    segments={segments}
                    interimTranscript={interimTranscript}
                    language={language}
                    onSeek={handleSeek} // [NEW]
                />
            </div>

            {/* Review Modal */}
            <ReviewSessionModal
                isOpen={showReviewModal}
                onClose={() => setShowReviewModal(false)}
                onSave={handleConfirmSave}
                onDiscard={handleDiscard}
                audioBlob={pendingSessionBlob}
                onUpdateTranscript={(text, newSegments, newWords) => {
                    setEnhancedTranscriptData({ text, segments: newSegments, wordSegments: newWords })
                }}
                data={{
                    title: `Freestyle ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
                    type: 'freestyle',
                    duration,
                    beatId: videoId,
                    date: new Date(),
                    createdAt: new Date(),
                    metadata: {
                        lyrics: enhancedTranscriptData?.text || transcript,
                        lyricsSegments: enhancedTranscriptData?.segments || segments,
                        lyricsWords: enhancedTranscriptData?.wordSegments || wordSegments
                    }
                }}
            />

            {/* Microphone Setup Modal */}
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
