/**
 * SearchBar Component
 * Input for searching words with vocalization picker.
 */

import { useState } from 'react';
import { getVocalizations } from '../../services/dictaApi';
import { searchWithCache, getCachedVocalizations } from '../../services/dictaCache';
import type { DictaCacheEntry } from '../../types/dicta';

interface SearchBarProps {
    onSearchStart: () => void;
    onSearchComplete: (word: string, entry: DictaCacheEntry) => void;
}

export default function SearchBar({ onSearchStart, onSearchComplete }: SearchBarProps) {
    const [rawInput, setRawInput] = useState('');
    const [vocalizations, setVocalizations] = useState<string[]>([]);
    const [showVocPicker, setShowVocPicker] = useState(false);
    const [isLoadingVoc, setIsLoadingVoc] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRawInput(e.target.value);
        setShowVocPicker(false);
        setVocalizations([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rawInput.trim()) return;

        setIsLoadingVoc(true);

        try {
            // Check if we already have cached vocalizations
            const cachedVocs = await getCachedVocalizations(rawInput);

            if (cachedVocs && cachedVocs.length > 0) {
                setVocalizations(cachedVocs);
            } else {
                // Fetch from Dicta
                const vocs = await getVocalizations(rawInput);
                setVocalizations(vocs);
            }

            setShowVocPicker(true);
        } catch (error) {
            console.error('Failed to get vocalizations:', error);
            // If vocalization fails, try direct search with raw word
            handleVocalizationSelect(rawInput);
        } finally {
            setIsLoadingVoc(false);
        }
    };

    const handleVocalizationSelect = async (vocalizedWord: string) => {
        setShowVocPicker(false);
        onSearchStart();

        try {
            const entry = await searchWithCache(rawInput, vocalizedWord);
            onSearchComplete(vocalizedWord, entry);
        } catch (error) {
            console.error('Search failed:', error);
        }
    };

    return (
        <div className="relative">
            <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={rawInput}
                        onChange={handleInputChange}
                        placeholder="הקלד מילה לחיפוש..."
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-right text-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        dir="rtl"
                    />
                    {isLoadingVoc && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                        </div>
                    )}
                </div>
                <button
                    type="submit"
                    disabled={!rawInput.trim() || isLoadingVoc}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white transition-all hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
                >
                    חפש 🔍
                </button>
            </form>

            {/* Vocalization Picker Dropdown */}
            {showVocPicker && vocalizations.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-gray-700 bg-gray-800 p-2 shadow-xl">
                    <p className="mb-2 px-2 text-sm text-gray-400">בחר את הניקוד הנכון:</p>
                    <div className="flex flex-wrap gap-2">
                        {vocalizations.map((voc, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleVocalizationSelect(voc)}
                                className="rounded-lg bg-gray-700 px-4 py-2 text-lg text-white transition-colors hover:bg-purple-600"
                            >
                                {voc}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
