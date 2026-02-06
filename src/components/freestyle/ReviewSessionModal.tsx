import { X, Check, Music2, Clock, Sparkles, Loader2, Plus, Trash2, Pencil, CheckCircle } from 'lucide-react'
import { useState, useEffect, useMemo, useRef } from 'react'
import { type DbSession, type DetectedRhymeGroup } from '../../db/db'
import { usePhoneticAnalysis } from '../../hooks/usePhoneticAnalysis'
import { transcribeAudio } from '../../services/whisper'
import { clsx } from 'clsx'
import { Dialog } from '@headlessui/react'

// --- Constants & Styles ---

const GROUP_COLORS = [
    'border-rose-500/50 text-rose-400 bg-rose-500/10',
    'border-sky-500/50 text-sky-400 bg-sky-500/10',
    'border-emerald-500/50 text-emerald-400 bg-emerald-500/10',
    'border-amber-500/50 text-amber-400 bg-amber-500/10',
    'border-violet-500/50 text-violet-400 bg-violet-500/10',
    'border-pink-500/50 text-pink-400 bg-pink-500/10',
];

interface ReviewSessionModalProps<T extends DbSession> {
    isOpen: boolean
    onClose: () => void
    onSave: (session: T) => void
    onDiscard: () => void
    data: T
    audioBlob?: Blob | null
    onUpdateTranscript?: (text: string, segments: any[], wordSegments: any[]) => void
    onAnalysisComplete?: (analysis: import('../../db/db').SessionAnalysis) => void
}

