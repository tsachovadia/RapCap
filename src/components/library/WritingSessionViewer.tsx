import { useState, useRef, useEffect } from 'react'
import type { DbSession } from '../../db/db'
import { db } from '../../db/db'
import { Calendar, Clock, Music, Play, Pause, Edit2, Plus, Trash2 } from 'lucide-react'
import YouTube from 'react-youtube'
import { useLiveQuery } from 'dexie-react-hooks'

// Simple auto-resize textarea component
const AutoResizeTextarea = ({ value, onChange, className, ...props }: any) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, [value])

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            className={className}
            rows={1}
            {...props}
        />
    )
}

interface WritingSessionViewerProps {
    session: DbSession
    onClose: () => void
}

export default function WritingSessionViewer({ session }: WritingSessionViewerProps) {
    const [lines, setLines] = useState<string[]>(session.metadata?.lines || session.metadata?.lyrics?.split('\n') || [])
    const linkedRhymes = session.metadata?.linkedRhymes || []

    // Fetch all groups to resolve IDs to Names
    // IMPORTANT: Ensure ID is treated consistently as number
    const allGroups = useLiveQuery(() => db.wordGroups.toArray())
    const groupMap = new Map((allGroups || []).filter(g => g.id !== undefined).map(g => [Number(g.id), g.name]))

    // Beat Playback State
    const [isPlayingBeat, setIsPlayingBeat] = useState(false)
    const playerRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Save changes debounced or on blur
    const saveSession = async (newLines: string[], newLinkedRhymes?: any[]) => {
        if (!session.id) return
        const updates: any = {
            'metadata.lines': newLines, // Keeping distinct lines array for editing
            'metadata.lyrics': newLines.join('\n'), // For backward compatibility/display
            updatedAt: new Date()
        }
        if (newLinkedRhymes) {
            updates['metadata.linkedRhymes'] = newLinkedRhymes
        }
        await db.sessions.update(session.id, updates)
    }

    const handleLineChange = (index: number, val: string) => {
        const newLines = [...lines]
        newLines[index] = val
        setLines(newLines)
        saveSession(newLines)
    }

    const handleAddLine = () => {
        const newLines = [...lines, ""]
        setLines(newLines)
        saveSession(newLines)
    }

    const handleDeleteLine = (index: number) => {
        const newLines = lines.filter((_, i) => i !== index)

        // Update linked rhymes: remove links for deleted line, shift others up
        const newLinkedRhymes = linkedRhymes
            .filter((lr: any) => lr.lineIndex !== index)
            .map((lr: any) => ({
                ...lr,
                lineIndex: lr.lineIndex > index ? lr.lineIndex - 1 : lr.lineIndex
            }))

        setLines(newLines)
        saveSession(newLines, newLinkedRhymes)
    }

    const toggleBeat = () => {
        if (!playerRef.current) return
        if (isPlayingBeat) {
            playerRef.current.pauseVideo()
        } else {
            playerRef.current.playVideo()
        }
        setIsPlayingBeat(!isPlayingBeat)
    }

    const fmtDate = (d: Date) => {
        return new Date(d).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    // Identify linked groups for highlighting badge
    const getLinkedGroupsForLine = (lineIndex: number) => {
        const links = linkedRhymes.filter((lr: any) => lr.lineIndex === lineIndex)
        // Deduplicate group IDs
        const groupIds = Array.from(new Set(links.map((lr: any) => lr.rhymeId)))

        return groupIds
            .map(id => {
                const numericId = Number(id); // Force number
                return {
                    id: numericId,
                    name: groupMap.get(numericId)
                }
            })
            .filter(g => !!g.name) as { id: number, name: string }[]
    }

    return (
        <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full pb-32" ref={containerRef}>
            {/* Header Card */}
            <div className="bg-[#181818] border border-[#282828] rounded-xl p-6 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Edit2 size={64} />
                </div>

                <h1 className="text-3xl font-black text-white mb-2">{session.title || 'Untitled Session'}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-subdued items-center">
                    <span className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        {fmtDate(session.createdAt)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                    <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {lines.length} bars
                    </span>
                    {session.beatId && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                            <span className="flex items-center gap-1.5 text-purple-400">
                                <Music size={14} />
                                {session.beatId}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Editor Area */}
            <div className="bg-[#181818] border border-[#282828] rounded-xl p-6 relative min-h-[60vh]">
                <div className="absolute top-4 right-4 text-xs font-mono text-subdued opacity-50 uppercase tracking-widest border border-white/10 px-2 py-0.5 rounded pointer-events-none">
                    Session Editor
                </div>

                <div className="space-y-2 font-hebrew text-lg lg:text-xl leading-relaxed text-white/90 mt-6" style={{ direction: 'rtl' }}>
                    {lines.map((line, idx) => {
                        const linkedGroups = getLinkedGroupsForLine(idx)

                        return (
                            <div key={idx} className="flex gap-4 group relative items-start">
                                {/* Line Number */}
                                <span className="text-subdued/20 font-mono text-sm shrink-0 w-6 pt-2.5 select-none text-center">
                                    {idx + 1}
                                </span>

                                {/* Input / Content */}
                                <div className="flex-1 relative">
                                    <AutoResizeTextarea
                                        value={line}
                                        onChange={(e: any) => handleLineChange(idx, e.target.value)}
                                        className="w-full bg-transparent border-0 outline-none text-white placeholder-subdued/20 resize-none py-2 px-1 focus:bg-white/5 rounded transition-colors"
                                        placeholder="Start writing..."
                                        style={{ direction: 'rtl' }}
                                    />

                                    {linkedGroups.length > 0 && (
                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 -ml-4 flex flex-col gap-1 items-end pointer-events-none opacity-60">
                                            {linkedGroups.map(g => (
                                                <span key={g.id} className="text-[10px] bg-[#1DB954]/20 text-[#1DB954] px-1.5 py-0.5 rounded border border-[#1DB954]/30 whitespace-nowrap">
                                                    {g.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <button
                                    onClick={() => handleDeleteLine(idx)}
                                    className="opacity-0 group-hover:opacity-100 p-2 text-red-500/50 hover:text-red-500 transition-all absolute -left-8 top-0"
                                    title="Delete line"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )
                    })}

                    <button
                        onClick={handleAddLine}
                        className="w-full py-4 text-subdued/50 hover:text-subdued hover:bg-white/5 border border-dashed border-transparent hover:border-white/10 rounded-lg transition-all flex items-center justify-center gap-2 mt-4"
                    >
                        <Plus size={16} />
                        <span>Add Bar</span>
                    </button>
                </div>
            </div>

            {/* Beat Player Footer (Sticky) */}
            {session.beatId && (
                <div className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#333] p-4 flex items-center justify-between z-40 lg:pl-64">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#222] rounded-lg flex items-center justify-center">
                            <Music className="text-purple-500" />
                        </div>
                        <div>
                            <div className="text-sm text-subdued uppercase font-bold text-[10px]">Backing Track</div>
                            <div className="font-bold text-white max-w-[200px] truncate">{session.beatId}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleBeat}
                            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                        >
                            {isPlayingBeat ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
                        </button>
                    </div>

                    {/* Hidden Player */}
                    <div className="hidden">
                        <YouTube
                            videoId={session.beatId}
                            onReady={(e) => {
                                playerRef.current = e.target;
                            }}
                            onStateChange={(e) => {
                                setIsPlayingBeat(e.data === 1)
                            }}
                            opts={{ height: '0', width: '0', playerVars: { playsinline: 1, controls: 0 } }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
