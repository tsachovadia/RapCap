import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Type, Grid3X3, PanelLeft, PanelLeftClose } from 'lucide-react';
import { db } from '../db/db';
import type { Verse, VerseBar, VerseScheme, SchemeHit } from '../db/db';
import { getRhymeColor } from '../utils/rhymeColors';
import { vocalizeAndSyllabify } from '../services/syllableService';
import { useToast } from '../contexts/ToastContext';
import BarEditor from '../components/verse/BarEditor';
import SchemeToolbar, { SchemeStripMobile } from '../components/verse/SchemeToolbar';
import RhymePanel from '../components/verse/RhymePanel';

const INITIAL_BAR_COUNT = 16;

function createEmptyBar(): VerseBar {
    return {
        id: crypto.randomUUID(),
        text: '',
        words: [],
    };
}

function createInitialVerse(): Verse {
    return {
        title: 'Verse חדש',
        bars: Array.from({ length: INITIAL_BAR_COUNT }, createEmptyBar),
        schemes: [],
        timeSignature: '4/4',
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

function mergeAdjacentHits(hits: SchemeHit[], barId: string): SchemeHit[] {
    const barHits = hits
        .filter(h => h.barId === barId)
        .sort((a, b) => a.startSyllable - b.startSyllable);
    const otherHits = hits.filter(h => h.barId !== barId);

    const merged: SchemeHit[] = [];
    for (const hit of barHits) {
        const last = merged[merged.length - 1];
        if (last && last.endSyllable + 1 >= hit.startSyllable) {
            last.endSyllable = Math.max(last.endSyllable, hit.endSyllable);
        } else {
            merged.push({ ...hit });
        }
    }

    return [...otherHits, ...merged];
}

export default function VerseEditorPage() {
    const { id } = useParams<{ id?: string }>();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [verse, setVerse] = useState<Verse>(createInitialVerse);
    const [viewMode, setViewMode] = useState<'text' | 'syllables'>('syllables');
    const [activeSchemeId, setActiveSchemeId] = useState<string | null>(null);
    const [focusedBarIdx, setFocusedBarIdx] = useState<number>(0);
    const [rhymePanelOpen, setRhymePanelOpen] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const vocalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load existing verse from DB
    useEffect(() => {
        const loadVerse = async () => {
            if (id) {
                const existing = await db.verses.get(Number(id));
                if (existing) {
                    setVerse(existing);
                }
            }
            setIsLoaded(true);
        };
        loadVerse();
    }, [id]);

    // Auto-save (2s debounce)
    const scheduleAutoSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            try {
                const updated = { ...verse, updatedAt: new Date() };
                if (updated.id) {
                    await db.verses.put(updated);
                } else {
                    const newId = await db.verses.add(updated);
                    setVerse(prev => ({ ...prev, id: newId as number }));
                    window.history.replaceState(null, '', `/verse-editor/${newId}`);
                }
            } catch (e) {
                console.error('Auto-save failed', e);
            }
        }, 2000);
    }, [verse]);

    useEffect(() => {
        if (isLoaded) scheduleAutoSave();
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [verse, isLoaded, scheduleAutoSave]);

    // Vocalize a bar (500ms debounce)
    const scheduleVocalize = useCallback((barId: string) => {
        if (vocalizeTimerRef.current) clearTimeout(vocalizeTimerRef.current);
        vocalizeTimerRef.current = setTimeout(async () => {
            setVerse(prev => {
                const bar = prev.bars.find(b => b.id === barId);
                if (!bar || !bar.text.trim()) return prev;

                vocalizeAndSyllabify(bar.text).then(words => {
                    setVerse(curr => ({
                        ...curr,
                        bars: curr.bars.map(b =>
                            b.id === barId ? { ...b, words } : b
                        ),
                    }));
                }).catch(console.error);

                return prev;
            });
        }, 500);
    }, []);

    // --- Bar handlers ---
    const handleBarTextChange = (barId: string, text: string) => {
        setVerse(prev => ({
            ...prev,
            bars: prev.bars.map(b =>
                b.id === barId ? { ...b, text, words: text.trim() ? b.words : [] } : b
            ),
        }));
        scheduleVocalize(barId);
    };

    const handleBarSplit = (barIdx: number, cursorPos: number) => {
        setVerse(prev => {
            const bar = prev.bars[barIdx];
            const before = bar.text.slice(0, cursorPos);
            const after = bar.text.slice(cursorPos);
            const newBars = [...prev.bars];
            newBars[barIdx] = { ...bar, text: before, words: [] };
            newBars.splice(barIdx + 1, 0, { ...createEmptyBar(), text: after });
            return { ...prev, bars: newBars };
        });
        setFocusedBarIdx(barIdx + 1);
    };

    const handleBarDelete = (barIdx: number) => {
        if (verse.bars.length <= 1) return;
        setVerse(prev => ({
            ...prev,
            bars: prev.bars.filter((_, i) => i !== barIdx),
        }));
        setFocusedBarIdx(Math.max(0, barIdx - 1));
    };

    // --- Scheme handlers ---
    const handleDeleteScheme = (schemeId: string) => {
        setVerse(prev => ({
            ...prev,
            schemes: prev.schemes.filter(s => s.id !== schemeId),
        }));
        if (activeSchemeId === schemeId) setActiveSchemeId(null);
    };

    const handleUpdateScheme = (schemeId: string, updates: Partial<VerseScheme>) => {
        setVerse(prev => ({
            ...prev,
            schemes: prev.schemes.map(s =>
                s.id === schemeId ? { ...s, ...updates } : s
            ),
        }));
    };

    const handleReorderScheme = (schemeId: string, direction: 'up' | 'down') => {
        setVerse(prev => {
            const idx = prev.schemes.findIndex(s => s.id === schemeId);
            if (idx < 0) return prev;
            const newIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (newIdx < 0 || newIdx >= prev.schemes.length) return prev;
            const newSchemes = [...prev.schemes];
            [newSchemes[idx], newSchemes[newIdx]] = [newSchemes[newIdx], newSchemes[idx]];
            return { ...prev, schemes: newSchemes };
        });
    };

    const handleCreateScheme = () => {
        const newScheme: VerseScheme = {
            id: crypto.randomUUID(),
            color: getRhymeColor(verse.schemes.length),
            syllableCount: 0,
            hits: [],
        };
        setVerse(prev => ({ ...prev, schemes: [...prev.schemes, newScheme] }));
        setActiveSchemeId(newScheme.id);
    };

    // Direct syllable tap — the core interaction
    const handleSyllableTap = (barId: string, syllableIndex: number) => {
        setVerse(prev => {
            // --- A: Check if syllable is within any existing hit ---
            for (const scheme of prev.schemes) {
                const hitIdx = scheme.hits.findIndex(h =>
                    h.barId === barId &&
                    syllableIndex >= h.startSyllable &&
                    syllableIndex <= h.endSyllable
                );
                if (hitIdx < 0) continue;

                const hit = scheme.hits[hitIdx];
                let newHits: SchemeHit[];

                if (hit.startSyllable === hit.endSyllable) {
                    // Single syllable → remove entirely
                    newHits = scheme.hits.filter((_, i) => i !== hitIdx);
                } else if (syllableIndex === hit.startSyllable) {
                    // Shrink from left
                    newHits = scheme.hits.map((h, i) =>
                        i === hitIdx ? { ...h, startSyllable: h.startSyllable + 1 } : h
                    );
                } else if (syllableIndex === hit.endSyllable) {
                    // Shrink from right
                    newHits = scheme.hits.map((h, i) =>
                        i === hitIdx ? { ...h, endSyllable: h.endSyllable - 1 } : h
                    );
                } else {
                    // Middle of hit → split into two
                    newHits = [
                        ...scheme.hits.slice(0, hitIdx),
                        { barId, startSyllable: hit.startSyllable, endSyllable: syllableIndex - 1 },
                        { barId, startSyllable: syllableIndex + 1, endSyllable: hit.endSyllable },
                        ...scheme.hits.slice(hitIdx + 1),
                    ];
                }

                if (newHits.length === 0) {
                    const newSchemes = prev.schemes.filter(s => s.id !== scheme.id);
                    setTimeout(() => setActiveSchemeId(
                        newSchemes.length > 0 ? newSchemes[newSchemes.length - 1].id : null
                    ), 0);
                    return { ...prev, schemes: newSchemes };
                }

                setTimeout(() => setActiveSchemeId(scheme.id), 0);
                return {
                    ...prev,
                    schemes: prev.schemes.map(s =>
                        s.id === scheme.id ? { ...s, hits: newHits } : s
                    ),
                };
            }

            // --- B: Uncolored syllable, active scheme exists → extend or add ---
            if (activeSchemeId) {
                const scheme = prev.schemes.find(s => s.id === activeSchemeId);
                if (scheme) {
                    const sameBarHits = scheme.hits
                        .map((h, i) => ({ hit: h, index: i }))
                        .filter(({ hit }) => hit.barId === barId);

                    const rightAdj = sameBarHits.find(({ hit }) => syllableIndex === hit.endSyllable + 1);
                    const leftAdj = sameBarHits.find(({ hit }) => syllableIndex === hit.startSyllable - 1);

                    if (rightAdj || leftAdj) {
                        let newHits = [...scheme.hits];
                        if (rightAdj) {
                            newHits = newHits.map((h, i) =>
                                i === rightAdj.index ? { ...h, endSyllable: syllableIndex } : h
                            );
                        } else if (leftAdj) {
                            newHits = newHits.map((h, i) =>
                                i === leftAdj.index ? { ...h, startSyllable: syllableIndex } : h
                            );
                        }
                        newHits = mergeAdjacentHits(newHits, barId);
                        return {
                            ...prev,
                            schemes: prev.schemes.map(s =>
                                s.id === activeSchemeId ? { ...s, hits: newHits } : s
                            ),
                        };
                    }
                }

                // Not adjacent → new single hit in active scheme
                return {
                    ...prev,
                    schemes: prev.schemes.map(s =>
                        s.id === activeSchemeId
                            ? { ...s, hits: [...s.hits, { barId, startSyllable: syllableIndex, endSyllable: syllableIndex }] }
                            : s
                    ),
                };
            }

            // --- C: No active scheme → create new scheme ---
            const newScheme: VerseScheme = {
                id: crypto.randomUUID(),
                color: getRhymeColor(prev.schemes.length),
                syllableCount: 1,
                hits: [{ barId, startSyllable: syllableIndex, endSyllable: syllableIndex }],
            };
            setTimeout(() => setActiveSchemeId(newScheme.id), 0);
            return { ...prev, schemes: [...prev.schemes, newScheme] };
        });
    };

    // --- Insert word from RhymePanel ---
    const handleInsertWord = (word: string) => {
        const barIdx = focusedBarIdx;
        setVerse(prev => {
            const bar = prev.bars[barIdx];
            const newText = bar.text ? `${bar.text} ${word}` : word;
            const newBars = prev.bars.map((b, i) =>
                i === barIdx ? { ...b, text: newText, words: [] } : b
            );
            return { ...prev, bars: newBars };
        });
        const barId = verse.bars[focusedBarIdx]?.id;
        if (barId) scheduleVocalize(barId);
        showToast(`"${word}" נוסף`, 'info');
    };

    // --- Title editing ---
    const handleTitleChange = (newTitle: string) => {
        setVerse(prev => ({ ...prev, title: newTitle }));
    };

    const activeScheme = verse.schemes.find(s => s.id === activeSchemeId) || null;

    return (
        <div className="flex flex-col h-screen bg-[#121212]">
            {/* Header */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#181818] shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                    <ArrowRight size={20} />
                </button>

                <input
                    type="text"
                    value={verse.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    dir="rtl"
                    className="flex-1 bg-transparent text-lg font-bold outline-none"
                />

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewMode(viewMode === 'text' ? 'syllables' : 'text')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'syllables' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'}`}
                        title={viewMode === 'text' ? 'מצב הברות' : 'מצב טקסט'}
                    >
                        {viewMode === 'text' ? <Grid3X3 size={18} /> : <Type size={18} />}
                    </button>

                    <button
                        onClick={() => setRhymePanelOpen(!rhymePanelOpen)}
                        className={`p-2 rounded-lg transition-colors md:hidden ${rhymePanelOpen ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white'}`}
                        title={rhymePanelOpen ? 'הסתר בנק חרוזים' : 'הצג בנק חרוזים'}
                    >
                        {rhymePanelOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
                    </button>
                </div>
            </header>

            {/* Desktop: 3-column layout */}
            <div className="flex-1 hidden md:flex overflow-hidden">
                {/* LEFT: Rhyme Bank */}
                {rhymePanelOpen && (
                    <div className="w-80 lg:w-96 border-r border-white/10 shrink-0">
                        <RhymePanel
                            activeScheme={activeScheme}
                            verse={verse}
                            onInsertWord={handleInsertWord}
                        />
                    </div>
                )}

                {/* CENTER: Bars */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-0.5" dir="rtl">
                    {verse.bars.map((bar, idx) => (
                        <BarEditor
                            key={bar.id}
                            bar={bar}
                            index={idx}
                            viewMode={viewMode}
                            activeSchemeId={activeSchemeId}
                            schemes={verse.schemes}
                            onTextChange={(text) => handleBarTextChange(bar.id, text)}
                            onSyllableTap={handleSyllableTap}
                            onSplit={(cursorPos) => handleBarSplit(idx, cursorPos)}
                            onDelete={() => handleBarDelete(idx)}
                            onFocus={() => setFocusedBarIdx(idx)}
                            isFocused={focusedBarIdx === idx}
                        />
                    ))}
                </div>

                {/* RIGHT: Scheme Toolbar */}
                <SchemeToolbar
                    schemes={verse.schemes}
                    activeSchemeId={activeSchemeId}
                    verse={verse}
                    onSelectScheme={setActiveSchemeId}
                    onDeleteScheme={handleDeleteScheme}
                    onUpdateScheme={handleUpdateScheme}
                    onReorderScheme={handleReorderScheme}
                    onCreateScheme={handleCreateScheme}
                />
            </div>

            {/* Mobile: single column */}
            <div className="flex-1 flex flex-col md:hidden overflow-hidden">
                {/* Bars */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-0.5" dir="rtl">
                    {verse.bars.map((bar, idx) => (
                        <BarEditor
                            key={bar.id}
                            bar={bar}
                            index={idx}
                            viewMode={viewMode}
                            activeSchemeId={activeSchemeId}
                            schemes={verse.schemes}
                            onTextChange={(text) => handleBarTextChange(bar.id, text)}
                            onSyllableTap={handleSyllableTap}
                            onSplit={(cursorPos) => handleBarSplit(idx, cursorPos)}
                            onDelete={() => handleBarDelete(idx)}
                            onFocus={() => setFocusedBarIdx(idx)}
                            isFocused={focusedBarIdx === idx}
                        />
                    ))}
                </div>

                {/* Mobile: Rhyme Bank bottom sheet */}
                {rhymePanelOpen && (
                    <div className="h-[30vh] border-t border-white/10 shrink-0">
                        <RhymePanel
                            activeScheme={activeScheme}
                            verse={verse}
                            onInsertWord={handleInsertWord}
                        />
                    </div>
                )}

                {/* Mobile: Scheme strip at bottom */}
                <SchemeStripMobile
                    schemes={verse.schemes}
                    activeSchemeId={activeSchemeId}
                    onSelectScheme={setActiveSchemeId}
                    onDeleteScheme={handleDeleteScheme}
                    onCreateScheme={handleCreateScheme}
                />
            </div>
        </div>
    );
}
