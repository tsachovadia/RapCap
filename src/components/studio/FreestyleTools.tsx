import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Layers, Sparkles, Search, X, Plus, Check, Flag, Pin, Zap } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import { useStudio } from '../../contexts/StudioContext';
import DictaModal from '../shared/DictaModal';

// ─── Helpers ──────────────────────────────────────────────────

const normalize = (s: string) => s.toLowerCase()
    .replace(/[\u0591-\u05C7]/g, '')   // strip nikkud
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
    .trim();

const HEBREW_PREFIXES = ['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ', 'וה', 'מה', 'שה', 'וכ', 'וב', 'ול'];

/** Strip common Hebrew prefixes from a word */
function stripPrefix(word: string): string {
    for (const p of HEBREW_PREFIXES) {
        if (word.startsWith(p) && word.length > p.length + 1) {
            return word.slice(p.length);
        }
    }
    return word;
}

/** Get the rhyming suffix of a Hebrew word (last 2-3 chars) */
function getRhymeSuffix(word: string): string[] {
    const stripped = stripPrefix(normalize(word));
    if (stripped.length < 2) return [stripped];
    const suffixes: string[] = [];
    suffixes.push(stripped.slice(-2));
    if (stripped.length >= 3) suffixes.push(stripped.slice(-3));
    return suffixes;
}

/** Score a word group by how many items share a suffix with the target word */
function scoreGroupForRhyme(
    groupItems: string[],
    targetSuffixes: string[],
    targetNorm: string,
): number {
    let score = 0;
    for (const item of groupItems) {
        const normItem = normalize(item);
        if (normItem === targetNorm) continue;
        const itemStripped = stripPrefix(normItem);
        for (const suffix of targetSuffixes) {
            if (itemStripped.endsWith(suffix)) {
                score += suffix.length;
                break;
            }
        }
    }
    return score;
}

// ─── Sticky dynamic group with TTL ───────────────────────────

interface StickyGroup {
    groupId: number;
    triggerWord: string;    // the word that triggered this group
    addedAt: number;        // Date.now() when added
    refreshedAt: number;    // last time re-triggered
}

const STICKY_TTL_MS = 15_000;   // groups stay visible 15 seconds
const MAX_STICKY = 6;           // max visible dynamic groups

// ─── Component ────────────────────────────────────────────────

