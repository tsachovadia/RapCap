import { Copy, Check, Download, Pencil, Save, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface LyricsPanelProps {
    lyrics?: string
    segments?: Array<{ timestamp: number; text: string }>
    currentTime: number
    onSeek: (time: number) => void
    onDownload?: () => void
    hasBlob: boolean
    onUpdateLyrics?: (newLyrics: string, newSegments: Array<{ timestamp: number; text: string }>) => void
}

export default function LyricsPanel({
    lyrics,
    segments,
    currentTime,
    onSeek,
    onDownload,
    hasBlob,
    onUpdateLyrics
}: LyricsPanelProps) {
    const [isCopied, setIsCopied] = useState(false)
    const [includeTimestamps, setIncludeTimestamps] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [editingText, setEditingText] = useState('')
    const [localSegments, setLocalSegments] = useState<Array<{ timestamp: number; text: string }>>([])
    const activeSegmentRef = useRef<HTMLDivElement>(null)
    const contentRef = useRef<HTMLDivElement>(null)

    // Auto-scroll logic
    useEffect(() => {
        if (activeSegmentRef.current && contentRef.current) {
            activeSegmentRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            })
        }
    }, [currentTime])

    // Sync local segments with props
    useEffect(() => {
        if (segments && segments.length > 0) {
            setLocalSegments([...segments])
        }
    }, [segments])

    const handleCopy = () => {
        let text = ''

        if (includeTimestamps && localSegments && Array.isArray(localSegments)) {
            text = localSegments.map((s) => {
                const time = formatTime(s.timestamp)
                return `[${time}] ${s.text}`
            }).join('\n')
        } else {
            text = lyrics || ''
        }

        if (text) {
            navigator.clipboard.writeText(text)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        }
    }

    const handleStartEdit = (index: number, text: string) => {
        setEditingIndex(index)
        setEditingText(text)
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditingText('')
    }

    const handleSaveEdit = (index: number) => {
        if (editingIndex === null) return

        const newSegments = [...localSegments]
        newSegments[index] = { ...newSegments[index], text: editingText }
        setLocalSegments(newSegments)

        // Build new lyrics string
        const newLyrics = newSegments.map(s => s.text).join(' ')

        if (onUpdateLyrics) {
            onUpdateLyrics(newLyrics, newSegments)
        }

        setEditingIndex(null)
        setEditingText('')
    }

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleSaveEdit(index)
        } else if (e.key === 'Escape') {
            handleCancelEdit()
        }
    }

    if (!lyrics && (!segments || segments.length === 0)) {
        return (
            <div className="bg-[#121212] rounded-lg p-6 text-center">
                <p className="text-subdued text-sm">אין מילים זמינות</p>
                <p className="text-subdued text-xs mt-1">לחץ על ✨ לתמלול אוטומטי</p>
            </div>
        )
    }

    return (
        <div className="bg-[#121212] rounded-lg flex flex-col" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[#282828]">
                <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase text-subdued">מילים</h4>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeTimestamps ? 'bg-[#1DB954] border-[#1DB954]' : 'border-subdued'
                            }`}>
                            {includeTimestamps && <div className="w-2 h-2 bg-black rounded-full" />}
                        </div>
                        <input
                            type="checkbox"
                            className="hidden"
                            checked={includeTimestamps}
                            onChange={(e) => setIncludeTimestamps(e.target.checked)}
                        />
                        <span className="text-xs text-subdued">עם זמנים</span>
                    </label>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${isCopied ? 'text-green-500 bg-green-500/10' : 'text-subdued hover:text-[#1DB954] hover:bg-white/5'
                            }`}
                    >
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? 'הועתק!' : 'העתק'}
                    </button>

                    {hasBlob && onDownload && (
                        <button
                            onClick={onDownload}
                            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-subdued hover:text-[#1DB954] hover:bg-white/5 transition-colors"
                        >
                            <Download size={12} />
                            MP3
                        </button>
                    )}
                </div>
            </div>

            {/* Lyrics Content */}
            <div
                ref={contentRef}
                className="h-[300px] overflow-y-auto p-4 space-y-4 text-right custom-scrollbar scroll-smooth"
            >
                {localSegments && localSegments.length > 0 ? (
                    localSegments.map((segment, i) => {
                        const isActive = currentTime >= segment.timestamp &&
                            (i === localSegments.length - 1 || currentTime < localSegments[i + 1].timestamp)
                        const isEditing = editingIndex === i

                        if (isEditing) {
                            return (
                                <div key={i} className="flex items-center gap-2 bg-[#282828] rounded-md p-2 border border-[#1DB954]/50 shadow-lg animate-in slide-in-from-top-1 duration-200">
                                    <input
                                        type="text"
                                        value={editingText}
                                        onChange={(e) => setEditingText(e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(e, i)}
                                        autoFocus
                                        className="flex-1 bg-transparent border-none text-base text-white focus:outline-none"
                                        dir="rtl"
                                    />
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleSaveEdit(i)}
                                            className="p-1.5 bg-[#1DB954] text-black rounded hover:brightness-110 transition-all"
                                            title="שמור"
                                        >
                                            <Save size={16} />
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            className="p-1.5 bg-white/10 text-white rounded hover:bg-white/20 transition-all"
                                            title="ביטול"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div
                                key={i}
                                ref={isActive ? activeSegmentRef : null}
                                className={`group relative flex items-center justify-between w-full text-right p-4 rounded-xl transition-all duration-300 ${isActive
                                    ? 'bg-[#1DB954]/20 border border-[#1DB954]/40 scale-105 shadow-[0_0_20px_rgba(29,185,84,0.1)]'
                                    : 'hover:bg-white/5 border border-transparent scale-100'
                                    }`}
                            >
                                <button
                                    onClick={() => onSeek(segment.timestamp)}
                                    className={`flex-1 text-right transition-colors ${isActive ? 'text-[#1DB954] font-black' : 'text-white/80 group-hover:text-white'}`}
                                >
                                    <span className="text-2xl md:text-3xl leading-tight font-bold tracking-tight">{segment.text}</span>
                                </button>

                                <div className="flex items-center gap-2">
                                    {includeTimestamps && (
                                        <span className="text-[10px] text-subdued opacity-50 font-mono">
                                            {formatTime(segment.timestamp)}
                                        </span>
                                    )}

                                    {onUpdateLyrics && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartEdit(i, segment.text);
                                            }}
                                            className="p-2 text-subdued hover:text-[#1DB954] hover:bg-[#1DB954]/10 rounded-full transition-all md:opacity-0 md:group-hover:opacity-100"
                                            title="ערוך שורה"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed p-2">
                        {lyrics}
                    </p>
                )}
            </div>
        </div>
    )
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
