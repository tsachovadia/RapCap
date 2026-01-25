/**
 * RhymeBank Component
 * Displays grouped rhymes by Mishkal (grammatical weight).
 * Organized into Perfect and Slant rhyme sections.
 */

import type { RhymeGroup } from '../../types/dicta';

interface RhymeBankProps {
    currentWord: string;
    rhymeGroups: RhymeGroup[];
    onWordClick: (word: string) => void;
}

export default function RhymeBank({ currentWord, rhymeGroups, onWordClick }: RhymeBankProps) {
    // Flatten all results
    const allResults = rhymeGroups.flatMap(group => group.results);

    // Separate into groups by lex (Mishkal)
    // For now, we'll show all as "Perfect" - future enhancement: classify by rhyme quality

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-purple-400">
                <span>🎯</span>
                <span>בנק החרוזים</span>
            </h2>

            {currentWord && (
                <div className="mb-4 rounded-lg bg-purple-900/30 p-3 text-center">
                    <span className="text-sm text-gray-400">חרוזים ל:</span>
                    <div className="text-xl font-bold text-white">{currentWord}</div>
                </div>
            )}

            {allResults.length === 0 ? (
                <p className="text-center text-gray-500">אין תוצאות</p>
            ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                    {allResults.map((result, idx) => (
                        <div key={idx} className="rounded-xl bg-gray-800/50 p-3">
                            {/* Mishkal Header */}
                            <div className="mb-2 text-xs text-gray-500 font-mono">
                                {result.lex}
                            </div>

                            {/* Words Grid */}
                            <div className="flex flex-wrap gap-2">
                                {result.forms.map((word, wordIdx) => (
                                    <button
                                        key={wordIdx}
                                        onClick={() => onWordClick(word)}
                                        className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm text-white transition-all hover:bg-purple-600 hover:scale-105 active:scale-95"
                                        title="לחץ להוספה ל-Lab"
                                    >
                                        {word}
                                    </button>
                                ))}
                                {result.hasMoreForms && (
                                    <span className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-500">
                                        +עוד...
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
