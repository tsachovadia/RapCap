/**
 * Word Association Drill Page
 * Game where user builds a chain of associations where each word triggers the next
 */
import { useState, useEffect, useRef } from 'react'
import { useTimer } from '../hooks/useTimer'
import { getDrillById, getRandomPrompt, type DrillPrompt } from '../data/drills'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { ArrowLeft, Clock, Pause, Play, Send, BrainCircuit, Save, Share2 } from 'lucide-react'

export default function WordAssociationPage() {
    const navigate = useNavigate()
    const [initialPrompt, setInitialPrompt] = useState<DrillPrompt | null>(null)
    const [currentWord, setCurrentWord] = useState<string>('')
    const [showInstructions, setShowInstructions] = useState(true)
    const [history, setHistory] = useState<string[]>([])
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const historyEndRef = useRef<HTMLDivElement>(null)

    // 3 minutes default (180 seconds)
    const { timeLeft, isRunning, isFinished, start, pause, resume, formatTime } = useTimer(180)

    useEffect(() => {
        const drill = getDrillById('word-association')
        if (drill) {
            const prompt = getRandomPrompt(drill)
            setInitialPrompt(prompt)
            if (prompt) {
                setCurrentWord(prompt.word)
            }
        }
    }, [])

    useEffect(() => {
        if (!showInstructions && !isFinished) {
            inputRef.current?.focus()
        }
    }, [showInstructions, isFinished])

    // Auto-scroll history
    useEffect(() => {
        historyEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [history])

    const handleStart = () => {
        setShowInstructions(false)
        start()
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!inputValue.trim() || isFinished) return

        const newWord = inputValue.trim()

        // Add current "stimulus" word and the "response" word to history is one way,
        // but typically we just track the sequence.
        // Let's store the sequence.

        setHistory(prev => [...prev, currentWord]) // Store the word that triggered the association
        setCurrentWord(newWord) // The new word becomes the trigger for the next
        setInputValue('')
    }

    const handleSave = async () => {
        try {
            // Reconstruct full chain including the last word
            const fullChain = [...history, currentWord]

            await db.sessions.add({
                title: `אסוציאציות: ${initialPrompt?.word || 'ללא כותרת'}`,
                createdAt: new Date(),
                duration: 180 - timeLeft,
                type: 'drill',
                subtype: 'word-association',
                content: fullChain.join(' → '),
                metadata: {
                    prompt: initialPrompt,
                    wordCount: fullChain.length
                }
            })
            // alert('האימון נשמר בהצלחה! 💾')
            navigate('/drills')
        } catch (e) {
            console.error('Failed to save drill', e)
            alert('שגיאה בשמירה')
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
                    <BrainCircuit size={18} className="text-[#E8115B]" />
                    אסוציאציות
                </h1>
                <div className="w-10"></div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative overflow-hidden">
                {/* Timer Bar */}
                <div className="px-4 py-3 flex items-center justify-between bg-[#181818] border-b border-[#282828] shrink-0">
                    <div className="flex items-center gap-2">
                        <Clock size={20} className={isRunning ? 'text-[#E8115B]' : 'text-subdued'} />
                        <span className={`font-mono text-xl font-bold tabular-nums ${timeLeft < 30 ? 'text-[#E8115B]' : 'text-white'}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                            <span className="text-subdued">מילים: </span>
                            <span className="text-accent">{history.length + (showInstructions ? 0 : 1)}</span>
                        </div>
                        {!showInstructions && !isFinished && (
                            <button
                                onClick={isRunning ? pause : resume}
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#282828]"
                            >
                                {isRunning ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Game Area */}
                <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden p-4">

                    {/* History Trail (Fading) */}
                    <div className="flex-1 w-full max-w-md flex flex-col justify-end items-center gap-2 pb-6 opacity-60 pointer-events-none overflow-hidden mask-linear-fade">
                        <div className="w-full flex flex-col items-center gap-2 text-subdued">
                            {history.slice(-5).map((word, i) => (
                                <div key={i} className="text-lg transition-all">{word}</div>
                            ))}
                            <div ref={historyEndRef} />
                        </div>
                    </div>

                    {/* Current Stimulus Word - HERO */}
                    <div className="mb-8 text-center animate-in zoom-in-50 duration-300 transform transition-all">
                        <p className="text-subdued text-xs font-bold uppercase tracking-wider mb-2">המילה הנוכחית</p>
                        <h2 className="text-5xl font-black text-white drop-shadow-2xl tracking-tight">
                            {currentWord}
                        </h2>
                        <p className="text-sm text-subdued mt-2 opacity-80">כתוב את המילה הראשונה שעולה לך לראש</p>
                    </div>

                    {/* Input Area */}
                    <div className="w-full max-w-md mb-8">
                        <form onSubmit={handleSubmit} className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={isRunning ? "מה זה מזכיר לך?" : "המתן..."}
                                className="w-full bg-[#282828] text-white text-center text-xl py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E8115B] transition-all shadow-lg px-12"
                                disabled={!isRunning || isFinished}
                                autoComplete="off"
                            />
                            <button
                                type="submit"
                                onMouseDown={(e) => e.preventDefault()}
                                disabled={!inputValue.trim() || !isRunning}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#E8115B] flex items-center justify-center text-white disabled:opacity-50 disabled:bg-[#404040] transition-colors"
                            >
                                <Send size={18} className={document.dir === 'rtl' ? 'rotate-180' : ''} />
                            </button>
                        </form>
                        <p className="text-center text-xs text-subdued mt-3 opacity-60">
                            {isRunning ? 'לחץ Enter למילה הבאה' : ' '}
                        </p>
                    </div>

                    <div className="flex-1"></div>
                </div>

                {/* Instructions Overlay */}
                {showInstructions && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50">
                        <div className="w-20 h-20 rounded-full bg-[#E8115B]/20 flex items-center justify-center mb-6">
                            <BrainCircuit size={40} className="text-[#E8115B]" />
                        </div>

                        <h2 className="text-2xl font-bold mb-4">אסוציאציות</h2>

                        <ul className="text-right space-y-4 mb-8 max-w-xs text-sm">
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#E8115B] w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 mt-0.5">1</span>
                                <span className="text-gray-300">תקבל מילה ראשונה</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#E8115B] w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 mt-0.5">2</span>
                                <span className="text-gray-300">כתוב את הדבר הראשון שעולה לך לראש</span>
                            </li>
                            <li className="flex gap-3 items-start">
                                <span className="bg-[#E8115B] w-6 h-6 rounded-full flex items-center justify-center text-black font-bold text-xs shrink-0 mt-0.5">3</span>
                                <span className="text-gray-300">המילה שכתבת הופכת למילה הבאה</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleStart}
                            className="bg-[#E8115B] hover:bg-[#E8115B]/90 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105"
                        >
                            התחל שרשרת
                        </button>
                    </div>
                )}

                {/* Finished Overlay */}
                {isFinished && (
                    <div className="absolute inset-0 bg-[#121212]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in duration-500">
                        <span className="text-6xl mb-4 animate-bounce">🧠</span>
                        <h2 className="text-3xl font-bold mb-1">סשן הסתיים!</h2>
                        <p className="text-subdued mb-8">המוח שלך עובד מהר היום.</p>

                        <div className="flex gap-6 mb-8">
                            {/* Score Card 1: Count */}
                            <div className="bg-[#282828] p-4 rounded-xl min-w-[100px]">
                                <p className="text-xs text-subdued uppercase">מילים</p>
                                <p className="text-4xl font-black text-white">{history.length + 1}</p>
                            </div>

                            {/* Score Card 2: Speed */}
                            <div className="bg-[#282828] p-4 rounded-xl min-w-[100px] border border-[#E8115B]/30">
                                <p className="text-xs text-subdued uppercase">קצב (WPM)</p>
                                <p className="text-4xl font-black text-[#E8115B]">
                                    {Math.round((history.length + 1) / (180 / 60))}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 w-full max-w-xs">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-white hover:bg-gray-200 text-black font-bold py-3 px-4 rounded-full flex items-center justify-center gap-2 transition-transform transform hover:scale-105 active:scale-95"
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
