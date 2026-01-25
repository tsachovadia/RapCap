/**
 * Library Page
 * Saved recording sessions with synced playback
 */

import { useState } from 'react';

interface Marker {
    time: number;
    label: string;
}

interface Lyric {
    time: number;
    text: string;
}

interface Session {
    id: string;
    name: string;
    date: string;
    duration: number; // seconds
    beat: string;
    markers: Marker[];
    lyrics: Lyric[];
}

const mockSessions: Session[] = [
    {
        id: '1',
        name: 'Session 1',
        date: '25/01/25',
        duration: 225,
        beat: 'Lo-Fi 85 BPM',
        markers: [
            { time: 15, label: 'Drop 1' },
            { time: 45, label: 'Hook' },
            { time: 80, label: 'Punchline' },
        ],
        lyrics: [
            { time: 15, text: 'שלום עולם' },
            { time: 22, text: 'אני בא מהמקום' },
            { time: 30, text: 'שבו הכל אפשרי' },
        ],
    },
    {
        id: '2',
        name: 'Session 2',
        date: '24/01/25',
        duration: 132,
        beat: 'Boom Bap 90 BPM',
        markers: [],
        lyrics: [],
    },
];

export default function LibraryPage() {
    const [sessions] = useState(mockSessions);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [currentTime, setCurrentTime] = useState(0);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    if (selectedSession) {
        return (
            <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setSelectedSession(null)}
                        className="text-gray-400 hover:text-white"
                    >
                        ←
                    </button>
                    <h1 className="text-lg font-bold">{selectedSession.name}</h1>
                    <button className="text-purple-400">📤</button>
                </div>

                {/* Playback */}
                <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-800">
                    <div className="flex items-center gap-3 mb-3">
                        <button className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                            ▶
                        </button>
                        <div className="flex-1">
                            <input
                                type="range"
                                min="0"
                                max={selectedSession.duration}
                                value={currentTime}
                                onChange={(e) => setCurrentTime(Number(e.target.value))}
                                className="w-full accent-purple-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(selectedSession.duration)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                        <span>🎵 {selectedSession.beat}</span>
                        <span>•</span>
                        <span>🎙️ voice.wav</span>
                    </div>
                </div>

                {/* Markers */}
                {selectedSession.markers.length > 0 && (
                    <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-800">
                        <h2 className="text-sm text-gray-400 mb-3">📍 Markers</h2>
                        <div className="space-y-2">
                            {selectedSession.markers.map((marker, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentTime(marker.time)}
                                    className="flex items-center gap-2 w-full text-right hover:text-purple-400"
                                >
                                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                                        [{formatTime(marker.time)}]
                                    </span>
                                    <span className="text-sm">{marker.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Lyrics */}
                {selectedSession.lyrics.length > 0 && (
                    <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-800">
                        <h2 className="text-sm text-gray-400 mb-3">📝 Lyrics (synced)</h2>
                        <div className="space-y-2">
                            {selectedSession.lyrics.map((lyric, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentTime(lyric.time)}
                                    className={`flex items-center gap-2 w-full text-right transition-colors ${currentTime >= lyric.time &&
                                            (i === selectedSession.lyrics.length - 1 ||
                                                currentTime < selectedSession.lyrics[i + 1].time)
                                            ? 'text-purple-400'
                                            : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <span className="text-xs bg-gray-800 px-2 py-0.5 rounded">
                                        [{formatTime(lyric.time)}]
                                    </span>
                                    <span className="text-sm">{lyric.text}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Export */}
                <div className="bg-[#12121a] rounded-xl p-4 border border-gray-800">
                    <h2 className="text-sm text-gray-400 mb-3">Export</h2>
                    <div className="grid grid-cols-3 gap-2">
                        <button className="py-2 bg-gray-800 rounded-lg text-xs hover:bg-gray-700">
                            🎙️ Voice
                        </button>
                        <button className="py-2 bg-gray-800 rounded-lg text-xs hover:bg-gray-700">
                            🎵 + Beat
                        </button>
                        <button className="py-2 bg-gray-800 rounded-lg text-xs hover:bg-gray-700">
                            📝 TXT
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">📚 ספריה</h1>
                <button className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-xl hover:bg-purple-500">
                    +
                </button>
            </div>

            {/* Sessions */}
            <div className="space-y-3">
                {sessions.map((session) => (
                    <button
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className="w-full bg-[#12121a] rounded-xl p-4 border border-gray-800 text-right hover:border-purple-500 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">🎵 {session.name}</span>
                            <span className="text-xs text-gray-500">
                                {formatTime(session.duration)}
                            </span>
                        </div>
                        <div className="flex gap-2 text-xs text-gray-500">
                            <span>{session.date}</span>
                            <span>•</span>
                            <span>{session.beat}</span>
                            {session.markers.length > 0 && (
                                <>
                                    <span>•</span>
                                    <span>📍 {session.markers.length}</span>
                                </>
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {sessions.length === 0 && (
                <div className="text-center py-20">
                    <div className="text-5xl mb-4">📚</div>
                    <p className="text-gray-500">אין הקלטות שמורות</p>
                </div>
            )}
        </div>
    );
}
