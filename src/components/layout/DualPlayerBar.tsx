/**
 * Dual Player Bar
 * Shows recording controls (left) and beat controls (right)
 */

import { useState } from 'react';

interface DualPlayerBarProps {
    onSyncClick?: () => void;
}

export default function DualPlayerBar({ onSyncClick }: DualPlayerBarProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [beatPlaying, setBeatPlaying] = useState(false);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-[#1a1a24] border-t border-gray-800">
            <div className="flex items-center justify-between px-4 h-14">
                {/* Left: Recording */}
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={() => setIsRecording(!isRecording)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isRecording
                                ? 'bg-red-500 animate-pulse'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                    >
                        {isRecording ? '⏹' : '🔴'}
                    </button>
                    <span className="text-sm font-mono text-gray-300">
                        {formatTime(recordingTime)}
                    </span>
                </div>

                {/* Center: Sync */}
                <button
                    onClick={onSyncClick}
                    className="px-3 py-1.5 text-xs font-medium text-purple-400 border border-purple-500/30 rounded-full hover:bg-purple-500/10 transition-colors"
                >
                    🔗 SYNC
                </button>

                {/* Right: Beat */}
                <div className="flex items-center gap-3 flex-1 justify-end">
                    <span className="text-xs text-gray-500 truncate max-w-[100px]">
                        {beatPlaying ? 'Lo-Fi 85 BPM' : 'No Beat'}
                    </span>
                    <button
                        onClick={() => setBeatPlaying(!beatPlaying)}
                        className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center hover:bg-purple-500 transition-colors"
                    >
                        {beatPlaying ? '⏸' : '▶'}
                    </button>
                </div>
            </div>
        </div>
    );
}
