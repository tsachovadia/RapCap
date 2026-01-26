
import { ChevronDown, ChevronUp, Play } from 'lucide-react'
import { useState } from 'react'

export interface Moment {
    id: string
    timestamp: number
    label: string
    lyrics?: string
}

interface MomentsListProps {
    moments: Moment[]
    onSeek: (timestamp: number) => void
}

export default function MomentsList({ moments, onSeek }: MomentsListProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)

    // if (!moments || moments.length === 0) return null

    return (
        <div className="flex flex-col gap-2 mt-4">
            <h3 className="text-xs font-bold text-subdued uppercase tracking-wider mb-1">רגעים נבחרים</h3>
            <div className="space-y-2">
                {moments && moments.length > 0 ? moments.map((moment) => {
                    const isExpanded = expandedId === moment.id
                    return (
                        <div key={moment.id} className="bg-[#282828] rounded-lg overflow-hidden border border-transparent hover:border-white/10 transition-colors">
                            <div
                                className="flex items-center justify-between p-3 cursor-pointer"
                                onClick={() => setExpandedId(isExpanded ? null : moment.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onSeek(moment.timestamp)
                                        }}
                                        className="w-8 h-8 rounded-full bg-[#1DB954]/20 text-[#1DB954] flex items-center justify-center hover:bg-[#1DB954] hover:text-black transition-colors"
                                    >
                                        <Play size={14} fill="currentColor" />
                                    </button>
                                    <div>
                                        <div className="font-medium text-sm text-white">{moment.label}</div>
                                        <div className="text-xs text-subdued font-mono">{formatTime(moment.timestamp)}</div>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronUp size={16} className="text-subdued" /> : <ChevronDown size={16} className="text-subdued" />}
                            </div>

                            {isExpanded && moment.lyrics && (
                                <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-1">
                                    <div className="bg-[#181818] rounded p-3 text-sm text-gray-300 whitespace-pre-wrap border border-white/5">
                                        {moment.lyrics}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }) : (
                    <div className="text-center py-8 text-subdued text-xs border border-dashed border-[#282828] rounded-lg">
                        לא נשמרו רגעים בסשן זה
                    </div>
                )}
            </div>
        </div>
    )
}

function formatTime(seconds: number) {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}
