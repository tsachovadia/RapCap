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
import { db, type DbSession } from '../../db/db'
import { syncService } from '../../services/dbSync'
import { useAuth } from '../../contexts/AuthContext'
import { Music, Download } from 'lucide-react'
import {
    beatTimeFromVocal,
    chooseDriftCorrection,
    hasPlaybackReachedEnd,
    normalizePlaybackStart,
    vocalTimeFromBeat,
} from '../../core/timeline'
import { createSessionManifest, safeFileStem, vocalFileName } from '../../core/sessionManifest'
import { sessionRepo } from '../../db/sessionRepo'

interface SessionPlayerProps {
    session: DbSession
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
    const isTransitioningRef = useRef<boolean>(false)
    const endedNotifiedRef = useRef(false)

    // State
    const [currentTime, setCurrentTime] = useState(0)
    const [vocalVolume, setVocalVolume] = useState(1.0)
    const [beatVolume, setBeatVolume] = useState(50)
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

    const finishPlayback = useCallback(() => {
        const audio = audioRef.current
        if (audio) {
            audio.pause()
            audio.playbackRate = 1
            if (Number.isFinite(session.duration) && session.duration > 0) {
                audio.currentTime = Math.min(session.duration, audio.duration || session.duration)
            }
        }
        youtubeRef.current?.pauseVideo?.()
        setCurrentTime(session.duration)
        onTimeUpdate?.(session.duration)

        if (!endedNotifiedRef.current) {
            endedNotifiedRef.current = true
            onEnded()
        }
    }, [onEnded, onTimeUpdate, session.duration])

    const handleTogglePlayback = useCallback(() => {
        const audio = audioRef.current

        if (isPlaying) {
            audio?.pause()
            youtubeRef.current?.pauseVideo?.()
            onPlayPause()
            return
        }

        endedNotifiedRef.current = false
        const vocalStartSec = normalizePlaybackStart(audio?.currentTime || 0, session.duration)
        if (audio) {
            audio.currentTime = vocalStartSec
            audio.playbackRate = 1
            // Keep this inside the tap so iOS allows the vocal channel to play.
            void audio.play().catch(() => { })
        }

        if (session.beatId && youtubeRef.current) {
            const beatStartSec = beatTimeFromVocal(
                vocalStartSec,
                session.beatStartTime || 0,
                syncOffset / 1000,
            )
            youtubeRef.current.seekTo(beatStartSec, true)
            youtubeRef.current.setVolume(beatVolume)
            // Keep this inside the same tap for mobile YouTube playback.
            youtubeRef.current.playVideo()
        }

        setCurrentTime(vocalStartSec)
        onPlayPause()
    }, [beatVolume, isPlaying, onPlayPause, session.beatId, session.beatStartTime, session.duration, syncOffset])

