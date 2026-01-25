/**
 * Phonetic Notebook Page
 * Main page for the Rapper CMS - now with tabs!
 */

import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import SearchBar from '../components/notebook/SearchBar';
import TheLab from '../components/notebook/TheLab';
import type { DictaCacheEntry } from '../types/dicta';

const MAX_VISIBLE = 24; // Max rhymes to show per tab (fits on screen)

export default function NotebookPage() {
    const [currentWord, setCurrentWord] = useState<string>('');
    const [cacheEntry, setCacheEntry] = useState<DictaCacheEntry | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [labLines, setLabLines] = useState<string[]>(['']);
    const [clickedWord, setClickedWord] = useState<string | null>(null);

    const handleSearchComplete = useCallback((word: string, entry: DictaCacheEntry) => {
        setCurrentWord(word);
        setCacheEntry(entry);
        setIsLoading(false);
    }, []);

    const handleSearchStart = useCallback(() => {
        setIsLoading(true);
    }, []);

    const handleWordClick = useCallback((word: string) => {
        setClickedWord(word);
        setLabLines(prev => {
            const newLines = [...prev];
            const lastIndex = newLines.length - 1;
            newLines[lastIndex] = newLines[lastIndex]
                ? `${newLines[lastIndex]} ${word}`
                : word;
            return newLines;
        });
        setTimeout(() => setClickedWord(null), 300);
    }, []);

    const handleNewLine = useCallback(() => {
        setLabLines(prev => [...prev, '']);
    }, []);

    // Flatten and categorize words
    const { shortWords, longWords, allWords } = useMemo(() => {
        if (!cacheEntry) return { shortWords: [], longWords: [], allWords: [] };

        const words = new Set<string>();
        cacheEntry.rhymeResults.forEach(group => {
            group.results.forEach(result => {
                result.forms.forEach(word => words.add(word));
            });
        });

        const all = Array.from(words);
        const short = all.filter(w => w.length <= 4).slice(0, MAX_VISIBLE);
        const long = all.filter(w => w.length > 4).slice(0, MAX_VISIBLE);

        return { shortWords: short, longWords: long, allWords: all.slice(0, MAX_VISIBLE) };
    }, [cacheEntry]);

    const tabs = [
        { name: '🎯 חרוזים', words: allWords },
        { name: '⚡ קצרים', words: shortWords },
        { name: '🌊 ארוכים', words: longWords },
    ];

    return (
        <div className="h-screen bg-gray-950 text-gray-100 flex flex-col overflow-hidden" dir="rtl">
            {/* Header */}
            <header className="shrink-0 border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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
            <div className="shrink-0 border-b border-gray-800 bg-gray-900/50 px-4 py-4">
                <div className="mx-auto max-w-6xl">
                    <SearchBar
                        onSearchStart={handleSearchStart}
                        onSearchComplete={handleSearchComplete}
                    />
                </div>
            </div>

            {/* Main Content - No Scroll! */}
            <main className="flex-1 min-h-0 mx-auto max-w-6xl w-full px-4 py-4">
                {isLoading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="flex items-center gap-3 text-purple-400">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-purple-400 border-t-transparent" />
                            <span>מחפש חרוזים...</span>
                        </div>
                    </div>
                )}

                {!isLoading && cacheEntry && (
                    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Left: Tabs with Rhymes */}
                        <div className="lg:col-span-2 flex flex-col min-h-0">
                            {/* Current Word Badge */}
                            <div className="shrink-0 mb-4 rounded-xl bg-gradient-to-r from-purple-900/40 to-pink-900/40 p-3 text-center border border-purple-500/20">
                                <span className="text-xs text-purple-300/70">חרוזים ל</span>
                                <span className="text-xl font-bold text-white mr-2">{currentWord}</span>
                                <span className="text-xs text-gray-500">({allWords.length}+)</span>
                            </div>

                            {/* Tabs */}
                            <Tab.Group>
                                <Tab.List className="shrink-0 flex gap-1 rounded-xl bg-gray-800/50 p-1 mb-4">
                                    {tabs.map(tab => (
                                        <Tab
                                            key={tab.name}
                                            className={({ selected }) =>
                                                `flex-1 rounded-lg py-2.5 text-sm font-medium transition-all
                                                ${selected
                                                    ? 'bg-purple-600 text-white shadow'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                                }`
                                            }
                                        >
                                            {tab.name} ({tab.words.length})
                                        </Tab>
                                    ))}
                                </Tab.List>
                                <Tab.Panels className="flex-1 min-h-0">
                                    {tabs.map(tab => (
                                        <Tab.Panel key={tab.name} className="h-full">
                                            <div className="flex flex-wrap gap-2 content-start">
                                                {tab.words.map((word, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => handleWordClick(word)}
                                                        className={`
                                                            rounded-lg px-3 py-2 text-sm font-medium transition-all
                                                            ${clickedWord === word
                                                                ? 'bg-green-500 text-white scale-110 shadow-lg'
                                                                : 'bg-gray-700/80 text-gray-100 hover:bg-purple-600 hover:scale-105'
                                                            }
                                                        `}
                                                    >
                                                        {word}
                                                    </button>
                                                ))}
                                                {tab.words.length === 0 && (
                                                    <p className="text-gray-500 text-center w-full py-8">אין מילים בקטגוריה זו</p>
                                                )}
                                            </div>
                                        </Tab.Panel>
                                    ))}
                                </Tab.Panels>
                            </Tab.Group>
                        </div>

                        {/* Right: The Lab */}
                        <div className="lg:col-span-1 min-h-0">
                            <TheLab
                                lines={labLines}
                                onLinesChange={setLabLines}
                                onNewLine={handleNewLine}
                            />
                        </div>
                    </div>
                )}

                {!isLoading && !cacheEntry && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="mb-4 text-6xl">🎵</div>
                        <h2 className="mb-2 text-2xl font-bold text-gray-300">התחל לחפש</h2>
                        <p className="text-gray-500">הקלד מילה למעלה כדי למצוא חרוזים</p>
                    </div>
                )}
            </main>
        </div>
    );
}

