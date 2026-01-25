/**
 * Freestyle Page
 * Recording with YouTube beats
 */

import { useState } from 'react';

export default function FreestylePage() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [beatUrl, setBeatUrl] = useState('');
    const [currentBeat, setCurrentBeat] = useState('Lo-Fi 85 BPM');
    const [markers, setMarkers] = useState<number[]>([]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">🎤 פריסטייל</h1>
                <button className="text-gray-500 hover:text-white">?</button>
            </div>

            {/* Recording Section */}
            <div className="bg-[#12121a] rounded-2xl p-6 mb-6 border border-gray-800 text-center">
                {/* Timer */}
                <div className="text-4xl font-mono mb-6">
                    {formatTime(recordingTime)}
                </div>

                {/* REC Button */}
                <button
                    onClick={() => setIsRecording(!isRecording)}
                    className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${isRecording
                            ? 'bg-red-500 animate-pulse scale-110'
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                >
                    <span className="text-2xl">{isRecording ? '⏹' : '🔴'}</span>
                </button>
                <p className="text-sm text-gray-500">
                    {isRecording ? 'הקלטה...' : 'לחץ להקלטה'}
                </p>

                {/* Markers */}
                {isRecording && (
                    <button
                        onClick={() => setMarkers([...markers, recordingTime])}
                        className="mt-4 px-4 py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500"
                    >
                        📍 Mark ({markers.length})
                    </button>
                )}
            </div>

            {/* Beat Section */}
            <div className="bg-[#12121a] rounded-2xl p-4 mb-6 border border-gray-800">
                <h2 className="text-sm text-gray-400 mb-3">🎵 Beat</h2>

                {/* Search */}
                <input
                    type="text"
                    placeholder="🔍 חפש ביוטיוב..."
                    className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <input
                    type="text"
                    placeholder="📋 הדבק לינק יוטיוב"
                    value={beatUrl}
                    onChange={(e) => setBeatUrl(e.target.value)}
                    className="w-full bg-gray-800 rounded-lg px-4 py-3 mb-4 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />

                {/* Playlist Nav */}
                <div className="flex items-center justify-between">
                    <button className="text-2xl text-gray-500 hover:text-white">◀</button>
                    <span className="text-sm">{currentBeat}</span>
                    <button className="text-2xl text-gray-500 hover:text-white">▶</button>
                </div>
            </div>

            {/* Lyrics Section */}
            <div className="bg-[#12121a] rounded-2xl p-4 border border-gray-800">
                <h2 className="text-sm text-gray-400 mb-3">📝 Lyrics (optional)</h2>
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">[0:15]</span>
                        <span>שורה ראשונה...</span>
                    </div>
                    <button className="text-sm text-purple-400 hover:text-purple-300">
                        + הוסף שורה
                    </button>
                </div>
            </div>
        </div>
    );
}
