import { useRef, useEffect, useState } from 'react';
import { useStudio } from '../../contexts/StudioContext';


export default function FreestyleCenter() {
    const { bars, addBar, updateBar, segments, interimTranscript, flowState } = useStudio();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editingBarId, setEditingBarId] = useState<string | null>(null);
    // Track which segments we've already converted to bars (survives re-renders)
    const processedKeys = useRef(new Set<string>());

    // Sync transcription segments → studio bars (deduped by content+timestamp)
    useEffect(() => {

        for (const seg of segments) {
            const key = `${seg.timestamp.toFixed(2)}|${seg.text}`;
            if (processedKeys.current.has(key)) continue;
            processedKeys.current.add(key);
            addBar({
                id: crypto.randomUUID(),
                text: seg.text,
                timestamp: seg.timestamp,
                source: 'transcription',
            });

        }
    }, [segments, addBar]);

    // Reset tracking when bars are cleared (new session)
    useEffect(() => {
        if (bars.length === 0) processedKeys.current.clear();
    }, [bars.length]);

    // Auto-scroll on new bars or interim change
    useEffect(() => {
        if (!containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        if (scrollHeight - scrollTop - clientHeight < 150) {
            containerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }, [bars.length, interimTranscript]);

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const isIdle = flowState === 'idle';

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2" dir="rtl">
            {bars.length === 0 && !interimTranscript && (
                <div className="flex items-center justify-center h-full text-white/20 text-sm">
                    {isIdle ? 'לחץ הקלט כדי להתחיל...' : 'מחכה לדיבור...'}
                </div>
            )}

            {bars.map((bar) => (
                <div
                    key={bar.id}
                    className="flex items-start gap-2 group"
                >
                    {/* Timestamp badge */}
                    {bar.timestamp != null && (
                        <span className="text-[10px] text-white/30 font-mono mt-1 shrink-0 w-10 text-left">
                            {formatTime(bar.timestamp)}
                        </span>
                    )}

                    {/* Bar text */}
                    {editingBarId === bar.id ? (
                        <input
                            autoFocus
                            value={bar.text}
                            onChange={(e) => updateBar(bar.id, { text: e.target.value })}
                            onBlur={() => setEditingBarId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingBarId(null)}
                            dir="rtl"
                            className="flex-1 bg-[#282828] rounded px-2 py-1 text-sm outline-none border border-white/10 focus:border-white/30"
                        />
                    ) : (
                        <p
                            onClick={() => isIdle && setEditingBarId(bar.id)}
                            className={`flex-1 text-sm leading-relaxed text-white/80 rounded px-2 py-1 transition-colors ${isIdle ? 'hover:bg-white/5 cursor-text' : ''
                                }`}
                        >
                            {bar.text}
                        </p>
                    )}
                </div>
            ))}

            {/* Interim text (pulsing) */}
            {interimTranscript && (
                <div className="flex items-start gap-2">
                    <span className="text-[10px] text-white/20 font-mono mt-1 shrink-0 w-10 text-left">...</span>
                    <p className="flex-1 text-sm leading-relaxed text-white/40 animate-pulse px-2 py-1">
                        {interimTranscript}
                    </p>
                </div>
            )}
        </div>
    );
}
