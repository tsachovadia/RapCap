/**
 * Phonetic Notebook Page
 * Main page for the Rapper CMS - organized by sound patterns.
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from '../components/notebook/SearchBar';
import RhymeBank from '../components/notebook/RhymeBank';
import MultiConstructor from '../components/notebook/MultiConstructor';
import TheLab from '../components/notebook/TheLab';
import FilterPanel from '../components/notebook/FilterPanel';
import type { DictaCacheEntry, RhymeGroup } from '../types/dicta';

export interface NotebookFilters {
    minSyllables: number;
    maxSyllables: number;
    perfectOnly: boolean;
    partOfSpeech: number; // 0 = all
}

export default function NotebookPage() {
    const [currentWord, setCurrentWord] = useState<string>('');
    const [cacheEntry, setCacheEntry] = useState<DictaCacheEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [labLines, setLabLines] = useState<string[]>(['']);
    const [filters, setFilters] = useState<NotebookFilters>({
        minSyllables: 1,
        maxSyllables: 7,
        perfectOnly: false,
        partOfSpeech: 0,
    });

    const handleSearchComplete = useCallback((word: string, entry: DictaCacheEntry) => {
        setCurrentWord(word);
        setCacheEntry(entry);
        setIsLoading(false);
    }, []);

    const handleSearchStart = useCallback(() => {
        setIsLoading(true);
    }, []);

    const handleWordDrag = useCallback((word: string) => {
        // Add word to the current line in the lab
        setLabLines(prev => {
            const newLines = [...prev];
            const lastIndex = newLines.length - 1;
            newLines[lastIndex] = newLines[lastIndex]
                ? `${newLines[lastIndex]} ${word}`
                : word;
            return newLines;
        });
    }, []);

    const handleNewLine = useCallback(() => {
        setLabLines(prev => [...prev, '']);
    }, []);

    // Filter rhyme results based on current filters
    const filteredResults: RhymeGroup[] = cacheEntry?.rhymeResults ?? [];

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
                    <Link to="/" className="text-xl font-bold text-purple-400">
                        🎤 RapCap
                    </Link>
                    <h1 className="text-lg font-semibold">📝 מחברת פונטית</h1>
                    <Link to="/library" className="text-gray-400 hover:text-white">
                        ספריה
                    </Link>
                </div>
            </header>

            {/* Search Bar */}
            <div className="border-b border-gray-800 bg-gray-900/50 px-4 py-4">
                <div className="mx-auto max-w-7xl">
                    <SearchBar
                        onSearchStart={handleSearchStart}
                        onSearchComplete={handleSearchComplete}
                    />
                </div>
            </div>

            {/* Main 4-Column Layout */}
            <main className="mx-auto max-w-7xl px-4 py-6">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3 text-purple-400">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                            <span>מחפש חרוזים...</span>
                        </div>
                    </div>
                )}

                {!isLoading && cacheEntry && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                        {/* Column 1: Rhyme Bank */}
                        <div className="lg:col-span-1">
                            <RhymeBank
                                currentWord={currentWord}
                                rhymeGroups={filteredResults}
                                onWordClick={handleWordDrag}
                            />
                        </div>

                        {/* Column 2: Multi-Syllabic Constructor */}
                        <div className="lg:col-span-1">
                            <MultiConstructor
                                rhymeGroups={filteredResults}
                                onWordClick={handleWordDrag}
                            />
                        </div>

                        {/* Column 3: The Lab (Writing Area) */}
                        <div className="lg:col-span-1">
                            <TheLab
                                lines={labLines}
                                onLinesChange={setLabLines}
                                onNewLine={handleNewLine}
                            />
                        </div>

                        {/* Column 4: Filters */}
                        <div className="lg:col-span-1">
                            <FilterPanel
                                filters={filters}
                                onFiltersChange={setFilters}
                            />
                        </div>
                    </div>
                )}

                {!isLoading && !cacheEntry && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-4 text-6xl">🎵</div>
                        <h2 className="mb-2 text-2xl font-bold text-gray-300">
                            התחל לחפש
                        </h2>
                        <p className="text-gray-500">
                            הקלד מילה למעלה כדי למצוא חרוזים לפי קצב ומשקל
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
