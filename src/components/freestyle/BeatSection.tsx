/**
 * BeatSection - Beat player with selector modal and volume control
 */
import { useState } from 'react'
import { Link as LinkIcon, ExternalLink } from 'lucide-react'
import BeatPlayer from './BeatPlayer'
import type { FlowState } from '../../hooks/useFlowState'
import { PRESET_BEATS } from '../../data/beats'
import { useToast } from '../../contexts/ToastContext'

interface BeatSectionProps {
    videoId: string
    setVideoId: (id: string) => void
    flowState: FlowState
    beatVolume: number
    setBeatVolume: (v: number) => void
    youtubePlayer: any
    setYoutubePlayer: (player: any) => void
    onPlayerStateChange: (event: any) => void
    language: 'he' | 'en'
}

export function BeatSection({
    videoId,
    setVideoId,
    flowState,
    beatVolume,
    setBeatVolume,
    youtubePlayer,
    setYoutubePlayer,
    onPlayerStateChange,
    language
}: BeatSectionProps) {
    const { showToast } = useToast()
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState('')

    // Get current beat info
    const currentBeat = PRESET_BEATS.find(b => b.id === videoId);
    const beatTitle = currentBeat ? currentBeat.name : (language === 'he' ? 'ביט מותאם אישית' : 'Custom Beat');

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlSubmit = () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowUrlInput(false)
            setUrlInput('')
        } else {
            showToast(language === 'he' ? 'קישור לא תקין' : 'Invalid YouTube URL', 'warning')
        }
    }

    return (
        <div className="flex gap-2">
            {/* Beat Player */}
            <div className="flex-1 h-20 bg-[#181818] rounded-xl overflow-hidden relative border border-[#282828] group">
                <BeatPlayer
                    videoId={videoId}
                    isPlaying={flowState !== 'idle' && flowState !== 'paused'}
                    volume={beatVolume}
                    onReady={setYoutubePlayer}
                    onStateChange={onPlayerStateChange}
                />

                {/* Status Overlay */}
                <div className="absolute top-2 left-2 flex gap-2 pointer-events-none z-10">
                    {flowState === 'preroll' && (
                        <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded animate-pulse">
                            {language === 'he' ? 'מתכונן...' : 'Ready...'}
                        </span>
                    )}
                    {flowState === 'recording' && (
                        <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded animate-pulse">
                            REC
                        </span>
                    )}
                </div>

                {/* Beat Title Overlay (Clickable) */}
                <div className="absolute bottom-2 left-2 right-16 z-20">
                    <a
                        href={`https://www.youtube.com/watch?v=${videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-white hover:underline truncate max-w-full drop-shadow-md bg-black/50 px-2 py-1 rounded-lg w-fit transition-colors hover:bg-black/70 hover:text-[#1DB954]"
                    >
                        {beatTitle}
                        <ExternalLink size={10} />
                    </a>
                </div>

                {/* Change Beat Button */}
                {!showUrlInput && (
                    <button
                        onClick={() => setShowUrlInput(true)}
                        className="absolute top-2 right-2 bg-black/80 hover:bg-[#1DB954] hover:text-black text-white px-3 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all flex items-center gap-2 z-20 border border-white/10 backdrop-blur-sm shadow-lg"
                    >
                        <LinkIcon size={12} />
                        <span>{language === 'he' ? 'שנה' : 'Change'}</span>
                    </button>
                )}
            </div>

            {/* Volume Control */}
            <div className="w-16 bg-[#181818] rounded-xl flex flex-col items-center py-2 gap-2 border border-[#282828]">
                <div className="text-[10px] text-subdued font-bold uppercase tracking-wider">VOL</div>
                <div className="flex-1 w-full flex justify-center min-h-0">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={beatVolume}
                        onChange={(e) => {
                            const val = Number(e.target.value)
                            setBeatVolume(val)
                            if (youtubePlayer) youtubePlayer.setVolume(val)
                        }}
                        className="h-full w-1 accent-[#1DB954] bg-[#3E3E3E] rounded appearance-none cursor-pointer"
                        style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                    />
                </div>
            </div>

            {/* Beat Selector Modal */}
            {showUrlInput && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in">
                    <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">
                            {language === 'he' ? 'בחר ביט' : 'Select Beat'}
                        </h3>

                        {/* Dropdown for Featured Beats */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-subdued uppercase tracking-widest px-1">
                                {language === 'he' ? 'ביטים נבחרים' : 'Featured Beats'}
                            </label>
                            <select
                                className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954] cursor-pointer"
                                onChange={(e) => {
                                    if (e.target.value) {
                                        setVideoId(e.target.value)
                                        setShowUrlInput(false)
                                    }
                                }}
                                value={PRESET_BEATS.some(b => b.id === videoId) ? videoId : ''}
                            >
                                <option value="" disabled>
                                    {language === 'he' ? 'בחר מהרשימה...' : 'Choose from list...'}
                                </option>
                                {PRESET_BEATS.map(beat => (
                                    <option key={beat.id} value={beat.id}>
                                        {beat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="relative pt-2">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#333]" />
                            <span className="relative z-10 bg-[#181818] px-4 text-[10px] font-bold text-subdued uppercase tracking-widest block mx-auto w-fit">
                                {language === 'he' ? 'או הדבק קישור' : 'Or Paste Link'}
                            </span>
                        </div>

                        <div className="flex w-full gap-2">
                            <input
                                type="text"
                                placeholder="Paste YouTube Link..."
                                className="flex-1 bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954]"
                                value={urlInput}
                                onChange={e => setUrlInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                                autoFocus
                            />
                            <button
                                onClick={handleUrlSubmit}
                                className="bg-[#1DB954] text-black px-4 py-3 rounded-lg font-bold hover:bg-[#1ed760] transition-colors"
                            >
                                {language === 'he' ? 'אישור' : 'Go'}
                            </button>
                        </div>

                        <button
                            onClick={() => setShowUrlInput(false)}
                            className="w-full py-2 text-sm text-subdued hover:text-white transition-colors"
                        >
                            {language === 'he' ? 'ביטול' : 'Cancel'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
