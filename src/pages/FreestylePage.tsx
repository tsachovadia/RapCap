/**
 * Freestyle Recording Page - Functional Implementation
 */
import { useState, useRef } from 'react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import BeatPlayer from '../components/freestyle/BeatPlayer'
import RecordingControls from '../components/freestyle/RecordingControls'
import { db } from '../db/db'
import { ArrowLeft, MoreHorizontal, Volume1, Volume2, Link, Plus } from 'lucide-react'

// Better static ID: 'HAFijG6kyRk' (User provided beat)
const STATIC_BEAT_ID = 'HAFijG6kyRk'

export default function FreestylePage() {
    const { initializeStream, startRecording, stopRecording, isRecording, duration, analyser } = useAudioRecorder()

    // Beat State
    const [videoId, setVideoId] = useState(STATIC_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)
    const [isPlayingBeat, setIsPlayingBeat] = useState(false)
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
    const [beatInput, setBeatInput] = useState('')

    const [isPreRolling, setIsPreRolling] = useState(false)

    // Polling Ref for Pre-Roll Check
    const preRollCheckRef = useRef<number | null>(null)

    // Toggle Recording Logic
    const handleToggleRecording = async () => {
        if (isRecording) {
            // STOP
            setIsPlayingBeat(false)
            if (youtubePlayer && typeof youtubePlayer.pauseVideo === 'function') {
                youtubePlayer.pauseVideo()
            }

            const blob = await stopRecording()

            // Save to DB
            if (blob.size > 0) {
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
                    alert('Session saved successfully! 🎉')
                } catch (e) {
                    console.error('Failed to save session', e)
                    alert('Failed to save session')
                }
            }

            // Cleanup props
            setIsPreRolling(false)
            if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)

        } else {
            // START
            try {
                // 1. Initialize Stream (Trusted Trigger)
                await initializeStream()

                // 2. Start Pre-Roll State
                setIsPreRolling(true)

                // 3. Play Beat
                if (youtubePlayer && typeof youtubePlayer.playVideo === 'function') {
                    if (isPlayingBeat) youtubePlayer.seekTo(0)
                    youtubePlayer.playVideo()
                    setIsPlayingBeat(true)

                    // 4. Pre-Roll Loop
                    const checkPreRoll = () => {
                        const currentTime = youtubePlayer.getCurrentTime()

                        if (currentTime >= 2.0) { // 2 Seconds Pre-Roll
                            console.log('🎤 Pre-Roll Complete! Starting Recording...')
                            startRecording().then(() => {
                                setIsPreRolling(false)
                            })
                            // Stop Loop
                            if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)
                        } else {
                            preRollCheckRef.current = requestAnimationFrame(checkPreRoll)
                        }
                    }

                    preRollCheckRef.current = requestAnimationFrame(checkPreRoll)

                } else {
                    alert('נגן הביט לא מוכן')
                    setIsPreRolling(false)
                }
            } catch (e) {
                console.error('Error starting flow:', e)
                alert('Error accessing mic or logic')
            }
        }
    }



    const handleBeatChange = (e: React.FormEvent) => {
        e.preventDefault()
        // Simple parser for YouTube URL or ID
        let id = beatInput
        if (id.includes('v=')) {
            id = id.split('v=')[1].split('&')[0]
        } else if (id.includes('youtu.be/')) {
            id = id.split('youtu.be/')[1]
        }
        setVideoId(id)
        setBeatInput('')
    }

    // Volume Control using Wheel on the beat card logic? Or just slider.
    // Let's add a simple slider for now.

    return (
        <div className="pb-24 min-h-screen flex flex-col relative overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#121212]">
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-base font-bold">פריסטייל</h1>
                <button className="w-10 h-10 rounded-full flex items-center justify-center text-subdued hover:text-white transition-colors">
                    <MoreHorizontal size={24} />
                </button>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center py-4">
                {/* Beat Player Visible */}
                <div className="w-full max-w-sm px-4 mb-4">
                    <BeatPlayer
                        videoId={videoId}
                        isPlaying={isPlayingBeat}
                        volume={beatVolume}
                        onReady={(player) => setYoutubePlayer(player)}
                    />
                </div>

                {/* Controls */}
                <RecordingControls
                    isRecording={isRecording}
                    isWaiting={isPreRolling}
                    duration={duration}
                    onToggleRecording={handleToggleRecording}
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
                    <button className="spotify-chip gap-1 pl-2">
                        <Plus size={16} />
                        הוסף
                    </button>
                </div>
                <div className="space-y-3 opacity-50">
                    <p className="text-sm text-center text-subdued">המילים יופיעו כאן...</p>
                </div>
            </section>
        </div>
    )
}
