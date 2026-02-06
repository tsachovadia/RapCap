import { useState, useRef, useEffect } from 'react'
import { X, Plus, Save, Minimize2, Maximize2, Video, VideoOff, StickyNote, Sparkles, Layers, Search, Flag, Music, Check } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import BeatPlayer from '../freestyle/BeatPlayer'
import { PRESET_BEATS, DEFAULT_BEAT_ID } from '../../data/beats'
import { db } from '../../db/db'
import { syncService } from '../../services/dbSync'
import { useAuth } from '../../contexts/AuthContext'
import type { FlowState } from '../../pages/RecordPage'
import DictaModal from '../shared/DictaModal'


interface Props {
    flowState: FlowState
    language: 'he' | 'en'
    onPreRollComplete: (beatStartTime: number) => void
    onBeatChange?: (beatId: string) => void
    segments: any[]
    interimTranscript: string
    notes?: string
    setNotes?: (notes: string) => void
    onSaveMoment?: () => void
}

export default function FreestyleModeUI({ flowState, language, onPreRollComplete, onBeatChange, segments, interimTranscript, notes, setNotes, onSaveMoment }: Props) {
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
    const [showDeckSelector, setShowDeckSelector] = useState(false)

    // Unified Zen Mode (Replaces conflicting ViewStates)
    const [isZenMode, setIsZenMode] = useState(false)

    // Modal States
    const [showNewGroupModal, setShowNewGroupModal] = useState(false)
    const [newGroupDraft, setNewGroupDraft] = useState({ name: '', keywords: '', words: [] as string[] })

    // Dicta State
    const [isDictaOpen, setIsDictaOpen] = useState(false)
    const [activeDictaDeckIdx, setActiveDictaDeckIdx] = useState<number | null>(null)

    // Zen Mode Features
    const [showVideoInZen, setShowVideoInZen] = useState(true)
    const [showNotesInZen, setShowNotesInZen] = useState(false)

    // Zen Mode / Swapping State
    const [swappingDeckIndex, setSwappingDeckIndex] = useState<number | null>(null)
    const [deckSearchQuery, setDeckSearchQuery] = useState('')

    // Fetch all word groups for selection
    const allWordGroups = useLiveQuery(() => db.wordGroups.toArray(), [])

    // NEW: Fetch custom beats
    const customBeats = useLiveQuery(() => db.beats?.toArray() || [], []) || []
    const allBeats = [...PRESET_BEATS, ...customBeats.map(b => ({ id: b.videoId, name: b.name }))]

    // Draft / Edit Mode State
    const [editingDeckIndices, setEditingDeckIndices] = useState<number[]>([])
    const [drafts, setDrafts] = useState<{ [key: number]: { name: string, words: string[], inputValue: string, originalId?: number } }>({})

    // NEW: Real-time Highlighting State
    const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set())

    useEffect(() => {
        // Reset highlights when starting a new flow
        if (flowState === 'idle') {
            setHighlightedWords(new Set())
        }
    }, [flowState])

    useEffect(() => {
        if ((!segments.length && !interimTranscript) || !allWordGroups) return

        // Normalization Helper: Lowercase, No Niqqud, No Punctuation
        const normalize = (str: string) => str.toLowerCase()
            .replace(/[\u0591-\u05C7]/g, "") // Remove Hebrew Niqqud
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "") // Remove Punctuation
            .trim()

        // Prepare Transcript Words "Soup"
        const fullText = segments.map(s => s.text).join(' ') + ' ' + interimTranscript
        const transcriptWords = fullText.split(/\s+/).map(normalize).filter(Boolean)
        const transcriptSet = new Set(transcriptWords)

        // Hebrew Prefixes
        const HEBREW_PREFIXES = ['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ', 'וה', 'מה', 'שה', 'וכ', 'וב', 'ול']

        let hasChanges = false
        const newHighlights = new Set(highlightedWords)

        // Check visible decks
        selectedDeckIds.forEach(deckId => {
            const deck = allWordGroups.find(g => g.id === deckId)
            if (!deck) return

            deck.items.forEach(item => {
                if (newHighlights.has(item)) return

                const normItem = normalize(item)
                if (!normItem) return

                let isMatch = false

                // 1. Direct Match
                if (transcriptSet.has(normItem)) {
                    isMatch = true
                }

                // 2. Hebrew Prefix Match
                if (!isMatch && language === 'he') {
                    // Check if any word in the transcript ends with our target word
                    isMatch = transcriptWords.some(tw => {
                        if (tw === normItem) return true
                        if (tw.endsWith(normItem)) {
                            const prefix = tw.slice(0, -normItem.length)
                            return HEBREW_PREFIXES.includes(prefix)
                        }
                        return false
                    })
                }

                if (isMatch) {
                    newHighlights.add(item)
                    hasChanges = true
                }
            })
        })

        if (hasChanges) {
            setHighlightedWords(newHighlights)
        }
    }, [segments, interimTranscript, selectedDeckIds, allWordGroups, language])



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

    const handleUrlSubmit = async () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowUrlInput(false)
            setUrlInput('')

            // Auto-save beat if new
            try {
                const existing = await db.beats.where('videoId').equals(id).first()
                if (!existing) {
                    let beatTitle = 'Imported Beat'

                    // Fetch title from oEmbed
                    try {
                        const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`)
                        const data = await response.json()
                        if (data.title) beatTitle = data.title
                    } catch (err) {
                        console.warn('Failed to fetch YouTube title', err)
                    }

                    await db.beats.add({
                        name: beatTitle,
                        videoId: id,
                        category: 'custom',
                        createdAt: new Date()
                    })
                }
            } catch (e) {
                console.error("Failed to auto-save beat", e)
            }
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

    const handleOpenDicta = (idx: number) => {
        setActiveDictaDeckIdx(idx)
        setIsDictaOpen(true)
    }

    const handleDictaAddWords = (words: string[]) => {
        if (activeDictaDeckIdx === null) return

        // Ensure we are in edit mode for this deck
        if (!editingDeckIndices.includes(activeDictaDeckIdx)) {
            toggleEditMode(activeDictaDeckIdx)
        }

        // Add words to draft
        setDrafts(prev => {
            const currentDraft = prev[activeDictaDeckIdx] || {
                name: "New Group",
                words: allWordGroups?.find(g => g.id === selectedDeckIds[activeDictaDeckIdx])?.items || [],
                inputValue: "",
                originalId: selectedDeckIds[activeDictaDeckIdx]
            }

            return {
                ...prev,
                [activeDictaDeckIdx]: {
                    ...currentDraft,
                    words: [...currentDraft.words, ...words]
                }
            }
        })
    }

    return (
        <div className={`h-full flex flex-col ${isZenMode ? 'absolute inset-0 z-50 bg-[#121212]' : ''}`}>

            {/* Header / Controls */}
            <div className={`relative flex items-center justify-center p-2 border-b border-[#282828] min-h-[50px]`}>

                {/* Left Controls (Absolute) */}
                <div className="absolute left-2 flex items-center gap-2 z-10">
                    {/* Capture Moment Button (Visible in normal mode) */}
                    {onSaveMoment && flowState === 'recording' && (
                        <button
                            onClick={onSaveMoment}
                            className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 rounded-lg text-sm transition-colors animate-pulse"
                        >
                            <Flag size={14} />
                            <span>Moment</span>
                        </button>
                    )}
                </div>

                {/* CENTER: BEAT SELECTOR */}
                <div className="flex items-center gap-1 bg-[#282828] rounded-lg p-0.5 border border-[#333] z-10">
                    {showUrlInput ? (
                        <div className="flex items-center gap-1 px-1">
                            <input
                                type="text"
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="Paste URL..."
                                className="bg-transparent border-none outline-none text-white text-xs w-32 font-mono"
                                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                autoFocus
                            />
                            <button
                                onClick={handleUrlSubmit}
                                className="text-[#1DB954] hover:text-white font-bold px-1"
                            >
                                OK
                            </button>
                            <button onClick={() => setShowUrlInput(false)}>
                                <X size={14} className="text-subdued" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <select
                                    className="bg-transparent text-white text-xs font-bold px-2 py-1 outline-none cursor-pointer appearance-none pr-6 max-w-[150px] truncate text-center"
                                    onChange={(e) => {
                                        if (e.target.value === 'paste_new') {
                                            setShowUrlInput(true)
                                        } else {
                                            setVideoId(e.target.value)
                                        }
                                    }}
                                    value={videoId}
                                >
                                    <option value="" disabled>Select Beat...</option>
                                    {allBeats.map(beat => <option key={beat.id} value={beat.id}>{beat.name}</option>)}
                                    <option value="paste_new" className="text-[#1DB954] font-bold">+ Import from YouTube</option>
                                </select>
                                <Music size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-subdued pointer-events-none" />
                            </div>
                        </>
                    )}
                </div>

                {/* Right Controls (Absolute) */}
                <div className="absolute right-2 flex items-center gap-2 z-10">
                    {/* ZEN MODE TOGGLE */}
                    <button
                        onClick={() => setIsZenMode(!isZenMode)}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${isZenMode ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'text-subdued hover:bg-[#282828] border border-transparent'}`}
                        title="Zen Mode"
                    >
                        {isZenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        <span className="text-xs font-bold">ZEN</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col gap-2 min-h-0 relative">
                {/* Upper Section: Beat & Words */}
                <div className={`flex gap-2 min-h-0 relative transition-all duration-300 ${isZenMode ? 'flex-[10]' : 'flex-[10]'} overflow-hidden`}>
                    <div className="flex-1 flex flex-col gap-2 min-h-0">

                        {/* Grid was here, BeatPlayer moved below */}

                        {/* Rhyme Deck Columns Grid */}
                        <div
                            className={`flex-1 min-h-0 grid gap-2 transition-all duration-300
                            grid-cols-4
                            ${isZenMode ? 'fixed inset-0 z-50 bg-black/95 p-8 backdrop-blur-sm' : ''}
                        `}>
                            {/* Zen Mode Type Controls */}
                            {isZenMode && (
                                <div className="absolute top-4 left-4 z-[60] flex gap-2">
                                    <button
                                        onClick={() => setShowVideoInZen(!showVideoInZen)}
                                        className={`p-2 rounded-full transition-colors ${showVideoInZen ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-subdued bg-[#282828]'}`}
                                        title="Toggle Video"
                                    >
                                        {showVideoInZen ? <Video size={20} /> : <VideoOff size={20} />}
                                    </button>
                                    <button
                                        onClick={() => setShowNotesInZen(!showNotesInZen)}
                                        className={`p-2 rounded-full transition-colors ${showNotesInZen ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-subdued bg-[#282828]'}`}
                                        title="Toggle Notes"
                                    >
                                        <StickyNote size={20} />
                                    </button>
                                    {onSaveMoment && flowState === 'recording' && (
                                        <button
                                            onClick={onSaveMoment}
                                            className="p-2 rounded-full bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition-colors animate-pulse"
                                            title="Capture Moment"
                                        >
                                            <Flag size={20} />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Close Zen Mode Button */}
                            {isZenMode && (
                                <button
                                    onClick={() => setIsZenMode(false)}
                                    className="absolute top-4 right-4 z-[60] bg-[#282828] p-2 rounded-full hover:bg-white/20 transition-colors"
                                >
                                    <Minimize2 size={24} className="text-white" />
                                </button>
                            )}

                            {/* Zen Mode Notes Overlay */}
                            {isZenMode && showNotesInZen && (
                                <div className="absolute top-16 right-4 bottom-4 w-80 bg-[#181818] border border-[#333] rounded-xl p-4 shadow-2xl z-[55] flex flex-col animate-in slide-in-from-right duration-200">
                                    <h3 className="text-sm font-bold text-subdued mb-2">Session Notes</h3>
                                    <textarea
                                        className="flex-1 bg-[#121212] rounded p-2 text-white text-sm outline-none resize-none focus:ring-1 ring-[#1DB954] border border-[#282828]"
                                        placeholder="Write your thoughts..."
                                        value={notes || ''}
                                        onChange={e => setNotes?.(e.target.value)}
                                    />
                                </div>
                            )}

                            {Array.from({ length: 4 }).map((_, idx) => {
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
                                        className={`bg-[#121212] rounded-lg p-1.5 flex flex-col border border-[#282828] h-full overflow-hidden relative group/deck ${isZenMode ? 'bg-[#000]' : ''}`}
                                    >
                                        {/* Column Header */}
                                        <div className="text-center pb-1 border-b border-[#282828] mb-1 flex-none flex items-center justify-between px-1">
                                            <span className={`font-bold text-[#1DB954] uppercase tracking-wider truncate block flex-1 text-right ${isZenMode ? 'text-lg' : 'text-[10px]'}`}>
                                                {deck.name}
                                            </span>
                                            <div className={`flex items-center gap-0.5 transition-opacity ${isZenMode ? 'opacity-100' : 'opacity-0 group-hover/deck:opacity-100'}`}>
                                                <button
                                                    onClick={() => handleOpenDicta(idx)}
                                                    className="text-purple-400 hover:text-purple-300 p-1 rounded-full hover:bg-purple-500/20"
                                                    title="Find Rhymes (Dicta)"
                                                >
                                                    <Sparkles size={isZenMode ? 18 : 12} />
                                                </button>

                                                {/* Swap/Search Button */}
                                                <button
                                                    onClick={() => {
                                                        setSwappingDeckIndex(idx)
                                                        setDeckSearchQuery('') // Reset search on open
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-blue-500/20"
                                                    title="Swap Group"
                                                >
                                                    <Search size={isZenMode ? 18 : 12} />
                                                </button>

                                                <button
                                                    onClick={() => toggleEditMode(idx)}
                                                    className="text-subdued hover:text-white p-1 rounded-full hover:bg-white/10"
                                                    title="Create/Edit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width={isZenMode ? 18 : 12} height={isZenMode ? 18 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                </button>
                                                <button
                                                    onClick={() => replaceWithRandomDeck(idx)}
                                                    className="text-subdued hover:text-white p-1 rounded-full hover:bg-white/10"
                                                    title="Randomize Deck"
                                                >
                                                    <Layers size={isZenMode ? 18 : 10} />
                                                </button>
                                            </div>
                                        </div>
                                        {/* Words List */}
                                        <div className="flex-1 overflow-y-auto flex flex-wrap content-start items-start gap-1 p-0.5 custom-scrollbar">
                                            {deck.items.map((word, wordIndex) => {
                                                const isUsed = highlightedWords.has(word)
                                                return (
                                                    <span
                                                        key={wordIndex}
                                                        className={`leading-none tracking-tight transition-all duration-300 cursor-default select-none rounded-sm px-1 py-0.5
                                                            ${isZenMode ? 'text-2xl font-bold p-2 m-1' : 'text-lg font-bold'}
                                                            ${isUsed
                                                                ? 'text-[#1DB954] bg-[#1DB954]/10 scale-105 shadow-[0_0_10px_rgba(29,185,84,0.3)]'
                                                                : 'text-white/90 hover:text-[#1DB954] bg-white/5'
                                                            }
                                                        `}
                                                    >
                                                        {word}
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Beat Player - Moved Here (Bottom) */}
                        <div className={`h-20 flex-none bg-[#181818] rounded-xl overflow-hidden relative border border-[#282828] group transition-all duration-300 ${isZenMode && !showVideoInZen ? 'h-0 opacity-0 border-0 m-0' : ''}`}>
                            <BeatPlayer
                                videoId={videoId}
                                isPlaying={flowState !== 'idle' && flowState !== 'paused'}
                                volume={beatVolume}
                                onReady={(player) => setYoutubePlayer(player)}
                            />
                        </div>
                    </div>


                    {/* Volume Controls (WIDENED & Improved) */}
                    <div className="w-8 flex flex-col items-center justify-center gap-2 py-4 bg-[#121212] rounded-full border border-[#282828]">
                        <Music size={14} className="text-subdued" />
                        <div className="flex-1 w-2 bg-[#282828] rounded-full relative group cursor-pointer hover:w-3 transition-all">
                            <div
                                className="absolute bottom-0 w-full bg-[#1DB954] rounded-full"
                                style={{ height: `${beatVolume}%` }}
                            />
                            <div className="absolute bottom-0 w-full flex items-end justify-center pb-2 pointer-events-none">
                                {/* Thumb indicator could go here if needed */}
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={beatVolume}
                                onChange={(e) => setBeatVolume(parseInt(e.target.value))}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                style={{ appearance: 'slider-vertical', WebkitAppearance: 'slider-vertical' } as any}
                                title="Beat Volume"
                            />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">{beatVolume}</span>
                    </div>
                </div>

                {/* Transcript Area (Responsive) */}
                <div className={`
                    bg-[#121212] rounded-xl border border-[#282828] p-4 overflow-hidden relative transition-all duration-300
                     h-40 flex-none
                    ${isZenMode ? 'fixed inset-x-0 bottom-0 h-[30%] z-50 bg-black/95 border-t border-[#333] rounded-none' : ''}
                `}>
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                        <button
                            onClick={() => {
                                // Toggle Zen mode if user wants to minimize/expand from here
                                setIsZenMode(!isZenMode)
                            }}
                            className="p-1 hover:bg-[#282828] rounded text-subdued"
                        >
                            {isZenMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
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
            {
                showNewGroupModal && (
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
                )
            }

            {/* Deck Selector Modal */}
            {
                showDeckSelector && (
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
                                                    if (selectedDeckIds.length >= 4) return;
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
                )
            }
            {/* Dicta Modal */}
            {/* Swap Deck Modal */}
            {swappingDeckIndex !== null && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSwappingDeckIndex(null)}>
                    <div className="bg-[#1e1e1e] w-full max-w-sm rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[60vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-3 border-b border-white/5 bg-[#252525] flex justify-between items-center">
                            <span className="text-xs font-bold uppercase text-white/50 tracking-wider">Select or Create Group</span>
                            <button onClick={() => setSwappingDeckIndex(null)} className="text-white/50 hover:text-white"><X size={16} /></button>
                        </div>

                        <div className="p-3 border-b border-white/5">
                            <div className="flex items-center bg-[#111] border border-white/10 rounded-lg px-2 py-1.5 focus-within:border-blue-500/50 transition-colors">
                                <Search size={14} className="text-white/30 mr-2" />
                                <input
                                    autoFocus
                                    className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-white/20"
                                    placeholder="Search groups..."
                                    value={deckSearchQuery}
                                    onChange={e => setDeckSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                            {/* Create Option if search has input */}
                            {deckSearchQuery.trim().length > 0 && (
                                <button
                                    onClick={() => {
                                        setNewGroupDraft(prev => ({ ...prev, name: deckSearchQuery }))
                                        setSwappingDeckIndex(null)
                                        setShowNewGroupModal(true)
                                    }}
                                    className="w-full py-2 mb-2 bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-xs uppercase"
                                >
                                    <Plus size={14} />
                                    Create "{deckSearchQuery}"
                                </button>
                            )}

                            {allWordGroups
                                ?.filter(g => {
                                    if (!deckSearchQuery) return true
                                    const q = deckSearchQuery.toLowerCase()
                                    return g.name.toLowerCase().includes(q) || g.items.some(i => i.toLowerCase().includes(q))
                                })
                                .map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => {
                                            const newIds = [...selectedDeckIds]
                                            newIds[swappingDeckIndex] = g.id!
                                            setSelectedDeckIds(newIds)
                                            setSwappingDeckIndex(null)
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center justify-between group transition-colors
                                            ${selectedDeckIds.includes(g.id!) ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-[#252525] border border-transparent'}
                                        `}
                                    >
                                        <div className="overflow-hidden">
                                            <div className={`text-sm font-bold truncate ${selectedDeckIds.includes(g.id!) ? 'text-blue-400' : 'text-white/80'}`}>{g.name}</div>
                                            <div className="text-[10px] text-white/40 truncate">{g.items.slice(0, 4).join(', ')}...</div>
                                        </div>
                                        {selectedDeckIds.includes(g.id!) && <Check size={14} className="text-blue-400" />}
                                    </button>
                                ))
                            }
                            {allWordGroups?.length === 0 && (
                                <div className="text-center p-4 text-white/30 text-xs">No groups found.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={(words) => {
                    handleDictaAddWords(words)
                }}
            />
        </div >
    )
}
