import { useState } from 'react';
import { Music, Play, Pause, Volume2 } from 'lucide-react';
import BeatPlayer from '../freestyle/BeatPlayer';
import { PRESET_BEATS } from '../../data/beats';
import { useStudio } from '../../contexts/StudioContext';
import { useToast } from '../../contexts/ToastContext';
import { db } from '../../db/db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function StudioBeatBar() {
    const { showToast } = useToast();
    const {
        videoId, setVideoId,
        beatVolume, setBeatVolume,
        youtubePlayer, setYoutubePlayer,
        flowState, handlePlayerStateChange, language,
    } = useStudio();

    const [showSelector, setShowSelector] = useState(false);
    const [urlInput, setUrlInput] = useState('');

    const customBeats = useLiveQuery(() => db.beats?.toArray() || [], []) || [];
    const allBeats = [...PRESET_BEATS, ...customBeats.map(b => ({ id: b.videoId, name: b.name }))];
    const currentBeat = allBeats.find(b => b.id === videoId);
    const beatName = currentBeat?.name || (language === 'he' ? 'ביט מותאם' : 'Custom');

    const isPlaying = flowState !== 'idle' && flowState !== 'paused';

    const extractYoutubeId = (url: string) => {
        const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/)
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleUrlSubmit = async () => {
        const id = extractYoutubeId(urlInput);
        if (!id) {
            showToast(language === 'he' ? 'קישור לא תקין' : 'Invalid YouTube URL', 'warning');
            return;
        }
        setVideoId(id);
        setShowSelector(false);
        setUrlInput('');

        // Auto-save custom beat
        try {
            const existing = await db.beats.where('videoId').equals(id).first();
            if (!existing) {
                let title = 'Imported Beat';
                try {
                    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
                    const data = await res.json();
                    if (data.title) title = data.title;
                } catch { }
                await db.beats.add({ name: title, videoId: id, category: 'custom', createdAt: new Date() });
            }
        } catch { }
    };

    const handleTogglePlay = () => {
        if (!youtubePlayer) return;
        if (isPlaying) {
            youtubePlayer.pauseVideo();
        } else {
            youtubePlayer.playVideo();
        }
    };

    return (
        <>
            <div className="h-10 flex items-center gap-2 px-3 bg-[#181818] border-b border-white/5 shrink-0">
                {/* Beat name button */}
                <button
                    onClick={() => setShowSelector(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors truncate min-w-0"
                >
                    <Music size={14} className="text-[#1DB954] shrink-0" />
                    <span className="truncate">{beatName}</span>
                </button>

                {/* Play/Pause toggle */}
                <button
                    onClick={handleTogglePlay}
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white shrink-0"
                >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </button>

                {/* Volume slider — hidden on mobile */}
                <div className="hidden md:flex items-center gap-1.5 flex-1 max-w-[160px]">
                    <Volume2 size={12} className="text-white/30 shrink-0" />
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={beatVolume}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            setBeatVolume(val);
                            youtubePlayer?.setVolume(val);
                        }}
                        className="flex-1 h-1 accent-[#1DB954] bg-[#3E3E3E] rounded appearance-none cursor-pointer"
                    />
                </div>

                {/* Hidden YouTube iframe */}
                <div className="w-0 h-0 overflow-hidden absolute">
                    <BeatPlayer
                        videoId={videoId}
                        isPlaying={isPlaying}
                        volume={beatVolume}
                        onReady={setYoutubePlayer}
                        onStateChange={handlePlayerStateChange}
                    />
                </div>
            </div>

            {/* Beat selector modal */}
            {showSelector && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl space-y-4">
                        <h3 className="text-lg font-bold text-white text-center">
                            {language === 'he' ? 'בחר ביט' : 'Select Beat'}
                        </h3>

                        <select
                            className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954] cursor-pointer"
                            onChange={(e) => {
                                if (e.target.value) {
                                    setVideoId(e.target.value);
                                    setShowSelector(false);
                                }
                            }}
                            value={allBeats.some(b => b.id === videoId) ? videoId : ''}
                        >
                            <option value="" disabled>
                                {language === 'he' ? 'בחר מהרשימה...' : 'Choose from list...'}
                            </option>
                            {allBeats.map(beat => (
                                <option key={beat.id} value={beat.id}>{beat.name}</option>
                            ))}
                        </select>

                        <div className="relative pt-2">
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-[#333]" />
                            <span className="relative z-10 bg-[#181818] px-4 text-[10px] font-bold text-white/30 uppercase tracking-widest block mx-auto w-fit">
                                {language === 'he' ? 'או הדבק קישור' : 'Or Paste Link'}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="YouTube Link..."
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
                            onClick={() => setShowSelector(false)}
                            className="w-full py-2 text-sm text-white/40 hover:text-white transition-colors"
                        >
                            {language === 'he' ? 'ביטול' : 'Cancel'}
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
