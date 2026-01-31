import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { Plus, Book, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { syncService } from '../services/dbSync'
import { useAuth } from '../contexts/AuthContext'

export default function RhymeLibraryPage() {
    const list = useLiveQuery(() => db.wordGroups.toArray())
    const navigate = useNavigate()
    const { user } = useAuth()
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
    const [isSelectionMode, setIsSelectionMode] = useState(false)

    // Sync selection mode with selected items if needed, but allow empty selection in mode
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

    const startSelectionMode = () => {
        setIsSelectionMode(true)
        setSelectedIds([])
    }

    const cancelSelectionMode = () => {
        setIsSelectionMode(false)
        setSelectedIds([])
    }

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-[#1a1a1a] flex justify-between items-center sticky top-0 z-10 transition-colors">
                {isSelectionMode ? (
                    <div className="flex items-center gap-4 w-full animate-in fade-in duration-200">
                        <button onClick={cancelSelectionMode} className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                            Cancel
                        </button>
                        <span className="font-bold flex-1 text-center">{selectedIds.length} Selected</span>
                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedIds.length === 0}
                            className={`p-2 rounded-full transition-all ${selectedIds.length > 0 ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-white/20'}`}
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                ) : (
                    <>
                        <h1 className="text-xl font-bold">📚 Rhyme Library</h1>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={startSelectionMode}
                                className="text-sm font-medium text-white/60 hover:text-white transition-colors"
                            >
                                Select
                            </button>
                            <div className="h-4 w-px bg-white/10 mx-1" />
                            <Link to="/rhyme-library/new">
                                <button className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:bg-purple-500 transition-colors">
                                    <Plus size={16} />
                                    New
                                </button>
                            </Link>
                        </div>
                    </>
                )}
            </div>

            {/* View Toggle Bar (Only visible when not selecting to keep UI clean, or keep it always? Let's keep it clean) */}
            {!isSelectionMode && (
                <div className="px-4 py-2 flex justify-end">
                    <div className="bg-[#1e1e1e] rounded-lg p-1 flex gap-1 border border-white/5">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-purple-600/20 text-purple-400' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-purple-600/20 text-purple-400' : 'text-white/30 hover:text-white/60'}`}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Content List/Grid */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${viewMode === 'list' ? '' : 'p-4'}`}>
                {viewMode === 'list' ? (
                    // LIST VIEW
                    <div className="flex flex-col">
                        {list?.map((group) => {
                            const isSelected = selectedIds.includes(group.id!)
                            return (
                                <div
                                    key={group.id}
                                    onClick={() => group.id && handleCardClick(group.id)}
                                    className={`
                                        w-full p-4 border-b border-white/5 flex items-center justify-between transition-all cursor-pointer
                                        ${isSelected ? 'bg-purple-900/20' : 'bg-[#121212] hover:bg-[#1a1a1a]'}
                                    `}
                                >
                                    <div className="flex items-center gap-4 flex-1">
                                        {/* Selection Checkbox */}
                                        {isSelectionMode && (
                                            <div className="transition-in fade-in duration-200">
                                                {isSelected
                                                    ? <CheckCircle2 className="text-purple-500 fill-purple-500/20" size={20} />
                                                    : <Circle className="text-white/20" size={20} />
                                                }
                                            </div>
                                        )}

                                        {/* Icon */}
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center border
                                            ${isSelected ? 'bg-purple-500/20 border-purple-500/40' : 'bg-[#252525] border-white/5'}
                                        `}>
                                            <Book size={18} className={`${isSelected ? 'text-purple-400' : 'text-white/40'}`} />
                                        </div>

                                        {/* Text Info */}
                                        <div className="flex flex-col">
                                            <h3 className={`font-bold text-base ${isSelected ? 'text-purple-100' : 'text-white'}`}>
                                                {group.name}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-white/30 uppercase tracking-wider">{group.items.length} WORDS</span>
                                                {(group.story || group.mnemonicLogic) && (
                                                    <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-white/40">STORY</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Arrow / Action */}
                                    {!isSelectionMode && (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/10">
                                            <polyline points="9 18 15 12 9 6"></polyline>
                                        </svg>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    // GRID VIEW
                    <div className="grid grid-cols-2 gap-3">
                        {list?.map((group) => {
                            const isSelected = selectedIds.includes(group.id!)
                            return (
                                <div
                                    key={group.id}
                                    onClick={() => group.id && handleCardClick(group.id)}
                                    onContextMenu={(e) => {
                                        e.preventDefault()
                                        if (group.id) {
                                            if (!isSelectionMode) startSelectionMode()
                                            toggleSelection(group.id)
                                        }
                                    }}
                                    className={`
                                        relative aspect-square rounded-2xl p-4 flex flex-col justify-between transition-all cursor-pointer border
                                        ${isSelected
                                            ? 'bg-purple-900/20 border-purple-500'
                                            : 'bg-[#1e1e1e] border-white/5 hover:bg-[#252525] hover:border-white/10'
                                        }
                                    `}
                                >
                                    {/* Selection Indicator */}
                                    {isSelectionMode && (
                                        <div className={`absolute top-3 left-3 z-10`}>
                                            {isSelected
                                                ? <CheckCircle2 className="text-purple-500 fill-purple-500/20" size={20} />
                                                : <Circle className="text-white/20" size={20} />
                                            }
                                        </div>
                                    )}

                                    {/* Top Right: Story Indicator */}
                                    <div className="self-end text-white/40">
                                        {(group.story || group.mnemonicLogic) && (
                                            <Book size={16} className={`${isSelected ? 'text-purple-400' : 'text-purple-400/60'}`} />
                                        )}
                                    </div>

                                    {/* Center: Name */}
                                    <div className="text-center mt-2">
                                        <h3 className="font-bold text-lg leading-tight mb-1">{group.name}</h3>
                                        <span className="text-[10px] text-white/30 uppercase tracking-widest">{group.items.length} WORDS</span>
                                    </div>

                                    {/* Bottom: Color Dot (Decorative) */}
                                    <div className="flex justify-center mt-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-purple-500' : 'bg-white/20'}`} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {(!list || list.length === 0) && (
                    <div className="flex flex-col items-center justify-center h-64 text-white/20 gap-4">
                        <Book size={48} strokeWidth={1} />
                        <p>No rhyme groups yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}
