import { useEffect, useRef, useState, useCallback } from 'react'
import YouTube from 'react-youtube'
import PlayerControls from './PlayerControls'
import VolumeControls from './VolumeControls'
import SyncControls from './SyncControls'
import WaveformTrack from './WaveformTrack'
import LyricsPanel from './LyricsPanel'
import MomentsList from './MomentsList'
import PlaybackEffectsPanel from './PlaybackEffectsPanel'
import { usePlaybackEffects } from '../../hooks/usePlaybackEffects'
import { ysFixWebmDuration } from '../../services/webmFix'
import { getBeatName } from '../../data/beats'
import { db } from '../../db/db'
import { syncService } from '../../services/dbSync'
import { useAuth } from '../../contexts/AuthContext'
import { Music } from 'lucide-react'

interface SessionPlayerProps {
    session: {
        id?: number
        blob?: Blob
        beatId?: string
        duration: number
        syncOffset?: number
        metadata?: any
    }
    isPlaying: boolean
    onPlayPause: () => void
    onClose: () => void
    onEnded: () => void
    onTimeUpdate?: (time: number) => void
    onLoadingChange?: (isLoading: boolean) => void
}

// Module-level caches
const blobUrlCache: Record<string, string> = {}
let decodeCtx: AudioContext | null = null

