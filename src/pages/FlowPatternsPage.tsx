/**
 * Flow Patterns Drill Page
 * Practice different rhyme speeds and patterns over a beat
 */
import { useState, useEffect } from 'react'
import { useTimer } from '../hooks/useTimer'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { ArrowLeft, Clock, Pause, Play, Waves, Volume2, Save, Share2, SkipForward } from 'lucide-react'
import BeatPlayer from '../components/freestyle/BeatPlayer'

// Flow patterns to cycle through
const FLOW_PATTERNS = [
    { name: 'רגיל (1/4)', description: 'מילה על כל ביט (Snare)', bpmMultiplier: 1, color: '#1E3264' },
    { name: 'מהיר (1/8)', description: 'פעמיים מהירות (Double Time)', bpmMultiplier: 2, color: '#E91429' },
    { name: 'איטי (Low)', description: 'חצי מהירות - תן לביט לנשום', bpmMultiplier: 0.5, color: '#1DB954' },
    { name: 'טריולות', description: 'שלוש הברות על כל ביט', bpmMultiplier: 1.5, color: '#E8115B' },
]

export default function FlowPatternsPage() {
    const navigate = useNavigate()
    const [showInstructions, setShowInstructions] = useState(true)
    const [volume, setVolume] = useState(80)
    const [isPlayingBeat, setIsPlayingBeat] = useState(false)
    const [currentPatternIndex, setCurrentPatternIndex] = useState(0)
    const [isPlayerReady, setIsPlayerReady] = useState(false)

    // Using a classic boom bap beat for flow practice
    // Using 'rNEnT6P4p9U' (Simple Boom Bap) safely.
    const SAFETY_BEAT_ID = 'rNEnT6P4p9U'

    // 8 minutes default (480 seconds)
    const { timeLeft, isRunning, isFinished, start, pause, resume, formatTime } = useTimer(480)

    // Change pattern every 60 seconds? Or just manual? 
    // Let's do auto-change every 30 seconds to keep it dynamic
    useEffect(() => {
        if (!isRunning || isFinished) return

        // Every 30 seconds of game time (approx), switch pattern
        // 480 total. 
        const elapsed = 480 - timeLeft
        if (elapsed > 0 && elapsed % 45 === 0) {
            handleSkipPattern()
        }
    }, [timeLeft, isRunning, isFinished])

    const handleStart = () => {
        setShowInstructions(false)
        setIsPlayingBeat(true)
        start()
    }

    const handlePause = () => {
        setIsPlayingBeat(false)
        pause()
    }

    const handleResume = () => {
        setIsPlayingBeat(true)
        resume()
    }

    const handleSkipPattern = () => {
        setCurrentPatternIndex((prev) => (prev + 1) % FLOW_PATTERNS.length)
    }

    const handleSave = async () => {
        try {
            await db.sessions.add({
                title: `אימון פלואו: ${new Date().toLocaleDateString()}`,
                createdAt: new Date(),
                duration: 480 - timeLeft,
                type: 'drill',
                subtype: 'flow-patterns',
                content: 'אימון פלואו - הושלם',
                metadata: {
                    completed: true
                }
            })
            navigate('/drills')
        } catch (e) {
            console.error('Failed to save drill', e)
            alert('שגיאה בשמירה')
        }
    }

    // Stop beat when component unmounts
    useEffect(() => {
        return () => setIsPlayingBeat(false)
    }, [])

    // Stop beat when finished
    useEffect(() => {
        if (isFinished) setIsPlayingBeat(false)
    }, [isFinished])

    const currentPattern = FLOW_PATTERNS[currentPatternIndex]

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-black text-white">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-[#121212] border-b border-[#282828]">
                <button
                    onClick={() => navigate('/drills')}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-base font-bold flex items-center gap-2">
                    <Waves size={18} className="text-[#1E3264]" />
                    דפוסי פלואו
                </h1>
                <div className="w-10"></div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Timer Bar */}
                <div className="px-4 py-3 flex items-center justify-between bg-[#181818] border-b border-[#282828] shrink-0">
                    <div className="flex items-center gap-2">
                        <Clock size={20} className={isRunning ? 'text-accent' : 'text-subdued'} />
                        <span className="font-mono text-xl font-bold tabular-nums">
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    {!showInstructions && !isFinished && (
                        <button
                            onClick={isRunning ? handlePause : handleResume}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#282828]"
                        >
                            {isRunning ? <Pause size={24} /> : <Play size={24} />}
                        </button>
                    )}
                </div>

                {/* Game Area */}
                <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-6 transition-colors duration-700"
                    style={{
                        background: !showInstructions && !isFinished
                            ? `radial-gradient(circle at center, ${currentPattern.color}20 0%, #000000 70%)`
                            : '#000000'
                    }}>

                    {/* Visualizer / Video Area (Hidden but active) */}
                    <div className="absolute opacity-0 pointer-events-none w-1 h-1 overflow-hidden">
                        <BeatPlayer
                            videoId={SAFETY_BEAT_ID}
                            isPlaying={isPlayingBeat}
                            volume={volume}
                            onReady={() => setIsPlayerReady(true)}
                        />
                    </div>

                    {!showInstructions && !isFinished && (
                        <div className="w-full max-w-md text-center space-y-12 animate-in fade-in duration-500">

                            {/* Floating Indicators */}
                            <div className="flex justify-center gap-1 mb-8 opacity-50">
                                {FLOW_PATTERNS.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1 rounded-full transition-all duration-300 ${idx === currentPatternIndex ? 'w-8 bg-white' : 'w-2 bg-gray-600'}`}
                                    />
                                ))}
                            </div>

                            {/* Main Pattern Instruction */}
                            <div key={currentPatternIndex} className="animate-in zoom-in-90 slide-in-from-bottom-4 duration-500">
                                <p className="text-subdued font-bold uppercase tracking-[0.2em] mb-4">האתגר הנוכחי</p>
                                <h2 className="text-6xl font-black text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                    {currentPattern.name}
                                </h2>
                                <p className="text-xl text-gray-300 font-medium max-w-xs mx-auto leading-relaxed">
                                    {currentPattern.description}
                                </p>
                            </div>

                            {/* Controls */}
                            <div className="pt-12 flex flex-col items-center gap-6">
                                <button
                                    onClick={handleSkipPattern}
                                    className="px-6 py-2 rounded-full border border-gray-700 hover:bg-gray-800 text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <SkipForward size={16} />
                                    החלף תבנית
                                </button>

                                {/* Volume Slider */}
                                <div className="w-64 bg-[#282828] rounded-full p-2 flex items-center gap-3">
                                    <Volume2 size={16} className="text-subdued" />
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={volume}
                                        onChange={(e) => setVolume(Number(e.target.value))}
                                        className="flex-1 accent-white h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Instructions Overlay */}
                {showInstructions && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50">
                        <div className="w-20 h-20 rounded-full bg-[#1E3264]/20 flex items-center justify-center mb-6">
                            <Waves size={40} className="text-[#1E3264]" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4">דפוסי פלואו</h2>

                        <ul className="text-right space-y-4 mb-8 max-w-xs text-sm">
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#1E3264] w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5">1</span>
                                <span className="text-gray-300">הביט יתחיל להתנגן ברקע</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#1E3264] w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5">2</span>
                                <span className="text-gray-300">קבל הוראות לשינוי הקצב כל 45 שניות</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#1E3264] w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 mt-0.5">3</span>
                                <span className="text-gray-300">נסה להתאים את הראפ שלך להנחיה</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleStart}
                            disabled={!isPlayerReady}
                            className="bg-[#1E3264] hover:bg-[#1E3264]/90 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {!isPlayerReady ? 'טוען ביט...' : 'התחל אימון'}
                            {isPlayerReady && <Play size={18} fill="currentColor" />}
                        </button>
                    </div>
                )}

                {/* Finished Overlay */}
                {isFinished && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50">
                        <span className="text-6xl mb-4">🏄‍♂️</span>
                        <h2 className="text-3xl font-bold mb-2">סשן הושלם!</h2>
                        <p className="text-subdued mb-8 max-w-xs">תרגלת שליטה ב-4 סוגי פלואו שונים. המוח שלך חד יותר עכשיו.</p>

                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                סיים
                            </button>
                            <button className="flex-1 bg-[#282828] hover:bg-[#3E3E3E] text-white font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2">
                                <Share2 size={18} />
                                שתף
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
