import React, { useState } from 'react'
import { Mic, Square, Play, Trash2, Pause } from 'lucide-react'
import { type Bar } from '../../db/db'

interface BarItemProps {
    bar: Bar
    index: number
    isActive: boolean
    isRecording: boolean
    isPlaying: boolean
    currentAudioTime: number
    audioDuration: number

    onChange: (text: string) => void
    onSplit: (cursorPos: number) => void
    onMergePrev: () => void // Kept in interface but unused in component for now?
    onMergeNext: () => void // Kept in interface but unused in component for now?
    onDelete: () => void

    onStartRecording: () => void
    onStopRecording: () => void
    onPlayAudio: () => void
    onPauseAudio: () => void
    onDeleteAudio: () => void
}

export const BarItem: React.FC<BarItemProps> = ({
    bar, index, isActive,
    isRecording, isPlaying, currentAudioTime, audioDuration,
    onChange, onSplit, onDelete, // Removed unused onMergePrev, onMergeNext
    onStartRecording, onStopRecording, onPlayAudio, onPauseAudio, onDeleteAudio
}) => {
    // const inputRef = useRef<HTMLInputElement>(null) // Removed unused ref
    const [isHovered, setIsHovered] = useState(false)

    // Auto-focus logic handled by parent via ID? 
    // Or we handle focus here if we know it just mounted?
    // Let's stick to parent focusing for now via timeout

    return (
        <div
            className={`flex items-center gap-2 group relative py-2 transition-colors duration-200 ${isActive ? 'bg-white/5 -mx-4 px-4 rounded-lg' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Bar Number */}
            <span className="text-white/20 text-xs font-mono w-6 text-right opacity-30 group-hover:opacity-100 uppercase select-none transition-opacity">
                {index + 1}
            </span>

            {/* Input Area */}
            <div className="relative flex-1">
                <input
                    id={`bar-${bar.id}`}
                    value={bar.text}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            onSplit(e.currentTarget.selectionStart || 0)
                        } else if (e.key === 'Backspace' && bar.text === '') {
                            e.preventDefault()
                            onDelete()
                        } else if (e.key === 'ArrowUp' && index > 0) {
                            // Let parent handle nav or use standard behavior?
                            // Standard behavior might work if IDs are sequential in DOM
                            // But we are using `bar-${id}`
                        }
                    }}
                    placeholder={index === 0 ? "Start writing bars..." : ""}
                    className="w-full bg-transparent outline-none text-xl leading-relaxed text-white/90 font-hebrew placeholder-white/10 border-b border-transparent focus:border-[#1DB954]/30 transition-colors py-1"
                    style={{ direction: 'rtl' }}
                />
            </div>

            {/* Audio Controls (Hover or Active) */}
            <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered || isRecording || isPlaying || bar.audioId ? 'opacity-100' : 'opacity-0'}`}>

                {/* Recording State */}
                {isRecording ? (
                    <button
                        onClick={onStopRecording}
                        className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse"
                        title="Stop Recording"
                    >
                        <Square size={16} fill="currentColor" />
                    </button>
                ) : bar.audioId ? (
                    /* Playback State */
                    <div className="flex items-center gap-1 bg-[#252525] rounded-full px-1 border border-white/5">
                        <button
                            onClick={isPlaying ? onPauseAudio : onPlayAudio}
                            className={`p-2 rounded-full hover:bg-white/10 ${isPlaying ? 'text-[#1DB954]' : 'text-white/60'}`}
                            title={isPlaying ? "Pause" : "Play Recording"}
                        >
                            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                        </button>

                        {/* Audio Waveform / Progress Placeholder */}
                        {isPlaying && (
                            <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-[#1DB954] transition-all duration-200"
                                    style={{ width: `${(currentAudioTime / (audioDuration || 1)) * 100}%` }}
                                />
                            </div>
                        )}

                        <button
                            onClick={onDeleteAudio}
                            className="p-2 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-500"
                            title="Delete Recording"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ) : (
                    /* Initial State */
                    <button
                        onClick={onStartRecording}
                        className="p-2 rounded-full hover:bg-white/10 text-white/20 hover:text-red-400 transition-colors"
                        title="Record Bar Audio"
                    >
                        <Mic size={18} />
                    </button>
                )}
            </div>
        </div>
    )
}
