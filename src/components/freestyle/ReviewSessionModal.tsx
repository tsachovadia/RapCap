import { X, Check, Music2, Clock, Calendar, Sparkles, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { transcribeAudio } from '../../services/whisper'



interface ReviewSessionModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    onDiscard: () => void
    audioBlob?: Blob | null // [NEW] Added for Whisper
    onUpdateTranscript?: (text: string, segments: any[], wordSegments: any[]) => void // [NEW] Callback
    data: {
        transcript: string
        duration: number
        beatId: string
        date: Date
        segments: Array<{ text: string, timestamp: number }>
        wordSegments?: Array<{ word: string, timestamp: number }>
    }
}

export default function ReviewSessionModal({ isOpen, onClose, onSave, onDiscard, data, audioBlob, onUpdateTranscript }: ReviewSessionModalProps) {
    const [isEnhancing, setIsEnhancing] = useState(false);

    if (!isOpen) return null

    // Format helpers
    const fmt = (s: number) => {
        const min = Math.floor(s / 60)
        const sec = Math.floor(s % 60)
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    // Prefer word segments if available and populated, otherwise fallback to chunks
    const displaySegments = (data.wordSegments && data.wordSegments.length > 0)
        ? data.wordSegments.map(ws => ({ text: ws.word, timestamp: ws.timestamp }))
        : data.segments;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-md flex flex-col max-h-[85vh] shadow-2xl">

                {/* Header */}
                <div className="p-4 border-b border-[#282828] flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Check className="text-[#1DB954]" size={20} />
                        Session Complete
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-[#282828] rounded-full transition-colors">
                        <X size={20} className="text-subdued" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#121212] p-3 rounded-xl border border-[#282828] flex flex-col items-center gap-1">
                            <Clock size={16} className="text-subdued" />
                            <span className="text-2xl font-bold text-white">{fmt(data.duration)}</span>
                            <span className="text-xs text-subdued uppercase">Duration</span>
                        </div>
                        <div className="bg-[#121212] p-3 rounded-xl border border-[#282828] flex flex-col items-center gap-1">
                            <Music2 size={16} className="text-subdued" />
                            <span className="text-sm font-bold text-white truncate max-w-full px-2" title={data.beatId}>
                                {data.beatId || 'No Beat'}
                            </span>
                            <span className="text-xs text-subdued uppercase">Beat ID</span>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-center gap-2 text-sm text-subdued">
                        <Calendar size={14} />
                        <span>{data.date.toLocaleString()}</span>
                    </div>

                    {/* Lyrics Preview with Timestamps */}
                    <div className="bg-[#121212] rounded-xl border border-[#282828] p-4 min-h-[200px] flex flex-col gap-2 relative">
                        <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                            {/* Transcribe Button */}
                            {audioBlob && onUpdateTranscript && (
                                <button
                                    onClick={async () => {
                                        if (isEnhancing) return;
                                        try {
                                            setIsEnhancing(true);
                                            const result = await transcribeAudio(audioBlob, 'he'); // Defaulting to Hebrew logic as requested
                                            onUpdateTranscript(result.text, result.segments, result.wordSegments);
                                        } catch (e) {
                                            alert("שגיאה בתמלול: " + (e instanceof Error ? e.message : String(e)));
                                        } finally {
                                            setIsEnhancing(false);
                                        }
                                    }}
                                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors shadow-lg"
                                    disabled={isEnhancing}
                                >
                                    {isEnhancing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    {isEnhancing ? 'מתמלל...' : 'שפר תמלול (Whisper)'}
                                </button>
                            )}
                            <span className="text-[10px] font-mono border border-white/20 px-1 rounded opacity-30 pointer-events-none">RAW DATA</span>
                        </div>

                        {displaySegments.length > 0 ? (
                            <div className="flex flex-col gap-2 font-mono text-sm h-full overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                {displaySegments.map((seg, i) => (
                                    <div key={i} className="flex gap-3 text-white/80 border-b border-[#282828]/50 pb-1 last:border-0 relative group items-center">
                                        {/* Explicit Timestamp Visualization */}
                                        <span className="text-[#1DB954] font-bold select-none shrink-0 opacity-70 group-hover:opacity-100 transition-opacity text-xs w-12 text-right">
                                            [{fmt(seg.timestamp)}]
                                        </span>
                                        <p className="leading-snug break-words flex-1">
                                            {seg.text}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-subdued italic py-10">
                                No lyrics detected...
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-[#282828] flex gap-3 bg-[#181818] rounded-b-2xl">
                    <button
                        onClick={onDiscard}
                        className="flex-1 py-3 rounded-xl font-bold bg-[#282828] hover:bg-red-900/50 hover:text-red-500 text-subdued transition-colors flex items-center justify-center gap-2"
                    >
                        <X size={18} />
                        Discard
                    </button>
                    <button
                        onClick={onSave}
                        className="flex-[2] py-3 rounded-xl font-bold bg-[#1DB954] hover:bg-[#1ed760] text-black transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(29,185,84,0.3)]"
                    >
                        <Check size={18} />
                        Save to Library
                    </button>
                </div>
            </div>
        </div>
    )
}