    // Master Clock & Sync
    useEffect(() => {
        let animationFrame: number
        const beatStartTimeSec = session.beatStartTime || 0
        const syncOffsetSec = syncOffset / 1000

        const loop = () => {
            animationFrame = requestAnimationFrame(loop)

            if (isPlaying && youtubeRef.current?.getCurrentTime) {
                const beatTimeSec = youtubeRef.current.getCurrentTime()
                const targetAudioTime = vocalTimeFromBeat({
                    beatTimeSec,
                    beatStartTimeSec,
                    syncOffsetSec,
                })
                const audio = audioRef.current

                setCurrentTime(targetAudioTime)
                onTimeUpdate?.(targetAudioTime)

                if (audio) {
                    if (hasPlaybackReachedEnd(targetAudioTime, session.duration)) {
                        isTransitioningRef.current = false
                        finishPlayback()
                        return
                    } else {
                        if (audio.readyState < 2) return

                        if (audio.paused && !audio.seeking && !isTransitioningRef.current) {
                            audio.currentTime = targetAudioTime
                            audio.playbackRate = 1
                            isTransitioningRef.current = true
                            audio.play().then(() => {
                                isTransitioningRef.current = false
                            }).catch(() => {
                                isTransitioningRef.current = false
                            })
                        } else if (!audio.seeking) {
                            const correction = chooseDriftCorrection(targetAudioTime, audio.currentTime)
                            audio.playbackRate = correction.playbackRate
                            if (correction.kind === 'seek' && correction.targetTimeSec !== undefined) {
                                audio.currentTime = correction.targetTimeSec
                            }
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
            endedNotifiedRef.current = false
            if (session.beatId && youtubeRef.current) {
                const vocalStartSec = normalizePlaybackStart(
                    audioRef.current?.currentTime || 0,
                    session.duration,
                )
                if (audioRef.current) audioRef.current.currentTime = vocalStartSec
                const beatStartSec = beatTimeFromVocal(vocalStartSec, beatStartTimeSec, syncOffsetSec)
                youtubeRef.current.seekTo(beatStartSec, true)
                youtubeRef.current.setVolume(beatVolume)
                youtubeRef.current.playVideo()
            } else if (!session.beatId && audioRef.current) {
                audioRef.current.currentTime = normalizePlaybackStart(
                    audioRef.current.currentTime,
                    session.duration,
                )
                audioRef.current.play().catch(() => { })
            }
            loop()
        } else {
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.playbackRate = 1
            }
            youtubeRef.current?.pauseVideo()
        }

        return () => cancelAnimationFrame(animationFrame)
    }, [beatVolume, finishPlayback, isPlaying, onTimeUpdate, session.beatId, session.beatStartTime, session.duration, syncOffset])

    const handleSeek = useCallback((time: number) => {
        const nextTime = Math.min(session.duration, Math.max(0, time))
        const beatTimeSec = beatTimeFromVocal(nextTime, session.beatStartTime || 0, syncOffset / 1000)
        if (youtubeRef.current) youtubeRef.current.seekTo(beatTimeSec, true)
        if (audioRef.current) {
            audioRef.current.currentTime = nextTime
            audioRef.current.playbackRate = 1
        }
        endedNotifiedRef.current = false
        setCurrentTime(nextTime)
    }, [session.beatStartTime, session.duration, syncOffset])

    const handleSyncChange = useCallback((nextOffset: number) => {
        setSyncOffset(nextOffset)
        if (session.id) {
            void sessionRepo.update(session.id, {
                syncOffset: nextOffset,
            })
        }
    }, [session.id])

    const handleDownload = useCallback(async () => {
        const cloudUrl = session.metadata?.cloudUrl
        const blob = session.blob

        if (!blob && !cloudUrl) return

        try {
            let downloadBlob: Blob

            if (blob) {
                // Use local blob directly
                downloadBlob = blob
            } else if (cloudUrl) {
                // Fetch from Firebase Storage
                const response = await fetch(cloudUrl)
                downloadBlob = await response.blob()
            } else {
                return
            }

            const url = URL.createObjectURL(downloadBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = vocalFileName(session.title, downloadBlob.type)
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Download failed:', err)
        }
    }, [session.blob, session.metadata?.cloudUrl, session.title])

    const handleDownloadManifest = useCallback(() => {
        const manifest = createSessionManifest(session)
        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${safeFileStem(session.title)}-session.json`
        document.body.appendChild(anchor)
        anchor.click()
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
    }, [session])

    const handleUpdateLyrics = useCallback(async (
        newLyrics: string,
        newSegments: Array<{ timestamp: number; text: string }>
    ) => {
        if (!session.id) return

        try {
            // Update in Dexie
            await db.sessions.update(session.id, {
                'metadata.lyrics': newLyrics,
                'metadata.lyricsSegments': newSegments,
                updatedAt: new Date()
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
            <audio ref={audioRef} onEnded={finishPlayback} crossOrigin="anonymous" />

            {/* Player Controls */}
            <PlayerControls
                isPlaying={isPlaying}
                isBuffering={isBuffering}
                currentTime={currentTime}
                duration={session.duration}
                onPlayPause={handleTogglePlayback}
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

            {/* Session exports */}
            {(session.blob || session.metadata?.cloudUrl) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-[#1DB954]/20 hover:bg-[#1DB954]/30 text-[#1DB954] rounded-lg transition-colors border border-[#1DB954]/30"
                    >
                        <Download size={18} />
                        <span className="font-medium">הורד ערוץ ווקאל</span>
                    </button>
                    <button
                        onClick={handleDownloadManifest}
                        className="flex items-center justify-center gap-2 w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
                    >
                        <Download size={18} />
                        <span className="font-medium">הורד פרטי סשן</span>
                    </button>
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
                    onSyncChange={handleSyncChange}
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

            {/* Visible beat player keeps the source understandable and debuggable. */}
            {session.beatId && (
                <div className="w-full aspect-video max-h-52 overflow-hidden rounded-lg border border-[#282828] bg-black">
                    <YouTube
                        videoId={session.beatId}
                        onReady={(e) => {
                            youtubeRef.current = e.target;
                            e.target.setVolume(beatVolume);
                            if (isPlaying) {
                                const vocalStartSec = normalizePlaybackStart(
                                    audioRef.current?.currentTime || 0,
                                    session.duration,
                                );
                                e.target.seekTo(beatTimeFromVocal(
                                    vocalStartSec,
                                    session.beatStartTime || 0,
                                    syncOffset / 1000,
                                ), true);
                                e.target.playVideo();
                            }
                        }}
                        className="w-full h-full"
                        opts={{ height: '100%', width: '100%', playerVars: { playsinline: 1, controls: 1 } }}
                    />
                </div>
            )}
        </div>
    )
}
