import { Play, Pause, Loader2, FileText, Cloud } from 'lucide-react'
import SessionActionsMenu from './SessionActionsMenu'
import type { Session } from '../../db/db'

interface SessionCardProps {
    session: Session
    isActive: boolean
    isPlaying: boolean
    isBuffering: boolean
    isTranscribing: boolean
    onPlayPause: () => void
    onExpand: () => void
    onTranscribe: () => void
    onDownload: () => void
    onCopyLyrics: () => void
    onDelete: () => void
}

export default function SessionCard({
    session,
    isActive,
    isPlaying,
    isBuffering,
    isTranscribing,
    onPlayPause,
    onExpand,
    onTranscribe,
    onDownload,
    onCopyLyrics,
    onDelete
}: SessionCardProps) {
    const hasLyrics = !!session.metadata?.lyrics
    const isCloudSynced = !!session.metadata?.cloudUrl
    const hasBlob = !!session.blob

    return (
        <div
            className={`rounded-xl p-3 transition-all duration-200 ${isActive
                ? 'bg-gradient-to-r from-[#1DB954]/20 to-[#282828] ring-1 ring-[#1DB954]/30'
                : 'bg-[#181818] hover:bg-[#282828]'
                }`}
        >
            <div className="flex items-center gap-3">
                {/* Play Button / Thumbnail */}
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onPlayPause()
                    }}
                    className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${isActive && isPlaying
                        ? 'bg-[#1DB954] hover:bg-[#1ed760] scale-105'
                        : 'bg-[#3E3E3E] hover:bg-[#4E4E4E]'
                        }`}
                >
                    {isActive && isBuffering ? (
                        <Loader2 className="text-[#1DB954] animate-spin" size={20} />
                    ) : isActive && isPlaying ? (
                        <Pause className="text-black" size={20} fill="currentColor" />
                    ) : (
                        <Play className={`${isActive ? 'text-[#1DB954]' : 'text-white'} ml-0.5`} size={20} fill="currentColor" />
                    )}
                </button>

                {/* Session Info - Clickable to expand */}
                <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={onExpand}
                >
                    <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-[#1DB954]' : 'text-white'
                            }`}>
                            {session.title}
                        </p>

                        {/* Status Icons */}
                        <div className="flex items-center gap-1 shrink-0">
                            {hasLyrics && (
                                <span title="יש מילים">
                                    <FileText size={12} className="text-purple-400" />
                                </span>
                            )}
                            {isCloudSynced && (
                                <span title="מסונכרן לענן">
                                    <Cloud size={12} className="text-blue-400" />
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-subdued mt-0.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${session.beatId
                            ? 'bg-[#1DB954]/20 text-[#1DB954]'
                            : 'bg-purple-500/20 text-purple-400'
                            }`}>
                            {session.beatId ? 'Freestyle' : 'Drill'}
                        </span>
                        <span>•</span>
                        <span>{formatDuration(session.duration)}</span>
                        <span>•</span>
                        <span>{formatDate(session.createdAt)}</span>
                    </div>
                </div>

                {/* Actions Menu */}
                <SessionActionsMenu
                    onTranscribe={onTranscribe}
                    onDownload={onDownload}
                    onCopyLyrics={onCopyLyrics}
                    onDelete={onDelete}
                    isTranscribing={isTranscribing}
                    hasLyrics={hasLyrics}
                    hasBlob={hasBlob || isCloudSynced}
                />
            </div>
        </div>
    )
}

function formatDuration(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('he-IL', {
        day: 'numeric',
        month: 'short'
    })
}
