/**
 * Object Writing Drill Page
 */
import { useState, useEffect } from 'react'
import { useTimer } from '../hooks/useTimer'
import { getDrillById, getRandomPrompt, type DrillPrompt } from '../data/drills'

import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'

export default function ObjectWritingPage() {
    const navigate = useNavigate()
    const [prompt, setPrompt] = useState<DrillPrompt | null>(null)
    const [showInstructions, setShowInstructions] = useState(true)
    const [text, setText] = useState('')

    // 10 minutes default
    const { timeLeft, isRunning, isFinished, start, pause, resume, formatTime } = useTimer(600)

    useEffect(() => {
        // Load drill data
        const drill = getDrillById('object-writing')
        if (drill) {
            setPrompt(getRandomPrompt(drill))
        }
    }, [])

    const handleStart = () => {
        setShowInstructions(false)
        start()
    }

    const handleSave = async () => {
        try {
            await db.sessions.add({
                title: `כתיבת אובייקטים: ${prompt?.word || 'ללא כותרת'}`,
                createdAt: new Date(),
                duration: 600 - timeLeft,
                type: 'drill',
                subtype: 'object-writing',
                content: text,
                metadata: {
                    prompt: prompt
                }
            })
            alert('האימון נשמר בהצלחה! 💾')
            navigate('/drills')
        } catch (e) {
            console.error('Failed to save drill', e)
            alert('שגיאה בשמירה')
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ backgroundColor: '#121212' }}>
                <button className="btn-icon">
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-base font-bold">כתיבת אובייקטים</h1>
                <div className="w-10"></div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative">
                {/* Timer Bar */}
                <div className="px-4 py-2 flex items-center justify-between bg-[#181818] border-b border-[#282828] shrink-0">
                    <div className="flex items-center gap-2">
                        <span className={`material-symbols-rounded ${isRunning ? 'text-accent' : 'text-subdued'}`}>
                            timer
                        </span>
                        <span className="font-mono text-xl font-bold tabular-nums">
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    {!showInstructions && !isFinished && (
                        <button
                            onClick={isRunning ? pause : resume}
                            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#282828]"
                        >
                            <span className="material-symbols-rounded icon-fill">
                                {isRunning ? 'pause' : 'play_arrow'}
                            </span>
                        </button>
                    )}
                </div>

                {/* Prompt Header */}
                {!showInstructions && (
                    <div className="px-6 py-4 text-center shrink-0" style={{ backgroundColor: '#181818' }}>
                        <p className="text-subdued text-xs font-bold uppercase tracking-wider mb-1">האובייקט שלך</p>
                        <h2 className="text-3xl font-bold text-accent">{prompt?.word}</h2>
                        <p className="text-sm text-subdued mt-1">{prompt?.wordEn}</p>
                    </div>
                )}

                {/* Text Area */}
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={showInstructions ? '' : "תתחיל לכתוב... תאר את הריח, הטעם, התחושה..."}
                    className="flex-1 w-full p-4 bg-transparent resize-none focus:outline-none text-lg leading-relaxed"
                    disabled={showInstructions || isFinished}
                />

                {/* Instructions Overlay */}
                {showInstructions && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10">
                        <div className="w-20 h-20 rounded-full bg-[#1DB954]/20 flex items-center justify-center mb-6">
                            <span className="material-symbols-rounded text-5xl text-accent">psychology</span>
                        </div>

                        <h2 className="text-2xl font-bold mb-4">איך זה עובד?</h2>

                        <ul className="text-right space-y-4 mb-8 max-w-xs">
                            <li className="flex gap-3">
                                <span className="text-accent font-bold">1.</span>
                                <span className="text-subdued">תקבל אובייקט אקראי לכתיבה</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-accent font-bold">2.</span>
                                <span className="text-subdued">יש לך 10 דקות לכתוב עליו בלי לעצור</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-accent font-bold">3.</span>
                                <span className="text-subdued">השתמש בכל 5 החושים בתיאור</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleStart}
                            className="btn-spotify w-full max-w-xs h-14 text-lg"
                        >
                            התחל אימון
                        </button>
                    </div>
                )}

                {/* Finished Overlay */}
                {isFinished && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                        <span className="text-6xl mb-4">🎉</span>
                        <h2 className="text-2xl font-bold mb-2">כל הכבוד!</h2>
                        <p className="text-subdued mb-8">סיימת 10 דקות של כתיבה יצירתית</p>

                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={handleSave}
                                className="flex-1 btn-secondary"
                            >
                                שמור לארכיון
                            </button>
                            <button className="flex-1 btn-spotify">
                                שתף
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
