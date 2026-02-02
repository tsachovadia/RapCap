import { useState, useRef, useEffect, useMemo } from 'react'
import { Link as LinkIcon, Layers, Grid3X3, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import BeatPlayer from '../freestyle/BeatPlayer'
import { PRESET_BEATS, DEFAULT_BEAT_ID } from '../../data/beats'
import { db, type WordGroup } from '../../db/db'
import type { FlowState } from '../../pages/RecordPage'


interface Props {
    flowState: FlowState
    language: 'he' | 'en'
    onPreRollComplete: (beatStartTime: number) => void
    onBeatChange?: (beatId: string) => void
    segments: any[]
    interimTranscript: string
}

export default function FreestyleModeUI({ flowState, language, onPreRollComplete, onBeatChange, segments, interimTranscript }: Props) {
    const [videoId, setVideoId] = useState(DEFAULT_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const preRollCheckRef = useRef<number | null>(null)


    // NEW: Multi-deck selection for column display
    const [selectedDeckIds, setSelectedDeckIds] = useState<number[]>([])
    const [columnCount, setColumnCount] = useState(4)
    const [showDeckSelector, setShowDeckSelector] = useState(false)
    const [viewMode, setViewMode] = useState<'normal' | 'expanded' | 'collapsed'>('normal')

    // State for single-deck replacement
    const [replacingDeckIndex, setReplacingDeckIndex] = useState<number | null>(null)

    // Fetch all word groups for selection
    const allWordGroups = useLiveQuery(() => db.wordGroups.toArray(), [])

    // Get selected deck data
    const selectedDecks = useMemo(() => {
        if (!allWordGroups) return []
        return selectedDeckIds
            .map(id => allWordGroups.find(g => g.id === id))
            .filter((g): g is WordGroup => g !== undefined)
            .slice(0, columnCount)
    }, [allWordGroups, selectedDeckIds, columnCount])



    // Auto-scroll refs
    const transcriptEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Notify parent when beat changes
    useEffect(() => {
        onBeatChange?.(videoId)
    }, [videoId, onBeatChange])



    // Pre-roll Monitoring
    useEffect(() => {
        if (flowState === 'preroll' && youtubePlayer) {
            const safetyTimeout = setTimeout(() => {
                if (preRollCheckRef.current) {
                    cancelAnimationFrame(preRollCheckRef.current)
                    const currentTime = youtubePlayer?.getCurrentTime() || 2.0
                    onPreRollComplete(currentTime)
                }
            }, 4000)

            const check = () => {
                if (!youtubePlayer) return
                const currentTime = youtubePlayer.getCurrentTime()
                if (currentTime >= 2.0) {
                    clearTimeout(safetyTimeout)
                    const exactStartTime = youtubePlayer.getCurrentTime()
                    onPreRollComplete(exactStartTime)
                    if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)
                } else {
                    preRollCheckRef.current = requestAnimationFrame(check)
                }
            }
            preRollCheckRef.current = requestAnimationFrame(check)
            return () => { if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current) }
        }
    }, [flowState, youtubePlayer, onPreRollComplete])

    // Auto-scroll Transcript
    useEffect(() => {
        if (segments.length > 0 || interimTranscript) {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
    }, [segments, interimTranscript])

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlSubmit = () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowUrlInput(false)
            setUrlInput('')
        } else {
            alert(language === 'he' ? 'קישור לא תקין' : 'Invalid YouTube URL')
        }
    }

    return (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* Upper Section: Beat & Words */}
            <div className={`flex gap-2 min-h-0 relative transition-all duration-300 ease-in-out ${viewMode === 'expanded' ? 'flex-[4]' : viewMode === 'collapsed' ? 'flex-none h-10' : 'flex-[2]'}`}>
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {/* Beat Player */}
                    <div className={`h-20 flex-none bg-[#181818] rounded-xl overflow-hidden relative border border-[#282828] group ${viewMode === 'collapsed' ? 'hidden' : ''}`}>
                        <BeatPlayer
                            videoId={videoId}
                            isPlaying={flowState !== 'idle' && flowState !== 'paused'}
                            volume={beatVolume}
                            onReady={(player) => setYoutubePlayer(player)}
                        />
                        <div className="absolute top-2 left-2 flex gap-2 pointer-events-none z-10">
                            {flowState === 'preroll' && (
                                <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded animate-pulse">מתכונן...</span>
                            )}
                            {flowState === 'recording' && (
                                <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded animate-pulse">REC</span>
                            )}
                        </div>

                        {showUrlInput ? (
                            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                                <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl space-y-4">
                                    <h3 className="text-lg font-bold text-white text-center">{language === 'he' ? 'בחר ביט' : 'Select Beat'}</h3>
                                    <select
                                        className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954]"
                                        onChange={(e) => { if (e.target.value) { setVideoId(e.target.value); setShowUrlInput(false); } }}
                                        value={PRESET_BEATS.some(b => b.id === videoId) ? videoId : ''}
                                    >
                                        <option value="" disabled>{language === 'he' ? 'בחר מהרשימה...' : 'Choose from list...'}</option>
                                        {PRESET_BEATS.map(beat => <option key={beat.id} value={beat.id}>{beat.name}</option>)}
                                    </select>
                                    <div className="flex w-full gap-2">
                                        <input
                                            type="text"
                                            placeholder="Paste YouTube Link..."
                                            className="flex-1 bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white"
                                            value={urlInput}
                                            onChange={e => setUrlInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                                        />
                                        <button onClick={handleUrlSubmit} className="bg-[#1DB954] text-black px-4 py-3 rounded-lg font-bold">Go</button>
                                    </div>
                                    <button onClick={() => setShowUrlInput(false)} className="w-full py-2 text-sm text-subdued hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowUrlInput(true)}
                                className="absolute top-2 right-2 bg-black/80 hover:bg-[#1DB954] hover:text-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 z-20 border border-white/10 backdrop-blur-sm"
                            >
                                <LinkIcon size={12} />
                                <span>{language === 'he' ? 'שנה ביט' : 'Change Beat'}</span>
                            </button>
                        )}
                    </div>

                    {/* Rhyme Deck Columns */}
                    <div className="flex-1 bg-[#181818] rounded-xl border border-[#282828] relative min-h-0 z-0 overflow-hidden flex flex-col">
                        {/* Controls Row */}
                        <div className="flex-none flex items-center justify-between px-3 py-2 bg-[#181818]/90 backdrop-blur-sm z-50 border-b border-[#282828]">
                            <button
                                onClick={() => setShowDeckSelector(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] rounded-lg text-xs font-medium transition-colors"
                            >
                                <Grid3X3 size={14} />
                                <span>{language === 'he' ? 'בחר קבוצות' : 'Select Decks'}</span>
                            </button>

                            <select
                                value={columnCount}
                                onChange={(e) => setColumnCount(Number(e.target.value))}
                                className="bg-[#282828] border border-[#3E3E3E] rounded px-2 py-1 text-xs text-white"
                            >
                                {[1, 2, 3, 4].map(n => (
                                    <option key={n} value={n}>{n} {language === 'he' ? 'עמודות' : 'columns'}</option>
                                ))}
                            </select>

                            <div className="flex items-center gap-1 border-l border-[#3E3E3E] pl-2 ml-2">
                                <button
                                    onClick={() => setViewMode(v => v === 'expanded' ? 'normal' : 'expanded')}
                                    className="p-1 hover:bg-white/10 rounded text-subdued hover:text-white transition-colors"
                                    title={viewMode === 'expanded' ? 'Restore' : 'Maximize'}
                                >
                                    {viewMode === 'expanded' ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                                </button>
                                <button
                                    onClick={() => setViewMode(v => v === 'collapsed' ? 'normal' : 'collapsed')}
                                    className="p-1 hover:bg-white/10 rounded text-subdued hover:text-white transition-colors"
                                    title={viewMode === 'collapsed' ? 'Expand' : 'Collapse'}
                                >
                                    {viewMode === 'collapsed' ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Columns Grid */}
                        <div className="flex-1 relative overflow-hidden">
                            <div className="absolute inset-0 overflow-y-auto p-2">
                                {selectedDecks.length > 0 ? (
                                    <div
                                        className="grid gap-2 h-full"
                                        style={{ gridTemplateColumns: `repeat(${Math.min(selectedDecks.length, columnCount)}, 1fr)` }}
                                    >
                                        {selectedDecks.map((deck, idx) => (
                                            <div
                                                key={deck.id}
                                                className="bg-[#121212] rounded-lg p-1.5 flex flex-col border border-[#282828] h-full overflow-hidden relative group/deck"
                                            >
                                                {/* Column Header */}
                                                <div className="text-center pb-1 border-b border-[#282828] mb-1 flex-none flex items-center justify-between px-1">
                                                    <span className="text-[10px] font-bold text-[#1DB954] uppercase tracking-wider truncate block flex-1 text-right">
                                                        {deck.name}
                                                    </span>
                                                    <button
                                                        onClick={() => setReplacingDeckIndex(idx)}
                                                        className="text-subdued hover:text-white p-1 rounded-full hover:bg-white/10 opacity-0 group-hover/deck:opacity-100 transition-opacity"
                                                        title="Replace Deck"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                                    </button>
                                                </div>
                                                {/* Words List - Dense Block */}
                                                <div className="flex-1 overflow-y-auto flex flex-wrap content-start items-start gap-1 p-0.5">
                                                    {deck.items.map((word, wordIndex) => (
                                                        <span
                                                            key={wordIndex}
                                                            className="text-lg font-bold text-white/90 leading-none tracking-tight hover:text-[#1DB954] transition-colors cursor-default select-none bg-white/5 rounded-sm px-1 py-0.5"
                                                        >
                                                            {word}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full gap-4 text-subdued/30">
                                        <Layers size={32} />
                                        <span className="text-xs uppercase tracking-widest text-center">
                                            {language === 'he' ? 'לחץ "בחר קבוצות" להציג חרוזים' : 'Click "Select Decks" to show rhymes'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Volume Column */}
                <div className={`w-12 bg-[#181818] rounded-xl flex flex-col items-center py-4 gap-4 border border-[#282828] relative ${viewMode === 'collapsed' ? 'hidden' : ''} h-full`}>
                    <div className="text-[10px] text-subdued font-bold uppercase tracking-wider -rotate-90 mt-2 flex-none">VOL</div>
                    <div className="flex-1 w-full flex justify-center py-2 min-h-0 relative">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={beatVolume}
                            onChange={(e) => {
                                const val = Number(e.target.value)
                                setBeatVolume(val)
                                if (youtubePlayer) youtubePlayer.setVolume(val)
                            }}
                            className="absolute top-0 bottom-0 w-1 accent-[#1DB954] bg-[#3E3E3E] rounded appearance-none cursor-pointer"
                            style={{ writingMode: 'vertical-lr', direction: 'rtl', height: '100%' }}
                        />
                    </div>
                </div>
            </div>

            {/* Transcript Area */}
            <div className={`flex-1 ${viewMode === 'expanded' ? 'min-h-[40px]' : 'min-h-[100px]'} bg-[#121212]/50 rounded-xl border border-[#282828] p-3 overflow-y-auto no-scrollbar relative flex flex-col gap-2`}>
                <div className="max-w-2xl mx-auto pt-4 pb-16 w-full" ref={scrollContainerRef}>
                    <div className="space-y-4">
                        {segments.map((seg, i) => (
                            <div key={i} className="flex items-start gap-3 text-white/40 hover:text-white/90 transition-colors">
                                <span className="text-[10px] font-mono text-[#1DB954]/40 mt-1 shrink-0">{Math.floor(seg.timestamp / 60)}:{Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}</span>
                                <p className="text-sm font-medium leading-relaxed">{seg.text}</p>
                            </div>
                        ))}
                        {interimTranscript && (
                            <div className="flex items-start gap-3 text-white animate-in fade-in duration-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954] mt-1.5 animate-pulse shrink-0" />
                                <p className="text-sm font-medium leading-relaxed">{interimTranscript}</p>
                            </div>
                        )}
                        <div ref={transcriptEndRef} className="h-4" />
                    </div>
                </div>
            </div>

            {/* Deck Selector Modal - Moved outside to prevent overflow clipping */}
            {
                showDeckSelector && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl">
                            <h3 className="text-lg font-bold text-white text-center mb-4">
                                {language === 'he' ? 'בחר קבוצות חרוזים' : 'Select Rhyme Groups'}
                            </h3>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {allWordGroups?.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => {
                                            const id = group.id!
                                            if (selectedDeckIds.includes(id)) {
                                                setSelectedDeckIds(selectedDeckIds.filter(i => i !== id))
                                            } else if (selectedDeckIds.length < 4) {
                                                setSelectedDeckIds([...selectedDeckIds, id])
                                            }
                                        }}
                                        className={`w-full p-3 rounded-lg text-right flex items-center justify-between transition-colors ${selectedDeckIds.includes(group.id!)
                                            ? 'bg-[#1DB954]/20 border border-[#1DB954]'
                                            : 'bg-[#282828] hover:bg-[#3E3E3E] border border-transparent'
                                            }`}
                                    >
                                        <span className="text-subdued text-xs">{group.items.length} מילים</span>
                                        <span className="font-medium">{group.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowDeckSelector(false)}
                                className="w-full mt-4 py-2 bg-[#1DB954] text-black font-bold rounded-lg"
                            >
                                {language === 'he' ? 'סיום' : 'Done'}
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Single Deck Replacement Modal */}
            {
                replacingDeckIndex !== null && (
                    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <button onClick={() => setReplacingDeckIndex(null)} className="p-2 text-subdued hover:text-white">✕</button>
                                <h3 className="text-lg font-bold text-white text-center">
                                    {language === 'he' ? 'החלף קבוצה' : 'Replace Deck'}
                                </h3>
                                <div className="w-8"></div>
                            </div>

                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {allWordGroups?.map(group => {
                                    const id = group.id!
                                    // Status Logic:
                                    // 1. Is this group CURRENTLY in the slot we are replacing?
                                    const isCurrentSlot = selectedDeckIds[replacingDeckIndex] === id
                                    // 2. Is this group ACTIVE in ANOTHER slot?
                                    const isActiveElsewhere = selectedDeckIds.includes(id) && !isCurrentSlot

                                    return (
                                        <button
                                            key={group.id}
                                            onClick={() => {
                                                if (isActiveElsewhere) return; // Optional: prevent selecting already active elsewhere? Or just allow swap? 
                                                // User logic: "smart... understand what is active". Better to allow swap if clicked, or just select.
                                                // Let's allow selecting any, but visually distinguish.
                                                // Actually, standard behavior: replace the slot with new ID.
                                                const newIds = [...selectedDeckIds]
                                                newIds[replacingDeckIndex] = id
                                                // If we selected something that was elsewhere, we might want to swap? 
                                                // Simple version: just replace. The "elsewhere" one stays there (duplicate). 
                                                // User asked "understand what is active". 
                                                // Let's disable "active elsewhere" to avoid dupes, unless user explicitly wants dupes (unlikely).
                                                if (!isActiveElsewhere) {
                                                    setSelectedDeckIds(newIds)
                                                    setReplacingDeckIndex(null)
                                                }
                                            }}
                                            disabled={isActiveElsewhere}
                                            className={`w-full p-3 rounded-lg text-right flex items-center justify-between transition-colors ${isCurrentSlot
                                                    ? 'bg-[#1DB954] text-black border border-[#1DB954]' // Current selection
                                                    : isActiveElsewhere
                                                        ? 'bg-[#282828]/50 text-subdued cursor-not-allowed border border-transparent' // In use elsewhere
                                                        : 'bg-[#282828] hover:bg-[#3E3E3E] text-white border border-transparent' // Available
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isActiveElsewhere && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-subdued">{language === 'he' ? 'בשימוש' : 'In Use'}</span>}
                                                <span className={`text-xs ${isCurrentSlot ? 'text-black/70' : 'text-subdued'}`}>{group.items.length} מילים</span>
                                            </div>
                                            <span className="font-medium">{group.name}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
