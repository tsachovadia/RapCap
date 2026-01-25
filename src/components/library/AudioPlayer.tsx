import { useEffect, useRef, useState } from 'react'

interface AudioPlayerProps {
    blob: Blob
    isPlaying: boolean
    onPlayPause: () => void
    onEnded: () => void
}

export default function AudioPlayer({ blob, isPlaying, onEnded }: Omit<AudioPlayerProps, 'onPlayPause'>) {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [progress, setProgress] = useState(0)
    const [duration, setDuration] = useState(0)

    useEffect(() => {
        const url = URL.createObjectURL(blob)
        if (audioRef.current) {
            audioRef.current.src = url
        }
        return () => URL.revokeObjectURL(url)
    }, [blob])

    useEffect(() => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.play()
            } else {
                audioRef.current.pause()
            }
        }
    }, [isPlaying])

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime
            const total = audioRef.current.duration || 0
            setDuration(total)
            setProgress((current / total) * 100)
        }
    }

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const seekTime = (Number(e.target.value) / 100) * audioRef.current.duration
            audioRef.current.currentTime = seekTime
            setProgress(Number(e.target.value))
        }
    }

    return (
        <div className="flex flex-col w-full">
            <audio
                ref={audioRef}
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => {
                    onEnded()
                    setProgress(0)
                }}
            />
            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full">
                <span className="text-2xs text-subdued w-8 text-right font-mono">
                    {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'}
                </span>

                <div className="flex-1 h-8 flex items-center group">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={progress || 0}
                        onChange={handleSeek}
                        className="w-full h-1 bg-[#535353] rounded-lg appearance-none cursor-pointer accent-white"
                        style={{
                            background: `linear-gradient(to right, #ffffff ${progress}%, #535353 ${progress}%)`
                        }}
                    />
                </div>

                <span className="text-2xs text-subdued w-8 font-mono">
                    {formatTime(duration)}
                </span>
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
