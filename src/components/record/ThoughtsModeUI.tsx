import { useRef, useEffect } from 'react'
import { Mic } from 'lucide-react'
import type { FlowState } from '../../pages/RecordPage'

interface Props {
    flowState: FlowState
    language: 'he' | 'en'
    segments: any[]
    interimTranscript: string
}

export default function ThoughtsModeUI({ flowState, language, segments, interimTranscript }: Props) {
    const transcriptEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, [segments, interimTranscript])

    return (
        <div className="flex-1 flex flex-col gap-4 min-h-0 bg-[#121212] rounded-3xl border border-white/5 shadow-2xl overflow-hidden p-6 md:p-10">
            {/* Context/Instruction */}
            <div className="flex items-center justify-between opacity-50 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <Mic size={20} className={flowState === 'recording' ? 'text-red-500 animate-pulse' : ''} />
                    <span className="text-sm font-medium tracking-wide">
                        {flowState === 'recording' ? (language === 'he' ? 'מקליט מחשבות...' : 'Recording thoughts...') : (language === 'he' ? 'התחל לדבר כדי לתמלל' : 'Start speaking to transcribe')}
                    </span>
                </div>
                <div className="text-xs font-mono uppercase tracking-widest">
                    {language === 'he' ? 'זיהוי קולי פעיל' : 'Voice Recognition Active'}
                </div>
            </div>

            {/* Large Scrollable Transcript */}
            <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar flex flex-col pt-4">
                <div className="max-w-3xl mx-auto w-full space-y-8 pb-32">
                    {segments.length === 0 && !interimTranscript && (
                        <div className="flex flex-col items-center justify-center py-20 text-white/20 text-center gap-4">
                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                <Mic size={32} />
                            </div>
                            <p className="text-lg italic font-light italic">
                                {language === 'he' ? 'זה המקום לפרוק הכל...' : 'This is your space to let it flow...'}
                            </p>
                        </div>
                    )}

                    {segments.map((seg, i) => (
                        <div
                            key={i}
                            className="text-2xl md:text-4xl font-light leading-relaxed text-white/90 animate-in fade-in slide-in-from-bottom-2 duration-500"
                        >
                            <p>{seg.text}</p>
                        </div>
                    ))}

                    {interimTranscript && (
                        <div className="text-2xl md:text-4xl font-medium leading-relaxed text-[#1DB954] drop-shadow-sm animate-in fade-in duration-300">
                            <p>{interimTranscript}</p>
                        </div>
                    )}
                    <div ref={transcriptEndRef} className="h-10" />
                </div>
            </div>
        </div>
    )
}
