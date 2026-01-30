import { useEffect, useRef, useState } from 'react'
import YouTube from 'react-youtube'
import { ChevronLeft, ChevronRight, Download, Copy, Check } from 'lucide-react'
import MomentsList from './MomentsList'
import WaveformTrack from './WaveformTrack'
import LyricsDisplay from './LyricsDisplay'

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

    // Setup Audio & Decode Peaks
    useEffect(() => {
        if (!session.blob && !session.metadata?.cloudUrl) return

        const url = session.blob ? URL.createObjectURL(session.blob) : session.metadata.cloudUrl
        if (audioRef.current) {
            console.log("🔊 Setting audio source:", url);
            setIsBuffering(true);
            onLoadingChange?.(true);
            audioRef.current.src = url;
            audioRef.current.load(); // Force load
        }

        // Decode for Waveform
        const decodeAudio = async () => {
            setIsProcessingAudio(true)
            try {
                let arrayBuffer: ArrayBuffer
                if (session.blob) {
                    arrayBuffer = await session.blob.arrayBuffer()
                } else if (session.metadata?.cloudUrl) {
                    const response = await fetch(session.metadata.cloudUrl)
                    arrayBuffer = await response.arrayBuffer()
                } else {
                    return
                }

                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

                // Extract Peak Data
                const rawData = audioBuffer.getChannelData(0) // Left channel
                const samples = 200 // Desired resolution
                const blockSize = Math.floor(rawData.length / samples)
                const peaks = []

                for (let i = 0; i < samples; i++) {
                    const start = i * blockSize
                    let sum = 0
                    // Optimization: Skip samples to speed up large files
                    // Stride of 50-100 is visually indistinguishable for a UI waveform
                    const stride = Math.floor(blockSize / 50) || 1
                    let count = 0

                    for (let j = 0; j < blockSize; j += stride) {
                        sum += Math.abs(rawData[start + j])
                        count++
                    }
                    peaks.push(sum / count)
                }

                // Normalize
                const max = Math.max(...peaks)
                const normalized = peaks.map(p => p / max)
                setAudioPeaks(normalized)
            } catch (e) {
                console.error("Audio Decode Failed", e)
            } finally {
                setIsProcessingAudio(false)
            }
        }

        decodeAudio()

        return () => {
            if (session.blob) URL.revokeObjectURL(url)
        }
    }, [session.blob, session.metadata?.cloudUrl])

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
            setIsBuffering(false);
            onLoadingChange?.(false);
        };
        const handleWaiting = () => {
            console.log("⏳ Audio Waiting (Stalled)");
            setIsBuffering(true);
            onLoadingChange?.(true);
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

            // If playing, sync Audio to YouTube (Master)
            if (isPlaying && youtubeRef.current && typeof youtubeRef.current.getCurrentTime === 'function') {
                const ytTime = youtubeRef.current.getCurrentTime()
                setCurrentTime(ytTime)

                // Sync Logic
                // Audio Time = YT Time - (Offset / 1000)
                const offsetSeconds = syncOffset / 1000
                const targetAudioTime = ytTime - offsetSeconds
                const audio = audioRef.current

                if (audio) {
                    if (targetAudioTime < 0) {
                        // Wait for cue
                        if (!audio.paused) {
                            audio.pause()
                            audio.currentTime = 0
                        }
                    } else if (targetAudioTime >= audio.duration) {
                        // End of audio
                        if (!audio.paused) audio.pause()
                    } else {
                        // Should be playing
                        // Check if audio is ready
                        if (audio.readyState < 2) {
                            // Still loading data...
                            return;
                        }

                        if (audio.paused) {
                            audio.currentTime = targetAudioTime
                            audio.play().catch(err => {
                                console.warn("Audio play blocked/failed:", err.message);
                            });
                        } else {
                            // Drift Correction
                            if (Math.abs(audio.currentTime - targetAudioTime) > 0.15) { // Increased threshold slightly
                                audio.currentTime = targetAudioTime
                            }
                        }
                    }
                }
            } else if (isPlaying && !session.beatId && audioRef.current) {
                // Freestyle with NO Beat (Master = Audio)
                setCurrentTime(audioRef.current.currentTime)
            }
        }

        if (isPlaying) loop()
        else {
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

        // Convert Pixels to Time
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

    // Manual Seek
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

    // Fix for 0:00 Moments: Ensure generic moments have timestamps
    // Sometimes moments might be stored as just numbers (timestamps) or objects.
    // We normalize to the interface expected by MomentsList
    const rawMoments = session.metadata?.moments || [];
    const moments = rawMoments.map((m: any, idx: number) => {
        // If it's already an object with time/label, use it.
        // If it's just a number (legacy), wrap it.
        // If it comes from the recorder, check the structure.
        // Assuming user feedback "saved as 0:00" means the data might be 0 or formatting fails.
        // We'll trust the value if it exists, otherwise default.
        if (typeof m === 'object' && m !== null) {
            return { timestamp: m.timestamp || 0, label: m.label || `Moment ${idx + 1}` };
        }
        // Fallback for number or other types
        return { timestamp: Number(m) || 0, label: `Moment ${idx + 1}` };
    });

    return (
        <div className="flex flex-col w-full gap-4 bg-[#181818] p-4 rounded-xl border border-[#282828] select-none">
            <audio ref={audioRef} onEnded={onEnded} crossOrigin="anonymous" />

            {/* Header / Stats */}
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

            {/* Volume Controls */}
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

            {/* TIMELINE STUDIO CONTAINER */}
            <div
                ref={trackRef}
                className="relative w-full h-40 bg-[#121212] rounded-lg overflow-hidden border border-[#282828] cursor-crosshair"
                onClick={handleTimelineClick}
            >
                {/* 1. BEAT TRACK (Background Ref) */}
                <div className="absolute top-0 w-full h-1/2 border-b border-[#282828] bg-black/40">
                    <span className="absolute top-1 left-2 text-[10px] text-subdued pointer-events-none">BEAT</span>
                    {/* Beat Progress Overlay */}
                    <div
                        className="absolute inset-y-0 left-0 bg-white/5 pointer-events-none"
                        style={{ width: `${(currentTime / session.duration) * 100}%` }}
                    />
                </div>

                {/* 2. VOCAL TRACK (Draggable) */}
                <div
                    className="absolute bottom-0 h-1/2 flex items-center transition-transform hover:bg-[#282828]/50"
                    style={{
                        width: '100%',
                        cursor: isDraggingSync ? 'grabbing' : 'grab'
                    }}
                    onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e) }}
                    onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e) }}
                    onClick={(e) => e.stopPropagation()} // Prevent seek when clicking track handle
                >
                    <span className="absolute top-1 left-2 text-[10px] text-[#1DB954] pointer-events-none z-10">VOCALS</span>

                    {/* Drag Handle Indicator */}
                    <div className="absolute left-0 inset-y-0 w-1 bg-[#1DB954] z-20 shadow-[0_0_10px_#1DB954]" />

                    {/* Waveform */}
                    <div className="w-full h-full opacity-80 pl-1">
                        {isProcessingAudio ? (
                            <div className="w-full h-full flex items-center justify-center text-xs text-subdued">Analyzing...</div>
                        ) : (
                            <WaveformTrack peaks={audioPeaks} color="#535353" height={60} progress={(currentTime - (syncOffset / 1000)) / session.duration * 100} />
                        )}
                    </div>
                </div>

                {/* 3. PLAYHEAD */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white z-30 pointer-events-none shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    style={{ left: `${(currentTime / session.duration) * 100}%` }}
                />

                {/* 4. MARKERS */}
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

            {/* Action Bar */}
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
                    {/* Share Button Removed */}
                </div>
            </div>

            {/* Hidden YT */}
            <div className="hidden">
                {session.beatId && (
                    <YouTube
                        videoId={session.beatId}
                        onReady={(e) => youtubeRef.current = e.target}
                        opts={{ height: '0', width: '0', playerVars: { playsinline: 1, controls: 0 } }}
                    />
                )}
            </div>

            {/* Content Area: Lyrics & Moments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-right" dir="rtl">
                {/* 1. Lyrics Column */}
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
                        onSeek={(t) => {
                            if (youtubeRef.current) youtubeRef.current.seekTo(t)
                            if (audioRef.current) audioRef.current.currentTime = Math.max(0, t - syncOffset / 1000)
                        }}
                        currentTime={currentTime}
                    />
                </div>

                {/* 2. Moments Column */}
                <div>
                    <MomentsList moments={moments} onSeek={(t) => youtubeRef.current?.seekTo(t)} />
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
