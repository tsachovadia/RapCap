import { useState, useEffect, useRef } from 'react'
import { X, Plus, Minimize2, Layers, Save, Search, Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type WordGroup, type DbSession, type Bar, type BarRecording } from '../../db/db'
import DictaModal from '../shared/DictaModal'
import { syncService } from '../../services/dbSync'
import { useAuth } from '../../contexts/AuthContext'
import { BarItem } from '../../components/writing/BarItem'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { useToast } from '../../contexts/ToastContext'

interface RhymeZenModeProps {
    initialGroup: WordGroup | null
    initialText: string
    initialTitle?: string
    onTextChange?: (text: string) => void
    onClose: () => void
}

export default function RhymeZenMode({ initialGroup, initialText: propText, initialTitle = '', onTextChange, onClose }: RhymeZenModeProps) {
    const { user } = useAuth()
    const { showToast } = useToast()

    // Bar-based State
    // Parse propText (string) into Bar[]
    const [bars, setBars] = useState<Bar[]>(() => {
        if (propText) {
            return propText.split('\n').map(line => ({ id: uuidv4(), text: line }))
        }
        return [{ id: uuidv4(), text: '' }]
    })

    // Sync bars back to onTextChange parent if needed
    useEffect(() => {
        if (onTextChange) {
            onTextChange(bars.map(b => b.text).join('\n'))
        }
    }, [bars, onTextChange])

    const [title, setTitle] = useState(initialTitle || `Writing Session ${new Date().toLocaleDateString()}`)
    const [sessionId, setSessionId] = useState<number | null>(null) // Local DB ID

    const [visibleDeckIds, setVisibleDeckIds] = useState<number[]>([])
    const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set())

    // Audio & Recording State
    const {
        startRecording: hookStartRecording,
        stopRecording: hookStopRecording,
        isRecording,
        duration: recordingDuration
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
    const [editingDeckId, setEditingDeckId] = useState<number | null>(null)

    // Fetch all groups
    const allGroups = useLiveQuery(() => db.wordGroups.toArray())

    const normalize = (str: string) => str.toLowerCase()
        .replace(/[\u0591-\u05C7]/g, "")
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
        .trim()

    // Auto-load 4 most recent or initial
    useEffect(() => {
        const loadInitialDecks = async () => {
            if (initialGroup?.id) {
                if (visibleDeckIds.length === 0) setVisibleDeckIds([initialGroup.id])
                return
            }

            if (visibleDeckIds.length === 0) {
                const recent = await db.wordGroups.orderBy('lastUsedAt').reverse().limit(4).toArray()
                if (recent.length > 0) {
                    setVisibleDeckIds(recent.map(r => r.id!))
                }
            }
        }
        loadInitialDecks()
    }, [initialGroup])


    // Visible Decks
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
                if (visibleDeckIds.includes(group.id!)) return

                const hasMatch = group.items.some(item => {
                    const normItem = normalize(item)
                    return words.has(normItem)
                })

                if (hasMatch) {
                    newDeckIdsToVis.add(group.id!)
                }
            })

            if (newDeckIdsToVis.size > 0) {
                setVisibleDeckIds(prev => [...prev, ...Array.from(newDeckIdsToVis)])
            }
        }

        const timer = setTimeout(checkForNewDecks, 1500)
        return () => clearTimeout(timer)
    }, [bars, allGroups, visibleDeckIds])


    // --- Actions ---

    // Ensure session exists (Draft)
    const ensureSessionExists = async (): Promise<number> => {
        if (sessionId) return sessionId;

        // Create draft session
        const session: DbSession = {
            title: title || 'Derived Session',
            type: 'writing',
            date: new Date(),
            createdAt: new Date(),
            duration: 0,
            cloudId: uuidv4(),
            metadata: {
                lyrics: bars.map(b => b.text).join('\n'),
                visibleDeckIds,
                lines: bars.map(b => b.text),
                bars,
                linkedRhymes: []
            }
        }

        // If we are in "text change mode" (embedded), we shouldn't really be creating sessions?
        // But for Audio, we MUST have a session ID.
        // So we create a "Shadow" session or just a normal session.
        // Let's create a normal session.

        const id = await db.sessions.add(session)
        setSessionId(id as number)
        return id as number
    }


    const handleSave = async () => {
        if (onTextChange) { onClose(); return }

        // Use ensureSessionExists logic but with potentially updated data
        const id = await ensureSessionExists()

        // Sync Linked Rhymes
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
                                lineIndex: idx,
                                rhymeId: deck.id!,
                                word: item
                            })
                        }
                    })
                })
            })
        }

        const updateData = {
            title,
            metadata: {
                lyrics: bars.map(b => b.text).join('\n'),
                visibleDeckIds,
                lines: bars.map(b => b.text),
                bars,
                linkedRhymes
            }
        }

        try {
            await db.sessions.update(id, updateData as any)
            if (visibleDeckIds.length > 0) {
                // Fire and forget update stats
                visibleDeckIds.forEach(did => db.wordGroups.update(did, { lastUsedAt: new Date() }).catch(() => { }))
            }
            showToast('Session saved!', 'success')
            onClose()
        } catch (error) {
            console.error('Failed to save session:', error)
            showToast('Failed to save session', 'error')
        }
    }

    // --- Audio Logic ---
    const handleStartRecording = async (barId: string) => {
        if (onTextChange) {
            showToast('Audio recording available in full session mode only.', 'info')
            return
        }

        if (isRecording || activePlaybackBarId) return

        // Ensure session exists so we can link recording
        await ensureSessionExists()

        setRecordingBarId(barId)
        await hookStartRecording()
    }

    const handleStopRecording = async (barId: string) => {
        if (!isRecording || recordingBarId !== barId) return

        const blob = await hookStopRecording()
        setRecordingBarId(null)

        // We need sessionId. ensureSessionExists should have set it.
        if (blob && blob.size > 0 && sessionId) {
            const recordingId = uuidv4()
            const newRecording: BarRecording = {
                id: recordingId,
                sessionId: sessionId,
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

                // Force save session to persist the link?
                // For now, rely on manual save or explicit update
                await db.sessions.update(sessionId, {
                    'metadata.bars': newBars
                } as any)

            } catch (e) {
                console.error("Failed to save recording", e)
                showToast('Failed to save recording', 'error')
            }
        }
    }

    const handlePlayAudio = async (barId: string, audioId: string) => {
        if (activePlaybackBarId && audioPlayerRef.current) {
            audioPlayerRef.current.pause()
            audioPlayerRef.current.currentTime = 0
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
            setActivePlaybackBarId(null)
            setPlaybackState({ currentTime: 0, duration: 0 })
            if (activePlaybackBarId === barId) return
        }

        try {
            const recording = await db.barRecordings.get(audioId)
            if (!recording) return

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
            setActivePlaybackBarId(null)
            if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current)
        }
    }

    const handleDeleteAudio = async (barId: string, audioId: string) => {
        if (confirm("Delete this recording?")) {
            try {
                await db.barRecordings.delete(audioId)
                const newBars = bars.map(b =>
                    b.id === barId ? { ...b, audioId: undefined } : b
                )
                setBars(newBars)
                if (sessionId) {
                    await db.sessions.update(sessionId, { 'metadata.bars': newBars } as any)
                }
                if (activePlaybackBarId === barId) handlePauseAudio()
            } catch (e) {
                console.error("Delete failed", e)
            }
        }
    }


    const toggleDeckVisibility = (id: number) => {
        if (visibleDeckIds.includes(id)) setVisibleDeckIds(prev => prev.filter(did => did !== id))
        else setVisibleDeckIds(prev => [...prev, id])
        setGroupSearchQuery('')
        setShowDeckSelector(false)
    }

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return showToast('Give your group a name!', 'warning')
        if (newGroupItems.length === 0) return showToast('Add some words first!', 'warning')
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
            console.error(e); showToast('Failed to create group', 'error')
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

    const filteredGroups = allGroups?.filter(g => {
        const q = groupSearchQuery.toLowerCase()
        return g.name.toLowerCase().includes(q) || g.items.some(i => i.toLowerCase().includes(q))
    }) || []

    return (
        <div className="fixed inset-0 z-50 bg-[#000] flex flex-col text-white animate-in zoom-in-95 duration-200">

            {/* Header / Controls */}
            <div className="flex items-center justify-between p-4 border-b border-[#333] bg-[#111] overflow-visible z-50">
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="font-bold text-xl text-[#1DB954] flex items-center gap-2 shrink-0">
                        <span className="material-symbols-rounded">spa</span>
                        Zen Mode
                    </h2>

                    {/* Integrated Search & Group Selector */}
                    <div className="relative flex-1 max-w-md ml-4">
                        <div className="flex items-center bg-[#222] border border-[#333] rounded-lg focus-within:border-[#1DB954] transition-colors w-full">
                            <Search size={16} className="text-white/40 ml-3" />
                            <input
                                value={groupSearchQuery}
                                onChange={(e) => {
                                    setGroupSearchQuery(e.target.value)
                                    setShowDeckSelector(true)
                                }}
                                onFocus={() => setShowDeckSelector(true)}
                                placeholder="Search groups or create..."
                                className="bg-transparent border-none outline-none text-sm text-white px-3 py-2 w-full placeholder-white/20"
                            />
                            <button
                                onClick={() => setShowDeckSelector(!showDeckSelector)}
                                className="px-3 py-2 hover:bg-[#333] rounded-r-lg border-l border-[#333] flex items-center gap-2 text-white/40 text-xs"
                            >
                                <Layers size={14} />
                                {visibleDeckIds.length}
                            </button>
                        </div>

                        {/* Dropdown Results */}
                        {showDeckSelector && (
                            <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-[#181818] border border-[#333] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 max-h-[60vh] flex flex-col z-[100]">
                                <div className="p-2 border-b border-[#333] bg-[#222] flex justify-between items-center text-xs text-white/40 uppercase font-bold">
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
                                            className="w-full py-2 mb-2 bg-[#333] text-white/60 hover:text-white hover:bg-[#444] rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-xs uppercase"
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
                                                    ${isSelected ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'hover:bg-[#333] text-white/80'}
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
                                    {filteredGroups.length === 0 && groupSearchQuery && (
                                        <div className="text-center p-4 text-white/40 text-xs">No groups match "{groupSearchQuery}"</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side Controls */}
                <div className="flex items-center gap-2 shrink-0 ml-4">
                    {!onTextChange && (
                        <div className="mr-4">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-transparent text-right font-bold text-white/50 focus:text-white outline-none border-b border-transparent focus:border-[#1DB954] transition-all w-48 text-sm"
                                placeholder="Session Title"
                            />
                        </div>
                    )}
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-[#1DB954] text-black rounded-full font-bold hover:scale-105 transition-transform"
                    >
                        <Save size={18} />
                        <span>{onTextChange ? 'Done' : 'Save'}</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <Minimize2 size={24} />
                    </button>
                </div>
            </div>


            {/* Scrollable Decks Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#0a0a0a] min-h-[40%] border-b border-[#333] relative">
                <div className="flex h-full p-4 gap-4 w-max items-stretch">
                    {visibleDecks?.map((deck, idx) => (
                        <div key={deck.id || idx} className="w-80 bg-[#141414] rounded-xl border border-[#333] flex flex-col overflow-hidden relative group transition-all hover:border-[#1DB954]/50 shadow-lg">
                            {/* Deck Header */}
                            <div className="p-3 border-b border-[#282828] bg-[#181818] flex items-center justify-between shrink-0">
                                <h3 className="font-bold text-[#1DB954] truncate flex-1 mr-2">{deck.name}</h3>
                                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingDeckId(deck.id!); setIsDictaOpen(true) }} className="text-white/40 hover:text-purple-400 p-1 rounded hover:bg-purple-400/10"><Search size={14} /></button>
                                    <button onClick={() => deck.id && toggleDeckVisibility(deck.id)} className="text-white/40 hover:text-red-400 p-1 rounded hover:bg-red-400/10"><X size={14} /></button>
                                </div>
                            </div>
                            {/* Quick Add */}
                            <div className="p-2 bg-[#111] border-b border-[#222] shrink-0">
                                <input placeholder="+ Add word (Enter)" className="w-full bg-[#222] border border-[#333] rounded px-2 py-1 text-xs text-white focus:border-[#1DB954] outline-none" onKeyDown={(e) => { if (e.key === 'Enter') { const val = e.currentTarget.value; if (val && deck.id) { addWordToDeck(deck.id, val); e.currentTarget.value = '' } } }} />
                            </div>
                            {/* Words */}
                            <div className="flex-1 overflow-y-auto p-2 content-start gap-2 custom-scrollbar">
                                <div className="flex flex-wrap gap-2">
                                    {deck.items.map((word, wIdx) => {
                                        const isHighlighted = highlightedWords.has(word)
                                        return (
                                            <span key={wIdx} className={`relative group/word px-2 py-1 rounded text-sm font-medium transition-all duration-300 transform flex items-center gap-1 pr-1 ${isHighlighted ? 'bg-[#1DB954] text-black scale-105 shadow-[0_0_15px_rgba(29,185,84,0.4)] font-bold z-10' : 'bg-[#222] text-white/80 border border-white/5 hover:border-white/20'}`}>
                                                {word}
                                                <button onClick={(e) => { e.stopPropagation(); if (deck.id) removeWordFromDeck(deck.id, word) }} className={`hover:text-red-500 opacity-0 group-hover/word:opacity-100 transition-opacity ${isHighlighted ? 'text-black/50' : 'text-white/30'}`}><X size={10} /></button>
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                    {visibleDeckIds.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-white/30 border border-dashed border-[#333] rounded-xl w-64 h-full bg-[#111]/50">
                            <Layers size={32} className="mb-2 opacity-50" />
                            <span className="text-sm font-medium text-center">No groups selected.<br />Use the search bar above.</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Half: Writing Area (Bar Based) */}
            <div className="h-[40%] bg-[#121212] p-4 flex flex-col relative z-0 box-border overflow-y-auto custom-scrollbar">
                <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full pb-20">
                    {bars.map((bar, idx) => (
                        <BarItem
                            key={bar.id || idx} // fallback idx if id missing (shouldn't happen)
                            bar={bar}
                            index={idx}
                            isActive={false}

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
                            onMergePrev={() => { }}
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
                </div>
            </div>

            {/* Same Creation Modal */}
            {isCreatingGroup && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    {/* Simplified structure to match existing helpers logic, already defined above */}
                    <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#252525] rounded-t-2xl">
                            <h3 className="font-bold flex items-center gap-2 text-white"><Plus size={18} className="text-[#1DB954]" /> New Group</h3>
                            <button onClick={() => setIsCreatingGroup(false)} className="text-white/50"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white" placeholder="Group Name" autoFocus />
                            <div className="flex gap-2">
                                <input value={newItemInput} onChange={e => setNewItemInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualItem()} placeholder="Add word..." className="flex-1 bg-[#111] px-3 py-2 rounded-lg text-white" />
                                <button onClick={addManualItem} className="bg-[#333] text-white p-2 rounded-lg"><Plus /></button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {newGroupItems.map((item, idx) => (
                                    <span key={idx} className="bg-[#222] text-white px-2 py-1 rounded text-sm flex gap-1">{item}</span>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-white/5 bg-[#252525]">
                            <button onClick={handleCreateGroup} className="w-full bg-[#1DB954] text-black font-bold py-2 rounded-lg">Create</button>
                        </div>
                    </div>
                </div>
            )}

            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={(words) => {
                    if (editingDeckId) {
                        const deck = allGroups?.find(g => g.id === editingDeckId)
                        if (deck) {
                            const newItems = [...deck.items, ...words]
                            db.wordGroups.update(editingDeckId, { items: newItems }).then(() => { if (user) syncService.syncWordGroups(user.uid) })
                        }
                    } else {
                        setNewGroupItems(prev => [...prev, ...words])
                    }
                }}
            />

        </div>
    )
}