export default function SessionPlayer({
    session,
    isPlaying,
    onPlayPause,
    onClose,
    onEnded,
    onTimeUpdate,
    onLoadingChange
}: SessionPlayerProps) {
    const { user } = useAuth()
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const youtubeRef = useRef<any>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const lastSourceKeyRef = useRef<string>('')
    const bufferingTimeoutRef = useRef<any>(null)
    const playbackStartTimeRef = useRef<number>(0)
    const hasStartedPlaybackRef = useRef<boolean>(false)

    // State
    const [currentTime, setCurrentTime] = useState(0)
    const [vocalVolume, setVocalVolume] = useState(1.0)
    const [beatVolume, setBeatVolume] = useState(100)
    const [syncOffset, setSyncOffset] = useState(session.syncOffset || 0)
    const [audioPeaks, setAudioPeaks] = useState<number[]>([])
    const [isProcessingAudio, setIsProcessingAudio] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)

    // Playback Effects Hook
    const {
        effects,
        updateEffect,
        toggleEnabled,
        resetEffects,
        connect: connectEffects
    } = usePlaybackEffects(audioRef.current)

    // Setup Audio & Decode Peaks
    useEffect(() => {
        const cloudUrl = session.metadata?.cloudUrl
        const blob = session.blob
        if (!blob && !cloudUrl) return

        const sessionId = (session as any).id
        const currentKey = cloudUrl || (blob ? `blob-${sessionId}` : '')
        const isNewSource = currentKey !== lastSourceKeyRef.current

        let activeUrl = ''
        if (isNewSource) {
            if (blob) {
                if (!blobUrlCache[sessionId]) {
                    blobUrlCache[sessionId] = URL.createObjectURL(blob)
                }
                activeUrl = blobUrlCache[sessionId]
            } else {
                activeUrl = cloudUrl || ''
            }
            lastSourceKeyRef.current = currentKey
        } else {
            activeUrl = blob ? (blobUrlCache[sessionId] || '') : (cloudUrl || '')
        }

        if (audioRef.current && activeUrl) {
            const currentSrc = audioRef.current.src
            if (currentSrc !== activeUrl && !currentSrc.includes(activeUrl)) {
                audioRef.current.src = activeUrl
                if (isNewSource) {
                    setIsBuffering(true)
                    onLoadingChange?.(true)
                    audioRef.current.load()
                }
            }
        }

        // Decode waveform
        if (isNewSource || audioPeaks.length === 0) {
            decodeAudioWaveform(blob, cloudUrl, session.duration)
        }
    }, [session.blob, session.metadata?.cloudUrl, (session as any).id])

    const decodeAudioWaveform = async (blob?: Blob, cloudUrl?: string, duration?: number) => {
        setIsProcessingAudio(true)
        try {
            let arrayBuffer: ArrayBuffer
            let sourceBlob: Blob | null = blob || null

            if (blob) {
                arrayBuffer = await blob.arrayBuffer()
            } else if (cloudUrl) {
                const response = await fetch(cloudUrl)
                sourceBlob = await response.blob()
                arrayBuffer = await sourceBlob.arrayBuffer()
            } else {
                return
            }

            if (arrayBuffer.byteLength === 0) throw new Error("Empty ArrayBuffer")

            if (!decodeCtx || decodeCtx.state === 'closed') {
                decodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
            }

            let audioBuffer: AudioBuffer
            try {
                audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
            } catch (initialError) {
                if (sourceBlob && duration && sourceBlob.type.includes('webm')) {
                    const fixedBlob = await ysFixWebmDuration(sourceBlob, duration * 1000, true)
                    const fixedBuffer = await fixedBlob.arrayBuffer()
                    audioBuffer = await decodeCtx.decodeAudioData(fixedBuffer)
                } else {
                    throw initialError
                }
            }

            const rawData = audioBuffer.getChannelData(0)
            const samples = 200
            const blockSize = Math.floor(rawData.length / samples)
            const peaks = []

            for (let i = 0; i < samples; i++) {
                const start = i * blockSize
                let sum = 0
                const stride = Math.floor(blockSize / 50) || 1
                let count = 0
                for (let j = 0; j < blockSize; j += stride) {
                    sum += Math.abs(rawData[start + j])
                    count++
                }
                peaks.push(sum / count)
            }

            const max = Math.max(...peaks)
            setAudioPeaks(peaks.map(p => p / max))
        } catch (e) {
            console.warn("⚠️ Audio Waveform Decode Failed:", e)
            setAudioPeaks(new Array(200).fill(0.1))
        } finally {
            setIsProcessingAudio(false)
        }
    }

    // Audio events
    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return

        const startLoading = () => {
            setIsBuffering(true)
            onLoadingChange?.(true)
        }
        const stopLoading = () => {
            if (bufferingTimeoutRef.current) {
                clearTimeout(bufferingTimeoutRef.current)
                bufferingTimeoutRef.current = null
            }
            setIsBuffering(false)
            onLoadingChange?.(false)
        }
        const handleWaiting = () => {
            if (audio.readyState < 3 && !bufferingTimeoutRef.current) {
                bufferingTimeoutRef.current = setTimeout(() => {
                    setIsBuffering(true)
                    onLoadingChange?.(true)
                }, 300)
            }
        }

        audio.addEventListener('loadstart', startLoading)
        audio.addEventListener('waiting', handleWaiting)
        audio.addEventListener('canplay', stopLoading)
        audio.addEventListener('playing', stopLoading)
        audio.addEventListener('stalled', handleWaiting)

        return () => {
            audio.removeEventListener('loadstart', startLoading)
            audio.removeEventListener('waiting', handleWaiting)
            audio.removeEventListener('canplay', stopLoading)
            audio.removeEventListener('playing', stopLoading)
            audio.removeEventListener('stalled', handleWaiting)
        }
    }, [onLoadingChange])

    // Cleanup
    useEffect(() => {
        return () => {
            if (bufferingTimeoutRef.current) clearTimeout(bufferingTimeoutRef.current)
        }
    }, [])

    // Volume changes
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = vocalVolume
    }, [vocalVolume])

    useEffect(() => {
        if (youtubeRef.current?.setVolume) youtubeRef.current.setVolume(beatVolume)
    }, [beatVolume])

    // Connect playback effects when isPlaying becomes true
    useEffect(() => {
        if (isPlaying && audioRef.current) {
            connectEffects()
        }
    }, [isPlaying, connectEffects])

    // Master Clock & Sync
    useEffect(() => {
        let animationFrame: number

        const loop = () => {
            animationFrame = requestAnimationFrame(loop)

            if (isPlaying && youtubeRef.current?.getCurrentTime) {
                const ytTime = youtubeRef.current.getCurrentTime()
                setCurrentTime(ytTime)
                onTimeUpdate?.(ytTime)

                const offsetSeconds = syncOffset / 1000
                const targetAudioTime = ytTime - offsetSeconds
                const audio = audioRef.current

                if (audio) {
                    // Grace period: don't aggressively correct in first 500ms of playback
                    const timeSinceStart = Date.now() - playbackStartTimeRef.current
                    const isInGracePeriod = timeSinceStart < 500

                    if (targetAudioTime < 0) {
                        // Only pause if not in grace period - prevents initial loop
                        if (!audio.paused && !isInGracePeriod) {
                            audio.pause()
                        }
                    } else if (targetAudioTime >= audio.duration) {
                        if (!audio.paused) audio.pause()
                    } else {
                        if (audio.readyState < 2) return

                        if (audio.paused) {
                            audio.currentTime = targetAudioTime
                            audio.play().catch(() => { })
                        } else if (!isInGracePeriod && Math.abs(audio.currentTime - targetAudioTime) > 0.15) {
                            // Only do aggressive sync corrections after grace period
                            audio.currentTime = targetAudioTime
                        }
                    }
                }
            } else if (isPlaying && !session.beatId && audioRef.current) {
                const time = audioRef.current.currentTime
                setCurrentTime(time)
                onTimeUpdate?.(time)
            }
        }

        if (isPlaying) {
            playbackStartTimeRef.current = Date.now()
            hasStartedPlaybackRef.current = false

            if (session.beatId && youtubeRef.current) {
                youtubeRef.current.playVideo()
            } else if (!session.beatId && audioRef.current) {
                // Reset to beginning on first play if near start
                if (audioRef.current.currentTime < 0.5) {
                    audioRef.current.currentTime = 0
                }
                hasStartedPlaybackRef.current = true
                audioRef.current.play().catch(() => { })
            }
            loop()
        } else {
            hasStartedPlaybackRef.current = false
            audioRef.current?.pause()
            youtubeRef.current?.pauseVideo()
        }

        return () => cancelAnimationFrame(animationFrame)
    }, [isPlaying, syncOffset, session.beatId, onTimeUpdate])

    const handleSeek = useCallback((time: number) => {
        if (youtubeRef.current) youtubeRef.current.seekTo(time)
        if (audioRef.current) audioRef.current.currentTime = Math.max(0, time - syncOffset / 1000)
        setCurrentTime(time)
    }, [syncOffset])

    const handleDownload = useCallback(() => {
        if (!session.blob) return
        const url = URL.createObjectURL(session.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `recording-${new Date().toISOString()}.mp3`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [session.blob])

    const handleUpdateLyrics = useCallback(async (
        newLyrics: string,
        newSegments: Array<{ timestamp: number; text: string }>
    ) => {
        if (!session.id) return

        try {
            // Update in Dexie
            await db.sessions.update(session.id, {
                'metadata.lyrics': newLyrics,
                'metadata.lyricsSegments': newSegments
            })

            // Trigger sync if user is logged in
            if (user?.uid) {
                try {
                    await syncService.syncSessions(user.uid)
                } catch (syncErr) {
                    console.warn('Sync failed after lyrics update:', syncErr)
                }
            }
        } catch (err) {
            console.error('Failed to update lyrics:', err)
        }
    }, [session.id])

    const handleTimelineClick = useCallback((e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const percent = (e.clientX - rect.left) / rect.width
        handleSeek(percent * session.duration)
    }, [session.duration, handleSeek])

    const moments = (session.metadata?.moments || []).map((m: any, idx: number) => ({
        id: m.id || `moment-${idx}`,
        timestamp: m.timestamp || (typeof m === 'number' ? m : 0),
        label: m.label || `Moment ${idx + 1}`
    }))

    if (!session.blob && !session.metadata?.cloudUrl) return null

    return (
        <div className="flex flex-col w-full gap-4 bg-[#181818] p-4 rounded-xl border border-[#282828]">
            <audio ref={audioRef} onEnded={onEnded} crossOrigin="anonymous" />

            {/* Player Controls */}
            <PlayerControls
                isPlaying={isPlaying}
                isBuffering={isBuffering}
                currentTime={currentTime}
                duration={session.duration}
                onPlayPause={onPlayPause}
                onClose={onClose}
                onSeek={handleSeek}
            />

            {/* Beat Indicator */}
            {session.beatId && (
                <div className="flex items-center gap-2 bg-[#121212] px-3 py-2 rounded-lg">
                    <Music size={16} className="text-purple-500" />
                    <span className="text-sm text-white/80">
                        🎵 {getBeatName(session.beatId)}
                    </span>
                </div>
            )}

            {/* Volume Controls */}
            <VolumeControls
                vocalVolume={vocalVolume}
                beatVolume={beatVolume}
                onVocalVolumeChange={setVocalVolume}
                onBeatVolumeChange={setBeatVolume}
                hasBeat={!!session.beatId}
            />

            {/* Playback Effects Panel */}
            <PlaybackEffectsPanel
                effects={effects}
                onUpdateEffect={updateEffect}
                onToggleEnabled={toggleEnabled}
                onReset={resetEffects}
            />

            {/* Waveform */}
            <div
                ref={trackRef}
                className="relative w-full h-24 bg-[#121212] rounded-lg overflow-hidden border border-[#282828] cursor-pointer"
                onClick={handleTimelineClick}
            >
                {isProcessingAudio ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-subdued">
                        מנתח אודיו...
                    </div>
                ) : (
                    <WaveformTrack
                        peaks={audioPeaks}
                        color="#535353"
                        height={96}
                        progress={(currentTime / session.duration) * 100}
                    />
                )}

                {/* Playhead */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-[#1DB954] z-10 pointer-events-none shadow-[0_0_10px_#1DB954]"
                    style={{ left: `${(currentTime / session.duration) * 100}%` }}
                />

                {/* Moments markers */}
                {moments.map((m: any, i: number) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-yellow-500/50 pointer-events-none"
                        style={{ left: `${(m.timestamp / session.duration) * 100}%` }}
                    >
                        <div className="absolute bottom-1 w-2 h-2 rounded-full bg-yellow-500 -translate-x-1/2" />
                    </div>
                ))}
            </div>

            {/* Sync Controls (only if has beat) */}
            {session.beatId && (
                <SyncControls
                    syncOffset={syncOffset}
                    onSyncChange={setSyncOffset}
                />
            )}

            {/* Lyrics Panel */}
            <LyricsPanel
                lyrics={session.metadata?.lyrics}
                segments={session.metadata?.lyricsSegments}
                currentTime={currentTime}
                onSeek={handleSeek}
                onDownload={handleDownload}
                hasBlob={!!session.blob}
                onUpdateLyrics={handleUpdateLyrics}
            />

            {/* Moments (if any) */}
            {moments.length > 0 && (
                <MomentsList moments={moments} onSeek={handleSeek} />
            )}

            {/* Hidden YouTube Player */}
            {session.beatId && (
                <div className="hidden">
                    <YouTube
                        videoId={session.beatId}
                        onReady={(e) => youtubeRef.current = e.target}
                        opts={{ height: '0', width: '0', playerVars: { playsinline: 1, controls: 0 } }}
                    />
                </div>
            )}
        </div>
    )
}
