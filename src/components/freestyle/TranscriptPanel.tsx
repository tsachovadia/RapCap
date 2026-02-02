/**
 * TranscriptPanel - Live transcript display with auto-scroll and clickable timestamps
 */
import { useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'
import type { FlowState } from '../../hooks/useFlowState'

interface Segment {
    text: string
    timestamp: number
}

interface TranscriptPanelProps {
    flowState: FlowState
    segments: Segment[]
    interimTranscript: string
    language: 'he' | 'en'
    onSeek?: (time: number) => void // New Prop
}

export function TranscriptPanel({
    flowState,
    segments,
    interimTranscript,
    language,
    onSeek
}: TranscriptPanelProps) {
    const transcriptEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Auto-scroll logic (keep active only if not user scrolling? simplified for now)
    useEffect(() => {
        if (segments.length > 0 || interimTranscript) {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
    }, [segments, interimTranscript])

    const isRecording = flowState === 'recording'
    const hasContent = segments.length > 0 || interimTranscript

    const handleTimestampClick = (time: number) => {
        if (onSeek) onSeek(time);
    }

    return (
        <div
            className="flex-1 min-h-[140px] bg-[#121212]/50 rounded-xl border border-[#282828] overflow-hidden relative shadow-inner"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
            {/* Mic Icon Badge */}
            <div className="absolute top-2 right-2 opacity-50 z-10 pointer-events-none">
                <Mic size={16} className="text-subdued/20" />
            </div>

            {/* Content Section */}
            <div className="h-full px-4 overflow-y-auto no-scrollbar scroll-smooth" ref={scrollContainerRef}>
                <div className="max-w-2xl mx-auto py-4">
                    {/* Recording Badge */}
                    {isRecording && (
                        <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            <span className="text-xs font-bold tracking-widest text-red-500 uppercase">
                                Recording Live
                            </span>
                        </div>
                    )}

                    {/* Transcript Display */}
                    <div className="space-y-4" dir={language === 'he' ? 'rtl' : 'ltr'}>
                        {/* Empty State */}
                        {!hasContent && isRecording && (
                            <div className="text-center py-8 opacity-40">
                                <p className="text-base italic">
                                    {language === 'he' ? 'התחל לראפ לראות מילים...' : 'Start rapping to see lyrics...'}
                                </p>
                            </div>
                        )}

                        {/* Final Segments */}
                        {segments.map((seg, i) => (
                            <div
                                key={i}
                                className="group text-xl md:text-2xl font-bold transition-all duration-700 text-white/60 hover:text-white"
                            >
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={() => handleTimestampClick(seg.timestamp)}
                                        className="text-[10px] font-mono text-[#1DB954]/50 hover:text-[#1DB954] mt-1.5 shrink-0 tabular-nums cursor-pointer select-none transition-colors border border-transparent hover:border-[#1DB954]/20 rounded px-1"
                                        title="Seek to time"
                                    >
                                        [{Math.floor(seg.timestamp / 60)}:{Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}]
                                    </button>
                                    <p className="leading-tight tracking-tight">{seg.text}</p>
                                </div>
                            </div>
                        ))}

                        {/* Interim Transcript (Real-time feedback) */}
                        {interimTranscript && (
                            <div className="text-xl md:text-2xl font-bold text-white animate-in fade-in duration-300">
                                <div className="flex items-start gap-3">
                                    <div className="w-2 h-2 rounded-full bg-[#1DB954] mt-2 animate-pulse shrink-0" />
                                    <p className="leading-tight tracking-tight drop-shadow-sm">{interimTranscript}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* Auto-scroll anchor */}
                <div ref={transcriptEndRef} className="h-4 flex-none" />
            </div>
        </div>
    )
}
