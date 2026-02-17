import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { db } from '../../db/db';
import type { Verse, VerseScheme } from '../../db/db';
import { getRhymes, getVocalization, stripNikkud } from '../../services/dicta';
import { Syllabifier } from '../../services/phonetic/Syllabifier';

interface RhymePanelProps {
    activeScheme: VerseScheme | null;
    verse: Verse;
    onInsertWord: (word: string) => void;
}

export default function RhymePanel({ verse, onInsertWord }: RhymePanelProps) {
    const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
    const [groupFilter, setGroupFilter] = useState('');
    const [newGroupName, setNewGroupName] = useState('');
    const [addingToGroupId, setAddingToGroupId] = useState<number | null>(null);
    const [newWordText, setNewWordText] = useState('');
    const [syllableCounts, setSyllableCounts] = useState<Map<string, number>>(new Map());

    // Dicta search state (collapsed section)
    const [searchCollapsed, setSearchCollapsed] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const wordGroups = useLiveQuery(() => db.wordGroups.toArray()) || [];

    // Collect verse words for highlighting
    const verseWords = useMemo(() => {
        const set = new Set<string>();
        for (const bar of verse.bars) {
            const words = bar.text.split(/\s+/).filter(Boolean);
            words.forEach(w => set.add(stripNikkud(w)));
        }
        return set;
    }, [verse.bars]);

    const isWordInVerse = (word: string) => verseWords.has(stripNikkud(word));

    // Lazy syllable count computation when a group is expanded
    useEffect(() => {
        if (expandedGroupId === null) return;
        const group = wordGroups.find(g => g.id === expandedGroupId);
        if (!group) return;

        const computeCounts = async () => {
            const newCounts = new Map(syllableCounts);
            let changed = false;

            for (const item of group.items) {
                if (newCounts.has(item)) continue;

                // Check itemsMetadata first
                const meta = group.itemsMetadata?.[item];
                if (meta?.syllableCount) {
                    newCounts.set(item, meta.syllableCount);
                    changed = true;
                    continue;
                }

                // Check vocalization cache
                const clean = stripNikkud(item).trim();
                if (!clean) continue;
                const cached = await db.vocalizationCache.get(clean);
                if (cached) {
                    const count = Syllabifier.syllabify(cached.vocalized).length;
                    newCounts.set(item, count);
                    changed = true;
                }
            }

            if (changed) setSyllableCounts(newCounts);
        };
        computeCounts();
    }, [expandedGroupId, wordGroups]);

    // Filter groups
    const filteredGroups = useMemo(() => {
        if (!groupFilter) return wordGroups;
        const q = groupFilter.toLowerCase();
        return wordGroups.filter(g =>
            g.name.toLowerCase().includes(q) ||
            g.items.some(item => stripNikkud(item).includes(q))
        );
    }, [wordGroups, groupFilter]);

    // Create new group
    const handleCreateGroup = async () => {
        const name = newGroupName.trim();
        if (!name) return;
        const id = await db.wordGroups.add({
            name,
            items: [],
            createdAt: new Date(),
            lastUsedAt: new Date(),
        });
        setNewGroupName('');
        setExpandedGroupId(id as number);
    };

    // Add word to group
    const handleAddWord = async (groupId: number) => {
        const word = newWordText.trim();
        if (!word) return;
        const group = wordGroups.find(g => g.id === groupId);
        if (!group) return;

        const clean = stripNikkud(word);
        if (group.items.some(item => stripNikkud(item) === clean)) return;

        await db.wordGroups.update(groupId, {
            items: [...group.items, word],
            lastUsedAt: new Date(),
        });
        setNewWordText('');
        setAddingToGroupId(null);
    };

    // Search for rhymes via Dicta
    const handleSearch = useCallback(async () => {
        const q = searchQuery.trim();
        if (!q) return;
        setIsSearching(true);
        try {
            const vocResults = await getVocalization(q);
            const vocalized = vocResults[0] || q;
            const results = await getRhymes(vocalized);
            setSearchResults(results);
        } catch (e) {
            console.error('Rhyme search failed', e);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    return (
        <div className="flex flex-col h-full bg-[#121212] overflow-hidden">
            {/* Header: Rhyme Bank + create group */}
            <div className="p-3 border-b border-white/5 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-white/80" dir="rtl">בנק חרוזים</h3>
                </div>
                <div className="flex gap-1.5" dir="rtl">
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                        dir="rtl"
                        placeholder="קבוצה חדשה..."
                        className="flex-1 bg-[#282828] rounded-lg px-2 py-1.5 text-xs outline-none border border-transparent focus:border-white/20 transition-colors"
                    />
                    <button
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim()}
                        className="p-1.5 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-30 rounded-lg transition-colors"
                    >
                        <Plus size={14} className="text-black" />
                    </button>
                </div>
            </div>

            {/* Group filter */}
            <div className="p-3 pb-1 shrink-0">
                <input
                    type="text"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                    dir="rtl"
                    placeholder="סנן קבוצות..."
                    className="w-full bg-[#1a1a1a] rounded px-2 py-1 text-xs outline-none border border-white/5 focus:border-white/15 transition-colors"
                />
            </div>

            {/* WordGroup list (primary content) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-1 space-y-2">
                {filteredGroups.map(group => {
                    const isExpanded = expandedGroupId === group.id;
                    const itemsToShow = isExpanded ? group.items : group.items.slice(0, 5);

                    return (
                        <div
                            key={group.id}
                            className="bg-[#181818] rounded-xl border border-white/5 overflow-hidden"
                        >
                            {/* Group Header */}
                            <button
                                onClick={() => setExpandedGroupId(isExpanded ? null : group.id!)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/5 transition-colors"
                            >
                                <span className="text-sm font-medium text-[#1DB954]" dir="rtl">
                                    {group.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/30">{group.items.length}</span>
                                    {isExpanded ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                                </div>
                            </button>

                            {/* Group Items with syllable badges */}
                            <div className="px-3 pb-2 flex flex-wrap gap-1" dir="rtl">
                                {itemsToShow.map((item, i) => {
                                    const sylCount = syllableCounts.get(item);
                                    return (
                                        <button
                                            key={`${group.id}-${i}`}
                                            onClick={() => onInsertWord(stripNikkud(item))}
                                            className={`
                                                relative px-2 py-0.5 rounded-full text-[10px] transition-all
                                                ${isWordInVerse(item)
                                                    ? 'bg-[#1DB954] text-black font-bold scale-105 shadow-[0_0_15px_rgba(29,185,84,0.4)]'
                                                    : 'bg-[#252525] text-white/80 hover:bg-[#333] border border-white/5'
                                                }
                                            `}
                                        >
                                            {item}
                                            {sylCount != null && (
                                                <span className="absolute -top-1.5 -left-1.5 bg-purple-600/80 text-[7px] rounded-full w-3.5 h-3.5 flex items-center justify-center text-white font-bold leading-none">
                                                    {sylCount}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                                {!isExpanded && group.items.length > 5 && (
                                    <span className="text-[10px] text-white/30 px-1 py-0.5">
                                        +{group.items.length - 5}
                                    </span>
                                )}
                            </div>

                            {/* Inline add word (when expanded) */}
                            {isExpanded && (
                                <div className="px-3 pb-2 flex gap-1.5" dir="rtl">
                                    <input
                                        type="text"
                                        value={addingToGroupId === group.id ? newWordText : ''}
                                        onChange={(e) => { setAddingToGroupId(group.id!); setNewWordText(e.target.value); }}
                                        onFocus={() => setAddingToGroupId(group.id!)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddWord(group.id!)}
                                        dir="rtl"
                                        placeholder="הוסף מילה..."
                                        className="flex-1 bg-[#252525] rounded px-2 py-1 text-[10px] outline-none border border-white/5 focus:border-white/15 transition-colors"
                                    />
                                    <button
                                        onClick={() => handleAddWord(group.id!)}
                                        disabled={!newWordText.trim() || addingToGroupId !== group.id}
                                        className="text-[10px] text-[#1DB954] px-2 disabled:opacity-30 font-medium"
                                    >
                                        הוסף
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}

                {filteredGroups.length === 0 && (
                    <p className="text-center text-white/30 text-xs py-4">
                        {groupFilter ? 'לא נמצאו קבוצות' : 'אין קבוצות מילים'}
                    </p>
                )}
            </div>

            {/* Dicta Search (collapsed secondary section) */}
            <div className="border-t border-white/5 shrink-0">
                <button
                    onClick={() => setSearchCollapsed(!searchCollapsed)}
                    className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                >
                    <span className="text-xs text-white/40 flex items-center gap-1.5">
                        <Search size={12} /> חיפוש בדיקטה
                    </span>
                    {searchCollapsed ? <ChevronUp size={14} className="text-white/30" /> : <ChevronDown size={14} className="text-white/30" />}
                </button>
                {!searchCollapsed && (
                    <div className="px-3 pb-3">
                        <div className="flex gap-2 mb-2">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    dir="rtl"
                                    placeholder="חפש חרוז..."
                                    className="w-full bg-[#282828] rounded-lg px-3 py-2 pr-9 text-sm outline-none border border-transparent focus:border-white/20 transition-colors"
                                />
                                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={isSearching || !searchQuery.trim()}
                                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg text-sm font-medium transition-colors shrink-0"
                            >
                                {isSearching ? '...' : 'חפש'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                {searchResults.map((word, i) => (
                                    <button
                                        key={`sr-${i}`}
                                        onClick={() => onInsertWord(stripNikkud(word))}
                                        className={`
                                            px-2 py-0.5 rounded-full text-xs transition-all
                                            ${isWordInVerse(word)
                                                ? 'bg-[#1DB954] text-black font-bold shadow-[0_0_10px_rgba(29,185,84,0.3)]'
                                                : 'bg-[#252525] text-white/70 hover:bg-[#333] border border-white/5'
                                            }
                                        `}
                                    >
                                        {word}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
