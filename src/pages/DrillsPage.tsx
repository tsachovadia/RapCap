/**
 * Drills Page - Spotify Style
 */

const drills = [
    {
        id: 'object-writing',
        title: 'כתיבת אובייקטים',
        subtitle: 'Object Writing',
        description: 'שפר את יכולת התיאור והדימויים',
        duration: '10 דק׳',
        color: '#1DB954',
        icon: 'psychology'
    },
    {
        id: 'rhyme-chains',
        title: 'שרשרות חרוזים',
        subtitle: 'Rhyme Chains',
        description: 'בנה רצף חרוזים ללא עצירה',
        duration: '5 דק׳',
        color: '#E91429',
        icon: 'link'
    },
    {
        id: 'flow-patterns',
        title: 'דפוסי פלואו',
        subtitle: 'Flow Patterns',
        description: 'תרגל קצבים ומקצבים שונים',
        duration: '8 דק׳',
        color: '#1E3264',
        icon: 'waves'
    },
    {
        id: 'word-association',
        title: 'אסוציאציות',
        subtitle: 'Word Association',
        description: 'קישור מילים מהיר ויצירתי',
        duration: '3 דק׳',
        color: '#E8115B',
        icon: 'hub'
    },
]

export default function DrillsPage() {
    return (
        <div className="pb-8">
            {/* Header with gradient */}
            <div className="px-4 pt-12 pb-6"
                style={{ background: 'linear-gradient(#1a1a2e 0%, #121212 100%)' }}>
                <h1 className="text-3xl font-bold mb-2">אימונים</h1>
                <p className="text-subdued">שפר את הכישורים שלך כל יום</p>
            </div>

            <div className="px-4">
                {/* Featured Drill */}
                <section className="mb-8">
                    <h2 className="text-base font-bold mb-4">המומלץ היום</h2>
                    <div
                        className="rounded-lg overflow-hidden"
                        style={{ backgroundColor: '#1DB954' }}
                    >
                        <div className="p-6 text-black">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                    <span className="material-symbols-rounded text-4xl">psychology</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-2xs font-bold uppercase tracking-wider opacity-70">יצירתיות</p>
                                    <h3 className="text-xl font-bold mb-1">כתיבת אובייקטים</h3>
                                    <p className="text-sm opacity-80">שפר את יכולת התיאור והדימויים</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <span className="text-sm font-semibold">10 דקות</span>
                                <button
                                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-transform hover:scale-105"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                                >
                                    <span className="material-symbols-rounded icon-fill">play_arrow</span>
                                    התחל
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* All Drills */}
                <section>
                    <h2 className="text-base font-bold mb-4">כל האימונים</h2>
                    <div className="space-y-2">
                        {drills.map((drill) => (
                            <div
                                key={drill.id}
                                className="spotify-list-item group cursor-pointer"
                            >
                                <div
                                    className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: drill.color }}
                                >
                                    <span className="material-symbols-rounded text-xl">{drill.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold">{drill.title}</p>
                                    <p className="text-2xs text-subdued">{drill.duration} • {drill.description}</p>
                                </div>
                                <span className="material-symbols-rounded text-subdued">chevron_left</span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
