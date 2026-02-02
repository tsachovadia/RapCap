import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { DbSession } from '../db/db'
import { useState, useMemo, useEffect } from 'react'
import { Search, Filter, CheckSquare, Trash2, ChevronDown, ChevronRight, X } from 'lucide-react'
import SessionCard from '../components/library/SessionCard'
import SessionPlayer from '../components/library/SessionPlayer'
import MiniPlayer from '../components/library/MiniPlayer'

// -- Helper: Group by Date --
const groupSessionsByDate = (sessions: DbSession[]) => {
    const groups: Record<string, DbSession[]> = {};

    sessions.forEach(session => {
        const date = new Date(session.createdAt);
        // Reset time to midnight for grouping
        const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();

        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(session);
    });

    // Convert to array and sort by date descending
    return Object.entries(groups)
        .map(([dateStr, sessionList]) => ({
            date: new Date(dateStr),
            sessions: sessionList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
};

export default function LibraryPage() {
    // Data
    const sessions = useLiveQuery(() => db.sessions.toArray())

    // UI State
    const [searchQuery, setSearchQuery] = useState('')
    const [activeSession, setActiveSession] = useState<DbSession | null>(null)
    const [isPlayerExpanded, setIsPlayerExpanded] = useState(false)

    // Player State
    const [isPlaying, setIsPlaying] = useState(false)
    const [isBuffering, setIsBuffering] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)

    // Multi-select State
    const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)
    const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())

    // Grouping State (Open/Closed groups)
    // We'll init this when sessions load, defaulting to the most recent open
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    // Effect to expand the most recent group by default when sessions load
    useEffect(() => {
        if (sessions && sessions.length > 0 && expandedGroups.size === 0) {
            const grouped = groupSessionsByDate(sessions);
            if (grouped.length > 0) {
                // Use the ISO string of the date as the key
                setExpandedGroups(new Set([grouped[0].date.toISOString()]));
            }
        }
    }, [sessions]);


    // Filter Logic
    const filteredSessions = useMemo(() => {
        if (!sessions) return []
        return sessions
            .filter(s => {
                const query = searchQuery.toLowerCase()
                return (
                    (s.metadata?.lyrics?.toLowerCase().includes(query)) ||
                    (s.beatId?.toLowerCase().includes(query)) ||
                    (new Date(s.createdAt).toLocaleDateString().includes(query))
                )
            })
            // Sort by createdAt desc (Global sort before grouping, though grouping handles its own sort)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }, [sessions, searchQuery])

    const groupedSessions = useMemo(() => groupSessionsByDate(filteredSessions), [filteredSessions]);


    // Handlers
    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this session?')) {
            await db.sessions.delete(parseInt(id, 10))
        }
    }

    const toggleMultiSelect = () => {
        setIsMultiSelectMode(!isMultiSelectMode);
        setSelectedSessionIds(new Set()); // Reset selection when toggling
    };

    const handleToggleSelectSession = (id: string) => {
        const newSet = new Set(selectedSessionIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedSessionIds(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedSessionIds.size === 0) return;
        if (confirm(`Delete ${selectedSessionIds.size} sessions?`)) {
            const idsToDelete = Array.from(selectedSessionIds).map(id => parseInt(id, 10));
            await db.sessions.bulkDelete(idsToDelete);
            setSelectedSessionIds(new Set());
            setIsMultiSelectMode(false);
        }
    };

    const handlePlaySession = (session: DbSession) => {
        setActiveSession(session)
        setIsPlayerExpanded(true)
        setIsPlaying(true)
        setCurrentTime(0)
    };

    const toggleGroups = (dateKey: string) => {
        const newSet = new Set(expandedGroups);
        if (newSet.has(dateKey)) {
            newSet.delete(dateKey);
        } else {
            newSet.add(dateKey);
        }
        setExpandedGroups(newSet);
    };


    // Helper for formatting date headers
    const formatDateHeader = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] bg-[#121212] text-white overflow-hidden pb-20">

            {/* Header */}
            <header className="p-4 border-b border-[#282828] bg-[#121212] z-10 shrink-0">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-black tracking-tight">Your Library</h1>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {isMultiSelectMode && selectedSessionIds.size > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="px-3 py-2 bg-red-900/30 text-red-500 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-red-900/50 transition-colors animate-in fade-in"
                            >
                                <Trash2 size={16} />
                                Delete ({selectedSessionIds.size})
                            </button>
                        )}

                        <button
                            onClick={toggleMultiSelect}
                            className={`p-2 rounded-full transition-colors ${isMultiSelectMode ? 'bg-[#1DB954] text-black' : 'bg-[#282828] text-subdued hover:text-white'}`}
                            title={isMultiSelectMode ? "Cancel Selection" : "Multi-select"}
                        >
                            {isMultiSelectMode ? <X size={20} /> : <CheckSquare size={20} />}
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-subdued" size={18} />
                    <input
                        type="text"
                        placeholder="Search flows, beats, dates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#282828] rounded-full py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#1DB954] placeholder-subdued/50 transition-all"
                    />
                </div>
            </header>

            {/* Main Content - Scrollable List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar space-y-4">
                {!sessions ? (
                    <div className="flex items-center justify-center py-20">Loading...</div>
                ) : filteredSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-subdued gap-4 text-center opacity-50">
                        <Filter size={48} />
                        <p>No sessions found...</p>
                    </div>
                ) : (
                    <div className="space-y-6 pb-20">
                        {groupedSessions.map(group => {
                            const dateKey = group.date.toISOString();
                            const isExpanded = expandedGroups.has(dateKey);

                            return (
                                <div key={dateKey} className="space-y-2">
                                    {/* Date Header */}
                                    <button
                                        onClick={() => toggleGroups(dateKey)}
                                        className="flex items-center gap-2 w-full text-left py-2 hover:bg-[#181818] rounded-lg px-2 -mx-2 transition-colors select-none group"
                                    >
                                        <div className={`p-1 rounded-full bg-[#282828] text-subdued group-hover:text-white transition-colors`}>
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                        <span className="font-bold text-sm text-subdued uppercase tracking-wider group-hover:text-white transition-colors">
                                            {formatDateHeader(group.date)}
                                        </span>
                                        <span className="text-xs text-subdued/50 ml-auto">{group.sessions.length}</span>
                                    </button>

                                    {/* Group Items */}
                                    {isExpanded && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            {group.sessions.map(session => (
                                                <SessionCard
                                                    key={session.id}
                                                    session={session}
                                                    onPlay={handlePlaySession}
                                                    onDelete={handleDelete}
                                                    isMultiSelectMode={isMultiSelectMode}
                                                    isSelected={session.id ? selectedSessionIds.has(String(session.id)) : false}
                                                    onToggleSelect={handleToggleSelectSession}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Players */}
            {activeSession && (
                <>
                    {/* SessionPlayer is always rendered to maintain audio state, but hidden if minimized */}

                    <div style={{ display: isPlayerExpanded ? 'block' : 'none' }} className="fixed inset-0 z-50 bg-[#121212] p-4 overflow-y-auto">
                        <div className="max-w-screen-md mx-auto h-full flex flex-col">
                            <button
                                onClick={() => setIsPlayerExpanded(false)}
                                className="self-start mb-4 p-2 text-subdued hover:text-white"
                            >
                                <ChevronDown size={24} />
                            </button>
                            <SessionPlayer
                                session={activeSession}
                                isPlaying={isPlaying}
                                onPlayPause={() => setIsPlaying(!isPlaying)}
                                onEnded={() => setIsPlaying(false)}
                                onTimeUpdate={setCurrentTime}
                                onLoadingChange={setIsBuffering}
                                onClose={() => setIsPlayerExpanded(false)}
                            />
                        </div>
                    </div>

                    {!isPlayerExpanded && (
                        <MiniPlayer
                            session={activeSession}
                            isPlaying={isPlaying}
                            isBuffering={isBuffering}
                            currentTime={currentTime}
                            onPlayPause={() => setIsPlaying(!isPlaying)}
                            onExpand={() => setIsPlayerExpanded(true)}
                        />
                    )}
                </>
            )}
        </div>
    )
}