export default function ReviewSessionModal<T extends DbSession = DbSession>({
    isOpen, onClose, onSave, onDiscard, data, audioBlob, onUpdateTranscript, onAnalysisComplete
}: ReviewSessionModalProps<T>) {

    // --- State ---
    const [mode, setMode] = useState<'review' | 'annotate' | 'edit_text'>('review');
    const [lyrics, setLyrics] = useState(data.metadata?.lyrics || '');

    // Sync state with props when data changes (e.g. when opening modal or when transcript updates)
    useEffect(() => {
        if (data.metadata?.lyrics !== undefined) {
            setLyrics(data.metadata.lyrics);
        }
    }, [data.metadata?.lyrics]);
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Annotation State
    const [localGroups, setLocalGroups] = useState<DetectedRhymeGroup[]>([]);
    const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set()); // "wordIndex" (global index for simplicity mostly)
    const [editingGroupId, setEditingGroupId] = useState<string | null>(null);


    // AI Analysis (Suggestions)
    const { analysis: phoneticAnalysis, isAnalyzing, analyzeNow } = usePhoneticAnalysis(lyrics);

    // --- Effects ---

    // Initialize Local Groups from Metadata or Analysis Suggestions
    useEffect(() => {
        if (data.metadata?.analysis?.detectedRhymeGroups) {
            setLocalGroups(data.metadata.analysis.detectedRhymeGroups);
        } else if (phoneticAnalysis?.rhymeGroups) {
            // If we have AI results but no saved data, propose them as starting point?
            // For now, let's keep them separate as "Suggestions" or just auto-adopt them.
            // Let's auto-adopt for now to give value.
            const mapped = phoneticAnalysis.rhymeGroups.map((g, i) => ({
                id: g.id,
                words: g.words.map(w => ({ text: w.text, lineId: w.lineId || '', wordIndex: w.wordIndex })),
                phoneticSignature: g.signature,
                confidence: g.confidence,
                type: g.type as any,
                color: GROUP_COLORS[i % GROUP_COLORS.length]
            }));
            setLocalGroups(mapped);
        }
    }, [data.metadata?.analysis, phoneticAnalysis]);

    // Lift Analysis Up (Sync to Parent / DB)
    // Use a ref to prevent infinite loops if onAnalysisComplete causes a re-render with new obj refs
    const lastAnalysisIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (phoneticAnalysis && onAnalysisComplete && phoneticAnalysis.rhymeGroups.length > 0) {
            // Create a simple fingerprint to detect if we already synced this exact analysis
            const fingerprint = `${phoneticAnalysis.rhymeGroups.length}-${phoneticAnalysis.rhymeGroups[0]?.id}`;

            if (lastAnalysisIdRef.current === fingerprint) return;
            lastAnalysisIdRef.current = fingerprint;

            // Map Phonetic result to SessionAnalysis structure
            const analysisData: import('../../db/db').SessionAnalysis = {
                correctedLyrics: lyrics,
                // Fix #2: Preserve existing tokens to avoid losing timestamp/id data
                tokens: data.metadata?.analysis?.tokens || [],
                rhymeSchemes: [],
                punchlines: [],
                flowMetrics: { wpm: 0, density: 'Low' },
                detectedRhymeGroups: phoneticAnalysis.rhymeGroups.map(g => ({
                    id: g.id,
                    words: g.words.map(w => ({
                        text: w.text,
                        // Fix #1: Pass rich phonetic data for decomposition view
                        syllables: w.syllables,
                        phonemes: w.phonemes,
                        lineId: w.lineId,         // Corrected from lineIndex
                        wordIndex: w.wordIndex
                    })),
                    phoneticSignature: g.signature || 'mixed', // Ensure signature exists
                    confidence: g.confidence || 0.8,
                    type: g.type as any,
                    status: 'new'
                }))
            };

            onAnalysisComplete(analysisData);
        }
    }, [phoneticAnalysis, onAnalysisComplete, lyrics]);

    // Parsing Lyrics into structured Lines/Words for rendering
    const structuredLyrics = useMemo(() => {
        return lyrics.split('\n').map((line, lineIdx) => {
            const words = line.trim().split(/\s+/).filter(w => w);
            return {
                id: `line-${lineIdx}`,
                words: words.map((w, wIdx) => ({
                    text: w,
                    originalIndex: wIdx, // need a reliable global index?
                    id: `word-${lineIdx}-${wIdx}`
                }))
            };
        });
    }, [lyrics]);

    // Timestamp Mapping
    const timestampMap = useMemo(() => {
        const map = new Map<string, number>();
        const timedWords = data.metadata?.lyricsWords || [];
        if (!timedWords.length) return map;

        let globalWordIdx = 0;
        lyrics.split('\n').forEach((line, lIdx) => {
            const words = line.trim().split(/\s+/).filter(w => w);
            words.forEach((_, wIdx) => {
                if (globalWordIdx < timedWords.length) {
                    map.set(`${lIdx}:${wIdx}`, timedWords[globalWordIdx].startTime);
                    globalWordIdx++;
                }
            });
        });
        return map;
    }, [lyrics, data.metadata?.lyricsWords]);

    const formatTimestamp = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    // --- handlers ---

    const handleWordClick = (lineIndex: number, wordIndex: number, wordText: string, charIndex?: number) => {
        // Edit Mode Logic
        if (editingGroupId) {
            const groupIndex = localGroups.findIndex(g => g.id === editingGroupId);
            if (groupIndex === -1) return;

            const group = localGroups[groupIndex];
            const lineId = structuredLyrics[lineIndex].id;

            // Check if this word is already in the group
            const existingWordIdx = group.words.findIndex((w: any) =>
                w.lineId === lineId && w.wordIndex === wordIndex
            );

            let newWords = [...group.words];

            if (existingWordIdx !== -1) {
                const existing = newWords[existingWordIdx];
                // Toggle Logic
                if (typeof existing !== 'string') {
                    // Check if we are in char-mode toggle
                    if (charIndex !== undefined) {
                        let chars = existing.charIndices || [];
                        if (chars.includes(charIndex)) {
                            chars = chars.filter(c => c !== charIndex);
                        } else {
                            chars = [...chars, charIndex].sort((a, b) => a - b);
                        }

                        if (chars.length === 0) {
                            // If no chars left, remove word
                            newWords.splice(existingWordIdx, 1);
                        } else {
                            newWords[existingWordIdx] = { ...existing, charIndices: chars };
                        }
                    } else {
                        // Clicked whole word -> Remove
                        newWords.splice(existingWordIdx, 1);
                    }
                } else {
                    newWords.splice(existingWordIdx, 1);
                }
            } else {
                // Add new word
                newWords.push({
                    text: wordText,
                    lineId,
                    wordIndex: wordIndex,
                    charIndices: charIndex !== undefined ? [charIndex] : undefined,
                    syllables: [],
                    phonemes: []
                });
            }

            const newGroups = [...localGroups];
            newGroups[groupIndex] = { ...group, words: newWords };
            setLocalGroups(newGroups);
            return;
        }

        if (mode !== 'annotate') {
            // Play Audio Logic if segments exist
            if (data.metadata?.lyricsWords) {
                // Find rough timestamp match (simplified)
                return;
            }
            return;
        }

        // Use char-specific ID if charIndex is provided
        const id = charIndex !== undefined
            ? `${lineIndex}:${wordIndex}:${charIndex}`
            : `${lineIndex}:${wordIndex}`;

        const newSet = new Set(selectedWords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedWords(newSet);
    };

    const handleCreateGroup = () => {
        if (selectedWords.size < 1) return;

        // We need to aggregate selected chars into words with "charIndices"
        // Map: "line:word" -> [charIndices]
        const selectionMap = new Map<string, number[]>();

        selectedWords.forEach(id => {
            const parts = id.split(':');
            if (parts.length === 3) {
                const [lIdx, wIdx, cIdx] = parts;
                const key = `${lIdx}:${wIdx}`;
                if (!selectionMap.has(key)) selectionMap.set(key, []);
                selectionMap.get(key)?.push(parseInt(cIdx));
            }
        });

        const wordsInGroup: any[] = [];

        structuredLyrics.forEach((line, lIdx) => {
            line.words.forEach((word, wIdx) => {
                const key = `${lIdx}:${wIdx}`;
                if (selectionMap.has(key)) {
                    const selectedChars = selectionMap.get(key)?.sort((a, b) => a - b);

                    // Determine if the whole word is selected (simplified check: if > 80% chars?)
                    // For now, let's just save valid charIndices.
                    // If all chars are selected, maybe we could mark it as full word? 
                    // Let's just be explicit.

                    wordsInGroup.push({
                        text: word.text,
                        lineId: line.id,
                        wordIndex: wIdx,
                        // NEW: Add character indices
                        charIndices: selectedChars,
                        // Helper for display: construct the syllable text
                        syllableText: selectedChars?.map(i => word.text[i]).join('')
                    });
                }
            });
        });

        if (wordsInGroup.length === 0) return;

        const newGroup: DetectedRhymeGroup = {
            id: `manual-${Date.now()}`,
            words: wordsInGroup,
            phoneticSignature: 'Manual',
            confidence: 1,
            type: 'perfect',
            color: GROUP_COLORS[localGroups.length % GROUP_COLORS.length]
        };

        setLocalGroups([...localGroups, newGroup]);
        setSelectedWords(new Set());
    };

    const handleSaveSession = () => {
        const finalData = { ...data };
        if (!finalData.metadata) finalData.metadata = {};

        finalData.metadata.lyrics = lyrics;
        finalData.metadata.analysis = {
            correctedLyrics: lyrics,
            tokens: data.metadata?.analysis?.tokens || [],
            rhymeSchemes: [],
            detectedRhymeGroups: localGroups,
            punchlines: [],
            flowMetrics: { wpm: 0, density: 'Low' }
        };

        onSave(finalData);
    };

    // --- Render ---

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-6xl h-[90vh] bg-[#0A0A0A] rounded-3xl overflow-hidden flex flex-col border border-zinc-800 shadow-2xl">

                    {/* TOP HEADER */}
                    <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#111]">
                        <div className="flex items-center gap-4">
                            <h2 className="text-xl font-bold text-white tracking-tight">Session Review</h2>
                            <div className="flex bg-[#1A1A1A] rounded-lg p-1 border border-zinc-800">
                                <button
                                    onClick={() => setMode('review')}
                                    className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-all", mode === 'review' ? "bg-zinc-700 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                                >
                                    Review
                                </button>
                                <button
                                    onClick={() => setMode('annotate')}
                                    className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-all", mode === 'annotate' ? "bg-purple-600 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                                >
                                    Annotate
                                </button>
                                <button
                                    onClick={() => setMode('edit_text')}
                                    className={clsx("px-3 py-1 rounded-md text-sm font-medium transition-all", mode === 'edit_text' ? "bg-blue-600 text-white shadow-sm" : "text-zinc-400 hover:text-white")}
                                >
                                    Edit Text
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={onDiscard} className="p-2 hover:bg-red-900/20 text-zinc-400 hover:text-red-400 rounded-full transition-colors">
                                <Trash2 size={20} />
                            </button>
                            <button onClick={handleSaveSession} className="px-5 py-2 bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold rounded-full transition-colors flex items-center gap-2">
                                <Check size={18} />
                                Save Session
                            </button>
                        </div>
                    </div>

                    {/* MAIN CONTENT AREA */}
                    <div className="flex-1 flex overflow-hidden">

                        {/* LEFT: WORKBENCH / LYRICS */}
                        <div className="flex-1 flex flex-col relative bg-[#0A0A0A]">
                            {/* Toolbar for Annotation Mode - Fixed at Top of Area */}
                            {mode === 'annotate' && (
                                <div className="sticky top-0 z-20 flex gap-2 bg-[#1A1A1A]/90 backdrop-blur border-b border-zinc-700 p-3 items-center justify-between px-6">
                                    <span className="text-xs text-zinc-400 flex items-center">
                                        {selectedWords.size} characters selected
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedWords(new Set())}
                                            className="text-xs hover:bg-zinc-700 text-zinc-400 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={handleCreateGroup}
                                            disabled={selectedWords.size === 0}
                                            className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg flex items-center gap-1 font-bold transition-colors shadow-lg shadow-purple-900/20"
                                        >
                                            <Plus size={14} /> Group Selection
                                        </button>
                                    </div>
                                </div>
                            )}

                            {mode === 'edit_text' ? (
                                <textarea
                                    className="w-full h-full bg-[#111] p-8 text-lg font-mono text-zinc-300 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={lyrics}
                                    onChange={(e) => setLyrics(e.target.value)}
                                    placeholder="Type your lyrics here..."
                                    dir="auto"
                                />
                            ) : (
                                <div className="flex-1 overflow-y-auto p-8 space-y-6" dir="auto">
                                    {structuredLyrics.map((line, lIdx) => (
                                        <div key={line.id} className="flex flex-wrap gap-x-4 gap-y-2 items-start justify-start py-1">
                                            {line.words.map((word, wIdx) => {
                                                // Check if any part of this word is in a group (for word-level coloring fallback)
                                                // But now we want character level.
                                                // Let's render characters if in annotate mode.

                                                if (mode === 'annotate') {
                                                    return (
                                                        <div key={word.id} className="flex cursor-text bg-zinc-900/30 rounded px-0.5">
                                                            {word.text.split('').map((char, cIdx) => {
                                                                const charId = `${lIdx}:${wIdx}:${cIdx}`;
                                                                const isSelected = selectedWords.has(charId);

                                                                // Find if this char is in a group
                                                                // We need to parse our localGroups to see if they contain this specific char range
                                                                // For now, if the group has the whole word, we highlight all chars.
                                                                const inGroup = localGroups.find(g =>
                                                                    g.words.some((gw: any) => {
                                                                        // Match if it's the whole word
                                                                        if (gw.text === word.text && gw.wordIndex === wIdx && gw.lineId === line.id && !gw.charIndices) return true;
                                                                        // Match if it's specific chars
                                                                        if (gw.charIndices && gw.wordIndex === wIdx && gw.lineId === line.id && gw.charIndices.includes(cIdx)) return true;
                                                                        return false;
                                                                    })
                                                                );

                                                                return (
                                                                    <span
                                                                        key={cIdx}
                                                                        onMouseDown={() => {
                                                                            // Simple toggle for now, dragging can be added later
                                                                            handleWordClick(lIdx, wIdx, word.text, cIdx);
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            if (e.buttons === 1) { // dragging
                                                                                handleWordClick(lIdx, wIdx, word.text, cIdx);
                                                                            }
                                                                        }}
                                                                        className={clsx(
                                                                            "inline-block min-w-[8px] text-center select-none transition-colors duration-75 text-xl font-medium",
                                                                            isSelected ? "bg-purple-500/40 text-white" : (inGroup ? inGroup.color?.replace('bg-', 'text-').replace('/10', '') : "text-zinc-400 hover:text-zinc-200")
                                                                        )}
                                                                    >
                                                                        {char}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    )
                                                }

                                                // Review Mode (Word Level)
                                                const group = localGroups.find(g =>
                                                    g.words.some((gw: any) => gw.text === word.text && (gw.wordIndex === wIdx || gw.text === word.text))
                                                );
                                                const timestamp = timestampMap.get(`${lIdx}:${wIdx}`);

                                                return (
                                                    <div key={word.id} className="inline-flex flex-col items-center mx-1">
                                                        <span
                                                            className={clsx(
                                                                "transition-all px-1.5 py-0.5 rounded-md text-lg hover:bg-zinc-800 cursor-pointer",
                                                                group ? group.color : "text-zinc-300"
                                                            )}
                                                            title={timestamp ? formatTimestamp(timestamp) : undefined}
                                                        >
                                                            {word.text}
                                                        </span>
                                                        {timestamp !== undefined && (
                                                            <span className="text-[9px] text-zinc-600 font-mono">
                                                                {formatTimestamp(timestamp)}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: SIDEBAR (Groups or Metadata) */}
                        <div className="w-80 border-l border-zinc-800 bg-[#111] flex flex-col shrink-0">
                            {mode === 'annotate' ? (
                                <div className="flex flex-col h-full">
                                    <div className="p-4 border-b border-zinc-800">
                                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                            <Sparkles size={14} /> Rhyme Groups
                                        </h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                        {localGroups.length === 0 && (
                                            <div className="text-center p-8 text-zinc-600 text-sm">
                                                Select words in the text and click "Group" to create annotations.
                                            </div>
                                        )}
                                        {localGroups.map((group, idx) => (
                                            <div key={idx} className={clsx("p-3 rounded-xl border flex flex-col gap-2 relative group", group.color || "border-zinc-700 bg-zinc-800/50")}>
                                                <div className="flex flex-wrap gap-1">
                                                    {group.words.map((w: any, wi: number) => (
                                                        <div key={wi} className="flex flex-col items-center">
                                                            <span className="text-xs font-bold opacity-90">{typeof w === 'string' ? w : w.text}</span>
                                                            {typeof w !== 'string' && w.syllables && w.syllables.length > 0 && (
                                                                <span className="text-[10px] text-zinc-500 font-mono leading-none">
                                                                    {w.syllables.join('-')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {editingGroupId === group.id ? (
                                                        <button
                                                            onClick={() => setEditingGroupId(null)}
                                                            className="text-emerald-400 hover:text-emerald-300"
                                                            title="Done Editing"
                                                        >
                                                            <CheckCircle size={14} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setEditingGroupId(group.id)}
                                                            className="text-zinc-500 hover:text-blue-400 disabled:opacity-30"
                                                            disabled={!!editingGroupId}
                                                            title="Edit Group"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setLocalGroups(localGroups.filter((_, i) => i !== idx))}
                                                        className="text-zinc-500 hover:text-red-400"
                                                        disabled={!!editingGroupId}
                                                        title="Delete Group"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* AI Suggestion Area */}
                                    {!phoneticAnalysis && !isAnalyzing && (
                                        <div className="p-4 border-t border-zinc-800">
                                            <button
                                                onClick={analyzeNow}
                                                className="w-full py-3 bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-purple-300 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all"
                                            >
                                                <Sparkles size={16} /> Auto-Analyze
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col h-full p-6 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Duration</label>
                                        <div className="text-2xl font-mono text-white flex items-center gap-2">
                                            <Clock size={20} className="text-zinc-600" />
                                            {Math.floor(data.duration / 60)}:{(data.duration % 60).toString().padStart(2, '0')}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase">Beat</label>
                                        <div className="text-sm text-zinc-300 flex items-center gap-2 bg-zinc-800/50 p-2 rounded-lg border border-zinc-800">
                                            <Music2 size={16} className="text-zinc-500" />
                                            <span className="truncate">{data.beatId || 'No Beat'}</span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-zinc-800/30 rounded-xl border border-zinc-800">
                                        <h4 className="text-sm font-bold text-white mb-2">Transcript AI</h4>
                                        <button
                                            onClick={async () => {
                                                if (isEnhancing || !audioBlob || !onUpdateTranscript) return;

                                                if (localGroups.length > 0) {
                                                    if (!confirm("Improving the transcript will reset your manual annotations. Continue?")) {
                                                        return;
                                                    }
                                                    setLocalGroups([]);
                                                }

                                                setIsEnhancing(true);
                                                try {
                                                    const result = await transcribeAudio(audioBlob, 'he');
                                                    onUpdateTranscript(result.text, result.segments, result.wordSegments);
                                                    setLyrics(result.text);
                                                } catch (e) { console.error(e); }
                                                setIsEnhancing(false);
                                            }}
                                            disabled={isEnhancing || !audioBlob}
                                            className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isEnhancing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                            Improve Transcript
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    )
}
