import { useState, useRef, useEffect } from 'react'
import { Link as LinkIcon, Layers, Grid3X3, Maximize2, Minimize2, ChevronDown, ChevronUp, Save, X, Plus } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import BeatPlayer from '../freestyle/BeatPlayer'
import { PRESET_BEATS, DEFAULT_BEAT_ID } from '../../data/beats'
import { db } from '../../db/db'
import { syncService } from '../../services/dbSync'
import { useAuth } from '../../contexts/AuthContext'
import type { FlowState } from '../../pages/RecordPage'


interface Props {
    flowState: FlowState
    language: 'he' | 'en'
    onPreRollComplete: (beatStartTime: number) => void
    onBeatChange?: (beatId: string) => void
    segments: any[]
    interimTranscript: string
}

export default function FreestyleModeUI({ flowState, language, onPreRollComplete, onBeatChange, segments, interimTranscript }: Props) {
    const { user } = useAuth()
    const [videoId, setVideoId] = useState(DEFAULT_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const preRollCheckRef = useRef<number | null>(null)
    const transcriptContainerRef = useRef<HTMLDivElement>(null)


    // NEW: Multi-deck selection for column display
    const [selectedDeckIds, setSelectedDeckIds] = useState<number[]>([])
    const [columnCount, setColumnCount] = useState(4)
    const [showDeckSelector, setShowDeckSelector] = useState(false)
    const [viewMode, setViewMode] = useState<'normal' | 'expanded' | 'collapsed'>('normal')

    // NEW: Zen Mode & Creation Modal
    const [isZenMode, setIsZenMode] = useState(false)
    const [showNewGroupModal, setShowNewGroupModal] = useState(false)
    const [newGroupDraft, setNewGroupDraft] = useState({ name: '', keywords: '', words: [] as string[] })


    // Draft / Edit Mode State
    const [editingDeckIndices, setEditingDeckIndices] = useState<number[]>([])
    const [drafts, setDrafts] = useState<{ [key: number]: { name: string, words: string[], inputValue: string, originalId?: number } }>({})

    // Fetch all word groups for selection
    const allWordGroups = useLiveQuery(() => db.wordGroups.toArray(), [])

    // Initialize random decks on mount or when data loads
    useEffect(() => {
        if (allWordGroups && allWordGroups.length > 0 && selectedDeckIds.length === 0) {
            // Pick 4 random unique decks
            const shuffled = [...allWordGroups].sort(() => 0.5 - Math.random())
            setSelectedDeckIds(shuffled.slice(0, 4).map(g => g.id!))
        }
    }, [allWordGroups])


    // Notify parent when beat changes
    useEffect(() => {
        onBeatChange?.(videoId)
    }, [videoId, onBeatChange])

    // Smart Auto-scroll Transcript
    useEffect(() => {
        if (transcriptContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = transcriptContainerRef.current
            // Only auto-scroll if user is near the bottom (within 150px)
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150

            if (isNearBottom) {
                transcriptContainerRef.current.scrollTo({
                    top: scrollHeight,
                    behavior: 'smooth'
                })
            }
        }
    }, [segments, interimTranscript, isZenMode])

    // Pre-roll Monitoring
    useEffect(() => {
        if (flowState === 'preroll' && youtubePlayer) {
            // Seek to start and play
            youtubePlayer.seekTo(0)
            youtubePlayer.playVideo()
            youtubePlayer.setVolume(beatVolume)

            // Start polling for 2-second mark
            preRollCheckRef.current = window.setInterval(() => {
                const currentTime = youtubePlayer.getCurrentTime()
                if (currentTime >= 2) { // 2 seconds pre-roll
                    if (preRollCheckRef.current) clearInterval(preRollCheckRef.current)
                    onPreRollComplete(currentTime)
                }
            }, 100)
        } else {
            if (preRollCheckRef.current) clearInterval(preRollCheckRef.current)
        }

        return () => {
            if (preRollCheckRef.current) clearInterval(preRollCheckRef.current)
        }
    }, [flowState, youtubePlayer])


    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlSubmit = () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowUrlInput(false)
            setUrlInput('')
        } else {
            alert(language === 'he' ? 'קישור לא תקין' : 'Invalid YouTube URL')
        }
    }

    // Random Replacement Logic
    const replaceWithRandomDeck = (indexToReplace: number) => {
        if (!allWordGroups) return;
        const availableGroups = allWordGroups.filter(g => !selectedDeckIds.includes(g.id!));
        if (availableGroups.length === 0) return;
        const randomGroup = availableGroups[Math.floor(Math.random() * availableGroups.length)];
        const newIds = [...selectedDeckIds];
        newIds[indexToReplace] = randomGroup.id!;
        setSelectedDeckIds(newIds);
    }

    // --- Draft Logic Helpers ---
    const toggleEditMode = (index: number) => {
        if (editingDeckIndices.includes(index)) {
            // Cancel edit
            setEditingDeckIndices(prev => prev.filter(i => i !== index))
        } else {
            // Start edit
            const deckId = selectedDeckIds[index]
            const existingDeck = allWordGroups?.find(g => g.id === deckId)

            if (!drafts[index]) {
                setDrafts(prev => ({
                    ...prev,
                    [index]: {
                        name: existingDeck ? existingDeck.name : "New Group",
                        words: existingDeck ? [...existingDeck.items] : [],
                        inputValue: "",
                        originalId: existingDeck?.id
                    }
                }))
            }
            setEditingDeckIndices(prev => [...prev, index])
        }
    }

    const handleDraftNameChange = (index: number, name: string) => {
        setDrafts(prev => ({ ...prev, [index]: { ...prev[index], name } }))
    }

    const handleDraftInputChange = (index: number, value: string) => {
        setDrafts(prev => ({ ...prev, [index]: { ...prev[index], inputValue: value } }))
    }

    const addWordToDraft = (index: number) => {
        const draft = drafts[index]
        if (!draft || !draft.inputValue.trim()) return

        const newWords = draft.inputValue.split(',').map(s => s.trim()).filter(s => s.length > 0)

        setDrafts(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                words: [...prev[index].words, ...newWords],
                inputValue: ""
            }
        }))
    }

    const removeWordFromDraft = (index: number, wordIndexToRemove: number) => {
        setDrafts(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                words: prev[index].words.filter((_, i) => i !== wordIndexToRemove)
            }
        }))
    }

    const saveDraft = async (index: number) => {
        const draft = drafts[index]
        if (!draft || !draft.name.trim() || draft.words.length === 0) {
            alert("Please enter a name and at least one word.")
            return
        }

        try {
            let finalId: number;

            // Check if we can update existing
            const existing = draft.originalId ? await db.wordGroups.get(draft.originalId) : null

            // Only update if it exists AND it's a custom group (to avoid overwriting system seeds if that's a concern, though user might want to fork system seeds)
            // For now, let's assume we can update if it's 'custom' OR if the user intends to edit their own stuff.
            // Safest: Update if existing.category === 'custom'. Else create new.
            const shouldUpdate = existing && existing.category === 'custom'

            if (shouldUpdate && draft.originalId) {
                await db.wordGroups.update(draft.originalId, {
                    name: draft.name,
                    items: draft.words,
                    lastUsedAt: new Date()
                })
                finalId = draft.originalId
            } else {
                // Create New
                const newId = await db.wordGroups.add({
                    name: draft.name,
                    items: draft.words,
                    category: 'custom',
                    language: language,
                    createdAt: new Date(),
                    lastUsedAt: new Date()
                })
                finalId = newId as number
            }

            // Update selection to show group (if ID changed, or forced refresh)
            const newIds = [...selectedDeckIds]
            newIds[index] = finalId
            setSelectedDeckIds(newIds)

            // Trigger background sync
            if (user) {
                syncService.syncWordGroups(user.uid).catch(console.error)
            }

            // Exit edit mode
            setEditingDeckIndices(prev => prev.filter(i => i !== index))

            // Clear draft
            setDrafts(prev => {
                const copy = { ...prev }
                delete copy[index]
                return copy
            })

        } catch (e) {
            console.error("Failed to save group:", e)
            alert("Failed to save group")
        }
    }

    const handleCreateNewGroup = async () => {
        if (!newGroupDraft.name.trim() || newGroupDraft.words.length === 0) {
            alert("Please enter a name and words")
            return
        }

        try {
            const newId = await db.wordGroups.add({
                name: newGroupDraft.name,
                items: newGroupDraft.words,
                category: 'custom',
                language: language,
                createdAt: new Date(),
                lastUsedAt: new Date()
            })

            // Sync
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)

            // Close modal
            setShowNewGroupModal(false)
            setNewGroupDraft({ name: '', keywords: '', words: [] })

            // Select in first slot? Or just let user select it.
            // User just wants to create.
            // Maybe nicely replace the *first* slot with this new one so they see it.
            const newIds = [...selectedDeckIds]
            newIds[0] = newId as number
            setSelectedDeckIds(newIds)

        } catch (e) {
            console.error(e)
        }
    }

    return (
        <div className={`h-full flex flex-col ${viewMode === 'expanded' ? 'absolute inset-0 z-50 bg-[#121212]' : ''}`}>

            {/* Header / Controls */}
            <div className={`flex items-center justify-between p-2 border-b border-[#282828] ${viewMode === 'collapsed' ? 'hidden' : ''}`}>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDeckSelector(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#282828] hover:bg-[#3E3E3E] rounded-lg text-sm text-subdued hover:text-white transition-colors"
                    >
                        <Layers size={14} />
                        <span>{language === 'he' ? 'בחר חרוזים' : 'Select Rhymes'}</span>
                    </button>

                    {/* NEW GROUP BUTTON */}
                    <button
                        onClick={() => setShowNewGroupModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] border border-[#1DB954]/50 rounded-lg text-sm transition-colors"
                    >
                        <Plus size={14} />
                        <span>{language === 'he' ? 'חדש' : 'New'}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* ZEN MODE TOGGLE */}
                    <button
                        onClick={() => setIsZenMode(!isZenMode)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-2 ${isZenMode ? 'bg-purple-500/20 text-purple-400' : 'text-subdued hover:bg-[#282828]'}`}
                        title="Zen Mode"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        <span className="text-xs font-bold">ZEN</span>
                    </button>

                    <div className="w-px h-6 bg-[#282828] mx-1" />

                    <button
                        onClick={() => setColumnCount(3)}
                        className={`p-1.5 rounded-lg transition-colors ${columnCount === 3 ? 'bg-[#1DB954] text-black' : 'text-subdued hover:bg-[#282828]'}`}
                        title="3 Columns"
                    >
                        <Grid3X3 size={16} />
                    </button>
                    <button
                        onClick={() => setColumnCount(4)}
                        className={`p-1.5 rounded-lg transition-colors ${columnCount === 4 ? 'bg-[#1DB954] text-black' : 'text-subdued hover:bg-[#282828]'}`}
                        title="4 Columns"
                    >
                        <Grid3X3 size={16} />
                    </button>

                    <div className="w-px h-6 bg-[#282828] mx-1" />

                    <button
                        onClick={() => setViewMode(prev => prev === 'expanded' ? 'normal' : 'expanded')}
                        className={`p-1.5 rounded-lg transition-colors ${viewMode === 'expanded' ? 'bg-[#1DB954] text-black' : 'text-subdued hover:bg-[#282828]'}`}
                        title={viewMode === 'expanded' ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {viewMode === 'expanded' ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0 relative">
                {/* Upper Section: Beat & Words */}
                <div className={`flex gap-2 min-h-0 relative transition-all duration-300 ${viewMode === 'expanded' ? 'flex-[3]' : 'flex-1'}`}>
                    <div className="flex-1 flex flex-col gap-2 min-h-0">

                        {/* Beat Player - Restored! */}
                        <div className={`h-20 flex-none bg-[#181818] rounded-xl overflow-hidden relative border border-[#282828] group ${viewMode === 'collapsed' ? 'hidden' : ''}`}>
                            <BeatPlayer
                                videoId={videoId}
                                isPlaying={flowState !== 'idle' && flowState !== 'paused'}
                                volume={beatVolume}
                                onReady={(player) => setYoutubePlayer(player)}
                            />

                            {/* Beat Selector Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                {showUrlInput ? (
                                    <div className="flex items-center gap-2 bg-[#181818] p-2 rounded-lg border border-[#333]">
                                        <input
                                            type="text"
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            placeholder="Paste YouTube URL..."
                                            className="bg-transparent border-none outline-none text-white text-sm w-48 font-mono"
                                            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                        />
                                        <button
                                            onClick={handleUrlSubmit}
                                            className="text-[#1DB954] hover:text-white font-bold"
                                        >
                                            OK
                                        </button>
                                        <button onClick={() => setShowUrlInput(false)}>
                                            <X size={16} className="text-subdued" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <select
                                            className="bg-[#181818] text-white text-sm border border-[#333] rounded-lg px-3 py-1.5 outline-none focus:border-[#1DB954] cursor-pointer appearance-none text-center font-bold min-w-[120px]"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    setVideoId(e.target.value);
                                                    setShowUrlInput(false);
                                                }
                                            }}
                                            value={videoId}
                                        >
                                            <option value="" disabled>{language === 'he' ? 'בחר מהרשימה...' : 'Choose from list...'}</option>
                                            {PRESET_BEATS.map(beat => <option key={beat.id} value={beat.id}>{beat.name}</option>)}

                                            {/* Fix: Show active custom beat if it's not in presets */}
                                            {!PRESET_BEATS.some(b => b.id === videoId) && videoId !== '' && (
                                                <option value={videoId}>{language === 'he' ? 'ביט מותאם אישית' : 'Custom Beat'}</option>
                                            )}
                                        </select>

                                        <button
                                            onClick={() => setShowUrlInput(true)}
                                            className="p-2 bg-[#282828] hover:bg-[#3E3E3E] rounded-full text-subdued hover:text-white transition-colors"
                                            title="Paste YouTube Link"
                                        >
                                            <LinkIcon size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Rhyme Deck Columns Grid */}
                        <div
                            className={`flex-1 min-h-0 grid gap-2 transition-all duration-300
                            ${columnCount === 3 ? 'grid-cols-3' : 'grid-cols-4'}
                            ${isZenMode ? 'fixed inset-x-0 top-0 bottom-[30%] z-50 bg-black/95 p-8 backdrop-blur-sm' : ''}
                        `}>
                            {/* Close Zen Mode Button */}
                            {isZenMode && (
                                <button
                                    onClick={() => setIsZenMode(false)}
                                    className="absolute top-4 right-4 z-[60] bg-[#282828] p-2 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <Minimize2 size={24} className="text-white" />
                                </button>
                            )}

                            {Array.from({ length: columnCount }).map((_, idx) => {
                                const deckId = selectedDeckIds[idx]
                                const deck = allWordGroups?.find(g => g.id === deckId)
                                const isEditing = editingDeckIndices.includes(idx)
                                const draft = drafts[idx]

                                if (isEditing) {
                                    // --- EDIT MODE UI ---
                                    return (
                                        <div key={idx} className="bg-[#181818] rounded-lg p-2 flex flex-col border border-[#1DB954] h-full overflow-hidden relative shadow-[0_0_10px_rgba(29,185,84,0.1)]">
                                            {/* Header Input */}
                                            <div className="flex items-center gap-1 mb-2">
                                                <input
                                                    className="bg-transparent border-b border-[#333] focus:border-[#1DB954] text-sm font-bold w-full outline-none text-[#1DB954]"
                                                    value={draft?.name || ""}
                                                    onChange={(e) => handleDraftNameChange(idx, e.target.value)}
                                                    placeholder="Group Name"
                                                />
                                                <button onClick={() => toggleEditMode(idx)} className="text-red-500 hover:text-red-400">
                                                    <X size={14} />
                                                </button>
                                                <button onClick={() => saveDraft(idx)} className="text-[#1DB954] hover:text-green-400">
                                                    <Save size={14} />
                                                </button>
                                            </div>

                                            {/* Words List (Draft) */}
                                            <div className="flex-1 overflow-y-auto flex flex-wrap content-start items-start gap-1 p-0.5 min-h-0">
                                                {draft?.words.map((w, i) => (
                                                    <span key={i} className="text-xs bg-white/10 px-1.5 py-0.5 rounded flex items-center gap-1 group/word">
                                                        {w}
                                                        <button onClick={() => removeWordFromDraft(idx, i)} className="opacity-0 group-hover/word:opacity-100 hover:text-red-500">
                                                            <X size={10} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Add Words Input */}
                                            <div className="pt-2 border-t border-[#333] flex gap-1">
                                                <input
                                                    className="bg-[#121212] rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 ring-[#1DB954]"
                                                    value={draft?.inputValue || ""}
                                                    onChange={(e) => handleDraftInputChange(idx, e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && addWordToDraft(idx)}
                                                    // AutoFocus logic if needed, but risky for jumping
                                                    placeholder="Add words..."
                                                />
                                                <button onClick={() => addWordToDraft(idx)} className="p-1 bg-[#282828] hover:bg-[#3E3E3E] rounded">
                                                    <Plus size={14} className="text-[#1DB954]" />
                                                </button>
                                            </div>
                                        </div>
                                    )
                                }

                                // --- NORMAL MODE UI ---
                                if (!deck) return <div key={idx} className="bg-[#121212] rounded-lg h-full border border-[#282828/50] opacity-50 flex items-center justify-center">
                                    <button onClick={() => replaceWithRandomDeck(idx)} className="text-subdued hover:text-white">
                                        <Plus size={24} />
                                    </button>
                                </div>;

                                return (
                                    <div
                                        key={deck.id} // Use stable ID
                                        className="bg-[#121212] rounded-lg p-1.5 flex flex-col border border-[#282828] h-full overflow-hidden relative group/deck"
                                    >
                                        {/* Column Header */}
                                        <div className="text-center pb-1 border-b border-[#282828] mb-1 flex-none flex items-center justify-between px-1">
                                            <span className={`font-bold text-[#1DB954] uppercase tracking-wider truncate block flex-1 text-right ${isZenMode ? 'text-lg' : 'text-[10px]'}`}>
                                                {deck.name}
                                            </span>
                                            <div className="flex items-center gap-0.5 opacity-0 group-hover/deck:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggleEditMode(idx)}
                                                    className="text-subdued hover:text-white p-1 rounded-full hover:bg-white/10"
                                                    title="Create/Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => replaceWithRandomDeck(idx)}
                                                    className="text-subdued hover:text-white p-1 rounded-full hover:bg-white/10"
                                                    title="Randomize Deck"
                                                >
                                                    <Layers size={10} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Words List */}
                                        <div className="flex-1 overflow-y-auto flex flex-wrap content-start items-start gap-1 p-0.5 custom-scrollbar">
                                            {deck.items.map((word, wordIndex) => (
                                                <span
                                                    key={wordIndex}
                                                    className={`leading-none tracking-tight hover:text-[#1DB954] transition-colors cursor-default select-none bg-white/5 rounded-sm px-1 py-0.5 ${isZenMode ? 'text-2xl font-bold p-2 m-1' : 'text-lg font-bold text-white/90'}`}
                                                >
                                                    {word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>


                    {/* Volume Controls (Restored) */}
                    <div className={`w-3 flex flex-col items-center justify-center gap-2 py-4 bg-[#121212] rounded-full border border-[#282828] ${viewMode === 'collapsed' ? 'hidden' : ''}`}>
                        <div className="flex-1 w-1 bg-[#282828] rounded-full relative group">
                            <div
                                className="absolute bottom-0 w-full bg-[#1DB954] rounded-full"
                                style={{ height: `${beatVolume}%` }}
                            />
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={beatVolume}
                                onChange={(e) => setBeatVolume(parseInt(e.target.value))}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                title="Beat Volume"
                            />
                        </div>
                    </div>
                </div>

                {/* Transcript Area (Restored!) */}
                <div className={`
                    bg-[#121212] rounded-xl border border-[#282828] p-4 overflow-hidden relative transition-all duration-300
                    ${viewMode === 'expanded' ? 'flex-[2]' : 'h-40'}
                    ${isZenMode ? 'fixed inset-x-0 bottom-0 h-[30%] z-50 bg-black/95 border-t border-[#333] rounded-none' : ''}
                `}>
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                        <button
                            onClick={() => setViewMode(prev => prev === 'collapsed' ? 'normal' : 'collapsed')}
                            className="p-1 hover:bg-[#282828] rounded text-subdued"
                        >
                            {viewMode === 'collapsed' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    <div
                        ref={transcriptContainerRef}
                        className="h-full overflow-y-auto custom-scrollbar font-mono text-lg leading-relaxed text-white/90 space-y-1"
                    >
                        {segments.map((seg, i) => (
                            <p key={i} className="opacity-60">{seg.text}</p>
                        ))}
                        <p className={`animate-pulse ${isZenMode ? 'text-[#1DB954] text-xl font-bold' : ''}`}>{interimTranscript}</p>
                    </div>
                </div>

            </div>

            {/* CREATE NEW GROUP MODAL */}
            {showNewGroupModal && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#181818] p-6 rounded-xl border border-[#333] shadow-2xl flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-white">Create New Rhyme Group</h2>
                        <input
                            className="bg-[#121212] border border-[#333] rounded p-2 text-white focus:border-[#1DB954] outline-none"
                            placeholder="Group Name (e.g., 'Battle Raps')"
                            value={newGroupDraft.name}
                            onChange={e => setNewGroupDraft(prev => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                            className="bg-[#121212] border border-[#333] rounded p-2 text-white focus:border-[#1DB954] outline-none"
                            placeholder="Add words (comma separated)..."
                            value={newGroupDraft.keywords}
                            onChange={e => {
                                const val = e.target.value
                                const words = val.split(',').map(s => s.trim()).filter(Boolean)
                                setNewGroupDraft(prev => ({ ...prev, keywords: val, words }))
                            }}
                        />
                        {/* Preview Words */}
                        <div className="flex flex-wrap gap-2 min-h-20 p-2 bg-[#121212] rounded border border-[#333]">
                            {newGroupDraft.words.map((w, i) => (
                                <span key={i} className="bg-white/10 px-2 py-1 rounded text-sm">{w}</span>
                            ))}
                            {newGroupDraft.words.length === 0 && <span className="text-subdued text-sm italic">Words will appear here...</span>}
                        </div>

                        <div className="flex gap-2 justify-end mt-2">
                            <button
                                onClick={() => setShowNewGroupModal(false)}
                                className="px-4 py-2 text-subdued hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateNewGroup}
                                className="px-4 py-2 bg-[#1DB954] text-black font-bold rounded hover:bg-[#1ed760] disabled:opacity-50"
                                disabled={!newGroupDraft.name || newGroupDraft.words.length === 0}
                            >
                                Create Group
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Deck Selector Modal */}
            {showDeckSelector && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-[#181818] p-6 rounded-xl border border-[#333] shadow-2xl h-[80vh] flex flex-col">
                        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
                            <h2 className="text-2xl font-bold text-white mb-4">Select Rhyme Decks</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-2">
                                {allWordGroups?.map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => {
                                            const id = group.id!
                                            if (selectedDeckIds.includes(id)) {
                                                setSelectedDeckIds(selectedDeckIds.filter(i => i !== id))
                                            } else {
                                                if (selectedDeckIds.length >= columnCount) return;
                                                setSelectedDeckIds([...selectedDeckIds, id])
                                            }
                                        }}
                                        className={`w-full p-3 rounded-lg text-right flex items-center justify-between transition-colors ${selectedDeckIds.includes(group.id!)
                                            ? 'bg-[#1DB954]/20 border border-[#1DB954]'
                                            : 'bg-[#282828] hover:bg-[#3E3E3E] border border-transparent'
                                            }`}
                                    >
                                        <span className="text-subdued text-xs">{group.items.length} מילים</span>
                                        <span className="font-medium">{group.name}</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setShowDeckSelector(false)}
                                className="w-full mt-4 py-2 bg-[#1DB954] text-black font-bold rounded-lg"
                            >
                                {language === 'he' ? 'סיום' : 'Done'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
