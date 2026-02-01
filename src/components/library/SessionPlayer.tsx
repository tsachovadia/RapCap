import { useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube'
import { ChevronLeft, ChevronRight, Download, Copy, Check } from 'lucide-react'
import MomentsList from './MomentsList'
import WaveformTrack from './WaveformTrack'
import LyricsDisplay from './LyricsDisplay'
import { ysFixWebmDuration } from '../../services/webmFix'

interface SessionPlayerProps {
    session: {
        blob?: Blob
        beatId?: string
        duration: number
        syncOffset?: number
        metadata?: any
    }
    isPlaying: boolean
    onEnded: () => void
    onLoadingChange?: (isLoading: boolean) => void
}

// Module-level blob URL cache to survive component remounts (e.g., StrictMode)
const blobUrlCache: Record<string, string> = {}
// Module-level decode context to avoid exceeding AudioContext limit
let decodeCtx: AudioContext | null = null;

export default function SessionPlayer({ session, isPlaying, onEnded, onLoadingChange }: SessionPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const youtubeRef = useRef<any>(null)

    // State
    const [currentTime, setCurrentTime] = useState(0)

    // Waveform State
    const [audioPeaks, setAudioPeaks] = useState<number[]>([])
    const [isProcessingAudio, setIsProcessingAudio] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)

    // Sync State
    const [syncOffset, setSyncOffset] = useState(session.syncOffset || 0) // in ms
    const [isDraggingSync, setIsDraggingSync] = useState(false)
    const dragStartX = useRef<number>(0)
    const dragStartOffset = useRef<number>(0)
    const trackRef = useRef<HTMLDivElement>(null)
    const lastSourceKeyRef = useRef<string>('')
    const bufferingTimeoutRef = useRef<any>(null)

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
            console.log("🔊 New audio source key:", currentKey);

            // For blobs, use or create cached URL
            if (blob) {
                if (!blobUrlCache[sessionId]) {
                    blobUrlCache[sessionId] = URL.createObjectURL(blob)
                    console.log("📦 Created and cached blob URL for session:", sessionId);
                }
                activeUrl = blobUrlCache[sessionId]
            } else {
                activeUrl = cloudUrl || ''
            }

            lastSourceKeyRef.current = currentKey
        } else {
            // Reuse existing URL
            activeUrl = blob ? (blobUrlCache[sessionId] || '') : (cloudUrl || '')
        }

        // Always ensure the audio element has the correct source
        if (audioRef.current && activeUrl) {
            const currentSrc = audioRef.current.src
            if (currentSrc !== activeUrl && !currentSrc.includes(activeUrl)) {
                console.log("🔊 Syncing audio element source:", activeUrl);
                audioRef.current.src = activeUrl;
                if (isNewSource) {
                    setIsBuffering(true);
                    onLoadingChange?.(true);
                    audioRef.current.load();
                }
            }
        }

        // Only decode waveform if it's a new source OR we don't have peaks yet
        if (isNewSource || audioPeaks.length === 0) {
            const decodeAudio = async () => {
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

                    if (arrayBuffer.byteLength === 0) {
                        throw new Error("Empty ArrayBuffer. Data might be corrupted.");
                    }

                    if (!decodeCtx || decodeCtx.state === 'closed') {
                        decodeCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
                    }

                    let audioBuffer: AudioBuffer
                    try {
                        audioBuffer = await decodeCtx.decodeAudioData(arrayBuffer.slice(0))
                    } catch (initialError) {
                        console.warn("⚠️ Initial Decode Failed. Attempting WebM Duration Fix...", initialError)

                        // Retry with Fix
                        if (sourceBlob && session.duration && sourceBlob.type.includes('webm')) {
                            try {
                                const fixedBlob = await ysFixWebmDuration(sourceBlob, session.duration * 1000, true)
                                const fixedBuffer = await fixedBlob.arrayBuffer()
                                audioBuffer = await decodeCtx.decodeAudioData(fixedBuffer)
                                console.log("✅ WebM Fix Successful for Waveform!")
                            } catch (fixErr) {
                                console.error("❌ Waveform Fix Failed:", fixErr)
                                throw fixErr // Re-throw to hit outer catch
                            }
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
                    const normalized = peaks.map(p => p / max)
                    setAudioPeaks(normalized)
                } catch (e) {
                    console.warn("⚠️ Audio Waveform Decode Failed:", {
                        error: e,
                        blobSize: blob?.size,
                        cloudUrl: !!cloudUrl
                    })
                    // Fallback to flat line instead of breaking the player
                    setAudioPeaks(new Array(200).fill(0.1))
                } finally {
                    setIsProcessingAudio(false)
                }
            }
            decodeAudio()
        }

        return () => {
            // Cleanup handled by module-level cache
        }
    }, [session.blob, session.metadata?.cloudUrl, (session as any).id, onLoadingChange, audioPeaks.length])

    // Final Cleanup on Unmount
    useEffect(() => {
        return () => {
            if (bufferingTimeoutRef.current) {
                clearTimeout(bufferingTimeoutRef.current);
            }
        }
    }, [])

    // Monitor Audio Events (Loading, Errors, Buffering)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const startLoading = () => {
            console.log("⏳ Audio Load Start");
            setIsBuffering(true);
            onLoadingChange?.(true);
        };
        const stopLoading = (e: string) => {
            console.log(`✅ Audio Load Stop (${e}), readyState: ${audio.readyState}`);
            if (bufferingTimeoutRef.current) {
                clearTimeout(bufferingTimeoutRef.current);
                bufferingTimeoutRef.current = null;
            }
            setIsBuffering(false);
            onLoadingChange?.(false);
        };
        const handleWaiting = () => {
            if (audio.readyState < 3) {
                console.log(`⏳ Audio Waiting (readyState: ${audio.readyState})`);
                if (!bufferingTimeoutRef.current) {
                    bufferingTimeoutRef.current = setTimeout(() => {
                        setIsBuffering(true);
                        onLoadingChange?.(true);
                    }, 300);
                }
            } else {
                console.log(`⏭️ Ignoring stall event (readyState: ${audio.readyState} - sufficient data)`);
            }
        };
        const handleError = () => {
            console.error("❌ Audio Element Error:", audio.error);
            setIsBuffering(false);
            onLoadingChange?.(false);
            if (audio.error?.code === 4) {
                console.warn("⚠️ Likely a CORS or Source error. Checking cloudUrl...");
            }
        };

        audio.addEventListener('loadstart', startLoading);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('canplay', () => stopLoading('canplay'));
        audio.addEventListener('playing', () => stopLoading('playing'));
        audio.addEventListener('stalled', handleWaiting);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('loadstart', startLoading);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('canplay', () => stopLoading('canplay'));
            audio.removeEventListener('playing', () => stopLoading('playing'));
            audio.removeEventListener('stalled', handleWaiting);
            audio.removeEventListener('error', handleError);
        }
    }, [onLoadingChange]);

    if (!session.blob && !session.metadata?.cloudUrl) return null

    // Volume State
    const [vocalVolume, setVocalVolume] = useState(1.0)
    const [beatVolume, setBeatVolume] = useState(100)

    // Apply Volume Changes
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = vocalVolume
    }, [vocalVolume])

    useEffect(() => {
        if (youtubeRef.current && typeof youtubeRef.current.setVolume === 'function') {
            youtubeRef.current.setVolume(beatVolume)
        }
    }, [beatVolume])

    // --- Master Clock & Sync Loop ---
    useEffect(() => {
        let animationFrame: number

        const loop = () => {
            animationFrame = requestAnimationFrame(loop)

            if (isPlaying && youtubeRef.current && typeof youtubeRef.current.getCurrentTime === 'function') {
                const ytTime = youtubeRef.current.getCurrentTime()
                setCurrentTime(ytTime)

                const offsetSeconds = syncOffset / 1000
                const targetAudioTime = ytTime - offsetSeconds
                const audio = audioRef.current

                if (audio) {
                    if (targetAudioTime < 0) {
                        if (!audio.paused) {
                            audio.pause()
                            audio.currentTime = 0
                        }
                    } else if (targetAudioTime >= audio.duration) {
                        if (!audio.paused) audio.pause()
                    } else {
                        if (audio.readyState < 2) {
                            return;
                        }

                        if (audio.paused) {
                            audio.currentTime = targetAudioTime
                            audio.play().catch(err => {
                                console.warn("Audio play blocked/failed:", err.message);
                            });
                        } else {
                            if (Math.abs(audio.currentTime - targetAudioTime) > 0.15) {
                                audio.currentTime = targetAudioTime
                            }
                        }
                    }
                }
            } else if (isPlaying && !session.beatId && audioRef.current) {
                setCurrentTime(audioRef.current.currentTime)
            }
        }

        if (isPlaying) {
            // Start playback when isPlaying becomes true
            if (session.beatId && youtubeRef.current) {
                youtubeRef.current.playVideo()
            } else if (!session.beatId && audioRef.current) {
                // For sessions without a beat, play audio directly
                audioRef.current.play().catch(err => {
                    console.warn("Audio play blocked/failed:", err.message)
                })
            }
            loop()
        } else {
            audioRef.current?.pause()
            youtubeRef.current?.pauseVideo()
        }

        return () => cancelAnimationFrame(animationFrame)
    }, [isPlaying, syncOffset, session.beatId])

    // --- Drag Logic ---
    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDraggingSync(true)
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        dragStartX.current = clientX
        dragStartOffset.current = syncOffset
    }

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDraggingSync || !trackRef.current) return

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
        const deltaPixels = clientX - dragStartX.current

        const containerWidth = trackRef.current.offsetWidth
        const msPerPixel = (session.duration * 1000) / containerWidth
        const deltaMs = deltaPixels * msPerPixel

        setSyncOffset(dragStartOffset.current + deltaMs)
    }

    const handleDragEnd = () => {
        setIsDraggingSync(false)
        console.log('Saved Offset:', syncOffset)
    }

    useEffect(() => {
        if (isDraggingSync) {
            window.addEventListener('mousemove', handleDragMove)
            window.addEventListener('touchmove', handleDragMove)
            window.addEventListener('mouseup', handleDragEnd)
            window.addEventListener('touchend', handleDragEnd)
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('touchmove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
            window.removeEventListener('touchend', handleDragEnd)
        }
    }, [isDraggingSync, session.duration])

    const handleTimelineClick = (e: React.MouseEvent) => {
        if (isDraggingSync) return

        const rect = e.currentTarget.getBoundingClientRect()
        const clickX = e.clientX - rect.left
        const percent = clickX / rect.width
        const targetTime = percent * session.duration

        if (youtubeRef.current) youtubeRef.current.seekTo(targetTime)
        if (audioRef.current) audioRef.current.currentTime = Math.max(0, targetTime - syncOffset / 1000)
    }

    const [includeTimestamps, setIncludeTimestamps] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

    const handleCopyLyrics = () => {
        let text = ''
        const segments = session.metadata?.lyricsSegments
        const rawLyrics = session.metadata?.lyrics

        if (includeTimestamps && segments && Array.isArray(segments)) {
            text = segments.map((s: any) => {
                const time = formatTime(s.timestamp)
                return `[${time}] ${s.text}`
            }).join('\n')
        } else {
            text = rawLyrics || ''
        }

        if (text) {
            navigator.clipboard.writeText(text)
            setIsCopied(true)
            setTimeout(() => setIsCopied(false), 2000)
        }
    }

    const handleDownload = () => {
        if (!session.blob) return
        const url = URL.createObjectURL(session.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `recording-${new Date().toISOString()}.mp3`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const rawMoments = session.metadata?.moments || [];
    const moments = rawMoments.map((m: any, idx: number) => {
        if (typeof m === 'object' && m !== null) {
            return {
                id: m.id || `moment-${idx}`,
                timestamp: m.timestamp || 0,
                label: m.label || `Moment ${idx + 1}`
            };
        }
        return {
            id: `moment-${idx}`,
            timestamp: Number(m) || 0,
            label: `Moment ${idx + 1}`
        };
    });

    return (
        <div className="flex flex-col w-full gap-4 bg-[#181818] p-4 rounded-xl border border-[#282828] select-none">
            <audio ref={audioRef} onEnded={onEnded} crossOrigin="anonymous" />

            <div className="flex items-center justify-between text-xs text-subdued font-bold tracking-wider mb-2">
                <div className="flex items-center gap-2">
                    <span>{formatTime(currentTime)}</span>
                    {isBuffering && (
                        <div className="flex items-center gap-1 text-[#1DB954] animate-pulse">
                            <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0s' }} />
                            <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-1 h-1 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.4s' }} />
                            <span className="text-[10px] uppercase">Buffering...</span>
                        </div>
                    )}
                </div>
                <span className="text-[#1DB954]">
                    Sync: {Math.round(syncOffset)}ms
                </span>
                <span>{formatTime(session.duration)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-[#121212] p-2 rounded mb-2">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-subdued font-bold">Vocals</label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={vocalVolume}
                        onChange={(e) => setVocalVolume(parseFloat(e.target.value))}
                        className="accent-[#1DB954] h-1 bg-[#282828] rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase text-subdued font-bold">Beat</label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={beatVolume}
                        onChange={(e) => setBeatVolume(parseInt(e.target.value))}
                        className="accent-purple-500 h-1 bg-[#282828] rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>

            <div
                ref={trackRef}
                className="relative w-full h-40 bg-[#121212] rounded-lg overflow-hidden border border-[#282828] cursor-crosshair"
                onClick={handleTimelineClick}
            >
                <div className="absolute top-0 w-full h-1/2 border-b border-[#282828] bg-black/40">
                    <span className="absolute top-1 left-2 text-[10px] text-subdued pointer-events-none">BEAT</span>
                    <div
                        className="absolute inset-y-0 left-0 bg-white/5 pointer-events-none"
                        style={{ width: `${(currentTime / session.duration) * 100}%` }}
                    />
                </div>

                <div
                    className="absolute bottom-0 h-1/2 flex items-center transition-transform hover:bg-[#282828]/50"
                    style={{
                        width: '100%',
                        cursor: isDraggingSync ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e) }}
                    onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e) }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <span className="absolute top-1 left-2 text-[10px] text-[#1DB954] pointer-events-none z-10">VOCALS</span>
                    <div className="absolute left-0 inset-y-0 w-1 bg-[#1DB954] z-20 shadow-[0_0_10px_#1DB954]" />
                    <div className="w-full h-full opacity-80 pl-1">
                        {isProcessingAudio ? (
                            <div className="w-full h-full flex items-center justify-center text-xs text-subdued">Analyzing...</div>
                        ) : (
                            <WaveformTrack peaks={audioPeaks} color="#535353" height={60} progress={(currentTime - (syncOffset / 1000)) / session.duration * 100} />
                        )}
                    </div>
                </div>

                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    style={{ left: `${(currentTime / session.duration) * 100}%` }}
                />

                {moments.map((m: any, i: number) => (
                    <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-yellow-500/50 pointer-events-none z-0"
                        style={{ left: `${(m.timestamp / session.duration) * 100}%` }}
                    >
                        <div className="absolute bottom-1 w-2 h-2 rounded-full bg-yellow-500 -translate-x-1/2" />
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mt-2">
                <div className="flex gap-2">
                    <button onClick={() => setSyncOffset(s => s - 50)} className="btn-secondary text-xs py-1 px-3 h-8">
                        <ChevronLeft size={14} /> -50ms
                    </button>
                    <button onClick={() => setSyncOffset(s => s + 50)} className="btn-secondary text-xs py-1 px-3 h-8">
                        +50ms <ChevronRight size={14} />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#282828] hover:bg-white/10 text-xs font-bold transition-colors"
                        title="Download Audio"
                    >
                        <Download size={14} />
                        MP3
                    </button>
                </div>
            </div>

            <div className="hidden">
                {session.beatId && (
                    <YouTube
                        videoId={session.beatId}
                        onReady={(e) => youtubeRef.current = e.target}
                        opts={{ height: '0', width: '0', playerVars: { playsinline: 1, controls: 0 } }}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-right" dir="rtl">
                <div className="h-[300px] flex flex-col">
                    <div className="flex items-center justify-between mb-2 pl-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${includeTimestamps ? 'bg-[#1DB954] border-[#1DB954]' : 'border-subdued'}`}>
                                {includeTimestamps && <div className="w-2 h-2 bg-black rounded-full" />}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={includeTimestamps}
                                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                            />
                            <span className="text-xs text-subdued">עם זמנים</span>
                        </label>
                        <button
                            onClick={handleCopyLyrics}
                            className={`flex items-center gap-1 text-xs transition-colors ${isCopied ? 'text-green-500' : 'text-subdued hover:text-[#1DB954]'}`}
                        >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            {isCopied ? 'הועתק ללוח!' : 'העתק מילים'}
                        </button>
                    </div>
                    <LyricsDisplay
                        lyrics={session.metadata?.lyrics}
                        segments={session.metadata?.lyricsSegments}
                        onSeek={(t: number) => {
                            if (youtubeRef.current) youtubeRef.current.seekTo(t)
                            if (audioRef.current) audioRef.current.currentTime = Math.max(0, t - syncOffset / 1000)
                        }}
                        currentTime={currentTime}
                    />
                </div>

                <div>
                    <MomentsList moments={moments} onSeek={(t: number) => youtubeRef.current?.seekTo(t)} />
                </div>
            </div>
        </div>
    )
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
