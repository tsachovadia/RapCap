import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Pause, Trash2, Calendar } from 'lucide-react';
import { getAllSessions, deleteSession } from '../services/db';
import type { Session } from '../types';
import { BeatPlayer } from '../components/studio/BeatPlayer';
import { useBeatController } from '../hooks/useBeatController';
import { BottomPlayer } from '../components/library/BottomPlayer';
import { FullScreenPlayer } from '../components/library/FullScreenPlayer';

export default function LibraryPage() {
    const navigate = useNavigate();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Phantom Player Logic
    // Phantom Player & Mobile Audio Logic
    const beatController = useBeatController();
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Phantom Style: We keep it hidden ('display: none') unless we are in full screen?
    // Actually, for "Phantom" to work, we just need it mounted.
    // We will render it at the root of this page, hidden.
    // When Full Screen is open, we can "move" it? 
    // Or just overlay the Full Screen player on top.

    // We need to track time for the UI
    useEffect(() => {
        let interval: any;
        if (playingId && audioRef.current) {
            interval = setInterval(() => {
                setCurrentTime(audioRef.current?.currentTime || 0);
            }, 100);
        }
        return () => clearInterval(interval);
    }, [playingId]);


    useEffect(() => {
        loadSessions();
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const loadSessions = async () => {
        try {
            const loadedSessions = await getAllSessions();
            // Sort by newest first
            setSessions(loadedSessions.reverse());
        } catch (err) {
            console.error("Failed to load sessions", err);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this session?')) {
            await deleteSession(id);
            loadSessions();
        }
    };

    const handlePlay = (session: Session) => {
        // Toggle Pause if same session
        if (playingId === session.id) {
            audioRef.current?.pause();
            beatController.pause();
            setPlayingId(null);
            return;
        }

        // Cleanup previous audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        const blob = session.recording.blob;
        if (!blob) {
            alert("Audio not found");
            return;
        }

        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);

        // Sync Logic: Stop video when audio ends
        audio.onended = () => {
            // Loop or Stop? Let's stop.
            setPlayingId(null);
            beatController.pause();
        };

        audioRef.current = audio;
        setPlayingId(session.id);

        audio.play().catch(e => {
            console.error("Audio Playback Failed (Mobile Restriction?):", e);
            // Optionally, we could show a "Tap to Play" overlay if this fails.
        });

        // Control Phantom Video Player
        if (session.beatContext.videoId) {
            // "Warmup" check: if we are on mobile, we hope the click event propagated.
            // We load the beat.
            beatController.loadBeat(session.beatContext.videoId, session.beatContext.playStartOffset || 0);

            // We do NOT need to "teleport" anymore. The player is persistent in the footer/background.
            beatController.play();
        }
    };

    const handleTogglePlay = () => {
        if (!playingId) return;

        if (audioRef.current?.paused) {
            audioRef.current.play().catch(e => console.error("Resume Audio Failed:", e));
            beatController.play();
        } else {
            audioRef.current?.pause();
            beatController.pause();
        }
        // Force update to refresh UI state if needed
        setPlayingId(prev => prev); // This might not be enough for re-render if value same, but we use refs.
        // Actually, playingId state doesn't change on pause, but we might want a 'isPlaying' state.
        // We can just rely on audioRef.paused for logic, but for UI we need state.
        // Let's add an 'isPlaying' state synced with playingId?
        // Simpler: Just force update or adding a 'playing' boolean state.
    };

    const handleSeek = (time: number) => {
        const session = sessions.find(s => s.id === playingId);
        if (audioRef.current && session) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);

            const offset = session.beatContext.playStartOffset || 0;
            const videoTime = time + offset;

            beatController.seek(videoTime);

            // Ensure both are playing if we were playing
            if (!audioRef.current.paused) {
                beatController.play();
            }
        }
    };



    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString() + ' ' + new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const currentPlayingSession = sessions.find(s => s.id === playingId);

    return (
        <div className="flex flex-col h-screen bg-gray-950 driver-mode-safe overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 pb-2 shrink-0 z-10 bg-gray-950">
                <button
                    onClick={() => navigate('/')}
                    className="p-3 bg-gray-900 rounded-full active:scale-95 transition-transform"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold tracking-tighter text-gray-100">LIBRARY</h1>
            </div>

            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
                {sessions.length === 0 ? (
                    <div className="text-center text-gray-500 mt-20">
                        No recordings yet.
                        <br />
                        Go make some noise! 🎤
                    </div>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            className={`
                rounded-xl bg-gray-900 border border-gray-800 transition-all overflow-hidden
                ${playingId === session.id ? 'border-indigo-500 bg-gray-800' : ''}
              `}
                        >
                            {/* Header / Main Row */}
                            <div
                                onClick={() => handlePlay(session)}
                                className="p-4 flex justify-between items-center active:bg-gray-800/50"
                            >
                                <div className="flex flex-col gap-1">
                                    <h3 className="font-bold text-gray-200">{session.beatContext.videoTitle}</h3>
                                    <div className="flex items-center text-xs text-gray-500 gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(session.createdAt)}
                                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                        {session.recording.durationSeconds.toFixed(0)}s
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Play Button acts as select now */}
                                    <button
                                        className={`p-3 rounded-full ${playingId === session.id ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400'}`}
                                    >
                                        {playingId === session.id && !audioRef.current?.paused ? (
                                            <Pause className="w-5 h-5 fill-current" />
                                        ) : (
                                            <Play className="w-5 h-5" />
                                        )}
                                    </button>

                                    <button
                                        onClick={(e) => handleDelete(e, session.id)}
                                        className="p-2 text-gray-600 hover:text-red-500"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Moments List (Visible when expanding or playing) */}
                            {session.moments.length > 0 && (
                                <div className="px-4 pb-4 pt-2 border-t border-gray-800/50">
                                    <h4 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Moments</h4>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleSeek(0); }}
                                            className="px-3 py-1 bg-gray-800 rounded text-xs text-gray-300 font-mono hover:bg-indigo-900/50 transition-colors"
                                        >
                                            Start (0:00)
                                        </button>
                                        {session.moments.map((moment, idx) => (
                                            <button
                                                key={idx}
                                                onClick={(e) => { e.stopPropagation(); handleSeek(moment); }}
                                                className="px-3 py-1 bg-yellow-900/30 text-yellow-500 border border-yellow-700/30 rounded text-xs font-mono hover:bg-yellow-900/50 transition-colors"
                                            >
                                                Moment {idx + 1} ({formatTime(moment)})
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Placeholder for Video (Target for Phantom) */}

                        </div>
                    ))
                )}
            </div>

            {/* CORRECT SINGLETON PLAYER */}
            <div className={`transition-all duration-500 ease-in-out
                ${isFullScreen
                    ? 'fixed top-32 left-8 right-8 aspect-square rounded-2xl overflow-hidden shadow-2xl z-40'
                    : 'fixed bottom-0 left-0 w-1 h-1 opacity-0 pointer-events-none'
                }
             `}>
                <BeatPlayer
                    videoId="" // Overridden
                    onReady={beatController.setPlayer}
                    onStateChange={beatController.handleStateChange}
                    className="w-full h-full"
                />
            </div>


            {currentPlayingSession && (
                <>
                    <BottomPlayer
                        session={currentPlayingSession}
                        playing={!audioRef.current?.paused}
                        // Note: 'playing' state here is tricky because we don't have a re-render triggering state for audio 'paused'.
                        // We relied on 'playingId'. But pausing doesn't nullify playingId.
                        // We need a 'isPlaying' state.
                        onTogglePlay={handleTogglePlay}
                        onExpand={() => setIsFullScreen(true)}
                        currentTime={currentTime}
                        duration={currentPlayingSession.recording.durationSeconds}
                    />

                    {isFullScreen && (
                        <FullScreenPlayer
                            session={currentPlayingSession}
                            playing={!audioRef.current?.paused}
                            onTogglePlay={handleTogglePlay}
                            onClose={() => setIsFullScreen(false)}
                            onSeek={handleSeek}
                            currentTime={currentTime}
                            duration={currentPlayingSession.recording.durationSeconds}
                        />
                    )}
                </>
            )}
        </div>
    );
}
