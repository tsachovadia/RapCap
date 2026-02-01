import { ChevronLeft, ChevronRight } from 'lucide-react'

interface SyncControlsProps {
    syncOffset: number
    onSyncChange: (offset: number) => void
}

export default function SyncControls({ syncOffset, onSyncChange }: SyncControlsProps) {
    return (
        <div className="flex items-center justify-between bg-[#121212] p-2 rounded-lg">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onSyncChange(syncOffset - 50)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#282828] hover:bg-[#383838] rounded-lg text-xs font-medium transition-colors active:scale-95"
                >
                    <ChevronLeft size={14} />
                    -50ms
                </button>
                <button
                    onClick={() => onSyncChange(syncOffset + 50)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#282828] hover:bg-[#383838] rounded-lg text-xs font-medium transition-colors active:scale-95"
                >
                    +50ms
                    <ChevronRight size={14} />
                </button>
            </div>

            <div className="text-xs text-subdued">
                סנכרון: <span className="text-[#1DB954] font-mono">{Math.round(syncOffset)}ms</span>
            </div>
        </div>
    )
}
