/**
 * MultiConstructor Component
 * Suggests multi-syllabic word combinations that match the same meter.
 * (Placeholder for future advanced logic)
 */

import type { RhymeGroup } from '../../types/dicta';

interface MultiConstructorProps {
    rhymeGroups: RhymeGroup[];
    onWordClick: (word: string) => void;
}

export default function MultiConstructor({ rhymeGroups, onWordClick }: MultiConstructorProps) {
    // For MVP: Show longer words (3+ syllables) as potential "multi" candidates
    // Future: Implement actual syllable combination logic

    const longWords = rhymeGroups
        .flatMap(group => group.results)
        .flatMap(result => result.forms)
        .filter(word => word.length >= 5) // Rough heuristic for multi-syllable
        .slice(0, 15);

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-pink-400">
                <span>🔗</span>
                <span>מחולל Multis</span>
            </h2>

            <p className="mb-4 text-xs text-gray-500">
                מילים ארוכות שמתאימות לקצב
            </p>

            {longWords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">אין מילים ארוכות</p>
            ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                    {longWords.map((word, idx) => (
                        <button
                            key={idx}
                            onClick={() => onWordClick(word)}
                            className="w-full rounded-lg bg-gradient-to-r from-pink-900/30 to-purple-900/30 px-4 py-2 text-right text-white transition-all hover:from-pink-800/50 hover:to-purple-800/50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {word}
                        </button>
                    ))}
                </div>
            )}

            <div className="mt-4 rounded-lg border border-dashed border-gray-700 p-3 text-center text-xs text-gray-600">
                🚧 בקרוב: צירופי מילים אוטומטיים
            </div>
        </div>
    );
}
