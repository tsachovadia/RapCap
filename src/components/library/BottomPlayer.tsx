import { Play, Pause } from 'lucide-react';
import type { Session } from '../../types';

interface BottomPlayerProps {
    session: Session | null;
    playing: boolean;
    onTogglePlay: () => void;
    onExpand: () => void;
    currentTime: number;
    duration: number;
}

export function BottomPlayer({ session, playing, onTogglePlay, onExpand, currentTime, duration }: BottomPlayerProps) {
    if (!session) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            onClick={onExpand}
            className="fixed bottom-0 left-0 right-0 h-[10vh] min-h-[80px] bg-gray-900 border-t border-gray-800 px-4 flex items-center justify-between z-40 active:bg-gray-850 transition-colors cursor-pointer"
        >
            {/* Left: Info */}
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                {/* Mini Thumbnail (YouTube) */}
                <div className="w-12 h-12 bg-black rounded overflow-hidden relative shrink-0">
                    {/* We don't render the video here to avoid re-mounting. We just show a thumbnail or placeholder */}
                    <img
                        src={`https://img.youtube.com/vi/${session.beatContext.videoId}/default.jpg`}
                        className="w-full h-full object-cover opacity-80"
                    />
                </div>
                <div className="flex flex-col overflow-hidden">
                    <h3 className="text-sm font-bold text-gray-100 truncate">{session.beatContext.videoTitle}</h3>
                    <div className="text-xs text-indigo-400">Now Playing</div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-4 shrink-0" onClick={e => e.stopPropagation()}>
                <button
                    onClick={onTogglePlay}
                    className="p-3 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-transform"
                >
                    {playing ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
            </div>

            {/* Progress Bar (Absolute Top) */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
                <div
                    className="h-full bg-indigo-500 transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}
