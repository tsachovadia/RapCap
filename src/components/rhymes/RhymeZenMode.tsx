import { useState, useEffect } from 'react'
import { X, Plus, Minimize2, Layers, Save, Search, Check } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type WordGroup, type DbSession } from '../../db/db'
import DictaModal from '../shared/DictaModal'
import { syncService } from '../../services/dbSync'
import { useAuth } from '../../contexts/AuthContext'

interface RhymeZenModeProps {
    initialGroup: WordGroup | null
    initialText: string
    initialTitle?: string
    onTextChange?: (text: string) => void
    onClose: () => void
}

export default function RhymeZenMode({ initialGroup, initialText: propText, initialTitle = '', onTextChange, onClose }: RhymeZenModeProps) {
    const { user } = useAuth()

    // Line-based State
    const [lines, setLines] = useState<string[]>(propText ? propText.split('\n') : [''])
    const [title, setTitle] = useState(initialTitle || `Writing Session ${new Date().toLocaleDateString()}`)

    const [visibleDeckIds, setVisibleDeckIds] = useState<number[]>([])
    const [highlightedWords, setHighlightedWords] = useState<Set<string>>(new Set())

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

    // Auto-load 4 most recent
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

    // Sync legacy
    useEffect(() => {
        if (onTextChange) onTextChange(lines.join('\n'))
    }, [lines, onTextChange])

    // Visible Decks
    const visibleDecks = useLiveQuery(
        async () => {
            if (visibleDeckIds.length === 0) return []
            const decks = await db.wordGroups.where('id').anyOf(visibleDeckIds).toArray()
            // Sort by selection order or keep robust? Let's just return found
            return decks
        },
        [visibleDeckIds]
    )

    // Highlight Logic
    useEffect(() => {
        if (!visibleDecks) return

        const normalize = (str: string) => str.toLowerCase()
            .replace(/[\u0591-\u05C7]/g, "")
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
            .trim()

        const HEBREW_PREFIXES = ['ה', 'ו', 'ב', 'ל', 'מ', 'ש', 'כ', 'וה', 'מה', 'שה', 'וכ', 'וב', 'ול']
        const newHighlights = new Set<string>()

        // Flatten full text for easier searching, but we might want line-by-line if optimizing
        // For now, checking inclusion in the full text string is easiest for multi-word phrases
        const fullTextRaw = lines.join(' ')
        const fullTextNorm = normalize(fullTextRaw)

        // Also keep a set of individual words for faster lookup of single words
        const textWords = fullTextNorm.split(/\s+/).filter(Boolean)

        visibleDecks.forEach(deck => {
            deck.items.forEach(item => {
                const normItem = normalize(item)
                if (!normItem) return

                let isMatch = false

                // 1. Direct phrase match in the full text (handles multi-word "lo noach")
                if (fullTextNorm.includes(normItem)) {
                    isMatch = true
                }

                // 2. If not matched yet, check for prefixes on the *first word* of the item if it's a phrase,
                // OR check prefixes on the item itself if it's a single word.
                if (!isMatch) {
                    // Check if any word in the text ends with this item (basic suffix check) - imprecise for phrases
                    // Better: Check if any word in text IS (prefix + item)
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
                    } else {
                        // Multi-word phrase with prefix? e.g. "ve lo noach" for "lo noach"
                        // We can check if "prefix" + " " + "phrase" exists? No usually attached. 
                        // "velo noach" -> "lo noach".
                        // Logic: split item into words [w1, ...rest]. Check if w1 matches with prefix, and rest follows.

                        // Find indices of words that end with firstWord
                        // This is getting complex. Let's stick to simple "includes" for phrases for now, 
                        // and prefix support mainly for single words as per original requirements unless specifically asked.
                        // But user said "lo noach" (phrase) didn't highlight. "includes" fixes that.
                    }
                }

                if (isMatch) newHighlights.add(item)
            })
        })
        setHighlightedWords(newHighlights)

    }, [lines, visibleDecks])

    // --- Actions ---
    const handleSave = async () => {
        if (onTextChange) { onClose(); return }

        // --- Auto-Linking Logic ---
        // Associates rhymes used in this session to the specific lines they appear in.
        // This is valuable for the "Session Review" display.
        const linkedRhymes: { lineIndex: number, rhymeId: number, word: string }[] = []

        if (visibleDecks) {
            const normalize = (str: string) => str.toLowerCase().replace(/[\u0591-\u05C7]/g, "").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").trim()

            lines.forEach((line, idx) => {
                const lineNorm = normalize(line)
                if (!lineNorm) return

                visibleDecks.forEach(deck => {
                    deck.items.forEach(item => {
                        const itemNorm = normalize(item)
                        if (!itemNorm) return

                        // Simple check: does the line include this rhyme word/phrase?
                        // We can reuse the advanced logic from highlighting if we extracted it, 
                        // but "includes" covers 90% and phrases.
                        if (lineNorm.includes(itemNorm)) {
                            linkedRhymes.push({
                                lineIndex: idx,
                                rhymeId: deck.id!, // Assuming deck has ID
                                word: item
                            })
                        }
                    })
                })
            })
        }

        const session: DbSession = {
            title: title || 'Untitled Writing Session',
            type: 'writing',
            date: new Date(),
            createdAt: new Date(),
            duration: 0,
            cloudId: uuidv4(),
            metadata: {
                lyrics: lines.join('\n'),
                visibleDeckIds,
                lines,
                linkedRhymes // <--- NEW FIELD
            }
        }
        try {
            await db.sessions.add(session)
            if (visibleDeckIds.length > 0) {
                await Promise.all(visibleDeckIds.map(id => db.wordGroups.update(id, { lastUsedAt: new Date() })))
            }
            alert('Session saved!')
            onClose()
        } catch (error) {
            console.error('Failed to save session:', error)
            alert('Failed to save session')
        }
    }

    const toggleDeckVisibility = (id: number) => {
        if (visibleDeckIds.includes(id)) setVisibleDeckIds(prev => prev.filter(did => did !== id))
        else setVisibleDeckIds(prev => [...prev, id])
        setGroupSearchQuery('') // Clear search on select
        setShowDeckSelector(false) // Close dropdown on select? User might want to select multiple. Let's keep one action for now.
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

    // --- Deck Editing (Directly in View) ---
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
        // Smart Search: Name OR Items
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
                            <Search size={16} className="text-subdued ml-3" />
                            <input
                                value={groupSearchQuery}
                                onChange={(e) => {
                                    setGroupSearchQuery(e.target.value)
                                    setShowDeckSelector(true)
                                }}
                                onFocus={() => setShowDeckSelector(true)}
                                placeholder="Search groups or create..."
                                className="bg-transparent border-none outline-none text-sm text-white px-3 py-2 w-full"
                            />
                            <button
                                onClick={() => setShowDeckSelector(!showDeckSelector)}
                                className="px-3 py-2 hover:bg-[#333] rounded-r-lg border-l border-[#333] flex items-center gap-2 text-subdued text-xs"
                            >
                                <Layers size={14} />
                                {visibleDeckIds.length}
                            </button>
                        </div>

                        {/* Dropdown Results */}
                        {showDeckSelector && (
                            <div className="absolute top-full left-0 mt-2 w-full min-w-[300px] bg-[#181818] border border-[#333] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 max-h-[60vh] flex flex-col z-[100]">
                                <div className="p-2 border-b border-[#333] bg-[#222] flex justify-between items-center text-xs text-subdued uppercase font-bold">
                                    <span>Select Groups to Show</span>
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
                                            className="w-full py-2 mb-2 bg-[#333] text-subdued hover:text-white hover:bg-[#444] rounded-lg flex items-center justify-center gap-2 transition-colors font-bold text-xs uppercase"
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
                                        <div className="text-center p-4 text-subdued text-xs">No groups match "{groupSearchQuery}"</div>
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
                        className="p-2 rounded-full hover:bg-white/10 text-subdued hover:text-white transition-colors"
                    >
                        <Minimize2 size={24} />
                    </button>
                </div>
            </div>

            {/* Top Half: Horizontal Scrollable Decks */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#0a0a0a] min-h-[40%] border-b border-[#333] relative">
                <div className="flex h-full p-4 gap-4 w-max items-stretch">
                    {visibleDecks?.map((deck, idx) => (
                        <div key={deck.id || idx} className="w-80 bg-[#141414] rounded-xl border border-[#333] flex flex-col overflow-hidden relative group transition-all hover:border-[#1DB954]/50 shadow-lg">
                            {/* Deck Header */}
                            <div className="p-3 border-b border-[#282828] bg-[#181818] flex items-center justify-between shrink-0">
                                <h3 className="font-bold text-[#1DB954] truncate flex-1 mr-2">{deck.name}</h3>
                                <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setEditingDeckId(deck.id!)
                                            setIsDictaOpen(true)
                                        }}
                                        className="text-subdued hover:text-purple-400 p-1 rounded hover:bg-purple-400/10"
                                        title="Find Rhymes (Dicta)"
                                    >
                                        <Search size={14} />
                                    </button>
                                    <button
                                        onClick={() => deck.id && toggleDeckVisibility(deck.id)}
                                        className="text-subdued hover:text-red-400 p-1 rounded hover:bg-red-400/10"
                                        title="Close"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>

                            {/* Quick Add Input */}
                            <div className="p-2 bg-[#111] border-b border-[#222] shrink-0">
                                <input
                                    placeholder="+ Add word (Enter)"
                                    className="w-full bg-[#222] border border-[#333] rounded px-2 py-1 text-xs text-white focus:border-[#1DB954] outline-none"
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
                                                        : 'bg-[#222] text-white/80 border border-white/5 hover:border-white/20'
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
                        <div className="flex flex-col items-center justify-center p-8 text-subdued border border-dashed border-[#333] rounded-xl w-64 h-full bg-[#111]/50">
                            <Layers size={32} className="mb-2 opacity-50" />
                            <span className="text-sm font-medium text-center">No groups selected.<br />Use the search bar above to add one!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Half: Writing Area (Line Based) */}
            <div className="h-[40%] bg-[#121212] p-4 flex flex-col relative z-0 box-border overflow-y-auto custom-scrollbar">
                {/* ... existing writing code ... */}
                <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
                    {lines.map((line, idx) => (
                        <div key={idx} className="flex items-center gap-2 group animate-in slide-in-from-bottom-2 duration-300">
                            {/* Same as before */}
                            <span className="text-subdued text-xs font-mono w-6 text-right opacity-20 group-hover:opacity-100 uppercase">{idx + 1}</span>
                            <div className="relative flex-1">
                                <input
                                    id={`line-${idx}`}
                                    value={line}
                                    onChange={(e) => {
                                        const newLines = [...lines]
                                        newLines[idx] = e.target.value
                                        setLines(newLines)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault()
                                            const newLines = [...lines]; newLines.splice(idx + 1, 0, ''); setLines(newLines);
                                            setTimeout(() => document.getElementById(`line-${idx + 1}`)?.focus(), 0)
                                        } else if (e.key === 'Backspace' && lines[idx] === '' && lines.length > 1) {
                                            e.preventDefault()
                                            const newLines = [...lines]; newLines.splice(idx, 1); setLines(newLines);
                                            setTimeout(() => document.getElementById(`line-${idx - 1}`)?.focus(), 0)
                                        }
                                    }}
                                    placeholder={idx === 0 ? "Start writing bars..." : ""}
                                    className="w-full bg-transparent outline-none text-xl leading-relaxed text-white/90 font-hebrew placeholder-white/20 border-b border-transparent focus:border-[#1DB954]/30 transition-colors py-1"
                                    style={{ direction: 'rtl' }}
                                    autoFocus={idx === lines.length - 1 && lines.length === 1}
                                />
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => {
                            setLines(prev => [...prev, ''])
                            setTimeout(() => document.getElementById(`line-${lines.length}`)?.focus(), 0)
                        }}
                        className="mt-4 self-center flex items-center gap-2 text-subdued hover:text-[#1DB954] transition-colors text-sm py-2 px-4 rounded-lg hover:bg-[#1DB954]/5"
                    >
                        <Plus size={16} />
                        Add next bar
                    </button>
                </div>
            </div>

            {/* Quick Group Creator Modal (Global) - Unchanged essentially, but let's keep it consistent */}
            {isCreatingGroup && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[80vh]">
                        {/* Same Creation Modal Logic */}
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#252525] rounded-t-2xl">
                            <h3 className="font-bold flex items-center gap-2 text-white">
                                <Plus size={18} className="text-[#1DB954]" />
                                Create New Rhyme Group
                            </h3>
                            <button onClick={() => setIsCreatingGroup(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="text-xs text-subdued uppercase font-bold block mb-1">Group Name</label>
                                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#1DB954] outline-none" autoFocus />
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input value={newItemInput} onChange={e => setNewItemInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManualItem()} placeholder="Add word..." className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
                                    <button onClick={addManualItem} className="bg-[#333] text-white p-2 rounded-lg"><Plus size={18} /></button>
                                    <button onClick={() => { setEditingDeckId(null); setIsDictaOpen(true) }} className="bg-purple-600/20 text-purple-400 border border-purple-500/30 px-3 rounded-lg flex items-center gap-1 text-sm"><Search size={14} /> Dicta</button>
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
            )}

            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={(words) => {
                    // Logic: If editing existing deck, update DB. If creating new, update state.
                    if (editingDeckId) {
                        // Add to existing
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
        </div>
    )
}
