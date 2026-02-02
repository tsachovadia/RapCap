import { Play, Pause, Loader2 } from 'lucide-react'
import type { DbSession } from '../../db/db'

interface MiniPlayerProps {
    session: DbSession | null
    isPlaying: boolean
    isBuffering: boolean
    currentTime: number
    onPlayPause: () => void
    onExpand: () => void
}

export default function MiniPlayer({
    session,
    isPlaying,
    isBuffering,
    currentTime,
    onPlayPause,
    onExpand
}: MiniPlayerProps) {
    if (!session) return null

    const progress = session.duration > 0 ? (currentTime / session.duration) * 100 : 0

    return (
        <div
            className="fixed bottom-16 left-0 right-0 z-50 bg-gradient-to-t from-[#181818] to-[#282828] border-t border-[#383838] px-4 py-2 backdrop-blur-lg"
            onClick={onExpand}
        >
            <div className="max-w-screen-lg mx-auto flex items-center gap-3">
                {/* Play/Pause Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onPlayPause()
                    }}
                    className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 hover:scale-105 transition-transform"
                >
                    {isBuffering ? (
                        <Loader2 className="text-black animate-spin" size={20} />
                    ) : isPlaying ? (
                        <Pause className="text-black" size={18} fill="currentColor" />
                    ) : (
                        <Play className="text-black ml-0.5" size={18} fill="currentColor" />
                    )}
                </button>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                        {session.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-subdued">
                        <span>{session.beatId ? 'Freestyle' : 'Drill'}</span>
                        <span>•</span>
                        <span>{formatTime(currentTime)} / {formatTime(session.duration)}</span>
                    </div>
                </div>

                {/* Expand indicator */}
                <div className="text-subdued text-xs">
                    ↑
                </div>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#383838]">
                <div
                    className="h-full bg-[#1DB954] transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
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
