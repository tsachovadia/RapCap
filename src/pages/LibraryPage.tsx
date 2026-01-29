import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import SessionPlayer from '../components/library/SessionPlayer'
import { Music, Play, Pause, Trash2, Copy, Check } from 'lucide-react'

import { useProfile } from '../hooks/useProfile'

export default function LibraryPage() {
    const { sessions, isLoading, deleteSession } = useSessions()
    const { profile } = useProfile()
    const [activeFilter, setActiveFilter] = useState('all')
    const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [copiedSessionId, setCopiedSessionId] = useState<number | null>(null)

    const filters = [
        { id: 'all', label: 'הכל' },
        { id: 'freestyle', label: 'הקלטות' },
        { id: 'drill', label: 'אימונים' },
    ]

    const handlePlayPause = (id: number) => {
        if (activeSessionId === id) {
            setIsPlaying(!isPlaying)
        } else {
            setActiveSessionId(id)
            setIsPlaying(true)
        }
    }

    const handleCopyDrill = (session: any) => {
        let textToCopy = ''

        if (session.subtype === 'rhyme-chains') {
            textToCopy = (session.content?.split(', ') || []).join('\n')
        } else if (session.subtype === 'word-association') {
            textToCopy = (session.content?.split(' → ') || []).join(' → ')
        } else {
            textToCopy = session.content || ''
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy)
            setCopiedSessionId(session.id)
            setTimeout(() => setCopiedSessionId(null), 2000)
        }
    }

    const filteredSessions = sessions?.filter(session => {
        if (activeFilter === 'all') return true
        return session.type === activeFilter
    })

    if (isLoading) {
        return <div className="p-8 text-center text-subdued">טוען ספריה...</div>
    }

    return (
        <div className="pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-4" style={{ backgroundColor: '#121212' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black border border-transparent hover:scale-105 transition-transform"
                            style={{ backgroundColor: profile.avatarColor }}
                            onClick={() => { /* Navigate to settings? */ }}
                        >
                            {profile.name[0].toUpperCase()}
                        </button>
                        <h1 className="text-xl font-bold">הספריה שלך</h1>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                    {filters.map((filter) => (
                        <button
                            key={filter.id}
                            onClick={() => setActiveFilter(filter.id)}
                            className={`spotify-chip shrink-0 hover:bg-white/20 transition-colors ${activeFilter === filter.id ? 'active' : ''}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="px-4">
                {/* Empty State */}
                {filteredSessions?.length === 0 && (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-[#282828] mx-auto mb-4 flex items-center justify-center">
                            <Music className="text-subdued" size={32} />
                        </div>
                        <h3 className="text-lg font-bold mb-1">עדיין אין כאן כלום</h3>
                        <p className="text-subdued text-sm">התחל להקליט כדי למלא את הספריה שלך</p>
                    </div>
                )}

                {/* Sessions List */}
                <div className="space-y-4">
                    {filteredSessions?.map((session) => {
                        const isActive = activeSessionId === session.id;

                        return (
                            <div
                                key={session.id}
                                className={`rounded-md p-3 transition-colors ${isActive ? 'bg-[#282828]' : 'hover:bg-[#181818]'}`}
                            >
                                <div className="flex items-center gap-3 mb-2" onClick={() => handlePlayPause(session.id)}>
                                    {/* Thumbnail / Play Button */}
                                    <div
                                        className="w-12 h-12 rounded flex items-center justify-center shrink-0 cursor-pointer relative overflow-hidden group"
                                        style={{ backgroundColor: isActive && isPlaying ? '#1DB954' : '#3E3E3E' }}
                                    >
                                        {isActive && isPlaying ? (
                                            <Pause className="text-black" size={20} fill="currentColor" />
                                        ) : (
                                            <Play className="text-white" size={20} fill="currentColor" />
                                        )}
                                    </div>

                                    {/* Meta */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${isActive ? 'text-[#1DB954]' : 'text-white'}`}>
                                            {session.title}
                                        </p>
                                        <div className="flex items-center gap-2 text-2xs text-subdued">
                                            <span>
                                                {session.beatId ? 'Freestyle' : 'Drill'} • {new Date(session.createdAt).toLocaleDateString('he-IL')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteSession(session.id);
                                        }}
                                        className="btn-icon w-8 h-8"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {/* Expanded Content */}
                                {isActive && (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {session.type === 'freestyle' ? (
                                            <SessionPlayer
                                                session={session}
                                                isPlaying={isPlaying}
                                                onEnded={() => setIsPlaying(false)}
                                            />
                                        ) : (
                                            <div className="bg-[#121212] p-4 rounded border border-[#282828] max-h-60 overflow-y-auto">
                                                {session.subtype === 'rhyme-chains' ? (
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-bold uppercase text-subdued mb-2">שרשרת חרוזים</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(session.content?.split(', ') || []).map((word: string, i: number) => (
                                                                <span key={i} className="px-3 py-1 bg-[#282828] rounded-full text-sm hover:bg-[#E91429]/20 hover:text-[#E91429] transition-colors cursor-default">
                                                                    {word}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : session.subtype === 'word-association' ? (
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-bold uppercase text-subdued mb-2">מסע אסוציאציות</h4>
                                                        <div className="flex flex-wrap items-center gap-2 text-sm">
                                                            {(session.content?.split(' → ') || []).map((word: string, i: number, arr: string[]) => (
                                                                <div key={i} className="flex items-center">
                                                                    <span className="font-medium text-gray-300">{word}</span>
                                                                    {i < arr.length - 1 && (
                                                                        <span className="mx-2 text-subdued">→</span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : session.subtype === 'flow-patterns' ? (
                                                    <div className="text-center py-4">
                                                        <p className="text-lg mb-2">🌊</p>
                                                        <p className="font-bold text-white">{session.content}</p>
                                                        <p className="text-xs text-subdued mt-1">
                                                            {session.metadata?.completed ? 'אימון הושלם בהצלחה' : 'אימון הופסק באמצע'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-subdued whitespace-pre-wrap">{session.content || 'תוכן האימון חסר'}</p>
                                                )}
                                                {session.subtype !== 'flow-patterns' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleCopyDrill(session)
                                                        }}
                                                        className={`mt-3 flex items-center gap-2 text-xs transition-colors ${copiedSessionId === session.id ? 'text-green-500' : 'text-[#1DB954] hover:text-white'}`}
                                                    >
                                                        {copiedSessionId === session.id ? <Check size={14} /> : <Copy size={14} />}
                                                        <span>{copiedSessionId === session.id ? 'הועתק ללוח!' : 'העתק תוכן'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
