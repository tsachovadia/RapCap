/**
 * Home Page - Spotify Style
 */

export default function HomePage() {
    const greeting = getGreeting()

    const recentItems = [
        { id: 1, title: 'Session מהיום', type: 'הקלטה', image: '🎤' },
        { id: 2, title: 'Drill יצירתיות', type: 'אימון', image: '🧠' },
        { id: 3, title: 'Lo-Fi 85 BPM', type: 'ביט', image: '🎵' },
        { id: 4, title: 'Session אתמול', type: 'הקלטה', image: '🎙️' },
    ]

    const recentBars = [
        { id: 1, text: 'שינאה זה אהבה הפוכה, כמו שמש בלילה', type: 'משחק מילים' },
        { id: 2, text: 'יש לי flow כמו נהר, זורם לא נעצר, Bars כמו סכר', type: 'מולטי' },
        { id: 3, text: 'מהכניסה לאריזה, הכל בלי הפתזה', type: 'אסונאנס' },
    ]

    return (
        <div className="pb-8">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-4"
                style={{ background: 'linear-gradient(#1a1a2e 0%, #121212 100%)' }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{greeting}</h1>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-subdued hover:text-white hover:bg-white/10 transition-colors">
                            <span className="material-symbols-rounded text-xl">notifications</span>
                        </button>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-subdued hover:text-white hover:bg-white/10 transition-colors">
                            <span className="material-symbols-rounded text-xl">settings</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4">
                {/* Quick Access Grid - Spotify style */}
                <div className="grid grid-cols-2 gap-2 mb-8">
                    {recentItems.map((item) => (
                        <button
                            key={item.id}
                            className="flex items-center gap-3 rounded overflow-hidden text-right transition-colors"
                            style={{ backgroundColor: '#282828' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3E3E3E'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#282828'}
                        >
                            <div className="w-12 h-12 flex items-center justify-center text-2xl"
                                style={{ backgroundColor: '#3E3E3E' }}>
                                {item.image}
                            </div>
                            <span className="flex-1 text-sm font-semibold truncate pr-3">{item.title}</span>
                        </button>
                    ))}
                </div>

                {/* Recent Bars Section */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">הבארים האחרונים</h2>
                        <button className="text-subdued text-xs font-bold uppercase tracking-wider hover:text-white transition-colors">
                            הכל
                        </button>
                    </div>

                    <div className="space-y-2">
                        {recentBars.map((bar) => (
                            <div
                                key={bar.id}
                                className="spotify-list-item cursor-pointer"
                            >
                                <div className="w-10 h-10 rounded flex items-center justify-center text-lg"
                                    style={{ backgroundColor: '#282828' }}>
                                    📝
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{bar.text}</p>
                                    <p className="text-2xs text-subdued">{bar.type}</p>
                                </div>
                                <button className="btn-play w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-rounded text-lg icon-fill">play_arrow</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Start Session CTA */}
                <section className="mb-8">
                    <div className="spotify-card p-6 text-center">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                            style={{ backgroundColor: '#1DB954' }}>
                            <span className="material-symbols-rounded text-3xl text-black icon-fill">mic</span>
                        </div>
                        <h3 className="text-lg font-bold mb-2">התחל פריסטייל</h3>
                        <p className="text-subdued text-sm mb-4">הקלט ושמור את הרגעים הטובים</p>
                        <button className="btn-spotify">
                            התחל הקלטה
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'בוקר טוב'
    if (hour < 18) return 'צהריים טובים'
    return 'ערב טוב'
}
