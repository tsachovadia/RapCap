import { useState, useMemo } from 'react';
import { Plus, ChevronUp, ChevronDown, Trash2, Palette, X } from 'lucide-react';
import type { Verse, VerseScheme } from '../../db/db';
import { RHYME_COLORS } from '../../utils/rhymeColors';
import { computeSchemeStats, type SchemeStats } from '../../utils/schemeAnalysis';

interface SchemeToolbarProps {
    schemes: VerseScheme[];
    activeSchemeId: string | null;
    verse: Verse;
    onSelectScheme: (id: string | null) => void;
    onDeleteScheme: (id: string) => void;
    onUpdateScheme: (id: string, updates: Partial<VerseScheme>) => void;
    onReorderScheme: (id: string, direction: 'up' | 'down') => void;
    onCreateScheme: () => void;
}

const VOWEL_LABELS: Record<string, string> = {
    A: 'אָ',
    E: 'אֶ',
    I: 'אִ',
    O: 'אֹ',
    U: 'אֻ',
};

export default function SchemeToolbar({
    schemes,
    activeSchemeId,
    verse,
    onSelectScheme,
    onDeleteScheme,
    onUpdateScheme,
    onReorderScheme,
    onCreateScheme,
}: SchemeToolbarProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [editingName, setEditingName] = useState(false);

    const statsMap = useMemo(() => {
        const map = new Map<string, SchemeStats>();
        for (const scheme of schemes) {
            map.set(scheme.id, computeSchemeStats(scheme, verse));
        }
        return map;
    }, [schemes, verse.bars]);

    const activeScheme = schemes.find(s => s.id === activeSchemeId);
    const activeIdx = schemes.findIndex(s => s.id === activeSchemeId);
    const activeStats = activeSchemeId ? statsMap.get(activeSchemeId) : null;

    const isExpanded = !!activeSchemeId;

    return (
        <div
            className={`flex h-full bg-[#181818] border-l border-white/10 transition-all duration-200 overflow-hidden ${
                isExpanded ? 'w-[264px]' : 'w-14'
            }`}
        >
            {/* Expanded detail panel */}
            {isExpanded && activeScheme && activeStats && (
                <div className="w-[200px] overflow-y-auto custom-scrollbar p-3 space-y-3 border-l border-white/5">
                    {/* Name */}
                    <div className="flex items-center gap-2">
                        <span
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: activeScheme.color }}
                        />
                        {editingName ? (
                            <input
                                autoFocus
                                value={activeScheme.name || ''}
                                onChange={e => onUpdateScheme(activeScheme.id, { name: e.target.value })}
                                onBlur={() => setEditingName(false)}
                                onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
                                className="flex-1 bg-[#282828] rounded px-2 py-1 text-sm outline-none border border-white/10 focus:border-white/30"
                                dir="rtl"
                                placeholder="שם הסכמה..."
                            />
                        ) : (
                            <button
                                onClick={() => setEditingName(true)}
                                className="flex-1 text-sm font-medium text-right truncate hover:text-white/80 transition-colors"
                                dir="rtl"
                            >
                                {activeScheme.name || `סכמה ${activeIdx + 1}`}
                            </button>
                        )}
                    </div>

                    {/* Color picker toggle */}
                    <button
                        onClick={() => setShowColorPicker(!showColorPicker)}
                        className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
                    >
                        <Palette size={12} />
                        {showColorPicker ? 'סגור' : 'שנה צבע'}
                    </button>

                    {showColorPicker && (
                        <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#252525] rounded-lg">
                            {RHYME_COLORS.map((color, i) => (
                                <button
                                    key={`${color}-${i}`}
                                    onClick={() => {
                                        onUpdateScheme(activeScheme.id, { color });
                                        setShowColorPicker(false);
                                    }}
                                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                                        activeScheme.color === color ? 'ring-2 ring-white scale-110' : ''
                                    }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#252525] rounded-lg p-2 text-center">
                            <div className="text-[10px] text-white/40">הברות</div>
                            <div className="text-lg font-bold" style={{ color: activeScheme.color }}>
                                {activeStats.totalSyllables}
                            </div>
                        </div>
                        <div className="bg-[#252525] rounded-lg p-2 text-center">
                            <div className="text-[10px] text-white/40">שורות</div>
                            <div className="text-lg font-bold" style={{ color: activeScheme.color }}>
                                {activeStats.barCount}
                            </div>
                        </div>
                    </div>

                    {/* Vowel pattern */}
                    {activeStats.vowelPattern.length > 0 && (
                        <div className="bg-[#252525] rounded-lg p-2">
                            <div className="text-[10px] text-white/40 mb-1.5">תבנית תנועות</div>
                            <div className="flex gap-1 flex-wrap" dir="rtl">
                                {activeStats.vowelPattern.map((v, i) => (
                                    <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#333]"
                                        style={{ color: activeScheme.color }}
                                    >
                                        {VOWEL_LABELS[v] || v}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reorder + delete */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <div className="flex gap-0.5">
                            <button
                                onClick={() => onReorderScheme(activeScheme.id, 'up')}
                                disabled={activeIdx === 0}
                                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors"
                            >
                                <ChevronUp size={14} />
                            </button>
                            <button
                                onClick={() => onReorderScheme(activeScheme.id, 'down')}
                                disabled={activeIdx === schemes.length - 1}
                                className="p-1.5 rounded hover:bg-white/10 disabled:opacity-20 transition-colors"
                            >
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <button
                            onClick={() => onDeleteScheme(activeScheme.id)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Compact strip — always visible */}
            <div className="w-14 flex flex-col items-center py-3 gap-2 overflow-y-auto custom-scrollbar shrink-0">
                {schemes.map((scheme, i) => {
                    const isActive = scheme.id === activeSchemeId;
                    const stats = statsMap.get(scheme.id);
                    return (
                        <button
                            key={scheme.id}
                            onClick={() => onSelectScheme(isActive ? null : scheme.id)}
                            className={`relative w-9 h-9 rounded-full transition-all duration-150 shrink-0 ${
                                isActive
                                    ? 'ring-2 ring-white scale-110 shadow-lg'
                                    : 'hover:scale-105 hover:brightness-110'
                            }`}
                            style={{ backgroundColor: scheme.color }}
                            title={scheme.name || `סכמה ${i + 1}`}
                        >
                            {stats && stats.totalSyllables > 0 && (
                                <span className="absolute -bottom-1 -right-1 bg-[#181818] text-[8px] text-white/70 rounded-full w-4 h-4 flex items-center justify-center font-bold border border-white/10">
                                    {stats.totalSyllables}
                                </span>
                            )}
                        </button>
                    );
                })}

                {/* Create new scheme button */}
                <button
                    onClick={onCreateScheme}
                    className="w-9 h-9 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 hover:bg-white/5 transition-all shrink-0"
                    title="סכמה חדשה"
                >
                    <Plus size={16} className="text-white/40" />
                </button>
            </div>
        </div>
    );
}

/* Horizontal mobile strip — used below the bars on small screens */
export function SchemeStripMobile({
    schemes,
    activeSchemeId,
    onSelectScheme,
    onDeleteScheme,
    onCreateScheme,
}: Pick<SchemeToolbarProps, 'schemes' | 'activeSchemeId' | 'onSelectScheme' | 'onDeleteScheme' | 'onCreateScheme'>) {
    if (schemes.length === 0) return null;

    return (
        <div className="border-t border-white/10 bg-[#181818] px-3 py-2">
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {schemes.map((scheme, i) => {
                    const isActive = scheme.id === activeSchemeId;
                    return (
                        <button
                            key={scheme.id}
                            onClick={() => onSelectScheme(isActive ? null : scheme.id)}
                            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150 ${
                                isActive
                                    ? 'ring-2 ring-white/50 shadow-lg scale-[1.05]'
                                    : 'hover:bg-white/10'
                            }`}
                            style={{
                                backgroundColor: isActive ? scheme.color + '40' : scheme.color + '20',
                            }}
                        >
                            <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: scheme.color }}
                            />
                            <span className="whitespace-nowrap">
                                {scheme.name || `סכמה ${i + 1}`}
                            </span>
                            <span className="text-white/50 text-xs">
                                ({scheme.hits.reduce((sum, h) => sum + (h.endSyllable - h.startSyllable + 1), 0)})
                            </span>
                            {isActive && (
                                <span
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteScheme(scheme.id);
                                    }}
                                    className="ml-0.5 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                                >
                                    <X size={12} />
                                </span>
                            )}
                        </button>
                    );
                })}
                <button
                    onClick={onCreateScheme}
                    className="shrink-0 w-8 h-8 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center hover:border-white/40 transition-colors"
                >
                    <Plus size={14} className="text-white/40" />
                </button>
            </div>
        </div>
    );
}
