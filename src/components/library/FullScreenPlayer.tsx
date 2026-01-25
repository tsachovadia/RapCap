import { Play, Pause, ChevronDown, SkipBack, SkipForward } from 'lucide-react';
import type { Session } from '../../types';

interface FullScreenPlayerProps {
    session: Session;
    playing: boolean;
    onTogglePlay: () => void;
    onClose: () => void;
    onSeek: (time: number) => void;
    currentTime: number;
    duration: number;
}

export function FullScreenPlayer({ session, playing, onTogglePlay, onClose, onSeek, currentTime, duration }: FullScreenPlayerProps) {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <button onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-white">
                    <ChevronDown className="w-8 h-8" />
                </button>
                <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">Now Playing</div>
                <div className="w-8" /> {/* Spacer */}
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col justify-center px-8 gap-8">
                {/* Artwork / Video Container */}
                {/* This is where we "Teleport" the player to! */}
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl bg-black border border-gray-800 relative">
                    {/* The BeatPlayer will be rendered here by the parent logic via Portals or standard React rendering 
                         if we choose to move the actual instance here.
                         However, for the "Persistent" pattern, the actual player might be hidden 
                         and checking 'visuals' here.
                         
                         BUT: User wants to see the video.
                         So we MUST render the BeatPlayer component here.
                      */}
                    <div className="w-full h-full relative">
                        {/* We will rely on the PARENT to render the <BeatPlayer /> instance here 
                            OR we assume this component IS the active view. 
                            
                            Actually, to keep it persistent, we can't unmount/remount between Bottom and Full.
                            
                            Strategy:
                            The <BeatPlayer/> is always mounted in LibraryPage.
                            When FullScreen is open, we use CSS to position it HERE? 
                            OR we just re-render it here?
                            
                            If we re-render, we lose autoplay context on mobile.
                            
                            BETTER: 
                            The <BeatPlayer> is a SINGLETON in LibraryPage.
                            We verify if 'FullScreen' is open. 
                            If open, we style the Singleton to fill this container?
                            
                            Actually, we can pass a ref to the container?
                            
                            For now, let's just make a placeholder and let LibraryPage handle the "Teleportation" logic 
                            via refs, similar to how we did for the card.
                         */}
                        <div id="phantom-player-target" className="w-full h-full" />
                    </div>
                </div>

                {/* Track Info */}
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white leading-tight">{session.beatContext.videoTitle}</h2>
                    <p className="text-gray-400">RapCap Session</p>
                </div>

                {/* Scrubber */}
                <div className="space-y-2">
                    <input
                        type="range"
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={(e) => onSeek(Number(e.target.value))}
                        className="w-full accent-indigo-500 h-1 bg-gray-800 rounded-full appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-mono text-gray-500">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-8">
                    <button
                        onClick={() => onSeek(currentTime - 10)}
                        className="p-2 text-gray-400 active:scale-90 transition-transform"
                    >
                        <SkipBack className="w-8 h-8" />
                    </button>

                    <button
                        onClick={onTogglePlay}
                        className="p-6 bg-white rounded-full text-black hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-indigo-500/20"
                    >
                        {playing ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current" />}
                    </button>

                    <button
                        onClick={() => onSeek(currentTime + 10)}
                        className="p-2 text-gray-400 active:scale-90 transition-transform"
                    >
                        <SkipForward className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Moments List (Horizontal Scroll) */}
            <div className="mb-12 mt-4 px-8">
                {session.moments.length > 0 && (
                    <div className="flex overflow-x-auto gap-2 pb-4 scrollbar-hide">
                        {session.moments.map((moment, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSeek(moment)}
                                className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-gray-400 whitespace-nowrap active:bg-indigo-900 active:text-white"
                            >
                                Moment {idx + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
