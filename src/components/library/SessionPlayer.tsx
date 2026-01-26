import { useEffect, useRef, useState } from 'react'
import YouTube, { type YouTubeProps } from 'react-youtube'
import { Mic, Music } from 'lucide-react'

interface SessionPlayerProps {
    session: {
        blob?: Blob
        beatId?: string
        duration: number
        syncOffset?: number
    }
    isPlaying: boolean
    onEnded: () => void
}

export default function SessionPlayer({ session, isPlaying, onEnded }: SessionPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const youtubeRef = useRef<any>(null)

    // State
    const [progress, setProgress] = useState(0)
    const [currentTime, setCurrentTime] = useState(0)
    const [vocalVolume, setVocalVolume] = useState(100)
    const [beatVolume, setBeatVolume] = useState(30) // Lower beat volume by default so vocals pop

    // Setup Audio
    useEffect(() => {
        if (!session.blob) return

        const url = URL.createObjectURL(session.blob)
        if (audioRef.current) {
            audioRef.current.src = url
        }
        return () => URL.revokeObjectURL(url)
    }, [session.blob])

    if (!session.blob) return null

    // Controls Logic
    useEffect(() => {
        const audio = audioRef.current
        const yt = youtubeRef.current

        if (isPlaying) {
            // Master Strategy:
            // 1. If we have a beat, PLAY BEAT FIRST.
            // 2. Wait for beat to actually start (via onStateChange) -> Then play Audio.
            // 3. If no beat, just play audio.

            if (session.beatId && yt) {
                try { yt.playVideo() } catch (e) { }
                // Audio play is handled in onStateChange(1) below
            } else {
                // No beat? Just play audio (Skip dead air if any)
                const offsetSeconds = (session.syncOffset || 0) / 1000
                if (audio) {
                    audio.currentTime = offsetSeconds
                    audio.play()
                }
            }
        } else {
            audio?.pause()
            try { yt?.pauseVideo() } catch (e) { }
        }
    }, [isPlaying, session.beatId])

    // Master Clock Loop
    useEffect(() => {
        let animationFrame: number

        const loop = () => {
            animationFrame = requestAnimationFrame(loop)

            if (isPlaying && youtubeRef.current && typeof youtubeRef.current.getCurrentTime === 'function') {
                const ytTime = youtubeRef.current.getCurrentTime()
                const offsetSeconds = (session.syncOffset || 0) / 1000
                const targetAudioTime = ytTime - offsetSeconds
                const audio = audioRef.current

                if (audio) {
                    // Update UI Progress
                    setCurrentTime(targetAudioTime > 0 ? targetAudioTime : 0)
                    const total = session.duration || 1
                    setProgress(((targetAudioTime > 0 ? targetAudioTime : 0) / total) * 100)

                    // Sync Audio
                    if (targetAudioTime < 0) {
                        // We are in the Pre-Roll / Intro
                        if (!audio.paused) {
                            audio.pause()
                            audio.currentTime = 0
                        }
                    } else {
                        // We are in the Vocal part
                        if (audio.paused) {
                            audio.currentTime = targetAudioTime
                            audio.play()
                        } else {
                            // Drift Correction (if drift > 0.1s)
                            if (Math.abs(audio.currentTime - targetAudioTime) > 0.15) {
                                console.log('🔄 Re-syncing drift', Math.abs(audio.currentTime - targetAudioTime))
                                audio.currentTime = targetAudioTime
                            }
                        }
                    }
                }
            }
        }

        if (isPlaying) {
            loop()
        }

        return () => cancelAnimationFrame(animationFrame)
    }, [isPlaying, session.syncOffset, session.duration])

    // State Change (Initial Play Trigger only)
    const handlePlayerStateChange = () => {
        // We rely on the loop for sync, but we use this to catch the initial "Play" command
        // effectively handled by the useEffect above monitoring [isPlaying]
    }

    // Sync Check (Optional: Resync every few seconds? For now just Play/Pause together)

    // Volume Management
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = vocalVolume / 100
    }, [vocalVolume])

    // Volume Management
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = vocalVolume / 100
    }, [vocalVolume])

    useEffect(() => {
        if (youtubeRef.current) youtubeRef.current.setVolume(beatVolume)
    }, [beatVolume])


    // Time Update (Driven by Audio)
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime
            const total = audioRef.current.duration || session.duration || 1
            setCurrentTime(current)
            setProgress((current / total) * 100)
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newProgress = Number(e.target.value)
        const total = audioRef.current?.duration || session.duration || 1
        const seekTime = (newProgress / 100) * total

        // Seek Audio
        if (audioRef.current) {
            audioRef.current.currentTime = seekTime
        }
        // Seek YouTube
        if (youtubeRef.current) {
            youtubeRef.current.seekTo(seekTime)
        }

        setProgress(newProgress)
    }

    // YouTube Opts
    const ytOpts: YouTubeProps['opts'] = {
        height: '0',
        width: '0', // Hidden player for playback
        playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            playsinline: 1,
            start: 0,
            origin: window.location.origin,
        },
    }

    return (
        <div className="flex flex-col w-full gap-6 bg-[#181818] p-4 rounded-xl border border-[#282828]">
            {/* Hidden stuff */}
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    onEnded()
                    setProgress(0)
                }}
            />
            {session.beatId && (
                <div className="fixed top-0 left-0 w-1 h-1 pointer-events-none opacity-0 z-[-1]">
                    <YouTube
                        videoId={session.beatId}
                        opts={ytOpts}
                        onReady={(e) => {
                            youtubeRef.current = e.target
                            e.target.setVolume(beatVolume)
                        }}
                        onStateChange={handlePlayerStateChange}
                    />
                </div>
            )}

            {/* TRACK 1: BEAT */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-subdued uppercase tracking-wider font-bold">
                    <div className="flex items-center gap-2">
                        <Music size={14} className="text-[#1DB954]" />
                        <span>Beat Track</span>
                    </div>
                </div>
                {/* Beat Progress Bar */}
                <div className="relative w-full h-8 flex items-center group">
                    {/* We use the same progress for now as they are synced, 
                         but visually separating them gives the 'studio' feel */}
                    <div className="absolute inset-0 bg-[#282828] rounded-lg overflow-hidden">
                        <div
                            className="h-full bg-[#1DB954]/20 transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {/* Beat Volume Inside Track */}
                    <input
                        type="range"
                        min="0" max="100"
                        value={beatVolume}
                        onChange={(e) => setBeatVolume(Number(e.target.value))}
                        className="absolute right-2 w-20 h-1 accent-[#1DB954] bg-white/10 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Beat Volume"
                    />
                </div>
            </div>

            {/* TRACK 2: VOCALS */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-subdued uppercase tracking-wider font-bold">
                    <div className="flex items-center gap-2">
                        <Mic size={14} className="text-[#E50914]" />
                        <span>Vocals</span>
                    </div>
                    <span>{formatTime(currentTime)} / {formatTime(session.duration)}</span>
                </div>

                <div className="relative w-full h-12 flex items-center group">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress || 0}
                        onChange={handleSeek}
                        className="relative z-10 w-full h-full opacity-0 cursor-pointer"
                    />
                    {/* Custom Vocal Visualizer Background */}
                    <div className="absolute inset-0 bg-[#282828] rounded-lg overflow-hidden flex items-center">
                        {/* Fake Waveform Pattern */}
                        <div className="w-full h-1/2 flex items-center justify-center gap-0.5 opacity-30">
                            {Array.from({ length: 40 }).map((_, i) => (
                                <div key={i} className="w-1 bg-white rounded-full" style={{ height: `${Math.random() * 100}%` }} />
                            ))}
                        </div>
                        {/* Progress Overlay */}
                        <div
                            className="absolute inset-0 bg-[#E50914]/30 border-r-2 border-[#E50914] transition-all duration-100 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    {/* Vocal Volume Inside Track */}
                    <input
                        type="range"
                        min="0" max="100"
                        value={vocalVolume}
                        onChange={(e) => setVocalVolume(Number(e.target.value))}
                        className="absolute right-2 z-20 w-20 h-1 accent-[#E50914] bg-white/10 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Vocal Volume"
                    />
                </div>
            </div>

            {/* Global Play/Pause happens via parent button usually, 
                but here we visualize the tracks */}
        </div>
    )
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
