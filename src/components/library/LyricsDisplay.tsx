import { FileText } from 'lucide-react'

interface LyricsDisplayProps {
    lyrics?: string
    segments?: Array<{ text: string, timestamp: number }>
    onSeek?: (time: number) => void
    currentTime?: number
}

export default function LyricsDisplay({ lyrics, segments, onSeek, currentTime = 0 }: LyricsDisplayProps) {
    if (!lyrics && (!segments || segments.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-[#282828] rounded-lg bg-[#181818]/50 h-full min-h-[200px]">
                <FileText className="text-[#282828] mb-2" size={32} />
                <p className="text-subdued text-xs">אין מילים לשיר זה</p>
            </div>
        )
    }

    return (
        <div className="bg-[#181818] rounded-lg border border-[#282828] overflow-hidden flex flex-col h-full max-h-[400px]">
            <div className="px-4 py-3 border-b border-[#282828] bg-[#121212]">
                <h3 className="text-xs font-bold text-subdued uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} />
                    מילים
                </h3>
            </div>
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 relative">
                {segments && segments.length > 0 ? (
                    <div className="space-y-4">
                        {segments.map((seg, i) => {
                            // Highlights if current time is close (simple highlight)
                            // Ideally we'd find the active segment properly
                            const isActive = currentTime >= seg.timestamp && (i === segments.length - 1 || currentTime < segments[i + 1].timestamp)

                            return (
                                <div
                                    key={i}
                                    onClick={() => onSeek?.(seg.timestamp)}
                                    className={`p-2 rounded cursor-pointer transition-colors ${isActive ? 'bg-[#1DB954]/20 border-r-2 border-[#1DB954]' : 'hover:bg-white/5'}`}
                                >
                                    <p className={`text-sm ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>
                                        {seg.text}
                                    </p>
                                    <span className="text-[10px] text-subdued block mt-1 opacity-50">
                                        {Math.floor(seg.timestamp / 60)}:{Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {lyrics}
                    </p>
                )}
            </div>
        </div>
    )
}
