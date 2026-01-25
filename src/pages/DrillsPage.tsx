/**
 * Drills Page - Training Library
 */
import { useState } from 'react'

const categories = [
    { id: 'creativity', name: 'יצירתיות', icon: 'psychology', color: '#9213ec', drills: 6, level: 'מתחיל' },
    { id: 'rhyme', name: 'חריזה', icon: 'music_note', color: '#0a84ff', drills: 12, level: 'מתקדם' },
    { id: 'flow', name: 'פלואו וקצב', icon: 'mic', color: '#30d158', drills: 8, level: 'שליטה בביט' },
    { id: 'diction', name: 'דיקציה והגייה', icon: 'record_voice_over', color: '#ff9f0a', drills: 5, level: 'מהירות' },
]

const featuredDrill = {
    name: 'כתיבת אובייקטים',
    nameEn: 'Object Writing',
    description: 'תרגיל לשיפור יכולת התיאור והדימויים דרך כתיבה על חפצים יומיומיים.',
    duration: 10,
}

export default function DrillsPage() {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

    if (selectedCategory) {
        const category = categories.find(c => c.id === selectedCategory)!

        return (
            <>
                <header className="flex items-center justify-between p-4">
                    <button onClick={() => setSelectedCategory(null)} className="w-12 h-12 flex items-center justify-center">
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                    </button>
                    <h1 className="text-xl font-bold">{category.name}</h1>
                    <div className="w-12" />
                </header>

                <div className="px-4">
                    <div className="card overflow-hidden" style={{ borderColor: `${category.color}30` }}>
                        <div className="h-32 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${category.color}30 0%, ${category.color}05 100%)` }}>
                            <span className="material-symbols-outlined text-6xl" style={{ color: category.color }}>{category.icon}</span>
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: category.color }}>{category.name}</span>
                                    <h2 className="text-2xl font-bold">{featuredDrill.name}</h2>
                                </div>
                                <span className="chip" style={{ backgroundColor: `${category.color}20`, color: category.color }}>
                                    {featuredDrill.duration} דק׳
                                </span>
                            </div>
                            <p className="text-white/60 mb-4">{featuredDrill.description}</p>

                            <div className="surface p-4 mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-white/60">notifications_active</span>
                                    <div>
                                        <p className="text-sm font-bold">תזכורת יומית</p>
                                        <p className="text-xs text-white/40">מתוזמן ל-20:00</p>
                                    </div>
                                </div>
                                <div className="w-12 h-6 rounded-full px-1 flex items-center" style={{ backgroundColor: '#9213ec' }}>
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>

                            <button className="btn-primary w-full h-14 text-lg">
                                <span className="material-symbols-outlined">play_arrow</span>
                                התחל אימון
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }

    return (
        <>
            {/* Header */}
            <header className="flex items-center justify-between p-4 sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: 'rgba(26, 16, 34, 0.8)' }}>
                <button className="w-12 h-12 flex items-center justify-center" style={{ color: '#9213ec' }}>
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <h1 className="text-xl font-bold">ספריית אימונים</h1>
                <button className="w-12 h-12 flex items-center justify-center">
                    <span className="material-symbols-outlined">settings</span>
                </button>
            </header>

            <div className="px-4">
                {/* Search */}
                <div className="surface flex items-stretch rounded-xl overflow-hidden mb-6">
                    <div className="px-4 flex items-center text-white/40">
                        <span className="material-symbols-outlined">search</span>
                    </div>
                    <input className="flex-1 bg-transparent py-3 outline-none text-white placeholder:text-white/40" placeholder="חפש אימון..." />
                </div>

                {/* Featured Card */}
                <h2 className="text-xl font-bold mb-4">קטגוריות</h2>
                <button
                    onClick={() => setSelectedCategory('creativity')}
                    className="card w-full overflow-hidden mb-6 text-right active:scale-[0.98] transition-transform"
                    style={{ borderColor: '#9213ec30' }}
                >
                    <div className="h-28 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(146,19,236,0.3) 0%, rgba(146,19,236,0.05) 100%)' }}>
                        <span className="material-symbols-outlined text-6xl text-purple-400/60">psychology</span>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-lg" style={{ color: '#9213ec' }}>psychology</span>
                                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9213ec' }}>יצירתיות</span>
                            </div>
                            <h3 className="text-xl font-bold">כתיבת אובייקטים</h3>
                        </div>
                        <span className="chip" style={{ backgroundColor: 'rgba(146,19,236,0.2)', color: '#9213ec' }}>10 דק׳</span>
                    </div>
                </button>

                {/* Categories List */}
                <h2 className="text-xl font-bold mb-4">עוד מסלולים</h2>
                <div className="space-y-1">
                    {categories.slice(1).map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className="flex items-center gap-4 w-full py-3 hover:bg-white/5 rounded-xl transition-colors text-right"
                        >
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#322839', color: cat.color }}>
                                <span className="material-symbols-outlined">{cat.icon}</span>
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">{cat.name}</p>
                                <p className="text-sm text-white/40">{cat.drills} תרגילים • {cat.level}</p>
                            </div>
                            <span className="material-symbols-outlined text-white/40">chevron_left</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}
