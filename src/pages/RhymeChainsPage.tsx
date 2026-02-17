/**
 * Rhyme Chains Drill Page
 * Game where user builds a chain of rhymes based on a starting word
 */
import { useState, useEffect, useRef } from 'react'
import { useTimer } from '../hooks/useTimer'
import { getDrillById, getRandomPrompt, type DrillPrompt } from '../data/drills'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { ArrowLeft, Clock, Pause, Play, Send, Link as LinkIcon, Save, Share2 } from 'lucide-react'
import { syncService } from '../services/dbSync'
import { useToast } from '../contexts/ToastContext'

export default function RhymeChainsPage() {
    const navigate = useNavigate()
    const { showToast } = useToast()
    const [prompt, setPrompt] = useState<DrillPrompt | null>(null)
    const [showInstructions, setShowInstructions] = useState(true)
    const [rhymes, setRhymes] = useState<string[]>([])
    const [inputValue, setInputValue] = useState('')
    const listEndRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // 5 minutes default (300 seconds)
    const { timeLeft, isRunning, isFinished, start, pause, resume, formatTime } = useTimer(300)

    useEffect(() => {
        const drill = getDrillById('rhyme-chains')
        if (drill) {
            setPrompt(getRandomPrompt(drill))
        }
    }, [])

    // Auto-scroll to bottom of list
    useEffect(() => {
        listEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [rhymes])

    // Focus input when game starts
    useEffect(() => {
        if (!showInstructions && !isFinished) {
            inputRef.current?.focus()
        }
    }, [showInstructions, isFinished])

    const handleStart = () => {
        setShowInstructions(false)
        start()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || isFinished) return

        setRhymes([...rhymes, inputValue.trim()])
        setInputValue('')
    }

    const handleSave = async () => {
        try {
            await db.sessions.add({
                title: `שרשרת חרוזים: ${prompt?.word || 'ללא כותרת'}`,
                date: new Date(),
                createdAt: new Date(),
                duration: 300 - timeLeft,
                type: 'drill',
                subtype: 'rhyme-chains',
                content: rhymes.join('\n'),
                metadata: {
                    prompt: prompt,
                    rhymeCount: rhymes.length
                }
            })
            // alert('האימון נשמר בהצלחה! 💾')
            syncService.syncInBackground()
            navigate('/drills')
        } catch (e) {
            console.error('Failed to save drill', e)
            showToast('שגיאה בשמירה', 'error')
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-black text-white">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 shrink-0 bg-[#121212] border-b border-[#282828]">
                <button
                    onClick={() => navigate('/drills')}
                    className="btn-icon"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-base font-bold flex items-center gap-2">
                    <LinkIcon size={18} className="text-[#E91429]" />
                    שרשרות חרוזים
                </h1>
                <div className="w-10"></div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Timer Bar */}
                <div className="px-4 py-3 flex items-center justify-between bg-[#181818] border-b border-[#282828] shrink-0">
                    <div className="flex items-center gap-2">
                        <Clock size={20} className={isRunning ? 'text-[#E91429]' : 'text-subdued'} />
                        <span className={`font-mono text-xl font-bold tabular-nums ${timeLeft < 60 ? 'text-[#E91429]' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                            <span className="text-subdued">חרוזים: </span>
                            <span className="text-accent">{rhymes.length}</span>
                        </div>
                        {!showInstructions && !isFinished && (
                            <button
                                onClick={isRunning ? pause : resume}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#282828] transition-colors"
                            >
                                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Game Area */}
                <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Fixed Prompt Header */}
                    <div className="px-6 py-4 text-center shrink-0 bg-gradient-to-b from-[#181818] to-transparent z-10">
                        <p className="text-subdued text-xs font-bold uppercase tracking-wider mb-2">מצא חרוזים למילה</p>
                        <h2 className="text-4xl font-black text-white mb-1 drop-shadow-lg">{prompt?.word}</h2>
                        <p className="text-sm text-subdued opacity-80">{prompt?.wordEn}</p>
                    </div>

                    {/* Rhymes List */}
                    <div className="flex-1 overflow-y-auto px-4 pb-4">
                        <div className="flex flex-col items-center gap-3 py-4">
                            {rhymes.length === 0 ? (
                                <div className="text-center text-subdued mt-10 opacity-50">
                                    <p>השרשרת ריקה...</p>
                                    <p className="text-sm mt-2">הקלד את החרוז הראשון למטה</p>
                                </div>
                            ) : (
                                rhymes.map((rhyme, index) => (
                                    <div
                                        key={index}
                                        className="w-full max-w-sm bg-[#282828] p-3 rounded-lg text-center animate-in fade-in slide-in-from-bottom-2 duration-300"
                                    >
                                        <span className="text-lg font-medium">{rhyme}</span>
                                    </div>
                                ))
                            )}
                            <div ref={listEndRef} />
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#181818] border-t border-[#282828] shrink-0">
                        <form onSubmit={handleSubmit} className="relative max-w-md mx-auto">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isRunning ? "הקלד חרוז..." : "המתן..."}
                                className="w-full bg-[#282828] text-white pl-4 pr-12 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-[#E91429] transition-all"
                                disabled={!isRunning || isFinished}
                                autoFocus
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || !isRunning}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#E91429] flex items-center justify-center text-white disabled:opacity-50 disabled:bg-[#404040]"
                            >
                                <Send size={16} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Instructions Overlay */}
                {showInstructions && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50">
                        <div className="w-20 h-20 rounded-full bg-[#E91429]/20 flex items-center justify-center mb-6">
                            <LinkIcon size={40} className="text-[#E91429]" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4">שרשרות חרוזים</h2>

                        <ul className="text-right space-y-4 mb-8 max-w-xs text-sm">
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#E91429] w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 mt-0.5">1</span>
                                <span className="text-gray-300">תקבל מילת בסיס להתחלה</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#E91429] w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 mt-0.5">2</span>
                                <span className="text-gray-300">הקלד כמה שיותר מילים שמתחרזות איתה</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#E91429] w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 mt-0.5">3</span>
                                <span className="text-gray-300">נסה לשמור על שטף ולא לעצור!</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleStart}
                            className="bg-[#E91429] hover:bg-[#E91429]/90 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
                        >
                            התחל שרשרת
                        </button>
                    </div>
                )}

                {/* Finished Overlay */}
                {isFinished && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50">
                        <span className="text-6xl mb-4">🔗</span>
                        <h2 className="text-3xl font-bold mb-2">זמן נגמר!</h2>
                        <div className="flex flex-col items-center gap-1 mb-6">
                            <p className="text-subdued">יצרת שרשרת של</p>
                            <p className="text-5xl font-black text-[#E91429] my-2">{rhymes.length}</p>
                            <p className="text-subdued">חרוזים</p>
                        </div>

                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                שמור
                            </button>
                            <button className="flex-1 btn-secondary">
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
