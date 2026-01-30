
import { X, Check, RefreshCw, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Segment {
    text: string;
    timestamp: number;
}

interface TranscriptData {
    text: string;
    segments: Segment[];
    words?: any[];
}

interface TranscriptionComparisonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedData: TranscriptData) => void;
    original: TranscriptData;
    generated: TranscriptData;
}

export default function TranscriptionComparisonModal({
    isOpen,
    onClose,
    onConfirm,
    original,
    generated
}: TranscriptionComparisonModalProps) {
    const [selection, setSelection] = useState<'original' | 'generated' | 'custom'>('generated');
    const [customSelectedLines, setCustomSelectedLines] = useState<Array<{ source: 'original' | 'generated', index: number }>>([]);

    // Initialize custom selection with all generated lines first
    useEffect(() => {
        if (isOpen && generated.segments) {
            setCustomSelectedLines(generated.segments.map((_, i) => ({ source: 'generated', index: i })));
        }
    }, [isOpen, generated]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (selection === 'original') {
            onConfirm(original);
        } else if (selection === 'generated') {
            onConfirm(generated);
        } else {
            // Merge logic
            // We combine the selected lines and sort them by timestamp
            let mergedSegments: Segment[] = [];

            customSelectedLines.forEach(sel => {
                const seg = sel.source === 'original'
                    ? original.segments[sel.index]
                    : generated.segments[sel.index];
                if (seg) mergedSegments.push(seg);
            });

            // Sort by timestamp
            mergedSegments.sort((a, b) => a.timestamp - b.timestamp);

            const mergedText = mergedSegments.map(s => s.text).join('\n');

            // Note: Merging word-level segments is tricky if we mix and match. 
            // For now, we'll keep the word segments of the *majority* source or just the generated one if mostly generated.
            // A simpler approach for MVP: If custom mix, we drop word-level precision or default to generated's words if mostly generated.
            // Let's just pass generated words for now to avoid breaking the DB schema, 
            // or maybe filter generated words that fall within the timestamps of kept segments.
            // That's complex. Let's just return the generated words but with the merged text and segments.
            onConfirm({
                text: mergedText,
                segments: mergedSegments,
                words: generated.words // Fallback
            });
        }
        onClose();
    };

    const toggleLine = (source: 'original' | 'generated', index: number) => {
        setSelection('custom');
        setCustomSelectedLines(prev => {
            const exists = prev.find(p => p.source === source && p.index === index);
            if (exists) {
                return prev.filter(p => !(p.source === source && p.index === index));
            } else {
                return [...prev, { source, index }];
            }
        });
    };

    const isLineSelected = (source: 'original' | 'generated', index: number) => {
        if (selection === 'original') return source === 'original';
        if (selection === 'generated') return source === 'generated';
        return !!customSelectedLines.find(p => p.source === source && p.index === index);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
            <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full max-w-4xl flex flex-col h-[85vh] shadow-2xl relative overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-[#282828] flex items-center justify-between shrink-0 bg-[#181818] z-10">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="text-purple-500" size={24} />
                        <div>
                            <h2 className="text-xl font-bold text-white">שפר תמלול (Whisper)</h2>
                            <p className="text-xs text-subdued">בחר איזה תמלול לשמור או שילוב ביניהם</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[#282828] rounded-full transition-colors">
                        <X size={20} className="text-subdued" />
                    </button>
                </div>

                {/* Main Comparison Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-[#282828]">

                    {/* Original Column */}
                    <div className="flex-1 flex flex-col min-h-0 relative group/col">
                        <div
                            className={`p-3 border-b border-[#282828] flex justify-between items-center cursor-pointer transition-colors ${selection === 'original' ? 'bg-purple-900/20' : 'hover:bg-[#202020]'}`}
                            onClick={() => setSelection('original')}
                        >
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full border border-white/40 ${selection === 'original' ? 'bg-purple-500 border-purple-500' : ''}`} />
                                תמלול מקורי
                            </h3>
                            <span className="text-xs text-subdued bg-[#282828] px-2 py-0.5 rounded-full">
                                {original.segments?.length || 0} שורות
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {(original.segments || []).length > 0 ? original.segments.map((seg, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleLine('original', i)}
                                    className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex gap-3 ${isLineSelected('original', i)
                                        ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                                        : 'bg-[#121212] border-[#282828] text-white/40 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isLineSelected('original', i) ? 'bg-purple-500 border-purple-500' : 'border-white/20'
                                        }`}>
                                        {isLineSelected('original', i) && <Check size={10} className="text-white" />}
                                    </div>
                                    <div>
                                        <span className="text-[#1DB954] text-xs font-mono block mb-0.5 opacity-70">
                                            {formatTime(seg.timestamp)}
                                        </span>
                                        <p className="leading-relaxed">{seg.text}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-subdued italic text-center mt-10">אין שורות מזוהות בתמלול המקורי.</p>
                            )}
                        </div>
                    </div>

                    {/* New (Whisper) Column */}
                    <div className="flex-1 flex flex-col min-h-0 relative group/col">
                        <div
                            className={`p-3 border-b border-[#282828] flex justify-between items-center cursor-pointer transition-colors ${selection === 'generated' ? 'bg-purple-900/20' : 'hover:bg-[#202020]'}`}
                            onClick={() => setSelection('generated')}
                        >
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full border border-white/40 ${selection === 'generated' ? 'bg-purple-500 border-purple-500' : ''}`} />
                                תמלול חדש (Whisper) ✨
                            </h3>
                            <span className="text-xs text-subdued bg-[#282828] px-2 py-0.5 rounded-full">
                                {generated.segments?.length || 0} שורות
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {(generated.segments || []).length > 0 ? generated.segments.map((seg, i) => (
                                <div
                                    key={i}
                                    onClick={() => toggleLine('generated', i)}
                                    className={`p-3 rounded-lg border text-sm cursor-pointer transition-all flex gap-3 ${isLineSelected('generated', i)
                                        ? 'bg-purple-500/10 border-purple-500/50 text-white shadow-[0_0_10px_rgba(168,85,247,0.1)]'
                                        : 'bg-[#121212] border-[#282828] text-white/40 hover:border-white/20'
                                        }`}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isLineSelected('generated', i) ? 'bg-purple-500 border-purple-500' : 'border-white/20'
                                        }`}>
                                        {isLineSelected('generated', i) && <Check size={10} className="text-white" />}
                                    </div>
                                    <div>
                                        <span className="text-[#1DB954] text-xs font-mono block mb-0.5 opacity-70">
                                            {formatTime(seg.timestamp)}
                                        </span>
                                        <p className="leading-relaxed">{seg.text}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center h-full text-subdued gap-2">
                                    <AlertCircle size={32} />
                                    <p>לא זוהה מלל חדש</p>
                                </div>
                            )}
                        </div>

                        {/* Overlay Gradient for Scroll cues */}
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#181818] to-transparent pointer-events-none" />
                    </div>

                </div>

                {/* Footer and Summary */}
                <div className="p-4 border-t border-[#282828] bg-[#181818] shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-sm text-subdued hidden md:block">
                            {selection === 'custom'
                                ? `נבחרו ${customSelectedLines.length} שורות (משולב)`
                                : `נבחר תמלול ${selection === 'original' ? 'מקורי' : 'חדש'} מלא`
                            }
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 md:flex-none py-2 px-6 rounded-xl font-bold bg-[#282828] hover:bg-white/10 text-subdued transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleConfirm}
                                className="flex-[2] md:flex-none py-2 px-8 rounded-xl font-bold bg-[#1DB954] hover:bg-[#1ed760] text-black transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(29,185,84,0.3)]"
                            >
                                <Check size={18} />
                                שמור שינויים
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
