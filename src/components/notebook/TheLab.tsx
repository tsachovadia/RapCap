/**
 * TheLab Component
 * Writing area where users compose their bars.
 * Words can be dragged/clicked from RhymeBank into here.
 */

import { useState, useEffect, useRef } from 'react';

interface TheLabProps {
    lines: string[];
    onLinesChange: (lines: string[]) => void;
    onNewLine: () => void;
}

export default function TheLab({ lines, onLinesChange, onNewLine }: TheLabProps) {
    const [flashLine, setFlashLine] = useState<number | null>(null);
    const prevLinesRef = useRef(lines);

    // Flash feedback when content is added via click
    useEffect(() => {
        const lastIdx = lines.length - 1;
        if (lines[lastIdx] !== prevLinesRef.current[lastIdx] && lines[lastIdx].length > (prevLinesRef.current[lastIdx]?.length || 0)) {
            setFlashLine(lastIdx);
            setTimeout(() => setFlashLine(null), 400);
        }
        prevLinesRef.current = lines;
    }, [lines]);

    const handleLineChange = (index: number, value: string) => {
        const newLines = [...lines];
        newLines[index] = value;
        onLinesChange(newLines);
    };

    const handleKeyDown = (e: React.KeyboardEvent, _index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onNewLine();
            setTimeout(() => {
                const inputs = document.querySelectorAll<HTMLInputElement>('.lab-line-input');
                inputs[inputs.length - 1]?.focus();
            }, 50);
        }
    };

    const handleDeleteLine = (index: number) => {
        if (lines.length <= 1) return;
        const newLines = lines.filter((_, i) => i !== index);
        onLinesChange(newLines);
    };

    const wordCount = lines.reduce((sum, line) => sum + line.trim().split(/\s+/).filter(Boolean).length, 0);

    return (
        <div className="rounded-2xl border border-green-500/20 bg-gradient-to-b from-gray-900 to-gray-950 p-5 shadow-lg shadow-green-500/5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <span className="text-2xl">🧪</span>
                <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                    The Lab
                </span>
            </h2>

            <p className="mb-4 text-xs text-gray-500 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-green-500/50 animate-pulse"></span>
                לחץ על מילה מהבנק להוספה
            </p>

            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {lines.map((line, index) => (
                    <div key={index} className="group flex items-center gap-2">
                        <span className="w-6 text-center text-xs text-gray-600 font-mono">
                            {index + 1}.
                        </span>
                        <input
                            type="text"
                            value={line}
                            onChange={(e) => handleLineChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            placeholder="כתוב כאן..."
                            className={`
                                lab-line-input flex-1 rounded-lg border px-3 py-2.5 text-right text-white 
                                placeholder-gray-600 focus:outline-none transition-all duration-200
                                ${flashLine === index
                                    ? 'border-green-400 bg-green-500/20 ring-2 ring-green-400/30'
                                    : 'border-gray-700 bg-gray-800/80 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                                }
                            `}
                            dir="rtl"
                        />
                        {lines.length > 1 && (
                            <button
                                onClick={() => handleDeleteLine(index)}
                                className="rounded p-1 text-gray-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                                title="מחק שורה"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <button
                onClick={onNewLine}
                className="mt-4 w-full rounded-lg border border-dashed border-gray-700 py-2.5 text-sm text-gray-500 transition-all hover:border-green-500 hover:text-green-400 hover:bg-green-500/5"
            >
                + שורה חדשה
            </button>

            {/* Stats footer */}
            <div className="mt-4 pt-3 border-t border-gray-800 flex justify-between text-xs text-gray-600">
                <span>{lines.filter(l => l.trim()).length} שורות</span>
                <span>{wordCount} מילים</span>
            </div>
        </div>
    );
}

