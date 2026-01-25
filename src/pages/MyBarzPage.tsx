/**
 * My Barz Page
 * Saved rhymes and wordplay ideas
 */

import { useState } from 'react';

interface Bar {
    id: string;
    text: string;
    type: 'multi' | 'punch' | 'assonance' | 'wordplay';
    explanation?: string;
}

const typeLabels = {
    multi: { icon: '🎯', label: 'חרוז מולטי' },
    punch: { icon: '💥', label: 'פאנץ\'ליין' },
    assonance: { icon: '🔊', label: 'אסונאנס' },
    wordplay: { icon: '🔀', label: 'משחק מילים' },
};

export default function MyBarzPage() {
    const [bars, setBars] = useState<Bar[]>([
        { id: '1', text: 'שינאה זה אהבה הפוכה', type: 'wordplay', explanation: 'משחק על ההיפוכיות' },
        { id: '2', text: 'יש לי flow כמו נהר', type: 'assonance', explanation: 'o-o צליל חוזר' },
    ]);

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">📝 My Barz</h1>
                <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-xl hover:bg-purple-500 transition-colors">
                    +
                </button>
            </div>

            {/* Bars List */}
            <div className="space-y-3">
                {bars.map((bar) => (
                    <div
                        key={bar.id}
                        className="bg-[#12121a] rounded-xl p-4 border border-gray-800"
                    >
                        <p className="text-lg font-medium mb-2">{bar.text}</p>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">
                                {typeLabels[bar.type].icon} {typeLabels[bar.type].label}
                            </span>
                        </div>
                        {bar.explanation && (
                            <p className="text-sm text-gray-500">{bar.explanation}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {bars.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📝</div>
                    <p className="text-gray-500">אין לך עדיין שורות שמורות</p>
                    <p className="text-gray-600 text-sm">לחץ + כדי להוסיף</p>
                </div>
            )}
        </div>
    );
}
