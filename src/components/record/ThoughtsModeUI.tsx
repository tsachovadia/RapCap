import { useRef, useEffect, type Dispatch, type SetStateAction } from 'react'
import { Mic, Keyboard } from 'lucide-react'
import type { FlowState } from '../../pages/RecordPage'

interface Props {
    flowState: FlowState
    language: 'he' | 'en'
    segments: any[]
    interimTranscript: string
    notes: string
    setNotes: Dispatch<SetStateAction<string>>
}

export default function ThoughtsModeUI({ flowState, language, segments, interimTranscript, notes, setNotes }: Props) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const lastSegmentsLengthRef = useRef(segments.length)

    // Auto-scroll logic for textarea? Or maybe just for the transcript if we kept it?
    // We want to append new transcription segments to the notes.

    useEffect(() => {
        // If new segments arrived, append them to notes
        if (segments.length > lastSegmentsLengthRef.current) {
            const newSegments = segments.slice(lastSegmentsLengthRef.current)
            const newText = newSegments.map(s => s.text).join(' ')

            setNotes((prev: string) => {
                const needsSpace = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n');
                return prev + (needsSpace ? ' ' : '') + newText;
            })

            lastSegmentsLengthRef.current = segments.length
        }
    }, [segments, setNotes])

    // Scroll textarea to bottom when notes update (if user is not manually editing?)
    // Basic implementation: Scroll to bottom on update
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
        }
    }, [notes])


    return (
        <div className="flex-1 flex flex-col gap-4 min-h-0 bg-[#121212] rounded-3xl border border-white/5 shadow-2xl overflow-hidden p-6 md:p-10">
            {/* Context/Instruction */}
            <div className="flex items-center justify-between opacity-50 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                    <Mic size={20} className={flowState === 'recording' ? 'text-red-500 animate-pulse' : ''} />
                    <span className="text-sm font-medium tracking-wide">
                        {flowState === 'recording' ? (language === 'he' ? 'מקליט מחשבות...' : 'Recording thoughts...') : (language === 'he' ? 'התחל לדבר או לכתוב' : 'Start speaking or typing')}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest">
                    <Keyboard size={14} />
                    <span>{language === 'he' ? 'עורך טקסט' : 'Text Editor'}</span>
                </div>
            </div>

            {/* Hybrid Input Area */}
            <div className="flex-1 flex flex-col relative">
                <textarea
                    ref={textareaRef}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language === 'he' ? 'המחשבות שלך יופיעו כאן...' : 'Your thoughts will appear here...'}
                    className="flex-1 w-full bg-transparent text-xl md:text-2xl font-light leading-relaxed text-white/90 resize-none outline-none placeholder:text-white/20 p-2"
                    dir={language === 'he' ? 'rtl' : 'ltr'}
                />

                {/* Interim Transcript Overlay (Ghost text) */}
                {interimTranscript && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-sm border-t border-white/10 text-[#1DB954] text-lg animate-in fade-in slide-in-from-bottom-2">
                        <p className="font-mono text-xs opacity-70 mb-1">LISTENING...</p>
                        <p>{interimTranscript}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

