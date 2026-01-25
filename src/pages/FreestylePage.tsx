/**
 * Freestyle Recording Page - Spotify Style
 */
import { useState } from 'react'

export default function FreestylePage() {
    const [isRecording, setIsRecording] = useState(false)
    const [minutes, setMinutes] = useState(0)
    const [seconds, setSeconds] = useState(0)

    return (
        <div className="pb-8">
            {/* Header */}
            <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
                style={{ backgroundColor: '#121212' }}>
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-base font-bold">פריסטייל</h1>
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors">
                    <span className="material-symbols-rounded">more_horiz</span>
                </button>
            </header>

            <div className="px-4">
                {/* Timer Display */}
                <div className="flex items-center justify-center gap-2 py-8">
                    <div className="text-center">
                        <div className="text-6xl font-bold tabular-nums"
                            style={{ fontFamily: 'ui-monospace, monospace' }}>
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </div>
                        <p className="text-2xs text-subdued mt-2">דקות : שניות</p>
                    </div>
                </div>

                {/* Record Button */}
                <div className="flex justify-center py-6">
                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={`flex items-center justify-center gap-3 px-8 h-14 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-200 ${isRecording ? 'hover:scale-105' : 'hover:scale-105'
                            }`}
                        style={{
                            backgroundColor: isRecording ? '#E91429' : '#1DB954',
                            color: isRecording ? '#FFFFFF' : '#000000',
                        }}
                    >
                        <span className="material-symbols-rounded icon-fill">
                            {isRecording ? 'stop' : 'fiber_manual_record'}
                        </span>
                        <span>{isRecording ? 'עצור' : 'הקלט'}</span>
                    </button>
                </div>

                {/* Markers */}
                <div className="spotify-card flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded flex items-center justify-center"
                        style={{ backgroundColor: '#282828' }}>
                        <span className="material-symbols-rounded text-accent">flag</span>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold">סמנים</p>
                        <p className="text-2xs text-subdued">0 נשמרו</p>
                    </div>
                    <span className="material-symbols-rounded text-subdued">chevron_left</span>
                </div>

                {/* Beat Selection */}
                <section className="mb-6">
                    <h2 className="text-base font-bold mb-4">בחר ביט</h2>

                    <div className="relative mb-3">
                        <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-subdued">search</span>
                        <input
                            className="spotify-input pr-12 rounded-full"
                            placeholder="חפש ביוטיוב..."
                        />
                    </div>

                    <div className="relative">
                        <span className="material-symbols-rounded absolute right-4 top-1/2 -translate-y-1/2 text-subdued">link</span>
                        <input
                            className="spotify-input pr-12 rounded-full"
                            placeholder="הדבק לינק..."
                        />
                    </div>
                </section>

                {/* Current Beat */}
                <section className="mb-6">
                    <h2 className="text-base font-bold mb-4">ביט נוכחי</h2>

                    <div className="spotify-card">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 rounded flex items-center justify-center"
                                style={{ backgroundColor: '#282828' }}>
                                <span className="material-symbols-rounded text-2xl text-accent">music_note</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">Lo-Fi Chill</p>
                                <p className="text-2xs text-subdued">85 BPM • RapCap Original</p>
                            </div>
                            <button className="btn-play w-12 h-12">
                                <span className="material-symbols-rounded text-2xl icon-fill">play_arrow</span>
                            </button>
                        </div>

                        {/* Progress */}
                        <div className="spotify-progress">
                            <div className="spotify-progress-fill" style={{ width: '35%' }} />
                        </div>
                        <div className="flex justify-between mt-2 text-2xs text-subdued">
                            <span>01:23</span>
                            <span>03:45</span>
                        </div>
                    </div>
                </section>

                {/* Lyrics */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-bold">מילים</h2>
                        <button className="spotify-chip">
                            <span className="material-symbols-rounded text-sm">add</span>
                            הוסף
                        </button>
                    </div>

                    <div className="space-y-3">
                        <div className="flex gap-4 text-subdued">
                            <span className="text-2xs font-mono" style={{ color: '#1DB954' }}>00:15</span>
                            <p className="text-sm">נכנס לקצב, המילים כבר פה</p>
                        </div>
                        <div className="flex gap-4">
                            <span className="text-2xs font-mono" style={{ color: '#1DB954' }}>00:45</span>
                            <p className="text-sm font-semibold">כל שורה פוגעת, בדיוק במקום</p>
                        </div>
                    </div>
                </section>
            </div>

            {/* Floating Marker Button */}
            <button
                className="fixed bottom-28 left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: '#282828', border: '1px solid #3E3E3E' }}
            >
                <span className="material-symbols-rounded text-accent">flag</span>
            </button>
        </div>
    )
}
