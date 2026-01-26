/**
 * Freestyle Recording Page - Unified Logic
 */
import { useState, useRef, useEffect } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import BeatPlayer from '../components/freestyle/BeatPlayer'
import RecordingControls from '../components/freestyle/RecordingControls'
import { db } from '../db/db'
import { ArrowLeft, MoreHorizontal, Volume1, Volume2, Link, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Better static ID: 'HAFijG6kyRk' (User provided beat)
const STATIC_BEAT_ID = 'HAFijG6kyRk'

export default function FreestylePage() {
    const navigate = useNavigate()
    const { initializeStream, startRecording, stopRecording, isRecording, duration, analyser } = useAudioRecorder()

    // Beat State
    const [videoId, setVideoId] = useState(STATIC_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
    const [beatInput, setBeatInput] = useState('')

    // Unified State
    const [isPreRolling, setIsPreRolling] = useState(false)
    const [isFlowActive, setIsFlowActive] = useState(false) // True when either pre-rolling or recording

    // Polling Ref for Pre-Roll Check
    const preRollCheckRef = useRef<number | null>(null)

    // Ensure stream is initialized on mount (redundant safety)
    useEffect(() => {
        initializeStream().catch(err => console.error("Stream init failed", err))
    }, [initializeStream])

    // UNIFIED TOGGLE LOGIC
    const handleToggleUnifiedFlow = async () => {
        if (isFlowActive) {
            // --- STOP EVERYTHING ---
            console.log('🛑 Stopping Flow...')

            // 1. Stop UI State
            setIsFlowActive(false)
            setIsPreRolling(false)
            if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)

            // 2. Stop Beat
            if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                youtubePlayer.pauseVideo()
            }

            // 3. Stop Recording (if active)
            if (isRecording) {
                const blob = await stopRecording()
                if (blob.size > 0) {
                    saveSession(blob)
                }
            }

        } else {
            // --- START EVERYTHING ---
            console.log('🎤 Starting Flow...')

            // CRITICAL FIX FOR MOBILE: Play Video IMMEDIATELY (Synchronous)
            // This "primes" the video element within the user interaction event loop.
            if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
                // Mute briefly if we want pre-roll silence, but we must call play() here.
                youtubePlayer.seekTo(0)
                youtubePlayer.playVideo()
            } else {
                alert('נגן הביט לא מוכן, נסה שוב רגע')
                return
            }

            try {
                // 1. Ensure Stream (Async - might take a moment)
                await initializeStream()

                // 2. Set UI State
                setIsFlowActive(true)
                setIsPreRolling(true)

                // 3. Start Pre-Roll Monitoring
                monitorPreRoll()

            } catch (e) {
                console.error('Failed to start flow:', e)
                alert('שגיאה בגישה למיקרופון')
                setIsFlowActive(false)
                // If mic fails, pause the beat we just started
                if (youtubePlayer) youtubePlayer.pauseVideo()
            }
        }
    }

    const monitorPreRoll = () => {
        // Fallback safety timeout in case YouTube player never reports ready
        const safetyTimeout = setTimeout(() => {
            if (preRollCheckRef.current) {
                console.warn("⚠️ Pre-roll timed out, forcing start...");
                cancelAnimationFrame(preRollCheckRef.current);
                startRecording().then(() => setIsPreRolling(false));
            }
        }, 3000); // 3 seconds max wait

        const check = () => {
            if (!youtubePlayer) return;

            const currentTime = youtubePlayer.getCurrentTime();
            // 2 Seconds Pre-Roll check
            if (currentTime >= 2.0) {
                console.log('✅ Pre-Roll Complete! Recording...');
                clearTimeout(safetyTimeout);
                startRecording().then(() => {
                    setIsPreRolling(false);
                });
                if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current);
            } else {
                preRollCheckRef.current = requestAnimationFrame(check);
            }
        };
        preRollCheckRef.current = requestAnimationFrame(check);
    }

    const saveSession = async (blob: Blob) => {
        try {
            await db.sessions.add({
                title: `Session ${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`,
                blob: blob,
                duration: duration,
                beatId: videoId,
                createdAt: new Date(),
                type: 'freestyle',
                syncOffset: 2000 // Fixed offset for Pre-Roll
            })
            // Optional: Toast or small notification instead of alert
            // alert('Session saved successfully! 🎉') 
        } catch (e) {
            console.error('Failed to save session', e)
            alert('שגיאה בשמירת ההקלטה')
        }
    }

    const handleBeatChange = (e: React.FormEvent) => {
        e.preventDefault()
        let id = beatInput
        if (id.includes('v=')) {
            id = id.split('v=')[1].split('&')[0]
        } else if (id.includes('youtu.be/')) {
            id = id.split('youtu.be/')[1]
        }
        setVideoId(id)
        setBeatInput('')
    }

    // Lyrics State
    const [isLyricsOpen, setIsLyricsOpen] = useState(false)
    const [lyricsText, setLyricsText] = useState('')

    return (
        <div className="pb-24 min-h-screen flex flex-col relative overflow-hidden bg-black text-white">
            {/* Header */}
            <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#121212]">
                <button
                    onClick={() => navigate('/')}
                    className="btn-icon"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-base font-bold">פריסטייל</h1>
                <button
                    onClick={() => navigate('/settings')}
                    className="btn-icon"
                    aria-label="Settings"
                >
                    <MoreHorizontal size={24} />
                </button>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
                {/* Beat Player (Visual Only) */}
                <div className="w-full max-w-sm px-4 mb-4 pointer-events-none">
                    <BeatPlayer
                        videoId={videoId}
                        isPlaying={isFlowActive} // Driven by Unified State
                        volume={beatVolume}
                        onReady={(player) => setYoutubePlayer(player)}
                    />
                </div>

                {/* Unified Controls */}
                <RecordingControls
                    isRecording={isFlowActive} // Visual state for the button (Red/Stop)
                    isWaiting={isPreRolling}
                    duration={duration}
                    onToggleRecording={handleToggleUnifiedFlow}
                    analyser={analyser}
                />
            </div>

            {/* Beat Control Section */}
            <div className="mb-6 px-4">
                <div className="spotify-card">
                    {/* Volume Slider */}
                    <div className="flex items-center gap-3 mb-4">
                        <Volume1 className="text-subdued" size={20} />
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={beatVolume}
                            onChange={(e) => setBeatVolume(Number(e.target.value))}
                            className="w-full accent-[#1DB954] h-1 bg-[#535353] rounded-lg appearance-none cursor-pointer"
                        />
                        <Volume2 className="text-subdued" size={20} />
                    </div>

                    {/* Beat Input */}
                    <form onSubmit={handleBeatChange} className="relative">
                        <Link className="absolute right-3 top-1/2 -translate-y-1/2 text-subdued" size={16} />
                        <input
                            value={beatInput}
                            onChange={(e) => setBeatInput(e.target.value)}
                            className="spotify-input pr-10 py-2 text-xs rounded-full"
                            placeholder="הדבק לינק ליוטיוב..."
                        />
                    </form>
                </div>
            </div>

            {/* Lyrics Section */}
            <section className="px-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold">מילים</h2>
                    <button
                        onClick={() => setIsLyricsOpen(!isLyricsOpen)}
                        className={`spotify-chip gap-1 pl-2 transition-colors ${isLyricsOpen ? 'bg-white/20 text-white' : 'hover:bg-white/20'}`}
                    >
                        <Plus size={16} className={isLyricsOpen ? 'rotate-45 transition-transform' : 'transition-transform'} />
                        {isLyricsOpen ? 'סגור' : 'הוסף'}
                    </button>
                </div>

                {isLyricsOpen ? (
                    <textarea
                        value={lyricsText}
                        onChange={(e) => setLyricsText(e.target.value)}
                        placeholder="כתוב כאן את המילים שלך..."
                        className="w-full h-40 bg-[#282828] rounded-lg p-4 text-white resize-none focus:outline-none focus:ring-1 focus:ring-white/50 animate-in fade-in slide-in-from-bottom-2 duration-300"
                    />
                ) : (
                    <div className="space-y-3 opacity-50">
                        <p className="text-sm text-center text-subdued">המילים יופיעו כאן...</p>
                    </div>
                )}
            </section>
        </div>
    )
}
