import React, { useState } from 'react';
import type { SessionAnalysis } from '../../db/db';
import { db } from '../../db/db';
import { Sparkles, BarChart2, MessageSquare, Check, Save, Play, Pause } from 'lucide-react';
import clsx from 'clsx';

interface AnalysisViewProps {
    analysis: SessionAnalysis;
    originalTranscript?: string; // Optional because sometimes we only show result
    audioBlob?: Blob | null;
    segments?: Array<{ text: string, timestamp: number }>;
}

export const AnalysisView: React.FC<AnalysisViewProps> = ({ analysis, originalTranscript, audioBlob, segments }) => {
    const [activeTab, setActiveTab] = useState<'lyrics' | 'punchlines'>('lyrics');
    const [viewMode, setViewMode] = useState<'original' | 'corrected'>('corrected');
    const [savedPunchlines, setSavedPunchlines] = useState<Set<number>>(new Set());

    // Audio State
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);

    React.useEffect(() => {
        if (audioBlob) {
            const url = URL.createObjectURL(audioBlob);
            setAudioUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [audioBlob]);

    const playSegment = (punchlineText: string, index: number) => {
        if (!audioRef.current || !segments) return;

        // 1. Find the best matching segment timestamp
        // Simple strategy: find segment that contains a significant chunk of the punchline
        // Normalize for better matching
        const normalize = (s: string) => s.toLowerCase().replace(/[^a-zא-ת0-9]/g, '');
        const target = normalize(punchlineText).slice(0, 15); // Match start

        const match = segments.find(s => normalize(s.text).includes(target));

        if (match) {
            if (playingIndex === index) {
                audioRef.current.pause();
                setPlayingIndex(null);
            } else {
                audioRef.current.currentTime = match.timestamp;
                audioRef.current.play();
                setPlayingIndex(index);
            }
        } else {
            // Fallback: Just play from start if no match (or warn)
            if (playingIndex === index) {
                audioRef.current.pause();
                setPlayingIndex(null);
            } else {
                audioRef.current.play(); // Play from current or start
                setPlayingIndex(index);
            }
        }
    };

    const handleAudioEnded = () => setPlayingIndex(null);

    const handleSavePunchline = async (punch: { text: string, score: number, reason: string }, index: number) => {
        try {
            await db.vault.add({
                type: 'punchline',
                content: punch.text,
                metadata: { score: punch.score, reason: punch.reason },
                createdAt: new Date(),
                // sessionId we might need to pass in props if we want to link it
            });
            setSavedPunchlines(prev => new Set(prev).add(index));
        } catch (error) {
            console.error("Failed to save to vault:", error);
            alert("Failed to save punchline");
        }
    };

    const renderLyricsWithHeatmap = (text: string) => {
        // Fallback for old data without tokens
        if (!analysis.tokens) {
            const words = text.split(/\s+/);
            return (
                <div className="leading-loose text-lg font-mono whitespace-pre-wrap">
                    {words.map((word, idx) => {
                        const cleanWord = word.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "");
                        const scheme = analysis.rhymeSchemes.find(s =>
                            s.words.some(w => w.text === cleanWord)
                        );

                        const style = scheme ? {
                            color: scheme.color,
                            textShadow: `0 0 10px ${scheme.color}40`,
                            fontWeight: 'bold'
                        } : {};

                        return (
                            <span key={idx} className="inline-block mr-1.5 transition-colors duration-300" style={style}>
                                {word}
                            </span>
                        );
                    })}
                </div>
            )
        }

        // New Token-Based Rendering
        return (
            <div className="leading-loose text-lg font-mono whitespace-pre-wrap">
                {analysis.tokens.map((token, idx) => {
                    const scheme = token.id ? analysis.rhymeSchemes.find(s => s.id === token.id) : null;
                    const style = scheme ? {
                        color: scheme.color,
                        textShadow: `0 0 10px ${scheme.color}40`,
                        fontWeight: 'bold'
                    } : { color: '#ffffff90' }; // Default slight dim

                    return (
                        <span
                            key={idx}
                            className="inline-block mr-1.5 transition-all duration-300 hover:scale-105 cursor-default relative group"
                            style={style}
                        >
                            {token.text}
                            {/* Hover tooltip for phonetic if available (debug or advanced view) */}
                            {token.phonetic && (
                                <span className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/80 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none text-white z-20">
                                    {token.phonetic}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
        );
    };



    return (
        <div className="flex flex-col h-full bg-[#121212] rounded-xl overflow-hidden border border-[#282828]">
            {/* Hidden Audio Element */}
            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={handleAudioEnded}
                    onPause={() => setPlayingIndex(null)}
                />
            )}

            {/* Header Tabs */}
            <div className="flex border-b border-[#282828]">
                <button
                    onClick={() => setActiveTab('lyrics')}
                    className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'lyrics' ? 'bg-[#1DB954]/10 text-[#1DB954] border-b-2 border-[#1DB954]' : 'text-subdued hover:text-white'}
                `}>
                    <BarChart2 size={16} />
                    Flow & Rhymes
                </button>
                <button
                    onClick={() => setActiveTab('punchlines')}
                    className={`flex-1 py-3 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-colors
                    ${activeTab === 'punchlines' ? 'bg-[#1DB954]/10 text-[#1DB954] border-b-2 border-[#1DB954]' : 'text-subdued hover:text-white'}
                `}>
                    <Sparkles size={16} />
                    Punchline Vault
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'lyrics' && (
                    <div className="space-y-4">
                        {/* Control Bar */}
                        <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#121212] z-10 py-2 border-b border-[#282828]">
                            <div className="flex bg-[#282828] rounded-lg p-0.5">
                                <button
                                    onClick={() => setViewMode('original')}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'original' ? 'bg-[#3E3E3E] text-white shadow-sm' : 'text-subdued hover:text-white'}`}
                                >
                                    Original
                                </button>
                                <button
                                    onClick={() => setViewMode('corrected')}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${viewMode === 'corrected' ? 'bg-[#1DB954] text-black shadow-sm' : 'text-subdued hover:text-white'}`}
                                >
                                    AI Corrected
                                </button>
                            </div>

                            <div className="flex gap-3 text-xs text-subdued">
                                <span>WPM: <b className="text-white">{analysis.flowMetrics.wpm}</b></span>
                                <span>Density: <b className="text-white">{analysis.flowMetrics.density}</b></span>
                            </div>
                        </div>

                        {/* Rhyme Legend */}
                        {viewMode === 'corrected' && (
                            <div className="flex flex-wrap gap-2 mb-4 bg-[#181818] p-3 rounded-lg border border-[#282828]">
                                <span className="text-[10px] uppercase text-subdued w-full font-bold tracking-wider">Active Schemes</span>
                                {analysis.rhymeSchemes.map(scheme => (
                                    <div key={scheme.id} className="flex items-center gap-1.5 px-2 py-1 bg-[#282828] rounded text-xs">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: scheme.color }} />
                                        <span style={{ color: scheme.color }} className="font-bold">{scheme.name || scheme.id}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Text Render */}
                        <div dir="rtl" className="text-right">
                            {viewMode === 'corrected'
                                ? renderLyricsWithHeatmap(analysis.correctedLyrics)
                                : <p className="leading-loose text-lg whitespace-pre-wrap opacity-60 font-mono">{originalTranscript}</p>
                            }
                        </div>
                    </div>
                )}

                {activeTab === 'punchlines' && (
                    <div className="space-y-3">
                        {analysis.punchlines.length === 0 ? (
                            <div className="text-center py-10 opacity-50">
                                <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
                                <p>No specific punchlines detected.</p>
                            </div>
                        ) : (
                            analysis.punchlines.map((punch, idx) => (
                                <div key={idx} className="bg-[#181818] border border-[#282828] p-4 rounded-lg relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-1 bg-[#1DB954] text-black text-[10px] font-bold rounded-bl-lg">
                                        SCORE: {punch.score}/10
                                    </div>
                                    <h4 dir="rtl" className="font-bold text-lg mb-2 text-right pr-2 border-r-2 border-[#1DB954]">{punch.text}</h4>
                                    <p dir="rtl" className="text-sm text-subdued text-right">{punch.reason}</p>



                                    <div className="mt-3 flex justify-between items-center">
                                        {/* Play Button */}
                                        {audioBlob && segments && (
                                            <button
                                                onClick={() => playSegment(punch.text, idx)}
                                                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-all border ${playingIndex === idx
                                                    ? 'bg-[#1DB954] text-black border-[#1DB954]'
                                                    : 'bg-transparent text-subdued border-subdued/30 hover:border-white hover:text-white'
                                                    }`}
                                            >
                                                {playingIndex === idx ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                                {playingIndex === idx ? 'Playing...' : 'Hear Match'}
                                            </button>
                                        )}

                                        {/* Save Button */}
                                        <button
                                            onClick={() => handleSavePunchline(punch, idx)}
                                            disabled={savedPunchlines.has(idx)}
                                            className={clsx(
                                                "flex items-center gap-1 text-xs px-3 py-1.5 rounded transition-all",
                                                savedPunchlines.has(idx)
                                                    ? "bg-[#1DB954] text-black font-bold opacity-80 cursor-default"
                                                    : "bg-white/5 hover:bg-white/10 text-white"
                                            )}
                                        >
                                            {savedPunchlines.has(idx) ? <Check size={12} /> : <Save size={12} />}
                                            {savedPunchlines.has(idx) ? "Saved to Vault" : "Save to Vault"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