export default function FreestyleTools() {
    const { segments, interimTranscript, flowState, handleSaveMoment, language } = useStudio();

    const allWordGroups = useLiveQuery(() => db.wordGroups.toArray(), []);

    // 2 pinned decks (user-selected)
    const [pinnedDeckIds, setPinnedDeckIds] = useState<(number | null)[]>([null, null]);
    const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set());
    const [swappingPinIndex, setSwappingPinIndex] = useState<number | null>(null);
    const [deckSearchQuery, setDeckSearchQuery] = useState('');
    const [isDictaOpen, setIsDictaOpen] = useState(false);

    // Sticky dynamic groups queue
    const [stickyGroups, setStickyGroups] = useState<StickyGroup[]>([]);
    const prevLastWordRef = useRef('');

    // Initialize pinned decks with first 2 groups
    useEffect(() => {
        if (allWordGroups && allWordGroups.length > 0 && pinnedDeckIds.every(id => id === null)) {
            const shuffled = [...allWordGroups].sort(() => 0.5 - Math.random());
            setPinnedDeckIds([
                shuffled[0]?.id ?? null,
                shuffled[1]?.id ?? null,
            ]);
        }
    }, [allWordGroups]);

    // ─── Extract last spoken word ─────────────────────────────

    const lastWord = useMemo(() => {
        const text = interimTranscript?.trim() || segments[segments.length - 1]?.text || '';
        const words = text.split(/\s+/).filter(Boolean);
        const raw = words[words.length - 1] || '';
        return normalize(raw);
    }, [segments, interimTranscript]);

    // ─── Accumulate sticky dynamic groups ─────────────────────

    const updateStickyGroups = useCallback((word: string) => {
        if (!word || word.length < 2 || !allWordGroups?.length) return;

        const targetSuffixes = getRhymeSuffix(word);
        const pinnedSet = new Set(pinnedDeckIds.filter(Boolean));
        const now = Date.now();

        // Find matching groups for this word
        const matches = allWordGroups
            .filter(g => !pinnedSet.has(g.id!))
            .map(g => ({
                id: g.id!,
                score: scoreGroupForRhyme(g.items, targetSuffixes, word),
            }))
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // top 3 per word

        if (matches.length === 0) return;

        setStickyGroups(prev => {
            let updated = [...prev];

            for (const match of matches) {
                const existing = updated.findIndex(sg => sg.groupId === match.id);
                if (existing >= 0) {
                    // Refresh TTL + update trigger word
                    updated[existing] = {
                        ...updated[existing],
                        triggerWord: word,
                        refreshedAt: now,
                    };
                } else {
                    // Add new
                    updated.push({
                        groupId: match.id,
                        triggerWord: word,
                        addedAt: now,
                        refreshedAt: now,
                    });
                }
            }

            // Evict expired (older than TTL, unless recently refreshed)
            updated = updated.filter(sg => now - sg.refreshedAt < STICKY_TTL_MS);

            // Cap at MAX_STICKY, keep newest
            if (updated.length > MAX_STICKY) {
                updated.sort((a, b) => b.refreshedAt - a.refreshedAt);
                updated = updated.slice(0, MAX_STICKY);
            }

            return updated;
        });
    }, [allWordGroups, pinnedDeckIds]);

    // Trigger when last word changes
    useEffect(() => {
        if (lastWord && lastWord !== prevLastWordRef.current && (flowState === 'recording' || flowState === 'paused')) {
            updateStickyGroups(lastWord);
            prevLastWordRef.current = lastWord;
        }
    }, [lastWord, flowState, updateStickyGroups]);

    // Periodic cleanup of expired sticky groups
    useEffect(() => {
        if (flowState !== 'recording' && flowState !== 'paused') return;
        const interval = setInterval(() => {
            const now = Date.now();
            setStickyGroups(prev => {
                const filtered = prev.filter(sg => now - sg.refreshedAt < STICKY_TTL_MS);
                return filtered.length !== prev.length ? filtered : prev;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [flowState]);

    // Clear sticky groups when recording stops
    useEffect(() => {
        if (flowState === 'idle') {
            setHighlightedWords(new Set());
            setStickyGroups([]);
            prevLastWordRef.current = '';
        }
    }, [flowState]);

    // ─── Real-time word highlighting (pinned + sticky dynamic) ─

    const activeDeckIds = useMemo(() => {
        const ids = pinnedDeckIds.filter((id): id is number => id !== null);
        stickyGroups.forEach(sg => ids.push(sg.groupId));
        return [...new Set(ids)];
    }, [pinnedDeckIds, stickyGroups]);

    useEffect(() => {
        if ((!segments.length && !interimTranscript) || !allWordGroups) return;

        const fullText = segments.map(s => s.text).join(' ') + ' ' + interimTranscript;
        const transcriptWords = fullText.split(/\s+/).map(normalize).filter(Boolean);
        const transcriptSet = new Set(transcriptWords);

        let hasChanges = false;
        const newHighlights = new Set(highlightedWords);

        activeDeckIds.forEach(deckId => {
            const deck = allWordGroups.find(g => g.id === deckId);
            if (!deck) return;
            deck.items.forEach(item => {
                if (newHighlights.has(item)) return;
                const normItem = normalize(item);
                if (!normItem) return;

                let isMatch = transcriptSet.has(normItem);
                if (!isMatch && language === 'he') {
                    isMatch = transcriptWords.some(tw => {
                        if (tw === normItem) return true;
                        if (tw.endsWith(normItem)) {
                            return HEBREW_PREFIXES.includes(tw.slice(0, -normItem.length));
                        }
                        return false;
                    });
                }
                if (isMatch) {
                    newHighlights.add(item);
                    hasChanges = true;
                }
            });
        });

        if (hasChanges) setHighlightedWords(newHighlights);
    }, [segments, interimTranscript, activeDeckIds, allWordGroups, language]);

    // ─── Render helpers ───────────────────────────────────────

    const renderDeckCard = (
        deck: { id?: number; name: string; items: string[] },
        opts: { isPinned?: boolean; pinIndex?: number; triggerWord?: string; isFading?: boolean } = {},
    ) => {
        const targetSuffixes = opts.triggerWord ? getRhymeSuffix(opts.triggerWord) : [];

        return (
            <div
                key={`${opts.isPinned ? 'pin' : 'dyn'}-${deck.id}`}
                className={`rounded-lg border overflow-hidden group/deck transition-opacity duration-1000 ${
                    opts.isFading ? 'opacity-40' : 'opacity-100'
                } ${
                    opts.isPinned
                        ? 'bg-[#181818] border-white/5'
                        : 'bg-[#0d1a14] border-[#1DB954]/20'
                }`}
            >
                {/* Deck header */}
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5">
                    <div className="flex items-center gap-1 min-w-0">
                        {opts.isPinned ? (
                            <Pin size={9} className="text-blue-400 shrink-0" />
                        ) : (
                            <Zap size={9} className="text-[#1DB954] shrink-0" />
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                            opts.isPinned ? 'text-blue-400' : 'text-[#1DB954]'
                        }`} dir="rtl">
                            {deck.name}
                        </span>
                        {opts.triggerWord && (
                            <span className="text-[9px] text-white/30 font-mono mr-1 shrink-0">
                                ← {opts.triggerWord}
                            </span>
                        )}
                    </div>
                    {opts.isPinned && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/deck:opacity-100 transition-opacity">
                            <button
                                onClick={() => setIsDictaOpen(true)}
                                className="p-1 text-purple-400 hover:text-purple-300 rounded hover:bg-purple-500/20"
                                title="Dicta"
                            >
                                <Sparkles size={10} />
                            </button>
                            <button
                                onClick={() => { setSwappingPinIndex(opts.pinIndex!); setDeckSearchQuery(''); }}
                                className="p-1 text-blue-400 hover:text-blue-300 rounded hover:bg-blue-500/20"
                                title="החלף"
                            >
                                <Search size={10} />
                            </button>
                            <button
                                onClick={() => {
                                    if (!allWordGroups) return;
                                    const used = new Set(pinnedDeckIds.filter(Boolean));
                                    const available = allWordGroups.filter(g => !used.has(g.id!));
                                    if (!available.length) return;
                                    const random = available[Math.floor(Math.random() * available.length)];
                                    const newIds = [...pinnedDeckIds];
                                    newIds[opts.pinIndex!] = random.id!;
                                    setPinnedDeckIds(newIds);
                                }}
                                className="p-1 text-white/30 hover:text-white/60 rounded hover:bg-white/10"
                                title="אקראי"
                            >
                                <Layers size={10} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Words - in dynamic groups, rhyming words sorted first */}
                <div className="flex flex-wrap content-start gap-1 p-2 max-h-[160px] overflow-y-auto custom-scrollbar" dir="rtl">
                    {(opts.triggerWord
                        ? [...deck.items].sort((a, b) => {
                            const aMatch = targetSuffixes.some(s => stripPrefix(normalize(a)).endsWith(s));
                            const bMatch = targetSuffixes.some(s => stripPrefix(normalize(b)).endsWith(s));
                            return (bMatch ? 1 : 0) - (aMatch ? 1 : 0);
                        })
                        : deck.items
                    ).map((word, wi) => {
                        const isUsed = highlightedWords.has(word);
                        const wordStripped = stripPrefix(normalize(word));
                        const isRhymeMatch = !opts.isPinned && targetSuffixes.some(s => wordStripped.endsWith(s));

                        return (
                            <span
                                key={wi}
                                className={`text-sm font-bold px-1 py-0.5 rounded-sm transition-all duration-300 cursor-default select-none ${
                                    isUsed
                                        ? 'text-[#1DB954] bg-[#1DB954]/10 scale-105 shadow-[0_0_10px_rgba(29,185,84,0.3)]'
                                        : isRhymeMatch
                                            ? 'text-white bg-white/10'
                                            : opts.triggerWord
                                                ? 'text-white/30 bg-white/[0.02]'
                                                : 'text-white/80 bg-white/5 hover:text-[#1DB954]'
                                }`}
                            >
                                {word}
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    // ─── Resolve sticky groups to actual decks ────────────────

    const now = Date.now();
    const resolvedStickyDecks = stickyGroups
        .map(sg => {
            const deck = allWordGroups?.find(g => g.id === sg.groupId);
            if (!deck) return null;
            const age = now - sg.refreshedAt;
            const isFading = age > STICKY_TTL_MS * 0.7; // start fading at 70% of TTL
            return { deck, triggerWord: sg.triggerWord, isFading };
        })
        .filter(Boolean) as { deck: { id?: number; name: string; items: string[] }; triggerWord: string; isFading: boolean }[];

    return (
        <div className="w-64 flex flex-col h-full bg-[#121212] border-l border-white/10 overflow-hidden">
            {/* Moment capture */}
            {flowState === 'recording' && (
                <div className="p-2 border-b border-white/5 shrink-0">
                    <button
                        onClick={handleSaveMoment}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 rounded-lg text-xs font-medium transition-colors hover:bg-yellow-500/20 animate-pulse"
                    >
                        <Flag size={12} />
                        רגע מיוחד
                    </button>
                </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {/* ── Pinned Decks (2) ──────────────────────── */}
                <div className="space-y-2">
                    <div className="flex items-center gap-1 px-1">
                        <Pin size={10} className="text-blue-400" />
                        <span className="text-[9px] font-bold text-blue-400/70 uppercase tracking-wider">נעוצים</span>
                    </div>
                    {pinnedDeckIds.map((deckId, idx) => {
                        const deck = deckId != null ? allWordGroups?.find(g => g.id === deckId) : null;
                        if (!deck) {
                            return (
                                <div key={`pin-${idx}`} className="bg-[#181818] rounded-lg p-3 border border-white/5 border-dashed min-h-[60px] flex items-center justify-center">
                                    <button
                                        onClick={() => { setSwappingPinIndex(idx); setDeckSearchQuery(''); }}
                                        className="text-white/20 hover:text-white/40 flex items-center gap-1 text-xs"
                                    >
                                        <Plus size={14} />
                                        <span>בחר קבוצה</span>
                                    </button>
                                </div>
                            );
                        }
                        return renderDeckCard(deck, { isPinned: true, pinIndex: idx });
                    })}
                </div>

                {/* ── Sticky Dynamic Rhyme Groups ──────────── */}
                {(flowState === 'recording' || flowState === 'paused') && (
                    <div className="space-y-2 pt-1">
                        <div className="flex items-center gap-1 px-1">
                            <Zap size={10} className="text-[#1DB954]" />
                            <span className="text-[9px] font-bold text-[#1DB954]/70 uppercase tracking-wider">
                                חרוזים דינמיים
                            </span>
                        </div>
                        {resolvedStickyDecks.length > 0 ? (
                            resolvedStickyDecks.map(({ deck, triggerWord, isFading }) =>
                                renderDeckCard(deck, { triggerWord, isFading })
                            )
                        ) : (
                            <div className="text-[10px] text-white/20 text-center py-3">
                                מחכה למילים...
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Swap pinned deck modal */}
            {swappingPinIndex !== null && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSwappingPinIndex(null)}>
                    <div className="bg-[#1e1e1e] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[60vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-white/5 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-white/50 tracking-wider">בחר קבוצה לנעיצה</span>
                            <button onClick={() => setSwappingPinIndex(null)} className="text-white/50 hover:text-white"><X size={16} /></button>
                        </div>
                        <div className="p-3 border-b border-white/5">
                            <div className="flex items-center bg-[#111] border border-white/10 rounded-lg px-2 py-1.5">
                                <Search size={14} className="text-white/30 mr-2" />
                                <input
                                    autoFocus
                                    className="bg-transparent outline-none text-sm text-white w-full placeholder-white/20"
                                    placeholder="חפש..."
                                    value={deckSearchQuery}
                                    onChange={e => setDeckSearchQuery(e.target.value)}
                                    dir="rtl"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {allWordGroups
                                ?.filter(g => {
                                    if (!deckSearchQuery) return true;
                                    const q = deckSearchQuery.toLowerCase();
                                    return g.name.toLowerCase().includes(q) || g.items.some(i => i.toLowerCase().includes(q));
                                })
                                .map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            const newIds = [...pinnedDeckIds];
                                            newIds[swappingPinIndex] = g.id!;
                                            setPinnedDeckIds(newIds);
                                            setSwappingPinIndex(null);
                                        }}
                                        className={`w-full text-right px-3 py-2 rounded-lg mb-1 flex items-center justify-between transition-colors ${
                                            pinnedDeckIds.includes(g.id!) ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-[#252525] border border-transparent'
                                        }`}
                                    >
                                        <div className="overflow-hidden">
                                            <div className={`text-sm font-bold truncate ${pinnedDeckIds.includes(g.id!) ? 'text-blue-400' : 'text-white/80'}`}>{g.name}</div>
                                            <div className="text-[10px] text-white/40 truncate">{g.items.slice(0, 4).join(', ')}...</div>
                                        </div>
                                        {pinnedDeckIds.includes(g.id!) && <Check size={14} className="text-blue-400" />}
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={() => {}}
            />
        </div>
    );
}
