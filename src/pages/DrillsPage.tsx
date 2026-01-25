/**
 * Drills Page
 * Training exercises organized by category
 */

import { useState } from 'react';

interface Drill {
    id: string;
    name: string;
    icon: string;
    duration: number; // minutes
    description: string;
    example: string;
    reminder?: boolean;
}

interface Category {
    id: string;
    name: string;
    icon: string;
    description: string;
    drills: Drill[];
}

const categories: Category[] = [
    {
        id: 'creativity',
        name: 'יצירתיות',
        icon: '🧠',
        description: 'הבסיס לכתיבה. שליפת דימויים ושבירת דפוסים.',
        drills: [
            { id: 'obj', name: 'Object Writing', icon: '📝', duration: 10, description: 'כתוב על חפץ ב-7 חושים', example: 'כוס → "זכוכית שקופה, טעם מר..."' },
            { id: 'free', name: 'Free Association', icon: '💭', duration: 5, description: 'רשימת מילים מנושא', example: 'כסף → עושר, בנק, ירוק...' },
            { id: 'chain', name: 'Chain Association', icon: '🔗', duration: 3, description: 'שרשרת - כל מילה מהקודמת', example: 'עיר → בטון → אפור → זקנה' },
        ],
    },
    {
        id: 'rhyme',
        name: 'חריזה',
        icon: '🎵',
        description: 'פיתוח האוזן. טכניקות אמינם.',
        drills: [
            { id: 'scheme', name: 'Rhyme Schemes', icon: '📊', duration: 5, description: 'כתוב בתבניות שונות', example: 'AABB → ABAB → ABBA' },
            { id: 'multi', name: 'Multisyllabic', icon: '🎯', duration: 7, description: 'מצא חרוזים רב-הברתיים', example: 'ילד של אבא = סרט של דרמה' },
        ],
    },
    {
        id: 'flow',
        name: 'פלואו',
        icon: '🎤',
        description: 'לשבת על הביט. שליטה בקצב.',
        drills: [
            { id: 'scat', name: 'Scatting', icon: '🎵', duration: 5, description: 'ג\'יבריש על ביט', example: '"דה-דה-דאם" - מצא קצב' },
            { id: 'mimic', name: 'Mimicry', icon: '🎭', duration: 10, description: 'חקה ראפר על ביט אחר', example: 'J. Cole על ביט מהיר' },
        ],
    },
    {
        id: 'story',
        name: 'סטורי',
        icon: '📖',
        description: 'פאנץ\'ליינס וסיפור.',
        drills: [
            { id: 'backward', name: 'Working Backwards', icon: '🔙', duration: 7, description: 'כתוב את הפאנץ\' קודם', example: 'פאנץ\' → סטאפ' },
            { id: 'persp', name: 'Perspective Swap', icon: '👁️', duration: 7, description: 'כתוב מנקודת מבט אחרת', example: 'מנקודת מבט של אקדח' },
        ],
    },
    {
        id: 'discipline',
        name: 'משמעת',
        icon: '⏰',
        description: 'הפיכה להרגל.',
        drills: [
            { id: '7min', name: '7 Minute Drill', icon: '⏱️', duration: 7, description: 'סיים בית ללא עריכה', example: 'J. Cole style' },
        ],
    },
];

export default function DrillsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const category = categories.find((c) => c.id === selectedCategory);

    return (
        <div className="p-4">
            {!selectedCategory ? (
                <>
                    {/* Header */}
                    <h1 className="text-2xl font-bold mb-6">✏️ תרגילים</h1>

                    {/* Category Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className="flex-shrink-0 px-4 py-2 bg-[#12121a] rounded-full border border-gray-800 hover:border-purple-500 transition-colors"
                            >
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* All Categories */}
                    <div className="space-y-4">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className="w-full bg-[#12121a] rounded-xl p-4 border border-gray-800 text-right hover:border-purple-500 transition-colors"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{cat.icon}</span>
                                    <span className="text-lg font-bold">{cat.name}</span>
                                    <span className="text-xs text-gray-500 mr-auto">
                                        {cat.drills.length} תרגילים
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500">{cat.description}</p>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {/* Category Detail */}
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className="flex items-center gap-2 text-gray-400 mb-4 hover:text-white"
                    >
                        ← חזור
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{category?.icon}</span>
                        <h1 className="text-2xl font-bold">{category?.name}</h1>
                    </div>
                    <p className="text-gray-500 mb-6">{category?.description}</p>

                    {/* Drills */}
                    <div className="space-y-3">
                        {category?.drills.map((drill) => (
                            <div
                                key={drill.id}
                                className="bg-[#12121a] rounded-xl p-4 border border-gray-800"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span>{drill.icon}</span>
                                        <span className="font-bold">{drill.name}</span>
                                    </div>
                                    <span className="text-xs text-gray-500">⏱ {drill.duration} דק'</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">{drill.description}</p>
                                <p className="text-xs text-gray-600 mb-3">💡 {drill.example}</p>
                                <button className="w-full py-2 bg-purple-600 rounded-lg text-sm font-medium hover:bg-purple-500 transition-colors">
                                    ▶ התחל תרגיל
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
