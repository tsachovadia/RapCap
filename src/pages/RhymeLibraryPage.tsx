import { useLiveQuery } from 'dexie-react-hooks'
import { db, type WordGroup } from '../db/db'
import { Trash2, Search, Circle, CheckCircle2, ExternalLink, Plus, Book, PenTool, Sparkles, X, WifiOff } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { syncService } from '../services/dbSync'
import { useAuth } from '../contexts/AuthContext'
import DictaModal from '../components/shared/DictaModal'

export default function RhymeLibraryPage() {
    const list = useLiveQuery(() => db.wordGroups.toArray())
    const navigate = useNavigate()
    const { user } = useAuth()

    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isSelectionMode, setIsSelectionMode] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // Toggle selection
    const toggleSelection = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id))
        } else {
            setSelectedIds([...selectedIds, id])
        }
    }

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return
        if (confirm(`Delete ${selectedIds.length} groups?`)) {
            if (user) {
                await syncService.deleteWordGroups(user.uid, selectedIds)
            } else {
                await db.wordGroups.bulkDelete(selectedIds)
            }
            setSelectedIds([])
            setIsSelectionMode(false)
        }
    }

    const handleMerge = async () => {
        if (selectedIds.length < 2) return
        const newName = prompt("Enter name for merged group:")
        if (!newName) return

        const groupsToMerge = list?.filter(g => g.id && selectedIds.includes(g.id)) || []
        const allItems = Array.from(new Set(groupsToMerge.flatMap(g => g.items)))

        const newGroup: WordGroup = {
            name: newName,
            items: allItems,
            createdAt: new Date(),
            lastUsedAt: new Date(),
        }

        try {
            // Create new group
            await db.wordGroups.add(newGroup)

            // Delete old groups
            if (user) {
                await syncService.deleteWordGroups(user.uid, selectedIds)
                await syncService.syncWordGroups(user.uid)
            } else {
                await db.wordGroups.bulkDelete(selectedIds)
            }

            setSelectedIds([])
            setIsSelectionMode(false)
            alert("Groups merged successfully!")
        } catch (e) {
            console.error(e)
            alert("Failed to merge groups")
        }
    }

    const handleConnect = async (type: 'perfect' | 'slant' | 'family') => {
        if (selectedIds.length < 2) return

        // This is a simplified implementation. Ideally we'd update all selected groups 
        // to point to each other, or use a separate connections table.
        // For now, we will add connections to each group pointing to the others.

        try {
            await db.transaction('rw', db.wordGroups, async () => {
                for (const id of selectedIds) {
                    const group = await db.wordGroups.get(id)
                    if (!group) continue

                    const otherIds = selectedIds.filter(sid => sid !== id)
                    const newConnections = otherIds.map(targetId => ({
                        targetGroupId: targetId,
                        type,
                        strength: 1
                    }))

                    const existingConnections = group.connections || []
                    // Merge new connections, avoiding duplicates
                    const updatedConnections = [...existingConnections]

                    newConnections.forEach(newConn => {
                        if (!updatedConnections.some(c => c.targetGroupId === newConn.targetGroupId)) {
                            updatedConnections.push(newConn)
                        }
                    })

                    await db.wordGroups.update(id, { connections: updatedConnections })
                }
            })

            if (user) syncService.syncWordGroups(user.uid).catch(console.error)

            setSelectedIds([])
            setIsSelectionMode(false)
            alert(`Groups connected as ${type} rhymes!`)
        } catch (e) {
            console.error(e)
            alert("Failed to connect groups")
        }
    }



    const createNewGroup = async (name: string) => {
        const newGroup: WordGroup = {
            name: name,
            items: [],
            createdAt: new Date(),
            lastUsedAt: new Date(),
        }
        try {
            const id = await db.wordGroups.add(newGroup)
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)
            navigate(`/rhyme-library/${id}`)
        } catch (e) {
            console.error(e)
            alert("Failed to create group")
        }
    }

    const filteredList = list?.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.items.some(i => i.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || []

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white overflow-hidden">
            {/* Header & Search */}
            <div className="p-4 border-b border-white/5 bg-[#1a1a1a] flex-none space-y-3 z-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Book className="text-[#1DB954]" size={24} />
                        Rhyme Library
                    </h1>

                    {isSelectionMode ? (
                        <div className="flex items-center gap-2 animate-in fade-in">
                            <span className="font-bold text-sm mr-2">{selectedIds.length} Selected</span>

                            {/* Merge Button */}
                            <button
                                onClick={handleMerge}
                                disabled={selectedIds.length < 2}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedIds.length >= 2 ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                            >
                                Merge
                            </button>

                            {/* Connect Button (Dropdown trigger effectively) */}
                            <div className="flex items-center gap-1 bg-purple-500/10 rounded-lg p-0.5">
                                <button
                                    onClick={() => handleConnect('perfect')}
                                    disabled={selectedIds.length < 2}
                                    title="Connect as Perfect Rhymes"
                                    className={`p-1.5 rounded-md transition-colors ${selectedIds.length >= 2 ? 'text-purple-400 hover:bg-purple-500/20' : 'text-white/20 cursor-not-allowed'}`}
                                >
                                    <div className="w-3 h-3 rounded-full border-2 border-current" />
                                </button>
                                <button
                                    onClick={() => handleConnect('slant')}
                                    disabled={selectedIds.length < 2}
                                    title="Connect as Slant Rhymes"
                                    className={`p-1.5 rounded-md transition-colors ${selectedIds.length >= 2 ? 'text-orange-400 hover:bg-orange-500/20' : 'text-white/20 cursor-not-allowed'}`}
                                >
                                    <div className="w-3 h-3 rounded-full border border-dashed border-current" />
                                </button>
                            </div>

                            <div className="w-px h-6 bg-white/10 mx-1" />

                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className={`p-2 rounded-full ${selectedIds.length > 0 ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-white/20 cursor-not-allowed'}`}
                            >
                                <Trash2 size={18} />
                            </button>

                            <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]) }} className="text-sm font-medium text-white/50 hover:text-white ml-2">
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <Link to="/rhyme-library/session">
                            <button className="flex items-center gap-2 bg-[#1DB954] text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition-transform">
                                <PenTool size={16} />
                                New Session
                            </button>
                        </Link>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
                    <input
                        type="text"
                        placeholder="Search or create rhyme group..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#252525] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#1DB954]/50 transition-colors"
                    />
                </div>
            </div>

            {/* Content Grid - Vertical Scroll (Mobile) / Horizontal Scroll (Desktop) */}
            <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto p-4 custom-scrollbar">

                {(!list || list.length === 0) && !searchQuery ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 gap-3 w-full">
                        <Book size={40} strokeWidth={1} />
                        <p className="text-xs">No rhyme groups yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-rows-3 md:grid-flow-col gap-4 h-full w-full md:w-max md:pr-10 pb-20 md:pb-0">
                        {/* Create Option Card */}
                        {searchQuery && !filteredList.some(g => g.name.toLowerCase() === searchQuery.toLowerCase()) && (
                            <div
                                onClick={() => createNewGroup(searchQuery)}
                                className="w-full md:w-80 h-40 md:h-full bg-[#1DB954]/5 border border-[#1DB954]/20 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-[#1DB954]/10 transition-colors"
                            >
                                <div className="p-3 bg-[#1DB954]/20 rounded-full text-[#1DB954]">
                                    <Plus size={24} />
                                </div>
                                <h3 className="font-bold text-[#1DB954]">Create "{searchQuery}"</h3>
                            </div>
                        )}

                        {filteredList.map((group) => (
                            <RhymeGroupCard
                                key={group.id}
                                group={group}
                                isSelected={selectedIds.includes(group.id!)}
                                isSelectionMode={isSelectionMode}
                                toggleSelection={toggleSelection}
                                setIsSelectionMode={setIsSelectionMode}
                                user={user}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// Extracted Component to handle local state without violating hooks rules
function RhymeGroupCard({
    group,
    isSelected,
    isSelectionMode,
    toggleSelection,
    setIsSelectionMode,
    user
}: {
    group: WordGroup,
    isSelected: boolean,
    isSelectionMode: boolean,
    toggleSelection: (id: number) => void,
    setIsSelectionMode: (v: boolean) => void,
    user: any
}) {
    const navigate = useNavigate()
    const [isAdding, setIsAdding] = useState(false)
    const [newWord, setNewWord] = useState('')
    const [bars, setBars] = useState(group.bars || '')
    const [isDictaOpen, setIsDictaOpen] = useState(false)
    const isOnline = useOnlineStatus()

    // Sync local bars state when group changes (e.g. from sync)
    useEffect(() => {
        setBars(group.bars || '')
    }, [group.bars])

    const handleAddWord = async (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (!newWord.trim() || !group.id) return

        try {
            const updatedItems = [...group.items, newWord.trim()]
            await db.wordGroups.update(group.id, { items: updatedItems })
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)
            setNewWord('')
            setIsAdding(false)
        } catch (error) {
            console.error("Failed to add word", error)
        }
    }

    const handleAddWords = async (words: string[]) => {
        if (!group.id) return
        try {
            const updatedItems = [...group.items, ...words]
            await db.wordGroups.update(group.id, { items: updatedItems })
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)
        } catch (error) {
            console.error("Failed to add words", error)
        }
    }

    const handleRemoveItem = async (index: number) => {
        if (!group.id) return
        try {
            const updatedItems = group.items.filter((_, i) => i !== index)
            await db.wordGroups.update(group.id, { items: updatedItems })
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)
        } catch (error) {
            console.error("Failed to remove word", error)
        }
    }

    const handleBarsChange = async (val: string) => {
        setBars(val)
        // Debounced save could be better, but for now specific save on blur or raw update
    }

    const saveBars = async () => {
        if (!group.id) return
        try {
            await db.wordGroups.update(group.id, { bars })
            if (user) syncService.syncWordGroups(user.uid).catch(console.error)
        } catch (error) {
            console.error("Failed to save bars", error)
        }
    }

    return (
        <div
            onClick={() => {
                if (isSelectionMode && group.id) toggleSelection(group.id)
            }}
            onContextMenu={(e) => {
                e.preventDefault()
                if (group.id) {
                    if (!isSelectionMode) setIsSelectionMode(true)
                    toggleSelection(group.id)
                }
            }}
            className={`
                w-full md:w-96 h-auto md:h-full min-h-[16rem] rounded-xl p-4 flex flex-col gap-3 relative group transition-all border select-none
                ${isSelected
                    ? 'bg-purple-900/20 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.15)]'
                    : 'bg-[#1e1e1e] border-white/5 hover:border-white/20 hover:bg-[#252525]'
                }
            `}
        >
            {/* Selection Checkbox */}
            {isSelectionMode && (
                <div className="absolute top-3 right-3 z-10">
                    {isSelected
                        ? <CheckCircle2 className="text-purple-500 fill-black" size={20} />
                        : <Circle className="text-white/20 hover:text-white/50" size={20} />
                    }
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <h3 className={`font-bold text-lg leading-tight truncate pr-2 ${isSelected ? 'text-purple-300' : 'text-white'}`}>
                    {group.name}
                </h3>

                <div className="flex items-center gap-1">
                    {/* Dicta Button */}
                    {!isSelectionMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (!isOnline) return
                                setIsDictaOpen(true)
                            }}
                            className={`p-1.5 rounded-full transition-colors ${!isOnline ? 'text-white/20 cursor-not-allowed' : 'hover:bg-white/10 text-purple-400/70 hover:text-purple-400'}`}
                            title={!isOnline ? "Unavailable offline" : "Find Rhymes with Dicta"}
                        >
                            {!isOnline ? <WifiOff size={16} /> : <Sparkles size={16} />}
                        </button>
                    )}

                    {!isSelectionMode && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (group.id) navigate(`/rhyme-library/${group.id}`)
                            }}
                            className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                            title="Go to Group Page"
                        >
                            <ExternalLink size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable Word List (Preview) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1 bg-black/20 rounded-lg p-2 inner-shadow">
                <div className="flex flex-wrap gap-1.5 content-start">
                    {group.items.map((word, idx) => (
                        <span
                            key={idx}
                            className={`
                                px-2 py-0.5 rounded-full text-[10px] border truncate max-w-full relative group/item
                                ${isSelected
                                    ? 'bg-purple-500/20 border-purple-500/30 text-purple-200'
                                    : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white/90'
                                }
                            `}
                        >
                            {word}
                            {!isSelectionMode && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveItem(idx)
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                >
                                    <X size={8} />
                                </button>
                            )}
                        </span>
                    ))}

                    {/* Inline Add Button */}
                    {!isSelectionMode && !isAdding && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                setIsAdding(true)
                            }}
                            className="px-2 py-0.5 rounded-full text-[10px] border border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/40 transition-colors flex items-center gap-1"
                        >
                            <Plus size={10} /> Add
                        </button>
                    )}
                    {/* Inline Add Form */}
                    {isAdding && (
                        <div className="animate-in fade-in w-24">
                            <form onSubmit={handleAddWord} className="flex gap-1">
                                <input
                                    autoFocus
                                    type="text"
                                    value={newWord}
                                    onChange={(e) => setNewWord(e.target.value)}
                                    onBlur={() => !newWord && setIsAdding(false)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full bg-black/40 border border-white/20 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:border-[#1DB954]/50"
                                />
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Bars Area (Inline Editor) */}
            {!isSelectionMode && (
                <div className="shrink-0 h-24 bg-black/20 rounded-lg border border-white/5 focus-within:border-white/20 transition-colors overflow-hidden flex flex-col">
                    <textarea
                        value={bars}
                        onChange={(e) => handleBarsChange(e.target.value)}
                        onBlur={saveBars} // Save on blur
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Write barz..."
                        className="w-full h-full bg-transparent p-2 text-xs text-white/80 resize-none focus:outline-none"
                        style={{ direction: 'rtl' }}
                    />
                </div>
            )}

            {/* Metadata Footer */}
            {group.connections && group.connections.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] text-blue-400 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>{group.connections.length} links</span>
                </div>
            )}

            {/* Dicta Modal */}
            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={handleAddWords}
            />
        </div>
    )
}

