/**
 * Library Page - Spotify Style
 */
import { useState } from 'react'

const sessions = [
    { id: 1, title: 'Session מהיום', beat: 'Lo-Fi', bpm: 85, duration: '3:45', date: 'היום', color: '#1DB954' },
    { id: 2, title: 'Late Night Flow', beat: 'Drill', bpm: 140, duration: '18:20', date: 'אתמול', color: '#535353' },
    { id: 3, title: 'Morning Practice', beat: 'Old School', bpm: 90, duration: '12:15', date: '22 בינו׳', color: '#E91429' },
    { id: 4, title: 'Quick Ideas', beat: 'Trap', bpm: 120, duration: '01:45', date: '20 בינו׳', color: '#1E3264' },
]

export default function LibraryPage() {
    const [activeFilter, setActiveFilter] = useState('all')
    const filters = [
        { id: 'all', label: 'הכל' },
        { id: 'recordings', label: 'הקלטות' },
        { id: 'favorites', label: 'לייקים' },
    ]

    return (
        <div className="pb-8">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-4" style={{ backgroundColor: '#121212' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                            style={{ backgroundColor: '#535353' }}>
                            ר
                        </div>
                        <h1 className="text-xl font-bold">הספריה שלך</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors">
                            <span className="material-symbols-rounded">search</span>
                        </button>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors">
                            <span className="material-symbols-rounded">add</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={`spotify-chip shrink-0 ${activeFilter === filter.id ? 'active' : ''}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="px-4">
                {/* Sessions List */}
                <div className="space-y-2">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            className="spotify-list-item group"
                        >
                            {/* Thumbnail */}
                            <div
                                className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                                style={{ backgroundColor: session.color }}
                            >
                                <span className="material-symbols-rounded text-xl">mic</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{session.title}</p>
                                <p className="text-2xs text-subdued">
                                    הקלטה • {session.beat} {session.bpm} BPM
                                </p>
                            </div>

                            {/* Play Button */}
                            <button className="btn-play w-10 h-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="material-symbols-rounded text-xl icon-fill">play_arrow</span>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Empty state for playlists */}
                <div className="mt-8">
                    <h2 className="text-base font-bold mb-4">צור פלייליסט</h2>
                    <div className="spotify-card p-5">
                        <p className="text-subdued text-sm mb-4">קבץ את ההקלטות הטובות שלך לפלייליסט</p>
                        <button className="btn-spotify text-sm">
                            צור פלייליסט
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
