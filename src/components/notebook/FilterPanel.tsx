/**
 * FilterPanel Component
 * Controls for filtering rhyme results by syllables, POS, etc.
 */

import type { NotebookFilters } from '../../pages/NotebookPage';

interface FilterPanelProps {
    filters: NotebookFilters;
    onFiltersChange: (filters: NotebookFilters) => void;
}

export default function FilterPanel({ filters, onFiltersChange }: FilterPanelProps) {
    const handleChange = <K extends keyof NotebookFilters>(
        key: K,
        value: NotebookFilters[K]
    ) => {
        onFiltersChange({ ...filters, [key]: value });
    };

    return (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-yellow-400">
                <span>⚙️</span>
                <span>הגדרות</span>
            </h2>

            {/* Rhyme Type Toggle */}
            <div className="mb-6">
                <label className="mb-2 block text-sm text-gray-400">סוג חרוז</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleChange('perfectOnly', false)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${!filters.perfectOnly
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        הכל
                    </button>
                    <button
                        onClick={() => handleChange('perfectOnly', true)}
                        className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${filters.perfectOnly
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                            }`}
                    >
                        מושלמים בלבד
                    </button>
                </div>
            </div>

            {/* Syllable Range */}
            <div className="mb-6">
                <label className="mb-2 block text-sm text-gray-400">
                    הברות: {filters.minSyllables} - {filters.maxSyllables}
                </label>
                <div className="flex items-center gap-3">
                    <input
                        type="range"
                        min={1}
                        max={7}
                        value={filters.minSyllables}
                        onChange={(e) => handleChange('minSyllables', parseInt(e.target.value))}
                        className="flex-1 accent-purple-500"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                        type="range"
                        min={1}
                        max={7}
                        value={filters.maxSyllables}
                        onChange={(e) => handleChange('maxSyllables', parseInt(e.target.value))}
                        className="flex-1 accent-purple-500"
                    />
                </div>
            </div>

            {/* Part of Speech */}
            <div className="mb-6">
                <label className="mb-2 block text-sm text-gray-400">חלק דיבור</label>
                <select
                    value={filters.partOfSpeech}
                    onChange={(e) => handleChange('partOfSpeech', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                >
                    <option value={0}>הכל</option>
                    <option value={1}>שם עצם</option>
                    <option value={2}>שם תואר</option>
                    <option value={3}>פועל</option>
                    <option value={4}>תואר הפועל</option>
                </select>
            </div>

            {/* Coming Soon: Mood Filter */}
            <div className="rounded-lg border border-dashed border-gray-700 p-3 text-center text-xs text-gray-600">
                🚧 בקרוב: מסנן מצב רוח (Aggressive / Smooth)
            </div>
        </div>
    );
}
