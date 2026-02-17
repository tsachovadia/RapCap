import { useState, useCallback } from 'react';
import { Mic, Pause, Play, Square, Save, Trash2 } from 'lucide-react';
import { useStudio } from '../../contexts/StudioContext';
import { db } from '../../db/db';
import { useToast } from '../../contexts/ToastContext';

export default function RecordingFooter() {
    const { showToast } = useToast();
    const {
        flowState,
        handleStartFlow,
        handlePauseFlow,
        handleResumeFlow,
        handleFinishFlow,
        handleDiscard,
        recorder,
        bars,
        clearBars,
        transcript,
        segments,
        wordSegments,
        moments,
        videoId,
        sessionTitle,
        language,
    } = useStudio();

    // After recording stops, hold the blob for save/discard
    const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isIdle = flowState === 'idle';
    const isRecording = flowState === 'recording';
    const isPaused = flowState === 'paused';
    const isPreroll = flowState === 'preroll';
    const hasPending = pendingBlob !== null;

    const formatDuration = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    };

    const handleStop = useCallback(async () => {
        const blob = await handleFinishFlow();
        if (blob && blob.size > 100) {
            setPendingBlob(blob);
        }
    }, [handleFinishFlow]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await db.sessions.add({
                title: sessionTitle || 'Studio Session',
                type: 'freestyle',
                beatId: videoId,
                duration: recorder.duration,
                date: new Date(),
                createdAt: new Date(),
                blob: pendingBlob || undefined,
                metadata: {
                    lyrics: transcript,
                    lyricsSegments: segments,
                    lyricsWords: wordSegments,
                    moments,
                    bars: bars.map(b => ({ id: b.id, text: b.text })),
                    language,
                },
            });
            showToast('הסשן נשמר!', 'success');
            setPendingBlob(null);
            clearBars();
        } catch (e) {
            console.error('Failed to save session:', e);
            showToast('שגיאה בשמירה', 'error');
        } finally {
            setIsSaving(false);
        }
    }, [pendingBlob, sessionTitle, videoId, recorder.duration, transcript, segments, wordSegments, moments, bars, language, clearBars, showToast]);

    const handleDiscardRecording = useCallback(() => {
        setPendingBlob(null);
        handleDiscard();
        clearBars();
    }, [handleDiscard, clearBars]);

    return (
        <div
            className="shrink-0 bg-[#181818] border-t border-white/10 px-4 py-3 flex items-center justify-center gap-4 z-40 relative"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
            {/* Pending save/discard state */}
            {hasPending && isIdle ? (
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDiscardRecording}
                        className="flex items-center gap-1.5 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-full transition-colors text-sm"
                    >
                        <Trash2 size={16} />
                        <span>מחק</span>
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-1.5 px-6 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-all active:scale-95 disabled:opacity-50 text-sm"
                    >
                        <Save size={16} />
                        <span>{isSaving ? 'שומר...' : 'שמור'}</span>
                    </button>
                </div>
            ) : isIdle ? (
                /* Record button */
                <button
                    onClick={handleStartFlow}
                    className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full transition-all shadow-lg shadow-red-900/30 active:scale-95"
                >
                    <Mic size={20} />
                    <span className="text-sm">הקלט</span>
                </button>
            ) : (
                <>
                    {/* Duration */}
                    <span className="text-lg font-mono text-white/60 tabular-nums min-w-[60px] text-center">
                        {formatDuration(recorder.duration)}
                    </span>

                    {/* Pause / Resume */}
                    {isRecording && (
                        <button
                            onClick={handlePauseFlow}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <Pause size={20} />
                        </button>
                    )}
                    {isPaused && (
                        <button
                            onClick={handleResumeFlow}
                            className="p-3 rounded-full bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] transition-colors"
                        >
                            <Play size={20} />
                        </button>
                    )}

                    {/* Preroll indicator */}
                    {isPreroll && (
                        <span className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full animate-pulse">
                            מתכונן...
                        </span>
                    )}

                    {/* Stop */}
                    {!isPreroll && (
                        <button
                            onClick={handleStop}
                            className="p-3 rounded-full bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors"
                        >
                            <Square size={20} />
                        </button>
                    )}

                    {/* Recording indicator */}
                    {isRecording && (
                        <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    )}
                </>
            )}
        </div>
    );
}
