/**
 * Home Page - הבארים שלי (My Barz)
 */

export default function HomePage() {
    const stats = [
        { value: 24, label: 'בארים' },
        { value: 12, label: 'הקלטות' },
        { value: 45, label: 'דקות' },
    ]

    const recentBars = [
        { id: 1, text: 'שינאה זה אהבה הפוכה, כמו שמש בלילה', type: 'משחק מילים', date: '25/01' },
        { id: 2, text: 'יש לי flow כמו נהר, זורם לא נעצר', type: 'מולטי', date: '24/01' },
        { id: 3, text: 'מהכניסה לאריזה, הכל בלי הפתזה', type: 'אסונאנס', date: '23/01' },
    ]

    return (
        <>
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-md px-4 py-4" style={{ backgroundColor: 'rgba(26, 16, 34, 0.8)' }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">הבארים שלי</h1>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#9213ec' }}>
                        <span className="material-symbols-outlined">add</span>
                    </button>
                </div>
            </header>

            <div className="px-4 py-4">
                {/* Stats */}
                <div className="flex gap-3 mb-6">
                    {stats.map((stat) => (
                        <div key={stat.label} className="flex-1 surface p-4 text-center">
                            <p className="text-2xl font-bold" style={{ color: '#9213ec' }}>{stat.value}</p>
                            <p className="text-xs text-white/50">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <button className="btn-primary flex-col h-20 gap-1">
                        <span className="material-symbols-outlined text-xl">mic</span>
                        <span className="text-sm">פריסטייל חדש</span>
                    </button>
                    <button className="btn-secondary flex-col h-20 gap-1">
                        <span className="material-symbols-outlined text-xl" style={{ color: '#9213ec' }}>fitness_center</span>
                        <span className="text-sm">לאימון</span>
                    </button>
                </div>

                {/* Recent Bars */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">בארים אחרונים</h2>
                    <button className="text-sm font-medium" style={{ color: '#9213ec' }}>הכל</button>
                </div>

                <div className="space-y-3">
                    {recentBars.map((bar) => (
                        <div key={bar.id} className="card p-4">
                            <div className="flex items-start justify-between mb-2">
                                <span className="chip text-xs px-2 h-6" style={{ backgroundColor: 'rgba(146,19,236,0.15)', color: '#9213ec' }}>
                                    {bar.type}
                                </span>
                                <span className="text-xs text-white/30">{bar.date}</span>
                            </div>
                            <p className="text-white leading-relaxed">{bar.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
