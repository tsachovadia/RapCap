import { useState, useMemo, useCallback } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useProfile } from '../hooks/useProfile'
import { db, type Session } from '../db/db'
import { Music, Settings } from 'lucide-react'

import SearchSortBar from '../components/library/SearchSortBar'
import SessionCard from '../components/library/SessionCard'
import SessionPlayer from '../components/library/SessionPlayer'
import MiniPlayer from '../components/library/MiniPlayer'
import TranscriptionComparisonModal from '../components/library/TranscriptionComparisonModal'

export default function LibraryPage() {
    const { sessions, isLoading, deleteSession } = useSessions()
    const { profile } = useProfile()

    // Search & Sort State
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilter, setActiveFilter] = useState('all')
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'duration'>('date')

    // Player State
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [isBuffering, setIsBuffering] = useState(false)

    // Transcription State
    const [transcribingSessionId, setTranscribingSessionId] = useState<number | null>(null)
    const [comparisonData, setComparisonData] = useState<{
        session: Session
        original: any
        generated: any
    } | null>(null)

    // Get active session
    const activeSession = useMemo(() => {
        return sessions?.find(s => s.id === activeSessionId) || null
    }, [sessions, activeSessionId])

    // Filtered & Sorted Sessions
    const filteredSessions = useMemo(() => {
        if (!sessions) return []

        let result = [...sessions]

        // Filter by type
        if (activeFilter !== 'all') {
            result = result.filter(s => s.type === activeFilter)
        }

        // Filter by search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            result = result.filter(s =>
                s.title.toLowerCase().includes(query) ||
                s.metadata?.lyrics?.toLowerCase().includes(query)
            )
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                case 'name':
                    return a.title.localeCompare(b.title, 'he')
                case 'duration':
                    return (b.duration || 0) - (a.duration || 0)
                default:
                    return 0
            }
        })

        return result
    }, [sessions, activeFilter, searchQuery, sortBy])

    // Handlers
    const handlePlayPause = useCallback((id: number) => {
        if (activeSessionId === id) {
            setIsPlaying(!isPlaying)
        } else {
            setActiveSessionId(id)
            setIsPlaying(true)
            setIsBuffering(false)
            setCurrentTime(0)
        }
    }, [activeSessionId, isPlaying])

    const handleExpand = useCallback((id: number) => {
        if (activeSessionId !== id) {
            setActiveSessionId(id)
            setIsPlaying(true)
            setCurrentTime(0)
        }
        setIsExpanded(true)
    }, [activeSessionId])

    const handleClosePlayer = useCallback(() => {
        setIsExpanded(false)
    }, [])

    const handleTranscribe = useCallback(async (session: Session) => {
        if (!session.id) return
        setTranscribingSessionId(session.id)

        try {
            let audioBlob = session.blob
            if (!audioBlob && session.metadata?.cloudUrl) {
                const response = await fetch(session.metadata.cloudUrl)
                audioBlob = await response.blob()
            }

            if (!audioBlob) throw new Error("Audio data not found")

            const { transcribeAudio } = await import('../services/whisper')
            const result = await transcribeAudio(audioBlob, (session.metadata?.language as 'he' | 'en') || 'he')

            setComparisonData({
                session,
                original: {
                    text: session.metadata?.lyrics || '',
                    segments: session.metadata?.lyricsSegments || [],
                    words: session.metadata?.lyricsWords || []
                },
                generated: {
                    text: result.text,
                    segments: result.segments,
                    words: result.wordSegments
                }
            })
        } catch (err) {
            console.error(err)
            alert("שגיאה בתמלול: " + String(err))
        } finally {
            setTranscribingSessionId(null)
        }
    }, [])

    const handleDownload = useCallback((session: Session) => {
        if (!session.blob) return
        const url = URL.createObjectURL(session.blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${session.title || 'recording'}.mp3`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }, [])

    const handleCopyLyrics = useCallback((session: Session) => {
        const lyrics = session.metadata?.lyrics
        if (lyrics) {
            navigator.clipboard.writeText(lyrics)
        }
    }, [])

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-[#1DB954] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-subdued">טוען ספריה...</p>
            </div>
        )
    }

    return (
        <div className="pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-4 bg-gradient-to-b from-[#181818] to-[#121212]">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-black hover:scale-105 transition-transform"
                            style={{ backgroundColor: profile.avatarColor }}
                        >
                            {profile.name[0].toUpperCase()}
                        </button>
                        <h1 className="text-xl font-bold">הספריה שלך</h1>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-[#282828] flex items-center justify-center hover:bg-[#383838] transition-colors">
                        <Settings size={18} className="text-subdued" />
                    </button>
                </div>

                <SearchSortBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    activeFilter={activeFilter}
                    onFilterChange={setActiveFilter}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                />
            </header>

            <div className="px-4">
                {/* Empty State */}
                {filteredSessions.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#282828] to-[#181818] mx-auto mb-4 flex items-center justify-center">
                            <Music className="text-subdued" size={36} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">
                            {searchQuery ? 'לא נמצאו תוצאות' : 'עדיין אין כאן כלום'}
                        </h3>
                        <p className="text-subdued text-sm">
                            {searchQuery ? 'נסה לחפש משהו אחר' : 'התחל להקליט כדי למלא את הספריה שלך'}
                        </p>
                    </div>
                )}

                {/* Sessions List */}
                <div className="space-y-2">
                    {filteredSessions.map((session) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            isActive={activeSessionId === session.id}
                            isPlaying={isPlaying && activeSessionId === session.id}
                            isBuffering={isBuffering && activeSessionId === session.id}
                            isTranscribing={transcribingSessionId === session.id}
                            onPlayPause={() => session.id && handlePlayPause(session.id)}
                            onExpand={() => session.id && handleExpand(session.id)}
                            onTranscribe={() => handleTranscribe(session)}
                            onDownload={() => handleDownload(session)}
                            onCopyLyrics={() => handleCopyLyrics(session)}
                            onDelete={() => session.id && deleteSession(session.id)}
                        />
                    ))}
                </div>
            </div>

            {/* Expanded Player Modal */}
            {isExpanded && activeSession && (
                <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg overflow-y-auto">
                    <div className="min-h-full p-4 pt-8 pb-24">
                        <div className="max-w-2xl mx-auto">
                            <h2 className="text-lg font-bold text-white mb-4 text-center">
                                {activeSession.title}
                            </h2>
                            <SessionPlayer
                                session={activeSession}
                                isPlaying={isPlaying}
                                onPlayPause={() => setIsPlaying(!isPlaying)}
                                onClose={handleClosePlayer}
                                onEnded={() => setIsPlaying(false)}
                                onTimeUpdate={setCurrentTime}
                                onLoadingChange={setIsBuffering}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Mini Player (when collapsed) */}
            {!isExpanded && activeSession && (
                <MiniPlayer
                    session={activeSession}
                    isPlaying={isPlaying}
                    isBuffering={isBuffering}
                    currentTime={currentTime}
                    onPlayPause={() => setIsPlaying(!isPlaying)}
                    onExpand={() => setIsExpanded(true)}
                />
            )}

            {/* Transcription Comparison Modal */}
            {comparisonData && (
                <TranscriptionComparisonModal
                    isOpen={true}
                    onClose={() => setComparisonData(null)}
                    original={comparisonData.original}
                    generated={comparisonData.generated}
                    onConfirm={async (selectedData) => {
                        try {
                            if (comparisonData.session?.id) {
                                await db.sessions.update(comparisonData.session.id, {
                                    'metadata.lyrics': selectedData.text,
                                    'metadata.lyricsSegments': selectedData.segments,
                                    'metadata.lyricsWords': selectedData.words
                                })
                            }
                        } catch (e) {
                            console.error("Failed to update session", e)
                            alert("שגיאה בשמירת התמלול")
                        }
                    }}
                />
            )}
        </div>
    )
}
