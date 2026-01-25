/**
 * RhymeBank Component
 * Displays a flat list of rhymes, sorted by user preference.
 */

import { useState, useMemo } from 'react';
import type { RhymeGroup } from '../../types/dicta';

interface RhymeBankProps {
    currentWord: string;
    rhymeGroups: RhymeGroup[];
    onWordClick: (word: string) => void;
}

type SortMode = 'length' | 'alpha';

export default function RhymeBank({ currentWord, rhymeGroups, onWordClick }: RhymeBankProps) {
    const [clickedWord, setClickedWord] = useState<string | null>(null);
    const [sortMode, setSortMode] = useState<SortMode>('length');

    // Flatten all results into a single array of words
    const allWords = useMemo(() => {
        const words = new Set<string>();
        rhymeGroups.forEach(group => {
            group.results.forEach(result => {
                result.forms.forEach(word => words.add(word));
            });
        });
        return Array.from(words);
    }, [rhymeGroups]);

    // Sort words based on mode
    const sortedWords = useMemo(() => {
        const sorted = [...allWords];
        if (sortMode === 'length') {
            sorted.sort((a, b) => a.length - b.length);
        } else {
            sorted.sort((a, b) => a.localeCompare(b, 'he'));
        }
        return sorted;
    }, [allWords, sortMode]);

    const handleWordClick = (word: string) => {
        setClickedWord(word);
        onWordClick(word);
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
                <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 p-4 text-center backdrop-blur-sm border border-purple-500/20">
                    <span className="text-xs uppercase tracking-wider text-purple-300/70">חרוזים ל</span>
                    <div className="text-2xl font-bold text-white mt-1">{currentWord}</div>
                </div>
            )}

            {/* Sort Controls */}
            {allWords.length > 0 && (
                <div className="mb-4 flex gap-2">
                    <button
                        onClick={() => setSortMode('length')}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${sortMode === 'length'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        📏 לפי אורך
                    </button>
                    <button
                        onClick={() => setSortMode('alpha')}
                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-all ${sortMode === 'alpha'
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        🔤 א-ב
                    </button>
                </div>
            )}

            {sortedWords.length === 0 ? (
                <div className="py-12 text-center">
                    <div className="text-4xl mb-3">🔍</div>
                    <p className="text-gray-500">אין תוצאות</p>
                </div>
            ) : (
                <div className="flex flex-wrap gap-2 max-h-[55vh] overflow-y-auto p-1 custom-scrollbar">
                    {sortedWords.map((word, idx) => (
                        <button
                            key={idx}
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
                </div>
            )}

            {/* Stats footer */}
            {sortedWords.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-800 text-center text-xs text-gray-600">
                    {sortedWords.length} חרוזים
                </div>
            )}
        </div>
    );
}
