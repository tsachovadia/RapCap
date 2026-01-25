/**
 * Library Page - Recording Sessions
 */
import { useState } from 'react'

const sessions = [
    { id: 1, name: 'Session 1', beat: 'Lo-Fi', bpm: 85, markers: 5, date: '25/01/25', duration: '3:45', gradient: 'from-purple-500/40 to-black/20', icon: 'mic' },
    { id: 2, name: 'Session 2', beat: 'Hard Drill', bpm: 140, markers: 12, date: '24/01/25', duration: '18:20', gradient: 'from-blue-600/40 to-purple-800/20', icon: 'music_note' },
    { id: 3, name: 'Session 3', beat: 'Old School', bpm: 90, markers: 3, date: '22/01/25', duration: '12:15', gradient: 'from-orange-500/40 to-red-900/20', icon: 'graphic_eq' },
    { id: 4, name: 'Late Night', beat: 'Chill Trap', bpm: 120, markers: 8, date: '20/01/25', duration: '01:45', gradient: 'from-emerald-500/40 to-teal-900/20', icon: 'keyboard_voice' },
]

export default function LibraryPage() {
    const [activeTab, setActiveTab] = useState('all')
    const tabs = [
        { id: 'all', label: 'הכל' },
        { id: 'recordings', label: 'הקלטות' },
        { id: 'favorites', label: 'מועדפים' },
    ]

    return (
        <>
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-md px-4 py-4" style={{ backgroundColor: 'rgba(26, 16, 34, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">ספריה</h1>
                    <div className="flex items-center gap-2">
                        <button className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ backgroundColor: '#9213ec' }}>
                            <span className="material-symbols-outlined">add</span>
                        </button>
                        <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/60">
                            <span className="material-symbols-outlined">search</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4 py-4">
                {/* Tabs */}
                <div className="flex gap-6 mb-4 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex flex-col items-center gap-1 shrink-0"
                        >
                            <span className={`text-sm font-bold ${activeTab === tab.id ? '' : 'text-white/40'}`}
                                style={{ color: activeTab === tab.id ? '#9213ec' : undefined }}>
                                {tab.label}
                            </span>
                            <div className={`h-1 w-4 rounded-full ${activeTab === tab.id ? '' : 'bg-transparent'}`}
                                style={{ backgroundColor: activeTab === tab.id ? '#9213ec' : undefined }} />
                        </button>
                    ))}
                </div>

                {/* Sessions */}
                <div className="space-y-4">
                    {sessions.map((session) => (
                        <div key={session.id} className="card p-4 flex gap-4 active:scale-[0.98] transition-transform cursor-pointer">
                            {/* Thumbnail */}
                            <div className={`relative w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br ${session.gradient}`}>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-3xl">{session.icon}</span>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex flex-col justify-between flex-1">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold">{session.name}</h3>
                                            <p className="text-xs text-white/40">{session.beat} {session.bpm} BPM</p>
                                        </div>
                                        <span className="chip text-[10px] px-2 h-5" style={{ backgroundColor: 'rgba(146,19,236,0.1)', color: '#9213ec' }}>
                                            {session.markers} markers
                                        </span>
                                    </div>
                                    <p className="text-xs text-white/40 mt-1">{session.date} • {session.duration}</p>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <button className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 text-white/60">
                                        <span className="material-symbols-outlined text-lg">share</span>
                                    </button>
                                    <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#9213ec' }}>
                                        <span className="material-symbols-outlined text-xl fill-icon">play_arrow</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
