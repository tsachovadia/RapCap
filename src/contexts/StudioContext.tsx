import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { StudioMode, StudioBar } from '../types/studio';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTranscription } from '../hooks/useTranscription';
import { useFlowState, type FlowState } from '../hooks/useFlowState';
import { DEFAULT_BEAT_ID } from '../data/beats';

// ─── Context Value ───────────────────────────────────────────────

interface StudioContextValue {
    // Mode
    activeMode: StudioMode;
    setActiveMode: (m: StudioMode) => void;

    // Bars
    bars: StudioBar[];
    addBar: (bar: StudioBar) => void;
    updateBar: (id: string, updates: Partial<StudioBar>) => void;
    clearBars: () => void;

    // Beat
    videoId: string;
    setVideoId: (id: string) => void;
    beatVolume: number;
    setBeatVolume: (v: number) => void;
    youtubePlayer: any;
    setYoutubePlayer: (p: any) => void;

    // Recording
    recorder: ReturnType<typeof useAudioRecorder>;
    flowState: FlowState;
    handleStartFlow: () => Promise<void>;
    handlePauseFlow: () => void;
    handleResumeFlow: () => void;
    handleFinishFlow: () => Promise<Blob | undefined>;
    handleSaveMoment: () => void;
    handlePlayerStateChange: (event: any) => void;
    handleDiscard: () => void;
    moments: number[];

    // Transcription
    transcript: string;
    interimTranscript: string;
    segments: { text: string; timestamp: number }[];
    wordSegments: any[];
    isListening: boolean;
    resetTranscript: () => void;

    // Session meta
    sessionTitle: string;
    setSessionTitle: (t: string) => void;
    language: 'he' | 'en';
    setLanguage: (l: 'he' | 'en') => void;
}

const StudioContext = createContext<StudioContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────

export function StudioProvider({ children }: { children: ReactNode }) {
    // Mode
    const [activeMode, setActiveMode] = useState<StudioMode>('freestyle');

    // Bars
    const [bars, setBars] = useState<StudioBar[]>([]);
    const addBar = useCallback((bar: StudioBar) => setBars(prev => {
        // Deduplicate: skip if same text + close timestamp already exists
        const exists = prev.some(b =>
            b.text === bar.text &&
            Math.abs((b.timestamp ?? 0) - (bar.timestamp ?? 0)) < 2
        );
        if (exists) return prev;
        return [...prev, bar];
    }), []);
    const updateBar = useCallback((id: string, updates: Partial<StudioBar>) => {
        setBars(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    }, []);
    const clearBars = useCallback(() => setBars([]), []);

    // Beat
    const [videoId, setVideoId] = useState(DEFAULT_BEAT_ID);
    const [beatVolume, setBeatVolume] = useState(50);
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null);

    // Session meta
    const [sessionTitle, setSessionTitle] = useState('');
    const [language, setLanguage] = useState<'he' | 'en'>('he');

    // Transcription state (drives isRecording via flowState)
    // Faster silence threshold (1200ms) for snappier bar creation in Studio
    const [isTranscribing, setIsTranscribing] = useState(false);
    const transcription = useTranscription(isTranscribing, language, 1200);

    // Audio recorder
    const recorder = useAudioRecorder();

    // Flow state machine
    const flow = useFlowState({
        onStartRecording: recorder.startRecording,
        onStopRecording: recorder.stopRecording,
        youtubePlayer,
        beatVolume,
        resetTranscript: transcription.resetTranscript,
        initializeStream: recorder.initializeStream,
        setIsTranscribing,
    });

    // ─── Value ───────────────────────────────────────────────────

    const value: StudioContextValue = {
        activeMode,
        setActiveMode,

        bars,
        addBar,
        updateBar,
        clearBars,

        videoId,
        setVideoId,
        beatVolume,
        setBeatVolume,
        youtubePlayer,
        setYoutubePlayer,

        recorder,
        flowState: flow.flowState,
        handleStartFlow: flow.handleStartFlow,
        handlePauseFlow: flow.handlePauseFlow,
        handleResumeFlow: flow.handleResumeFlow,
        handleFinishFlow: flow.handleFinishFlow,
        handleSaveMoment: flow.handleSaveMoment,
        handlePlayerStateChange: flow.handlePlayerStateChange,
        handleDiscard: flow.handleDiscard,
        moments: flow.moments,

        transcript: transcription.transcript,
        interimTranscript: transcription.interimTranscript,
        segments: transcription.segments,
        wordSegments: transcription.wordSegments,
        isListening: transcription.isListening,
        resetTranscript: transcription.resetTranscript,

        sessionTitle,
        setSessionTitle,
        language,
        setLanguage,
    };

    return (
        <StudioContext.Provider value={value}>
            {children}
        </StudioContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────

export function useStudio() {
    const ctx = useContext(StudioContext);
    if (!ctx) throw new Error('useStudio must be used within StudioProvider');
    return ctx;
}
