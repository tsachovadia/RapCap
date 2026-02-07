import { useState, useRef } from 'react'
import { Play, Pause, Volume2, Music, X, Link as LinkIcon } from 'lucide-react'
import BeatPlayer from '../freestyle/BeatPlayer'
import { PRESET_BEATS } from '../../data/beats'

interface WritingBeatControlProps {
    videoId: string | null
    setVideoId: (id: string | null) => void
    isPlaying: boolean
    setIsPlaying: (playing: boolean) => void
    volume: number
    setVolume: (vol: number) => void
}

export function WritingBeatControl({
    videoId,
    setVideoId,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume
}: WritingBeatControlProps) {
    const [showSelector, setShowSelector] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const playerRef = useRef<any>(null)

    // Helper to get beat name
    const currentBeat = PRESET_BEATS.find(b => b.id === videoId)
    const beatName = currentBeat ? currentBeat.name : (videoId ? 'Custom Beat' : 'No Beat Selected')

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlSubmit = () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowSelector(false)
            setUrlInput('')
            setIsPlaying(true) // Auto-play on select
        } else {
            alert('Invalid YouTube URL')
        }
    }

    return (
        <div className="flex items-center gap-2 bg-[#181818] border border-white/5 rounded-lg p-1 pr-3 shadow-sm h-10 transition-colors hover:border-white/10">
            {/* Hidden Player */}
            <div className="hidden">
                {videoId && (
                    <BeatPlayer
                        videoId={videoId}
                        isPlaying={isPlaying}
                        volume={volume}
                        onReady={(p) => playerRef.current = p}
                        onStateChange={(e) => {
                            // Sync state if external pause (e.g. buffering)
                            if (e.data === 2) setIsPlaying(false)
                            if (e.data === 1) setIsPlaying(true)
                        }}
                    />
                )}
            </div>

            {/* Icon / Toggle Selector */}
            <button
                onClick={() => setShowSelector(!showSelector)}
                className={`p-1.5 rounded-md transition-colors ${videoId ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                title="Select Beat"
            >
                <Music size={16} />
            </button>

            {/* Play/Pause Control (Only if beat selected) */}
            {videoId && (
                <>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-white transition-colors"
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>

                    {/* Name Display */}
                    <div
                        className="text-xs font-medium text-white/80 truncate max-w-[100px] md:max-w-[150px] cursor-pointer hover:text-white"
                        onClick={() => setShowSelector(true)}
                        title={beatName}
                    >
                        {beatName}
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-1 group relative">
                        <Volume2 size={14} className="text-white/40 group-hover:text-white transition-colors" />
                        <div className="w-0 overflow-hidden group-hover:w-16 transition-all duration-300 flex items-center">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={(e) => setVolume(Number(e.target.value))}
                                className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                            />
                        </div>
                    </div>
                </>
            )}

            {!videoId && (
                <span
                    className="text-xs text-white/30 cursor-pointer hover:text-white/50"
                    onClick={() => setShowSelector(true)}
                >
                    Select a beat...
                </span>
            )}

            {/* Selector Modal / Popover */}
            {showSelector && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Choose Beat</h4>
                        <button onClick={() => setShowSelector(false)} className="text-white/40 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>

                    {/* Presets Grid/List */}
                    <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar mb-3">
                        {PRESET_BEATS.map(beat => (
                            <button
                                key={beat.id}
                                onClick={() => {
                                    setVideoId(beat.id)
                                    setIsPlaying(true)
                                    setShowSelector(false)
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-colors flex items-center justify-between
                                    ${videoId === beat.id ? 'bg-[#1DB954]/20 text-[#1DB954] font-bold' : 'hover:bg-white/5 text-white/70'}
                                `}
                            >
                                {beat.name}
                                {videoId === beat.id && <Play size={10} fill="currentColor" />}
                            </button>
                        ))}
                    </div>

                    {/* URL Input */}
                    <div className="pt-2 border-t border-white/5">
                        <div className="flex gap-1">
                            <input
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                                placeholder="Paste YouTube Link..."
                                className="flex-1 bg-[#111] border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:border-[#1DB954] outline-none"
                            />
                            <button
                                onClick={handleUrlSubmit}
                                className="bg-[#333] hover:bg-[#1DB954] hover:text-black text-white p-1.5 rounded transition-colors"
                            >
                                <LinkIcon size={12} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
