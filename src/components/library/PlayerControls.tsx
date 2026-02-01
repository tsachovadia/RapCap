import { Play, Pause, Loader2, X } from 'lucide-react'

interface PlayerControlsProps {
    isPlaying: boolean
    isBuffering: boolean
    currentTime: number
    duration: number
    onPlayPause: () => void
    onClose: () => void
    onSeek: (time: number) => void
}

export default function PlayerControls({
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    onPlayPause,
    onClose,
    onSeek
}: PlayerControlsProps) {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const percent = clickX / rect.width
        onSeek(percent * duration)
    }

    return (
        <div className="flex items-center gap-4">
            {/* Play/Pause Button */}
            <button
                onClick={onPlayPause}
                className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shrink-0 hover:scale-105 hover:bg-[#1ed760] transition-all"
            >
                {isBuffering ? (
                    <Loader2 className="text-black animate-spin" size={24} />
                ) : isPlaying ? (
                    <Pause className="text-black" size={24} fill="currentColor" />
                ) : (
                    <Play className="text-black ml-1" size={24} fill="currentColor" />
                )}
            </button>

            {/* Progress Section */}
            <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-subdued mb-1">
                    <span className="font-mono">{formatTime(currentTime)}</span>
                    <span className="font-mono">{formatTime(duration)}</span>
                </div>

                {/* Progress Bar */}
                <div
                    className="h-2 bg-[#3E3E3E] rounded-full cursor-pointer group relative"
                    onClick={handleProgressClick}
                >
                    <div
                        className="h-full bg-[#1DB954] rounded-full transition-all duration-100 relative"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Handle */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
                    </div>
                </div>
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                title="סגור נגן"
            >
                <X size={20} className="text-subdued" />
            </button>
        </div>
    )
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
