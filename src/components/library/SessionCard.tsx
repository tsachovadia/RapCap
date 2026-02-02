import { Clock, Play, Trash2, CheckSquare, Square } from 'lucide-react';
import type { DbSession } from '../../db/db';

// Force HMR update

// Helper to generate a display title
const generateSessionTitle = (session: DbSession): string => {
    if (session.title && session.title !== 'Untitled Session') return session.title;
    const date = new Date(session.createdAt);
    return `Flow ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

interface SessionCardProps {
    session: DbSession;
    onPlay: (session: DbSession) => void;
    onDelete: (id: string) => void;

    // New Props for Multi-select
    isMultiSelectMode: boolean;
    isSelected: boolean;
    onToggleSelect: (id: string) => void;
}

export default function SessionCard({
    session,
    onPlay,
    onDelete,
    isMultiSelectMode,
    isSelected,
    onToggleSelect
}: SessionCardProps) {

    const handleClick = (e: React.MouseEvent) => {
        // If in multi-select mode, clicking anywhere toggles selection
        if (isMultiSelectMode) {
            e.stopPropagation();
            if (session.id !== undefined) {
                onToggleSelect(String(session.id));
            }
            return;
        }

        // Otherwise open the player
        onPlay(session);
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (session.id !== undefined) {
            onDelete(String(session.id));
        }
    };

    // Format helpers
    const fmt = (s: number) => {
        const min = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    // Extract a preview snippet from the transcript
    const transcript = session.metadata?.lyrics || '';
    const previewText = transcript
        ? transcript.slice(0, 60) + (transcript.length > 60 ? '...' : '')
        : 'Thinking...';

    return (
        <div
            onClick={handleClick}
            className={`
                relative bg-[#181818] rounded-xl p-4 border transition-all cursor-pointer group hover:bg-[#222]
                ${isSelected
                    ? 'border-[#1DB954] bg-[#1DB954]/10'
                    : 'border-[#282828] hover:border-[#383838]'
                }
            `}
        >
            <div className="flex items-center gap-4">

                {/* 1. Multi-select Checkbox OR Leading Play Icon (Visual only) */}
                <div className="shrink-0">
                    {isMultiSelectMode ? (
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center transition-colors
                            ${isSelected ? 'text-[#1DB954]' : 'text-subdued'}
                        `}>
                            {isSelected ? <CheckSquare size={24} /> : <Square size={24} />}
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-[#282828] flex items-center justify-center text-[#1DB954] group-hover:scale-110 transition-transform">
                            <Play size={16} fill="currentColor" />
                        </div>
                    )}
                </div>

                {/* 2. Content Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                    {/* Title & Beat */}
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white truncate text-base">
                            {generateSessionTitle(session)}
                        </h3>
                    </div>

                    {/* Transcript Preview */}
                    <p className="text-sm text-subdued truncate opacity-80">
                        {previewText}
                    </p>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-xs text-subdued mt-1">
                        <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {fmt(session.duration)}
                        </span>
                        <span>•</span>
                        <span>{new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {session.beatId && (
                            <>
                                <span>•</span>
                                <span className="max-w-[100px] truncate" title={session.beatId}>
                                    {session.beatId}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* 3. Actions (Delete) - Only show if NOT in multiselect to avoid clutter/accidents */}
                {!isMultiSelectMode && (
                    <button
                        onClick={handleDeleteClick}
                        className="p-2 text-subdued hover:text-red-500 hover:bg-white/5 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Delete Session"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
