import { useLiveQuery } from 'dexie-react-hooks'
import { db, type WordGroup } from '../db/db'
import { Plus, Book, Trash2, CheckCircle2, Circle, PenTool, Search } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { syncService } from '../services/dbSync'
import { useAuth } from '../contexts/AuthContext'

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

    const handleCardClick = (id: number) => {
        if (isSelectionMode) {
            toggleSelection(id)
        } else {
            navigate(`/rhyme-library/${id}`)
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
        <div className="flex flex-col h-full bg-[#121212] text-white">
            {/* Header & Search */}
            <div className="p-4 border-b border-white/5 bg-[#1a1a1a] sticky top-0 z-10 space-y-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Book className="text-[#1DB954]" size={24} />
                        Rhyme Library
                    </h1>

                    {isSelectionMode ? (
                        <div className="flex items-center gap-4 animate-in fade-in">
                            <button onClick={() => { setIsSelectionMode(false); setSelectedIds([]) }} className="text-sm font-medium text-white/60 hover:text-white">
                                Cancel
                            </button>
                            <span className="font-bold text-sm">{selectedIds.length} Selected</span>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.length === 0}
                                className={`p-2 rounded-full ${selectedIds.length > 0 ? 'text-red-400 bg-red-500/10' : 'text-white/20'}`}
                            >
                                <Trash2 size={18} />
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

            {/* Content Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {/* Create Option */}
                {searchQuery && !filteredList.some(g => g.name.toLowerCase() === searchQuery.toLowerCase()) && (
                    <button
                        onClick={() => createNewGroup(searchQuery)}
                        className="w-full bg-[#1DB954]/10 border border-[#1DB954]/20 text-[#1DB954] p-3 rounded-xl flex items-center justify-center gap-2 mb-3 text-sm font-bold hover:bg-[#1DB954]/20 transition-colors"
                    >
                        <Plus size={16} />
                        Create "{searchQuery}"
                    </button>
                )}

                {/* List Layout (Rows) */}
                <div className="flex flex-col gap-2">
                    {filteredList.map((group) => {
                        const isSelected = selectedIds.includes(group.id!)
                        return (
                            <div
                                key={group.id}
                                onClick={() => group.id && handleCardClick(group.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault()
                                    if (group.id) {
                                        if (!isSelectionMode) setIsSelectionMode(true)
                                        toggleSelection(group.id)
                                    }
                                }}
                                className={`
                                    w-full p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer border
                                    ${isSelected
                                        ? 'bg-purple-900/20 border-purple-500'
                                        : 'bg-[#1e1e1e] border-white/5 hover:bg-[#252525] hover:border-white/10'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    {isSelectionMode && (
                                        <div className="shrink-0">
                                            {isSelected
                                                ? <CheckCircle2 className="text-purple-500 fill-purple-500/20" size={18} />
                                                : <Circle className="text-white/20" size={18} />
                                            }
                                        </div>
                                    )}

                                    <div className="flex flex-col min-w-0">
                                        <h3 className="font-bold text-sm leading-tight truncate">{group.name}</h3>
                                        <span className="text-[10px] text-white/30 uppercase tracking-widest">{group.items.length} WORDS</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {(group.story || group.mnemonicLogic) && (
                                        <Book size={14} className={`${isSelected ? 'text-purple-400' : 'text-white/30'}`} />
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {(!list || list.length === 0) && !searchQuery && (
                    <div className="flex flex-col items-center justify-center h-48 text-white/20 gap-3">
                        <Book size={40} strokeWidth={1} />
                        <p className="text-xs">No rhyme groups yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}
