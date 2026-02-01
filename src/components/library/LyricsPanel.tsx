import { Copy, Check, Download } from 'lucide-react'
import { useState } from 'react'

interface LyricsPanelProps {
    lyrics?: string
    segments?: Array<{ timestamp: number; text: string }>
    currentTime: number
    onSeek: (time: number) => void
    onDownload?: () => void
    hasBlob: boolean
}

export default function LyricsPanel({
    lyrics,
    segments,
    currentTime,
    onSeek,
    onDownload,
    hasBlob
}: LyricsPanelProps) {
    const [isCopied, setIsCopied] = useState(false)
    const [includeTimestamps, setIncludeTimestamps] = useState(false)

    const handleCopy = () => {
        let text = ''

        if (includeTimestamps && segments && Array.isArray(segments)) {
            text = segments.map((s) => {
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
            <div className="h-[200px] overflow-y-auto p-3 space-y-1 text-right custom-scrollbar">
                {segments && segments.length > 0 ? (
                    segments.map((segment, i) => {
                        const isActive = currentTime >= segment.timestamp &&
                            (i === segments.length - 1 || currentTime < segments[i + 1].timestamp)

                        return (
                            <button
                                key={i}
                                onClick={() => onSeek(segment.timestamp)}
                                className={`block w-full text-right px-2 py-1 rounded transition-all ${isActive
                                        ? 'bg-[#1DB954]/20 text-[#1DB954] font-medium scale-[1.02]'
                                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <span className="text-sm leading-relaxed">{segment.text}</span>
                            </button>
                        )
                    })
                ) : (
                    <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">
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
