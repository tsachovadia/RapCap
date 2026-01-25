/**
 * Freestyle Recording Page
 */
import { useState } from 'react'

export default function FreestylePage() {
    const [isRecording, setIsRecording] = useState(false)
    const [minutes] = useState(1)
    const [seconds] = useState(23)

    return (
        <>
            {/* Header */}
            <header className="flex items-center justify-between p-4 sticky top-0 z-40 backdrop-blur-md" style={{ backgroundColor: 'rgba(26, 16, 34, 0.8)' }}>
                <button className="w-12 h-12 flex items-center justify-center">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
                <h1 className="text-lg font-bold">פריסטייל</h1>
                <button className="w-12 h-12 flex items-center justify-center">
                    <span className="material-symbols-outlined">more_horiz</span>
                </button>
            </header>

            <div className="px-4">
                {/* Timer */}
                <div className="flex gap-4 py-4">
                    <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="surface h-20 w-full flex items-center justify-center">
                            <span className="text-4xl font-bold">{String(minutes).padStart(2, '0')}</span>
                        </div>
                        <span className="text-xs text-white/50">דקות</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center gap-2">
                        <div className="surface h-20 w-full flex items-center justify-center">
                            <span className="text-4xl font-bold">{String(seconds).padStart(2, '0')}</span>
                        </div>
                        <span className="text-xs text-white/50">שניות</span>
                    </div>
                </div>

                {/* Record Button */}
                <div className="flex justify-center py-4">
                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={`flex items-center gap-2 px-8 h-14 rounded-full font-bold transition-all active:scale-95 ${isRecording ? 'recording-pulse' : ''
                            }`}
                        style={{ backgroundColor: isRecording ? '#ff3b30' : 'rgba(255,255,255,0.1)' }}
                    >
                        <span className="material-symbols-outlined fill-icon">
                            {isRecording ? 'stop' : 'fiber_manual_record'}
                        </span>
                        <span>{isRecording ? 'STOP' : 'REC'}</span>
                    </button>
                </div>

                {/* Markers */}
                <div className="my-4">
                    <div className="surface p-4 flex items-center gap-4 cursor-pointer">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(146,19,236,0.2)' }}>
                            <span className="material-symbols-outlined" style={{ color: '#9213ec' }}>flag</span>
                        </div>
                        <span className="flex-1">3 סמנים נשמרו</span>
                        <span className="material-symbols-outlined text-white/40">chevron_left</span>
                    </div>
                </div>

                {/* Beat Selection */}
                <div className="mb-6">
                    <h3 className="text-xl font-bold py-4">בחירת ביט</h3>
                    <div className="space-y-3">
                        <div className="relative">
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/40">search</span>
                            <input className="input-field pr-12" placeholder="חפש ביוטיוב..." />
                        </div>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-white/40">link</span>
                            <input className="input-field pr-12" placeholder="הדבק לינק..." />
                        </div>
                    </div>

                    {/* Current Beat */}
                    <div className="surface p-4 mt-4">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(146,19,236,0.3)' }}>
                                <span className="material-symbols-outlined text-3xl">music_note</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold">Lo-Fi 85 BPM</h4>
                                <p className="text-sm text-white/50">RapCap Original</p>
                            </div>
                            <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#9213ec' }}>
                                <span className="material-symbols-outlined fill-icon">play_arrow</span>
                            </button>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                            <div className="h-full w-[45%]" style={{ backgroundColor: '#9213ec' }} />
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-white/40">
                            <span>01:23</span>
                            <span>03:45</span>
                        </div>
                    </div>
                </div>

                {/* Lyrics */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold">מילים (Lyrics)</h3>
                        <button className="chip active text-sm gap-1">
                            <span className="material-symbols-outlined text-sm">add</span>
                            הוסף
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div className="flex gap-4 opacity-50">
                            <span className="text-xs font-mono" style={{ color: '#9213ec' }}>00:15</span>
                            <p>נכנס לקצב, המילים כבר פה</p>
                        </div>
                        <div className="flex gap-4 opacity-70">
                            <span className="text-xs font-mono" style={{ color: '#9213ec' }}>00:45</span>
                            <p>כל שורה פוגעת, בדיוק במקום</p>
                        </div>
                        <div className="flex gap-4 py-2 pr-3 rounded-l-lg" style={{ borderRight: '2px solid #9213ec', backgroundColor: 'rgba(146,19,236,0.05)' }}>
                            <span className="text-xs font-mono" style={{ color: '#9213ec' }}>01:12</span>
                            <p className="font-bold text-lg">מקליט עכשיו חזק!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Marker Button */}
            <button className="fixed bottom-28 left-6 z-50 w-14 h-14 rounded-full backdrop-blur-md flex items-center justify-center shadow-xl active:scale-90 transition-transform"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <span className="material-symbols-outlined">flag</span>
            </button>
        </>
    )
}
