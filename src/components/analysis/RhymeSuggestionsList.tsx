import { useState } from 'react';
import { Sparkles, Layers, Plus, Loader2, Database } from 'lucide-react';
import type { DetectedRhymeGroup } from '../../db/db';
import { getRhymes, stripNikkud } from '../../services/dicta';

interface RhymeSuggestionsListProps {
    groups: DetectedRhymeGroup[];
    onSaveGroup: (group: DetectedRhymeGroup) => void;
    onDiscard: (groupId: string) => void;
}

export default function RhymeSuggestionsList({ groups, onSaveGroup, onDiscard }: RhymeSuggestionsListProps) {
    const [expandingId, setExpandingId] = useState<string | null>(null);
    const [expandedWords, setExpandedWords] = useState<Record<string, string[]>>({});

    const handleExpand = async (group: DetectedRhymeGroup) => {
        if (expandingId) return;
        setExpandingId(group.id);

        try {
            // Pick the longest word as the "seed" for better results, or just the first
            // Ideally we pick one with Nikkud if we had it, but we rely on Dicta's lookup
            const seedWord = group.words.reduce((a, b) => a.length > b.length ? a : b, group.words[0]);

            // 1. Get vocalization options (simulated or real if we had nikkud input)
            // For now, raw string
            const rhymes = await getRhymes(seedWord);

            // Filter out words already in the group
            const existingSet = new Set(group.words.map(w => stripNikkud(w)));
            const newRhymes = rhymes.filter(r => !existingSet.has(stripNikkud(r)));

            setExpandedWords(prev => ({
                ...prev,
                [group.id]: newRhymes.slice(0, 15) // Limit to top 15 to not overwhelm
            }));
        } catch (e) {
            console.error("Failed to expand group:", e);
        } finally {
            setExpandingId(null);
        }
    };

    const handleSave = (group: DetectedRhymeGroup) => {
        // If we have expanded words, merge them in
        const extra = expandedWords[group.id] || [];
        const finalGroup = {
            ...group,
            words: [...group.words, ...extra]
        };
        onSaveGroup(finalGroup);
    };

    if (groups.length === 0) {
        return (
            <div className="text-center py-10 text-subdued/50 italic">
                No distinct rhyme groups detected yet.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {groups.map(group => {
                const isExpanded = !!expandedWords[group.id];
                const expansion = expandedWords[group.id] || [];

                return (
                    <div key={group.id} className="bg-[#181818] border border-[#282828] rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Header */}
                        <div className="p-3 bg-[#202020] border-b border-[#282828] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-8 rounded-full ${group.type === 'multi_syllabic' ? 'bg-purple-500 shadow-[0_0_10px_#a855f7]' : 'bg-blue-500'}`} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">
                                            {group.phoneticSignature || 'Unknown Pattern'}
                                        </span>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${group.type === 'multi_syllabic' ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-blue-500/10 border-blue-500/30 text-blue-300'}`}>
                                            {group.type === 'multi_syllabic' ? 'Multi-Syllabic' : 'Rhyme'}
                                        </span>
                                        {group.status === 'match' && (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                <Database size={10} /> Existing
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-subdued flex items-center gap-2 mt-0.5">
                                        <Sparkles size={10} />
                                        Contextual Confidence: {Math.round(group.confidence * 100)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4">
                            <div className="flex flex-wrap gap-2 mb-3">
                                {group.words.map((w, idx) => (
                                    <span key={idx} className="bg-[#2a2a2a] text-gray-200 px-2 py-1 rounded text-sm border border-white/5">
                                        {w}
                                    </span>
                                ))}
                                {isExpanded && expansion.map((w, idx) => (
                                    <span key={`exp-${idx}`} className="bg-purple-500/10 text-purple-200 px-2 py-1 rounded text-sm border border-purple-500/20 animate-in zoom-in duration-200">
                                        warning
                                        {w}
                                    </span>
                                ))}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-[#282828]/50">
                                <button
                                    onClick={() => handleExpand(group)}
                                    disabled={!!expandingId || isExpanded}
                                    className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors
                                        ${isExpanded ? 'text-subdued cursor-default' : 'text-purple-400 hover:bg-purple-500/10 hover:text-purple-300'}
                                    `}
                                >
                                    {expandingId === group.id ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Sparkles size={12} />
                                    )}
                                    {isExpanded ? 'Enriched' : 'Enrich with Dicta'}
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onDiscard(group.id)}
                                        className="text-white/40 hover:text-white/80 p-2 transition-colors"
                                        title="Discard"
                                    >
                                        <Layers size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleSave(group)}
                                        className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-transform active:scale-95 flex items-center gap-1.5"
                                    >
                                        <Plus size={12} strokeWidth={3} />
                                        {group.status === 'match' ? 'Merge & Update' : 'Create Group'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
