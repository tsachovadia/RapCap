import { X, Check, Music2, Clock, Calendar, Sparkles, Loader2, Copy, FileJson } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { AnalysisView } from '../analysis/AnalysisView'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DbSession, type DetectedRhymeGroup, type SessionAnalysis } from '../../db/db'
import RhymeSuggestionsList from '../analysis/RhymeSuggestionsList'
import { usePhoneticAnalysis } from '../../hooks/usePhoneticAnalysis'
import { transcribeAudio } from '../../services/whisper'
import LyricsDisplay from '../library/LyricsDisplay'

interface ReviewSessionModalProps<T extends DbSession> {
    isOpen: boolean
    onClose: () => void
    onSave: (session: T) => void
    onDiscard: () => void
    data: T
    audioBlob?: Blob | null
    onUpdateTranscript?: (text: string, segments: any[], wordSegments: any[]) => void
    onAnalysisComplete?: (analysis: SessionAnalysis) => void
}

export default function ReviewSessionModal<T extends DbSession = DbSession>({ isOpen, onClose, onSave, onDiscard, data, audioBlob, onUpdateTranscript, onAnalysisComplete }: ReviewSessionModalProps<T>) {
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Phonetic Engine Integration
    const transcriptText = data.metadata?.lyrics || '';
    const {
        analysis: phoneticAnalysis,
        isAnalyzing: isPhoneticAnalyzing,
        analyzeNow
    } = usePhoneticAnalysis(transcriptText);

    // Bubbling up analysis results
    useEffect(() => {
        if (phoneticAnalysis && onAnalysisComplete) {
            // Map Phonetic result to SessionAnalysis structure
            const analysisData: SessionAnalysis = {
                correctedLyrics: transcriptText,
                tokens: [], // Legacy Not used 
                rhymeSchemes: [], // Legacy Not used
                punchlines: [],
                flowMetrics: { wpm: 0, density: 'Low' },
                detectedRhymeGroups: phoneticAnalysis.rhymeGroups.map(g => ({
                    id: g.id,
                    words: g.words.map(w => w.text),
                    phoneticSignature: (g as any).commonPhoneticPattern || 'mixed',
                    confidence: (g as any).score || 0.8,
                    type: 'multi_syllabic',
                    status: 'new'
                }))
            };
            onAnalysisComplete(analysisData);
        }
    }, [phoneticAnalysis, onAnalysisComplete, transcriptText]);

    const [view, setView] = useState<'transcript' | 'analysis' | 'rhymes'>('transcript');

    // Legacy isAnalyzing (for Gemini if we still keep it or just map it to phonetic)
    const isAnalyzing = isPhoneticAnalyzing;

    const [annotatedLines, setAnnotatedLines] = useState<any[]>([]);
    const [processedGroups, setProcessedGroups] = useState<DetectedRhymeGroup[]>([]);

    // Fetch rhyme groups for multicolor visualization
    const allGroups = useLiveQuery(() => db.wordGroups.toArray())

    // Normalize helper - kept minimal here
    const normalize = (str: string) => str.toLowerCase().replace(/[\u0591-\u05C7]/g, "").replace(/[., \/#!$%\^&\*;: { } = \-_`~()?]/g, "").trim();

    useEffect(() => {
        const segments = data.metadata?.lyricsSegments;
        if (!segments || !allGroups) return

        // Build lookup
        const wordToGroupMap = new Map<string, number>();
        allGroups.forEach(g => {
            g.items.forEach(word => {
                const norm = normalize(word);
                if (norm) wordToGroupMap.set(norm, g.id!);
            })
        })

        const newLines = segments.map((seg: any) => {
            const words = (seg.text || '').split(/(\s+)/).map((rawToken: string) => { // preservation split
                if (!rawToken.trim()) return { text: rawToken }; // spaces
                const norm = normalize(rawToken);
                const groupId = wordToGroupMap.get(norm);
                return {
                    text: rawToken, // Changed from segment text to rawToken
                    rhymeGroupIndex: groupId
                }
            })
            return {
                timestamp: seg.timestamp,
                words
            }
        })
        setAnnotatedLines(newLines)
    }, [data.metadata?.lyricsSegments, allGroups])

    // Process detected rhyme groups against existing DB groups
    useEffect(() => {
        // Prefer new phonetic analysis, fall back to stored analysis
        const sourceGroups = phoneticAnalysis?.rhymeGroups;

        if (!sourceGroups || !allGroups) {
            // Fallback to stored if no new analysis (e.g. offline/loading)
            if (data.metadata?.analysis?.detectedRhymeGroups && allGroups) {
                // Already in correct format, just check matches
                const processed = data.metadata.analysis.detectedRhymeGroups.map((detected: DetectedRhymeGroup) => {
                    const detectedWords = new Set(detected.words.map((w: string) => normalize(w)));
                    let matchId: number | undefined;
                    for (const dbGroup of allGroups) {
                        const dbWords = dbGroup.items.map(w => normalize(w));
                        const overlap = dbWords.filter(w => detectedWords.has(w));
                        if (overlap.length > 0) { matchId = dbGroup.id; break; }
                    }
                    return {
                        ...detected,
                        status: (matchId ? 'match' : 'new') as 'match' | 'new',
                        existingGroupId: matchId
                    } as DetectedRhymeGroup;
                });
                setProcessedGroups(processed);
            }
            return;
        }

        // Map PhoneticRhymeGroup -> DetectedRhymeGroup
        const processed = sourceGroups.map(group => {
            const groupWords = group.words.map(w => w.text);
            const detectedWords = new Set(groupWords.map(w => normalize(w)));

            let matchId: number | undefined;
            if (allGroups) {
                for (const dbGroup of allGroups) {
                    const dbWords = dbGroup.items.map(w => normalize(w));
                    const overlap = dbWords.filter(w => detectedWords.has(w));
                    if (overlap.length > 0) {
                        matchId = dbGroup.id;
                        break;
                    }
                }
            }

            return {
                id: group.id,
                words: groupWords,
                phoneticSignature: group.signature,
                confidence: 1.0, // Deterministic
                type: group.type, // 'assonance' etc matches
                status: (matchId ? 'match' : 'new') as 'match' | 'new',
                existingGroupId: matchId
            } as DetectedRhymeGroup;
        });

        setProcessedGroups(processed);
    }, [phoneticAnalysis, data.metadata?.analysis, allGroups]);

    const handleSaveGroup = async (group: DetectedRhymeGroup) => {
        try {
            if (group.status === 'match' && group.existingGroupId) {
                // Merge
                const existing = await db.wordGroups.get(group.existingGroupId);
                if (existing) {
                    // Combine and dedupe
                    const mergedItems = Array.from(new Set([...existing.items, ...group.words]));
                    await db.wordGroups.update(group.existingGroupId, {
                        items: mergedItems,
                        lastUsedAt: new Date()
                    });
                    // Only alert/toast in a real app, here we just update local state visually if needed
                }
            } else {
                // Create New
                await db.wordGroups.add({
                    name: group.phoneticSignature || group.words[0], // Fallback name
                    items: group.words,
                    createdAt: new Date(),
                    lastUsedAt: new Date(),
                    isSystem: false
                });
            }
            // Remove from list or mark done?
            // For now, remove from the suggestion list
            setProcessedGroups(prev => prev.filter(p => p.id !== group.id));
        } catch (e) {
            console.error("Failed to save group", e);
        }
    };

    const handleDiscardGroup = (id: string) => {
        setProcessedGroups(prev => prev.filter(p => p.id !== id));
    };

    // Analysis state (local if not passed from parent, but better to use onUpdateAnalysis callback)
    // Analysis state (local if not passed from parent, but better to use onUpdateAnalysis callback)
    const handleAnalyze = async () => {
        const text = data.metadata?.lyrics || '';

        if (!text) {
            alert("Please transcribe the audio first to generate lyrics for analysis.");
            return;
        }

        if (isAnalyzing) return;

        // If using phonetic engine, we might just want to trigger it?
        // But usePhoneticAnalysis is reactive to text changes.
        // If we want to force re-run or show UI:
        analyzeNow();

        // If we still want 'Deep Analysis' (Gemini), keeping legacy path optional:
        /*
        try {
            setIsAnalyzing(true);
            const moments: number[] = []; 
            const analysis = await performDeepAnalysis(text, moments);
            if (analysis && onAnalysisComplete) {
                onAnalysisComplete(analysis);
                setView('analysis');
            }
        } catch (e) {
            console.error("Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
        }
        */
        // For now, just switch view
        setView('analysis');
    };

    // Auto-analyze on mount if no analysis exists
    const hasAutoAnalyzed = useRef(false);
    useEffect(() => {
        const text = data.metadata?.lyrics;
        const analysis = data.metadata?.analysis;

        if (isOpen && text && !analysis && !isAnalyzing && !hasAutoAnalyzed.current) {
            hasAutoAnalyzed.current = true;
            setTimeout(() => {
                handleAnalyze();
            }, 500);
        }
    }, [isOpen, data.metadata?.lyrics, data.metadata?.analysis]);

    if (!isOpen) return null

    // Format helpers
    const fmt = (s: number) => {
        const min = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-md flex flex-col max-h-[85vh] shadow-2xl">

                {/* Header */}
                <div className="p-4 border-b border-[#282828] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Check className="text-[#1DB954]" size={20} />
                        Session Complete
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-[#282828] rounded-full transition-colors">
                        <X size={20} className="text-subdued" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* View Toggle / Tabs */}
                    <div className="flex gap-2 border-b border-[#282828] pb-1">
                        <button
                            onClick={() => setView('transcript')}
                            className={`pb-2 px-1 text-sm font-bold transition-colors border-b-2 ${view === 'transcript' ? 'border-[#1DB954] text-white' : 'border-transparent text-subdued hover:text-white'}`}
                        >
                            Review & Edit
                        </button>
                        <button
                            onClick={() => setView('analysis')}
                            className={`pb-2 px-1 text-sm font-bold transition-colors border-b-2 flex items-center gap-1.5 ${view === 'analysis' ? 'border-purple-500 text-purple-400' : 'border-transparent text-subdued hover:text-white'}`}
                        >
                            <Sparkles size={14} />
                            AI Coach
                        </button>
                        <button
                            onClick={() => setView('rhymes')}
                            className={`pb-2 px-1 text-sm font-bold transition-colors border-b-2 flex items-center gap-1.5 ${view === 'rhymes' ? 'border-blue-500 text-blue-400' : 'border-transparent text-subdued hover:text-white'}`}
                        >
                            <Sparkles size={14} className="text-blue-400" />
                            Rhymes {processedGroups.length > 0 && <span className="bg-blue-500 text-black text-[10px] px-1 rounded-full">{processedGroups.length}</span>}
                        </button>
                    </div>

                    {view === 'rhymes' ? (
                        <div className="min-h-[300px]">
                            {processedGroups.length > 0 ? (
                                <RhymeSuggestionsList
                                    groups={processedGroups}
                                    onSaveGroup={handleSaveGroup}
                                    onDiscard={handleDiscardGroup}
                                />
                            ) : (
                                <div className="text-center py-10 text-subdued italic flex flex-col items-center gap-2">
                                    <Sparkles size={24} className="opacity-20" />
                                    <span>No pending rhyme suggestions found.</span>
                                </div>
                            )}
                        </div>
                    ) : view === 'analysis' ? (
                        <div className="h-[400px] flex flex-col relative">
                            {data.metadata?.analysis ? (
                                <>
                                    <button
                                        onClick={() => {
                                            const json = JSON.stringify(data.metadata?.analysis, null, 2);
                                            navigator.clipboard.writeText(json);
                                            console.log("Analysis JSON:", json);
                                            alert("JSON copied to clipboard & logged to console!");
                                        }}
                                        className="absolute top-2 right-2 z-10 p-2 bg-black/50 hover:bg-black/80 rounded text-xs text-subdued hover:text-white transition-colors flex items-center gap-1"
                                        title="Copy Analysis JSON for Debugging"
                                    >
                                        <FileJson size={12} />
                                        <Copy size={12} />
                                    </button>
                                    <AnalysisView
                                        analysis={data.metadata.analysis}
                                        originalTranscript={data.metadata.lyrics || ''}
                                        audioBlob={audioBlob}
                                        segments={data.metadata.lyricsSegments}
                                    />
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 border border-dashed border-[#282828] rounded-xl bg-[#121212]">
                                    <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 mb-2">
                                        <Sparkles size={32} />
                                    </div>
                                    <h3 className="text-white font-bold text-lg">Analyze Your Flow</h3>
                                    <p className="text-subdued text-sm max-w-xs">
                                        Get deep insights relative to phonetic rhyme schemes.
                                    </p>
                                    <button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                        className="mt-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-6 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
                                    >
                                        {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                        {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-[#121212] p-3 rounded-xl border border-[#282828] flex flex-col items-center gap-1">
                                    <Clock size={16} className="text-subdued" />
                                    <span className="text-2xl font-bold text-white">{fmt(data.duration)}</span>
                                    <span className="text-xs text-subdued uppercase">Duration</span>
                                </div>
                                <div className="bg-[#121212] p-3 rounded-xl border border-[#282828] flex flex-col items-center gap-1">
                                    <Music2 size={16} className="text-subdued" />
                                    <span className="text-sm font-bold text-white truncate max-w-full px-2" title={data.beatId}>
                                        {data.beatId || 'No Beat'}
                                    </span>
                                    <span className="text-xs text-subdued uppercase">Beat ID</span>
                                </div>
                            </div>

                            {/* Date */}
                            <div className="flex items-center justify-center gap-2 text-sm text-subdued">
                                <Calendar size={14} />
                                <span>{data.date.toLocaleString()}</span>
                            </div>

                            {/* Transcript Content */}
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm font-medium text-subdued">Transcript</div>
                                    {!data.metadata?.analysis && !isAnalyzing && (
                                        <button
                                            onClick={handleAnalyze}
                                            className="text-xs bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-2 py-1 rounded-md border border-emerald-500/20 flex items-center gap-1 transition-colors"
                                        >
                                            <Sparkles size={12} />
                                            Analyze Flow
                                        </button>
                                    )}
                                    {isAnalyzing && (
                                        <div className="text-xs text-emerald-500 flex items-center gap-1 animate-pulse">
                                            <Loader2 size={12} className="animate-spin" />
                                            Analyzing...
                                        </div>
                                    )}
                                    {data.metadata?.analysis && (
                                        <button
                                            onClick={() => setView('analysis')}
                                            className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
                                        >
                                            <Sparkles size={12} /> View Analysis
                                        </button>
                                    )}
                                </div>

                                {/* Lyrics Preview with Timestamps */}
                                <div className="bg-[#121212] rounded-xl border border-[#282828] p-4 min-h-[200px] flex flex-col gap-2 relative">
                                    <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                                        {/* Transcribe Button */}
                                        {audioBlob && onUpdateTranscript && (
                                            <button
                                                onClick={async () => {
                                                    if (isEnhancing) return;
                                                    try {
                                                        setIsEnhancing(true);
                                                        const result = await transcribeAudio(audioBlob, 'he'); // Defaulting to Hebrew logic as requested
                                                        onUpdateTranscript(result.text, result.segments, result.wordSegments);
                                                    } catch (e) {
                                                        alert("שגיאה בתמלול: " + (e instanceof Error ? e.message : String(e)));
                                                    } finally {
                                                        setIsEnhancing(false);
                                                    }
                                                }}
                                                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors shadow-lg"
                                                disabled={isEnhancing}
                                            >
                                                {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                                {isEnhancing ? 'מתמלל...' : 'שפר תמלול (Whisper)'}
                                            </button>
                                        )}
                                        <span className="text-[10px] font-mono border border-white/20 px-1 rounded opacity-30 pointer-events-none">RAW DATA</span>
                                    </div>

                                    <LyricsDisplay
                                        lyrics={data.metadata?.lyrics || ''}
                                        segments={data.metadata?.lyricsSegments || []}
                                        annotatedLines={annotatedLines}
                                        currentTime={0}
                                    />
                                </div>

                                {/* AI Keywords */}
                                {data.metadata?.aiKeywords && data.metadata.aiKeywords.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {data.metadata.aiKeywords.map((keyword, i) => (
                                            <span key={i} className="text-xs bg-[#1DB954]/20 text-[#1DB954] px-2 py-1 rounded-full border border-[#1DB954]/30">
                                                #{keyword}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )
                    }
                </div >

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#282828] flex gap-3 bg-[#181818] rounded-b-2xl" >
                    <button
                        onClick={onDiscard}
                        className="flex-1 py-3 rounded-xl font-bold bg-[#282828] hover:bg-red-900/50 hover:text-red-500 text-subdued transition-colors flex items-center justify-center gap-2"
                    >
                        <X size={18} />
                        Discard
                    </button>
                    <button
                        onClick={() => onSave(data)}
                        className="flex-[2] py-3 rounded-xl font-bold bg-[#1DB954] hover:bg-[#1ed760] text-black transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(29,185,84,0.3)]"
                    >
                        <Check size={18} />
                        Save to Library
                    </button>
                </div>
            </div>
        </div>
    )
}
