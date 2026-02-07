import { useState, useEffect, useRef } from 'react'
import { Plus, X, Layers, Search, Check, ChevronLeft, WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { v4 as uuidv4 } from 'uuid'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useParams } from 'react-router-dom'
import { db, type WordGroup, type DbSession, type Bar, type BarRecording } from '../db/db'
import DictaModal from '../components/shared/DictaModal'
import { syncService } from '../services/dbSync'
import { useAuth } from '../contexts/AuthContext'
import { BarItem } from '../components/writing/BarItem'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { WritingBeatControl } from '../components/writing/WritingBeatControl'

export default function WritingSessionPage() {
    const navigate = useNavigate()
    const { id } = useParams<{ id?: string }>()
    const { user } = useAuth()
    const isOnline = useOnlineStatus()

    // Bar-based State
    const [bars, setBars] = useState<Bar[]>([{ id: uuidv4(), text: '' }])
    const [beatId, setBeatId] = useState<string | null>(null)
    const [isBeatPlaying, setIsBeatPlaying] = useState(false)
    const [beatVolume, setBeatVolume] = useState(50)
    const [title, setTitle] = useState(`Writing Session ${new Date().toLocaleDateString()}`)
    const [sessionId, setSessionId] = useState<string | null>(null) // To track if we are editing an existing session draft

    const [visibleDeckIds, setVisibleDeckIds] = useState<number[]>([])
    const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set())

    // Audio & Recording State
    const {
        startRecording: hookStartRecording,
        stopRecording: hookStopRecording,
        isRecording,
        duration: recordingDuration,
        // audioAnalyser
    } = useAudioRecorder()

    const [recordingBarId, setRecordingBarId] = useState<string | null>(null)
    const [activePlaybackBarId, setActivePlaybackBarId] = useState<string | null>(null)
    const [playbackState, setPlaybackState] = useState({ currentTime: 0, duration: 0 })

    const audioPlayerRef = useRef<HTMLAudioElement | null>(null)
    const playbackIntervalRef = useRef<number | null>(null)


    // Group Selector State
    const [showDeckSelector, setShowDeckSelector] = useState(false)
    const [groupSearchQuery, setGroupSearchQuery] = useState('')

    // Creation State
    const [isCreatingGroup, setIsCreatingGroup] = useState(false)
    const [newGroupName, setNewGroupName] = useState('')
    const [newGroupItems, setNewGroupItems] = useState<string[]>([])
    const [newItemInput, setNewItemInput] = useState('')
    const [isDictaOpen, setIsDictaOpen] = useState(false)

    // Managing Dicta for EXISTING groups
    const [editingDeckId, setEditingDeckId] = useState<number | null>(null)

    // Fetch all groups
    const allGroups = useLiveQuery(() => db.wordGroups.toArray())

    // Auto-save ref to prevent loops
    const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sessionRef = useRef<DbSession | null>(null)

    // Helper to normalize text for matching
    const normalize = (str: string) => str.toLowerCase()
        .replace(/[\u0591-\u05C7]/g, "")
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .trim()

    // Load session if ID is provided
    useEffect(() => {
        const loadExistingSession = async () => {
            if (id) {
                const numericId = parseInt(id, 10)
                if (!isNaN(numericId)) {
                    const session = await db.sessions.get(numericId)
                    if (session && (session.type === 'writing' || session.type === 'freestyle')) {
                        setTitle(session.title)
                        setSessionId(id)
                        sessionRef.current = session

                        if (session.beatId) setBeatId(session.beatId)

                        // Migration / Loading Logic
                        if (session.metadata?.bars && session.metadata.bars.length > 0) {
                            setBars(session.metadata.bars)
                        } else if (session.metadata?.lines && session.metadata.lines.length > 0) {
                            // Migrate from Lines array
                            setBars(session.metadata.lines.map((line: string) => ({ id: uuidv4(), text: line })))
                        } else if (session.metadata?.lyrics) {
                            // Migrate from Lyrics string
                            setBars(session.metadata.lyrics.split('\n').map((line: string) => ({ id: uuidv4(), text: line })))
                        } else if (session.type === 'freestyle' && session.metadata?.transcript) {
                            // Migrate from Freestyle Transcript
                            const text = session.metadata.transcript
                            setBars(text.split('\n').map((line: string) => ({ id: uuidv4(), text: line })))
                        } else {
                            // Default empty
                            setBars([{ id: uuidv4(), text: '' }])
                        }

                        if (session.metadata?.visibleDeckIds) {
                            setVisibleDeckIds(session.metadata.visibleDeckIds)
                        }
                    }
                }
            } else {
                // Pre-fill with recent decks for NEW session only
                const recent = await db.wordGroups.orderBy('lastUsedAt').reverse().limit(4).toArray()
                if (recent.length > 0) {
                    setVisibleDeckIds(recent.map(r => r.id!))
                }
            }
        }
        loadExistingSession()
    }, [id])

    // Visible Decks Query
    const visibleDecks = useLiveQuery(
        async () => {
            if (visibleDeckIds.length === 0) return []
            return await db.wordGroups.where('id').anyOf(visibleDeckIds).toArray()
        },
        [visibleDeckIds]
    )

    // Highlight Logic
    useEffect(() => {
        if (!visibleDecks) return

        const HEBREW_PREFIXES = ['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ', 'וה', 'מה', 'שה', 'וכ', 'וב', 'ול']
        const newHighlights = new Set<string>()

        const fullTextRaw = bars.map(b => b.text).join(' ')
        const fullTextNorm = normalize(fullTextRaw)
        const textWords = fullTextNorm.split(/\s+/).filter(Boolean)

        visibleDecks.forEach(deck => {
            deck.items.forEach(item => {
                const normItem = normalize(item)
                if (!normItem) return

                let isMatch = false
                if (fullTextNorm.includes(normItem)) {
                    isMatch = true
                }

                if (!isMatch) {
                    const isSingleWord = !normItem.includes(' ')
                    if (isSingleWord) {
                        isMatch = textWords.some(tw => {
                            if (tw === normItem) return true
                            if (tw.endsWith(normItem)) {
                                const prefix = tw.slice(0, -normItem.length)
                                return HEBREW_PREFIXES.includes(prefix)
                            }
                            return false
                        })
                    }
                }
                if (isMatch) newHighlights.add(item)
            })
        })
        setHighlightedWords(newHighlights)
    }, [bars, visibleDecks])

    // --- Auto-Discovery Logic ---
    useEffect(() => {
        const checkForNewDecks = async () => {
            if (!allGroups || allGroups.length === 0) return

            const fullText = bars.map(b => b.text).join(' ')
            const words = new Set(normalize(fullText).split(/\s+/).filter(w => w.length > 1))

            const newDeckIdsToVis = new Set<number>()

            allGroups.forEach(group => {
                // Skip if already visible
                if (visibleDeckIds.includes(group.id!)) return

                // Check if any word in the group is in the text
                const hasMatch = group.items.some(item => {
                    const normItem = normalize(item)
                    return words.has(normItem)
                })

                if (hasMatch) {
                    newDeckIdsToVis.add(group.id!)
                }
            })

            if (newDeckIdsToVis.size > 0) {
                console.log("Auto-discovering groups:", Array.from(newDeckIdsToVis))
                setVisibleDeckIds(prev => [...prev, ...Array.from(newDeckIdsToVis)])
            }
        }

        const timer = setTimeout(checkForNewDecks, 1500) // 1.5s debounce
        return () => clearTimeout(timer)
    }, [bars, allGroups, visibleDeckIds])

    // --- Auto-Save Logic ---
    const saveSession = async () => {
        // Don't save empty sessions with no content
        const hasContent = bars.some(b => b.text.trim().length > 0)
        if (!hasContent && visibleDeckIds.length === 0 && bars.length === 1) return

        const linkedRhymes: { lineIndex: number, rhymeId: number, word: string }[] = []

        if (visibleDecks) {
            bars.forEach((bar, idx) => {
                const lineNorm = normalize(bar.text)
                if (!lineNorm) return

                visibleDecks.forEach(deck => {
                    deck.items.forEach(item => {
                        const itemNorm = normalize(item)
                        if (!itemNorm) return
                        if (lineNorm.includes(itemNorm)) {
                            linkedRhymes.push({
                                lineIndex: idx, // Approximation
                                rhymeId: deck.id!,
                                word: item
                            })
                        }
                    })
                })
            })
        }

        const sessionData: DbSession = {
            id: sessionRef.current?.id, // Keep ID if exists
            title: title || 'Untitled Writing Session',
            type: sessionRef.current?.type === 'freestyle' ? 'freestyle' : 'writing',
            beatId: beatId || undefined,
            date: new Date(),
            createdAt: sessionRef.current?.createdAt || new Date(),
            duration: 0,
            cloudId: sessionRef.current?.cloudId || uuidv4(),
            metadata: {
                lyrics: bars.map(b => b.text).join('\n'), // Legacy support
                visibleDeckIds,
                lines: bars.map(b => b.text), // Legacy support
                bars, // NEW: Source of Truth
                linkedRhymes
            }
        }

        try {
            if (sessionRef.current?.id) {
                // Explicitly cast or partial update to avoid strict type mismatch with Dexie
                await db.sessions.update(sessionRef.current.id, sessionData as any)
            } else {
                const id = await db.sessions.add(sessionData)
                sessionData.id = id as number
                sessionRef.current = sessionData
                setSessionId(id.toString())
            }
            // Update deck usage
            if (visibleDeckIds.length > 0) {
                // Fire and forget update
                visibleDeckIds.forEach(id => db.wordGroups.update(id, { lastUsedAt: new Date() }).catch(console.error))
            }
        } catch (error) {
            console.error("Auto-save failed", error)
        }
    }

    // Trigger auto-save on changes
    useEffect(() => {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)

        // Debounce save 
        autoSaveTimerRef.current = setTimeout(() => {
            saveSession()
        }, 2000)

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
        }
    }, [bars, title, visibleDeckIds])

    // Save on unmount
    useEffect(() => {
        return () => {
            saveSession()
        }
    }, [])

    // --- Audio Logic ---
    const handleStartRecording = async (barId: string) => {
        if (isRecording || activePlaybackBarId) {
            // Stop any ongoing activity first? Or just block?
            // Let's block for safety
            return
        }
        setRecordingBarId(barId)
        await hookStartRecording()
    }

    const handleStopRecording = async (barId: string) => {
        if (!isRecording || recordingBarId !== barId) return

        const blob = await hookStopRecording()
        setRecordingBarId(null)

        if (blob && blob.size > 0 && sessionRef.current?.id) {
            const recordingId = uuidv4()
            const newRecording: BarRecording = {
                id: recordingId,
                sessionId: sessionRef.current.id,
                barId,
                blob,
                createdAt: new Date(),
                duration: recordingDuration
            }

            try {
                await db.barRecordings.add(newRecording)

                // Update Bar State
                const newBars = bars.map(b =>
                    b.id === barId ? { ...b, audioId: recordingId } : b
                )
                setBars(newBars)

                // If we don't save immediately, the bar.audioId might be lost on reload if user leaves before debounce
                // Let's force a save here to ensure audio link is persisted references
                // But saveSession uses 'bars' state... closure issue? 
                // We should use the updated bars actually. 
                // Refactor saveSession to take optional bars? 
                // For now, rely on effect dependency on 'bars' to trigger debounce save.

            } catch (e) {
                console.error("Failed to save recording", e)
                alert("Failed to save recording")
            }
        } else if (!sessionRef.current?.id) {
            alert("Please wait for session to initialize (auto-save) before recording.")
        }
    }

    const handlePlayAudio = async (barId: string, audioId: string) => {
        // Stop current if playing
        if (activePlaybackBarId && audioPlayerRef.current) {
            audioPlayerRef.current.pause()
            audioPlayerRef.current.currentTime = 0
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
            setActivePlaybackBarId(null)
            setPlaybackState({ currentTime: 0, duration: 0 })

            // If clicking the same one, just toggle off (already done above)
            if (activePlaybackBarId === barId) return
        }

        try {
            const recording = await db.barRecordings.get(audioId)
            if (!recording) {
                console.error("Recording not found")
                return
            }

            const url = URL.createObjectURL(recording.blob)
            const audio = new Audio(url)
            audioPlayerRef.current = audio

            audio.onloadedmetadata = () => {
                setPlaybackState({ currentTime: 0, duration: audio.duration || recording.duration })
            }

            audio.onended = () => {
                setActivePlaybackBarId(null)
                setPlaybackState({ currentTime: 0, duration: 0 })
                if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
            }

            audio.play()
            setActivePlaybackBarId(barId)

            // Start interval
            playbackIntervalRef.current = window.setInterval(() => {
                if (audioPlayerRef.current) {
                    setPlaybackState({
                        currentTime: audioPlayerRef.current.currentTime,
                        duration: audioPlayerRef.current.duration
                    })
                }
            }, 100)

        } catch (e) {
            console.error("Playback failed", e)
        }
    }

    const handlePauseAudio = () => {
        if (audioPlayerRef.current) {
            audioPlayerRef.current.pause()
            setActivePlaybackBarId(null) // Or keep active but paused state? simplified to verify stop for now
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
        }
    }

    const handleDeleteAudio = async (barId: string, audioId: string) => {
        if (confirm("Delete this recording?")) {
            try {
                await db.barRecordings.delete(audioId)
                setBars(prev => prev.map(b =>
                    b.id === barId ? { ...b, audioId: undefined } : b
                ))
                if (activePlaybackBarId === barId) handlePauseAudio()
            } catch (e) {
                console.error("Delete failed", e)
            }
        }
    }


    // --- Actions ---
    const toggleDeckVisibility = (id: number) => {
        if (visibleDeckIds.includes(id)) setVisibleDeckIds(prev => prev.filter(did => did !== id))
        else setVisibleDeckIds(prev => [...prev, id])
        setGroupSearchQuery('')
        setShowDeckSelector(false)
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return alert("Give your group a name!")
        if (newGroupItems.length === 0) return alert("Add some words first!")
        const newGroup: WordGroup = {
            name: newGroupName,
            items: newGroupItems,
            createdAt: new Date(),
            lastUsedAt: new Date(),
        }
        try {
            const id = await db.wordGroups.add(newGroup)
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)
            setVisibleDeckIds(prev => [...prev, id as number])
            setIsCreatingGroup(false); setNewGroupName(''); setNewGroupItems([]); setShowDeckSelector(false)
        } catch (e) {
            console.error(e); alert("Failed to create group")
        }
    }

    const addManualItem = () => {
        if (!newItemInput.trim()) return
        setNewGroupItems(prev => [...prev, newItemInput.trim()])
        setNewItemInput('')
    }

    const addWordToDeck = async (deckId: number, word: string) => {
        if (!word.trim()) return
        const deck = allGroups?.find(g => g.id === deckId)
        if (!deck) return
        const newItems = [...deck.items, word.trim()]
        await db.wordGroups.update(deckId, { items: newItems })
        if (user) syncService.syncWordGroups(user.uid).catch(console.error)
    }

    const removeWordFromDeck = async (deckId: number, wordToRemove: string) => {
        const deck = allGroups?.find(g => g.id === deckId)
        if (!deck) return
        const newItems = deck.items.filter(w => w !== wordToRemove)
        await db.wordGroups.update(deckId, { items: newItems })
        if (user) syncService.syncWordGroups(user.uid).catch(console.error)
    }

    // --- Filter Logic ---
    const filteredGroups = allGroups?.filter(g => {
        const q = groupSearchQuery.toLowerCase()
        return g.name.toLowerCase().includes(q) || g.items.some(i => i.toLowerCase().includes(q))
    }) || []


    return (
        <div className="flex flex-col h-full bg-[#121212] text-white">

            {/* Header / Controls */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1a1a1a] sticky top-0 z-20">
                <div className="flex items-center gap-4 flex-1">
                    <button
                        onClick={() => {
                            saveSession().then(() => navigate('/rhyme-library'))
                        }}
                        className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <h2 className="font-bold text-xl text-white hidden md:block">
                        Writing Session
                    </h2>

                    {/* Integrated Search & Group Selector */}
                    <div className="relative flex-1 max-w-md ml-0 md:ml-4">
                        <div className="flex items-center bg-[#252525] border border-white/10 rounded-lg focus-within:border-[#1DB954] transition-colors w-full">
                            <Search size={16} className="text-white/40 ml-3" />
                            <input
                                value={groupSearchQuery}
                                onChange={(e) => {
                                    setGroupSearchQuery(e.target.value)
                                    setShowDeckSelector(true)
                                }}
                                onFocus={() => setShowDeckSelector(true)}
                                placeholder="Search groups or create..."
                                className="bg-transparent border-none outline-none text-sm text-white px-3 py-2 w-full placeholder-white/30"
                            />
                            <button
                                onClick={() => setShowDeckSelector(!showDeckSelector)}
                                className="px-3 py-2 hover:bg-[#333] rounded-r-lg border-l border-white/10 flex items-center gap-2 text-white/40 text-xs"
                            >
                                <Layers size={14} />
                                {visibleDeckIds.length}
                            </button>
                        </div>

                        {/* Dropdown Results */}
                        {showDeckSelector && (
                            <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[60vh] flex flex-col z-[100]">
                                <div className="p-2 border-b border-white/5 bg-[#202020] flex justify-between items-center text-xs text-white/40 uppercase font-bold">
                                    <span>Select Groups</span>
                                    <button onClick={() => setShowDeckSelector(false)}><X size={14} /></button>
                                </div>
                                <div className="overflow-y-auto p-2 custom-scrollbar">
                                    {/* Create Option */}
                                    {groupSearchQuery.trim().length > 0 && (
                                        <button
                                            onClick={() => {
                                                setNewGroupName(groupSearchQuery)
                                                setIsCreatingGroup(true)
                                                setShowDeckSelector(false)
                                            }}
                                            className="w-full py-2 mb-2 bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-xs uppercase"
                                        >
                                            <Plus size={14} />
                                            Create "{groupSearchQuery}"
                                        </button>
                                    )}
                                    {groupSearchQuery.trim().length === 0 && (
                                        <button
                                            onClick={() => {
                                                setIsCreatingGroup(true)
                                                setShowDeckSelector(false)
                                            }}
                                            className="w-full py-2 mb-2 bg-[#252525] text-white/60 hover:text-white hover:bg-[#333] rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-xs uppercase"
                                        >
                                            <Plus size={14} />
                                            Create New Group
                                        </button>
                                    )}

                                    {filteredGroups.map(g => {
                                        const isSelected = visibleDeckIds.includes(g.id!)
                                        return (
                                            <button
                                                key={g.id}
                                                onClick={() => toggleDeckVisibility(g.id!)}
                                                className={`w-full px-3 py-2 rounded-lg text-sm mb-1 flex items-center justify-center relative transition-colors
                                                    ${isSelected ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'hover:bg-[#252525] text-white/80'}
                                                `}
                                            >
                                                <div className="overflow-hidden text-center">
                                                    <span className="truncate block font-medium">{g.name}</span>
                                                    <span className="truncate block text-[10px] opacity-60">{g.items.slice(0, 5).join(', ')}</span>
                                                </div>
                                                {isSelected && <Check size={14} className="absolute right-3" />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Controls */}
                <div className="flex items-center gap-2 shrink-0 ml-4">
                    <WritingBeatControl
                        videoId={beatId}
                        setVideoId={setBeatId}
                        isPlaying={isBeatPlaying}
                        setIsPlaying={setIsBeatPlaying}
                        volume={beatVolume}
                        setVolume={setBeatVolume}
                    />
                    <div className="mr-2">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-transparent text-right font-bold text-white/50 focus:text-white outline-none border-b border-transparent focus:border-[#1DB954] transition-all w-32 md:w-48 text-sm"
                            placeholder="Session Title"
                        />
                    </div>
                    {/* Auto-save indicator could go here */}
                    <div className="text-[10px] text-white/20 uppercase font-bold tracking-wider">
                        {sessionId ? 'Auto-saving' : 'Draft'}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Reversible Column */}
            <div className="flex flex-col-reverse md:flex-col flex-1 overflow-hidden relative">

                {/* Top Half (Desktop) / Bottom Half (Mobile): Horizontal Scrollable Decks */}
                <div className="flex-none h-[40%] md:flex-1 md:h-auto overflow-x-auto overflow-y-hidden bg-[#0f0f0f] md:min-h-[40%] border-t md:border-t-0 border-b border-white/5 relative order-1 md:order-none">
                    <div className="flex h-full p-4 gap-4 w-max items-stretch">
                        {visibleDecks?.map((deck, idx) => (
                            <div key={deck.id || idx} className="w-80 bg-[#181818] rounded-xl border border-white/5 flex flex-col overflow-hidden relative group transition-all hover:border-[#1DB954]/30 shadow-lg">
                                {/* Deck Header */}
                                <div className="p-3 border-b border-white/5 bg-[#202020] flex items-center justify-between shrink-0">
                                    <h3 className="font-bold text-[#1DB954] truncate flex-1 mr-2">{deck.name}</h3>
                                    <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                if (!isOnline) return
                                                setEditingDeckId(deck.id!)
                                                setIsDictaOpen(true)
                                            }}
                                            className={`p-1 rounded transition-colors ${!isOnline ? 'text-white/20 cursor-not-allowed' : 'text-white/40 hover:text-purple-400 hover:bg-purple-400/10'}`}
                                            title={!isOnline ? "Offline - Search unavailable" : "Find Rhymes (Dicta)"}
                                        >
                                            {!isOnline ? <WifiOff size={14} /> : <Search size={14} />}
                                        </button>
                                        <button
                                            onClick={() => deck.id && toggleDeckVisibility(deck.id)}
                                            className="text-white/40 hover:text-red-400 p-1 rounded hover:bg-red-400/10"
                                            title="Close"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Add Input */}
                                <div className="p-2 bg-[#1a1a1a] border-b border-white/5 shrink-0">
                                    <input
                                        placeholder="+ Add word (Enter)"
                                        className="w-full bg-[#252525] border border-white/5 rounded px-2 py-1 text-xs text-white focus:border-[#1DB954] outline-none"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value
                                                if (val && deck.id) {
                                                    addWordToDeck(deck.id, val)
                                                    e.currentTarget.value = ''
                                                }
                                            }
                                        }}
                                    />
                                </div>

                                {/* Words */}
                                <div className="flex-1 overflow-y-auto p-2 content-start gap-2 custom-scrollbar">
                                    <div className="flex flex-wrap gap-2">
                                        {deck.items.map((word, wIdx) => {
                                            const isHighlighted = highlightedWords.has(word)
                                            return (
                                                <span
                                                    key={wIdx}
                                                    className={`
                                                relative group/word px-2 py-1 rounded text-sm font-medium transition-all duration-300 transform flex items-center gap-1 pr-1
                                                ${isHighlighted
                                                            ? 'bg-[#1DB954] text-black scale-105 shadow-[0_0_15px_rgba(29,185,84,0.4)] font-bold z-10'
                                                            : 'bg-[#252525] text-white/80 border border-white/5 hover:border-white/20'
                                                        }
                                                `}
                                                >
                                                    {word}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            if (deck.id) removeWordFromDeck(deck.id, word)
                                                        }}
                                                        className={`hover:text-red-500 opacity-0 group-hover/word:opacity-100 transition-opacity ${isHighlighted ? 'text-black/50' : 'text-white/30'}`}
                                                    >
                                                        <X size={10} />
                                                    </button>
                                                </span>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Empty State / Add Helper */}
                        {visibleDeckIds.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-8 text-white/20 border border-dashed border-white/10 rounded-xl w-64 h-full bg-white/5">
                                <Layers size={32} className="mb-2 opacity-50" />
                                <span className="text-sm font-medium text-center">No groups selected.<br />Use the search bar above to add one!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Half (Desktop) / Top Half (Mobile): Writing Area (Bar Based) */}
                <div className="flex-1 md:flex-none md:h-[50%] bg-[#121212] p-6 flex flex-col relative z-0 box-border overflow-y-auto custom-scrollbar order-2 md:order-none">
                    <div className="flex flex-col gap-2 w-full pb-20">
                        {bars.map((bar, idx) => (
                            <BarItem
                                key={bar.id}
                                bar={bar}
                                index={idx}
                                isActive={false} // Could use activeID state here if we want to track focus cleanly

                                isRecording={recordingBarId === bar.id}
                                isPlaying={activePlaybackBarId === bar.id}
                                currentAudioTime={activePlaybackBarId === bar.id ? playbackState.currentTime : 0}
                                audioDuration={playbackState.duration || (recordingBarId === bar.id ? recordingDuration : 0)}

                                onChange={(text) => {
                                    const newBars = [...bars]
                                    newBars[idx] = { ...newBars[idx], text }
                                    setBars(newBars)
                                }}
                                onSplit={(cursorPos) => {
                                    const currentText = bar.text
                                    const textBefore = currentText.slice(0, cursorPos)
                                    const textAfter = currentText.slice(cursorPos)
                                    const newBars = [...bars]
                                    newBars[idx] = { ...bar, text: textBefore }

                                    const newId = uuidv4()
                                    newBars.splice(idx + 1, 0, { id: newId, text: textAfter })
                                    setBars(newBars)
                                    setTimeout(() => document.getElementById(`bar-${newId}`)?.focus(), 0)
                                }}
                                onMergePrev={() => {
                                    // Logic for Backspace at start? 
                                    // Currently implemented as Delete if empty
                                }}
                                onMergeNext={() => { }}
                                onDelete={() => {
                                    if (bars.length > 1) {
                                        const newBars = [...bars]
                                        newBars.splice(idx, 1)
                                        setBars(newBars)
                                        setTimeout(() => document.getElementById(`bar-${bars[idx - 1]?.id || bars[0].id}`)?.focus(), 0)
                                    }
                                }}

                                onStartRecording={() => handleStartRecording(bar.id)}
                                onStopRecording={() => handleStopRecording(bar.id)}
                                onPlayAudio={() => bar.audioId && handlePlayAudio(bar.id, bar.audioId)}
                                onPauseAudio={handlePauseAudio}
                                onDeleteAudio={() => bar.audioId && handleDeleteAudio(bar.id, bar.audioId)}
                            />
                        ))}

                        <button
                            onClick={() => {
                                const newId = uuidv4()
                                setBars(prev => [...prev, { id: newId, text: '' }])
                                setTimeout(() => document.getElementById(`bar-${newId}`)?.focus(), 0)
                            }}
                            className="mt-4 self-center flex items-center gap-2 text-white/30 hover:text-[#1DB954] transition-colors text-sm py-2 px-4 rounded-lg hover:bg-[#1DB954]/5"
                        >
                            <Plus size={16} />
                            Add next bar
                        </button>

                        <div className="h-20" /> {/* Spacer */}
                    </div>
                </div>
            </div >

            {/* Quick Group Creator Modal (Global) */}
            {
                isCreatingGroup && (
                    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#252525] rounded-t-2xl">
                                <h3 className="font-bold flex items-center gap-2 text-white">
                                    <Plus size={18} className="text-[#1DB954]" />
                                    Create New Rhyme Group
                                </h3>
                                <button onClick={() => setIsCreatingGroup(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
                            </div>
                            <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="text-xs text-white/40 uppercase font-bold block mb-1">Group Name</label>
                                    <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#1DB954] outline-none" autoFocus />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input value={newItemInput} onChange={e => setNewItemInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualItem()} placeholder="Add word..." className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                                        <button onClick={addManualItem} className="bg-[#333] text-white p-2 rounded-lg"><Plus size={18} /></button>
                                        <button
                                            onClick={() => {
                                                if (!isOnline) return
                                                setEditingDeckId(null);
                                                setIsDictaOpen(true)
                                            }}
                                            className={`px-3 rounded-lg flex items-center gap-1 text-sm border ${!isOnline ? 'bg-gray-800 text-gray-400 border-gray-700 cursor-not-allowed' : 'bg-purple-600/20 text-purple-400 border-purple-500/30'}`}
                                            title={!isOnline ? "Unavailable offline" : "Search with Dicta"}
                                        >
                                            {!isOnline ? <WifiOff size={14} /> : <Search size={14} />} Dicta
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 p-2 bg-[#111] rounded-xl min-h-[100px] border border-white/5 content-start">
                                    {newGroupItems.map((item, idx) => (
                                        <span key={idx} className="bg-[#222] text-white/90 px-2 py-1 rounded text-sm flex items-center gap-1 border border-white/5 group">{item} <button onClick={() => setNewGroupItems(prev => prev.filter((_, i) => i !== idx))}><X size={12} /></button></span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 border-t border-white/5 bg-[#252525] rounded-b-2xl">
                                <button onClick={handleCreateGroup} className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-xl hover:scale-[1.02] shadow-lg">Create Group</button>
                            </div>
                        </div>
                    </div>
                )
            }

            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={(words) => {
                    if (editingDeckId) {
                        const deck = allGroups?.find(g => g.id === editingDeckId)
                        if (deck) {
                            const newItems = [...deck.items, ...words]
                            db.wordGroups.update(editingDeckId, { items: newItems }).then(() => {
                                if (user) syncService.syncWordGroups(user.uid)
                            })
                        }
                    } else {
                        setNewGroupItems(prev => [...prev, ...words])
                    }
                }}
            />
        </div >
    )
}
