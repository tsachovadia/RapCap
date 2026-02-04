import { FileText } from 'lucide-react'
import { getRhymeColor } from '../../utils/rhymeColors'

interface LyricsDisplayProps {
    lyrics?: string
    segments?: Array<{ text: string, timestamp: number }>
    annotatedLines?: Array<{
        timestamp: number;
        words: Array<{ text: string, rhymeGroupIndex?: number }>;
    }>
    onSeek?: (time: number) => void
    currentTime?: number
}

export default function LyricsDisplay({ lyrics, segments, annotatedLines, onSeek, currentTime = 0 }: LyricsDisplayProps) {
    if (!lyrics && (!segments || segments.length === 0) && (!annotatedLines || annotatedLines.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center border border-[#282828] rounded-lg bg-[#121212] h-full min-h-[200px]">
                <FileText className="text-[#282828] mb-2" size={32} />
                <p className="text-subdued text-xs">אין מילים לשיר זה</p>
            </div>
        )
    }

    return (
        <div className="bg-[#121212] rounded-lg border border-[#282828] overflow-hidden flex flex-col h-full max-h-[500px] shadow-inner">
            <div className="px-4 py-3 border-b border-[#282828] bg-[#0a0a0a] flex justify-between items-center">
                <h3 className="text-xs font-bold text-subdued uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} />
                    מילים
                </h3>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative bg-[#121212]">
                {annotatedLines && annotatedLines.length > 0 ? (
                    <div className="space-y-6" dir="rtl">
                        {annotatedLines.map((line, i) => {
                            const isActive = currentTime >= line.timestamp && (i === annotatedLines.length - 1 || currentTime < annotatedLines[i + 1].timestamp)

                            return (
                                <div
                                    key={i}
                                    className={`relative group transition-all duration-300 ${isActive ? 'opacity-100 scale-[1.01]' : 'opacity-60 hover:opacity-90'}`}
                                >
                                    <div
                                        onClick={() => onSeek?.(line.timestamp)}
                                        className="flex flex-wrap gap-x-2 gap-y-2 items-baseline leading-relaxed cursor-pointer"
                                    >
                                        {line.words.map((wordObj, wIdx) => {
                                            const color = wordObj.rhymeGroupIndex !== undefined
                                                ? getRhymeColor(wordObj.rhymeGroupIndex)
                                                : undefined;

                                            return (
                                                <span
                                                    key={wIdx}
                                                    className={`
                                                        px-1.5 py-0.5 rounded-[4px] text-lg font-medium transition-transform hover:scale-105
                                                        ${color ? 'text-black font-bold shadow-sm' : 'text-gray-300'}
                                                    `}
                                                    style={color ? { backgroundColor: color, boxShadow: `0 0 10px ${color}40` } : {}}
                                                >
                                                    {wordObj.text}
                                                </span>
                                            )
                                        })}
                                    </div>
                                    <span className="absolute -left-8 top-1 text-[10px] text-subdued font-mono opacity-0 group-hover:opacity-50 transition-opacity">
                                        {Math.floor(line.timestamp / 60)}:{Math.floor(line.timestamp % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                ) : segments && segments.length > 0 ? (
                    <div className="space-y-4" dir="auto">
                        {segments.map((seg, i) => {
                            const isActive = currentTime >= seg.timestamp && (i === segments.length - 1 || currentTime < segments[i + 1].timestamp)

                            return (
                                <div
                                    key={i}
                                    onClick={() => onSeek?.(seg.timestamp)}
                                    className={`p-3 rounded-md cursor-pointer transition-all ${isActive ? 'bg-[#1DB954]/10 border-r-2 border-[#1DB954]' : 'hover:bg-white/5'}`}
                                >
                                    <p className={`text-base leading-relaxed ${isActive ? 'text-white font-medium' : 'text-gray-400'}`}>
                                        {seg.text}
                                    </p>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-subdued opacity-50 font-mono">
                                            {Math.floor(seg.timestamp / 60)}:{Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <p className="text-gray-300 text-base whitespace-pre-wrap leading-relaxed font-sans">
                        {lyrics}
                    </p>
                )}
            </div>
        </div>
    )
}
