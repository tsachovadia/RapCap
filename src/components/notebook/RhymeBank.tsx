/**
 * RhymeBank Component
 * Displays grouped rhymes by Mishkal (grammatical weight).
 */

import { useState } from 'react';
import type { RhymeGroup } from '../../types/dicta';

interface RhymeBankProps {
    currentWord: string;
    rhymeGroups: RhymeGroup[];
    onWordClick: (word: string) => void;
}

// Map technical Mishkal names to friendlier Hebrew labels
const mishkalLabels: Record<string, string> = {
    'הלם_קל': '🔵 קל',
    'חלם_קל': '🔵 קל',
    'בלם_קל': '🔵 קל',
    'פעל_קל': '🔵 קל',
    '_הפעיל': '🟣 הפעיל',
    '_פיעל': '🟢 פיעל',
    '_נפעל': '🟡 נפעל',
    '_התפעל': '🟠 התפעל',
    '_הופעל': '⚪ הופעל',
    '_פועל': '🔴 פועל',
};

function getMishkalLabel(lex: string): string {
    // Try to find a matching pattern
    for (const [pattern, label] of Object.entries(mishkalLabels)) {
        if (lex.includes(pattern)) {
            return label;
        }
    }
    // Default: just show first part cleaner
    return `✨ ${lex.split('_')[0] || 'משקל'}`;
}

export default function RhymeBank({ currentWord, rhymeGroups, onWordClick }: RhymeBankProps) {
    const [clickedWord, setClickedWord] = useState<string | null>(null);

    // Flatten all results
    const allResults = rhymeGroups.flatMap(group => group.results);

    const handleWordClick = (word: string) => {
        setClickedWord(word);
        onWordClick(word);

        // Clear feedback after animation
        setTimeout(() => setClickedWord(null), 300);
    };

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-b from-gray-900 to-gray-950 p-5 shadow-lg shadow-purple-500/5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">🎯</span>
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    בנק החרוזים
                </span>
            </h2>

            {currentWord && (
                <div className="mb-5 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 p-4 text-center backdrop-blur-sm border border-purple-500/20">
                    <span className="text-xs uppercase tracking-wider text-purple-300/70">חרוזים ל</span>
                    <div className="text-2xl font-bold text-white mt-1">{currentWord}</div>
                </div>
            )}

            {allResults.length === 0 ? (
                <div className="py-12 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-500">אין תוצאות</p>
                </div>
            ) : (
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1 custom-scrollbar">
                    {allResults.map((result, idx) => (
                        <div
                            key={idx}
                            className="rounded-xl bg-gray-800/60 p-4 border border-gray-700/50 hover:border-purple-500/30 transition-colors"
                        >
                            {/* Mishkal Header - Now with friendly label */}
                            <div className="mb-3 flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-300">
                                    {getMishkalLabel(result.lex)}
                                </span>
                                <span className="text-xs text-gray-600 font-mono">
                                    ({result.forms.length})
                                </span>
                            </div>

                            {/* Words Grid */}
                            <div className="flex flex-wrap gap-2">
                                {result.forms.map((word, wordIdx) => (
                                    <button
                                        key={wordIdx}
                                        onClick={() => handleWordClick(word)}
                                        className={`
                                            rounded-lg px-3 py-2 text-sm font-medium
                                            transition-all duration-150 
                                            ${clickedWord === word
                                                ? 'bg-green-500 text-white scale-110 shadow-lg shadow-green-500/30'
                                                : 'bg-gray-700/80 text-gray-100 hover:bg-purple-600 hover:text-white hover:scale-105'
                                            }
                                            active:scale-95 cursor-pointer
                                        `}
                                    >
                                        {word}
                                    </button>
                                ))}
                                {result.hasMoreForms && (
                                    <span className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-700">
                                        +עוד...
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats footer */}
            {allResults.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800 text-center text-xs text-gray-600">
                    {allResults.reduce((sum, r) => sum + r.forms.length, 0)} חרוזים • {allResults.length} קבוצות
                </div>
            )}
        </div>
    );
}

