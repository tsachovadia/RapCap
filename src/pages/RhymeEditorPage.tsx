import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, type WordGroup } from '../db/db'
import { Plus, Trash2, Save, ArrowLeft, Sparkles, Loader2, ChevronDown, ChevronUp, Mic, ExternalLink } from 'lucide-react'
import { generateMnemonicStory } from '../services/gemini'
import { syncService } from '../services/dbSync'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import DictaModal from '../components/shared/DictaModal'
import { useLiveQuery } from 'dexie-react-hooks'

export default function RhymeEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { showToast } = useToast()
    const isNew = !id || id === 'new'

    // Form State
    const [name, setName] = useState('')
    const [items, setItems] = useState<string[]>([])
    const [story, setStory] = useState('')
    const [mnemonicLogic, setMnemonicLogic] = useState('')
    const [bars, setBars] = useState('')
    const [newItem, setNewItem] = useState('')

    // AI / Dicta State
    const [isGenerating, setIsGenerating] = useState(false)
    const [isEditingStory, setIsEditingStory] = useState(false)

    // View State (Collapsible Sections)
    const [isWordBankOpen, setIsWordBankOpen] = useState(false)
    const [isStoryOpen, setIsStoryOpen] = useState(false)
    const [isLogicOpen, setIsLogicOpen] = useState(false)
    const [isBarsOpen, setIsBarsOpen] = useState(false)
    const [isContextOpen, setIsContextOpen] = useState(true) // Default to open if there are links
    const [isSaving, setIsSaving] = useState(false)
    const [createdAt, setCreatedAt] = useState<Date | null>(null)

    // Dicta Modal State
    const [isDictaOpen, setIsDictaOpen] = useState(false)

    // Load Linked Sessions
    const linkedSessions = useLiveQuery(async () => {
        if (!id || isNew) return []
        const numId = parseInt(id)
        return db.sessions
            .filter(session => {
                const links = session.metadata?.linkedRhymes || []
                return links.some((l: any) => Number(l.rhymeId) === numId)
            })
            .toArray()
    }, [id, isNew])

    // Load Data
    useEffect(() => {
        if (!isNew && id) {
            db.wordGroups.get(parseInt(id)).then(group => {
                if (group) {
                    setName(group.name)
                    setItems(group.items)
                    setStory(group.story || '')
                    setMnemonicLogic(group.mnemonicLogic || '')
                    setBars(group.bars || '')
                    if (group.createdAt) setCreatedAt(new Date(group.createdAt))
                    else setCreatedAt(new Date()) // Fallback for legacy data missing createdAt
                }
            })
        }
    }, [id, isNew])

    const handleSave = async () => {
        if (isSaving) return
        if (!name.trim()) return showToast('Please give your rhyme group a name!', 'warning')

        setIsSaving(true)
        const groupData: WordGroup = {
            name,
            items,
            story,
            mnemonicLogic,
            bars,
            createdAt: createdAt || new Date(),
            lastUsedAt: new Date(),
            // Preserve ID if editing
            ...(isNew ? {} : { id: parseInt(id!) })
        }

        try {
            if (isNew) {
                await db.wordGroups.add(groupData)
            } else {
                // If existing, we MUST preserve cloudId and syncedAt to prevent duplication by sync engine
                const existing = await db.wordGroups.get(parseInt(id!))
                if (existing) {
                    groupData.cloudId = existing.cloudId
                    groupData.syncedAt = existing.syncedAt
                }
                await db.wordGroups.put({ ...groupData, id: parseInt(id!) })
            }

            // Trigger background sync (non-blocking)
            if (user) {
                syncService.syncWordGroups(user.uid).catch(console.error);
            }

            navigate('/rhyme-library') // Go back to library
        } catch (err) {
            console.error("Failed to save:", err)
            showToast('Error saving group.', 'error')
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this deck?')) {
            if (id) {
                const numericId = parseInt(id);
                if (user) {
                    await syncService.deleteWordGroups(user.uid, [numericId]);
                } else {
                    await db.wordGroups.delete(numericId);
                }
            }
            navigate('/rhyme-library')
        }
    }

    const addItem = () => {
        if (!newItem.trim()) return
        setItems([...items, newItem.trim()])
        setNewItem('')
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    // --- AI Story ---
    const handleMagicStory = async () => {
        if (items.length < 2) {
            showToast('Please add at least 2 words first!', 'warning');
            return;
        }

        setIsGenerating(true);
        // Ensure section is open to see result
        setIsStoryOpen(true);
        setIsLogicOpen(true);

        try {
            const result = await generateMnemonicStory(items);
            setStory(result.story);
            setMnemonicLogic(result.logic);
        } catch (error) {
            showToast('Failed to generate story. Check your internet or API key.', 'error');
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    }




    // Simplified UI Layout for Reading Mode
    // 1. Title (Already in Header)
    // 2. Small List of all rhymes
    // 3. Story (Main Focus)
    // 4. Categories (Bottom - Placeholder)

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white relative">
            {/* Header */}
            <div className="sticky top-0 z-30 flex items-center justify-between p-4 border-b border-white/5 bg-[#1a1a1a]">
                <button onClick={() => navigate(-1)} className="text-white/60 p-2">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex-1 mx-4 text-center">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Rhyme Name (e.g. Yarid)"
                        className="w-full bg-transparent text-center font-bold text-2xl placeholder-white/30 focus:outline-none"
                    />
                </div>



                {!isNew && (
                    <button onClick={handleDelete} className="text-red-400/50 p-2 hover:text-red-400">
                        <Trash2 size={20} />
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`p-2 font-bold ml-2 transition-opacity ${isSaving ? 'text-green-400/50' : 'text-green-400'}`}
                >
                    {isSaving ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
                </button>
            </div>

            {/* Main Content Scrollable Area - Added pb-40 to fix scrolling issue */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 pb-40">

                {/* 1. WORD BANK & ADDER */}
                <div className="space-y-4">
                    {/* Collapsible Header */}
                    <button
                        onClick={() => setIsWordBankOpen(!isWordBankOpen)}
                        className="flex items-center gap-2 w-full text-left group"
                    >
                        {isWordBankOpen ?
                            <ChevronDown size={16} className="text-white/40 group-hover:text-white transition-colors" /> :
                            <ChevronUp size={16} className="text-white/40 group-hover:text-white transition-colors" />
                        }
                        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">
                            Word Bank ({items.length})
                        </h3>
                        {!isWordBankOpen && items.length > 0 && (
                            <span className="text-[10px] text-white/30 ml-auto truncate max-w-[200px]">
                                {items.slice(0, 3).join(', ')}{items.length > 3 ? '...' : ''}
                            </span>
                        )}
                    </button>

                    {/* Collapsible Content */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isWordBankOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="space-y-4 pl-1">
                            {/* Input Bar */}
                            <div className="flex gap-2">
                                <div className="flex-1 flex items-center bg-[#252525] rounded-lg border border-white/10 px-3 focus-within:border-green-500/50 transition-colors">
                                    <input
                                        value={newItem}
                                        onChange={(e) => setNewItem(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && addItem()}
                                        placeholder="Add a word..."
                                        className="flex-1 bg-transparent py-3 text-sm focus:outline-none text-white placeholder-white/20"
                                    />
                                    <button
                                        onClick={addItem}
                                        className="bg-green-500/10 text-green-500 p-1.5 rounded-md hover:bg-green-500/20"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsDictaOpen(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex flex-col items-center justify-center leading-tight shadow-lg hover:bg-purple-500"
                                >
                                    <span>Find</span>
                                    <span className="opacity-70">Rhymes</span>
                                </button>
                            </div>

                            {/* Word Chips */}
                            <div className="flex flex-wrap gap-2">
                                {items.length === 0 && <span className="text-white/20 text-xs italic p-2">No words yet. Add some or use the Finder!</span>}
                                {items.map((item, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-[#252525] rounded-lg text-xs text-white/80 border border-white/5 relative group cursor-pointer hover:bg-[#333] hover:text-white transition-colors">
                                        {item}
                                        <button
                                            onClick={() => removeItem(i)}
                                            className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >
                                            <Trash2 size={10} className="text-white" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5 w-full my-4" />

                {/* 2. THE STORY (Main Focus) */}
                <div className="space-y-2">
                    {/* Header with Magic Button */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setIsStoryOpen(!isStoryOpen)}
                            className="flex items-center gap-2 group"
                        >
                            {isStoryOpen ?
                                <ChevronDown size={16} className="text-green-400 group-hover:text-green-300 transition-colors" /> :
                                <ChevronUp size={16} className="text-green-400 group-hover:text-green-300 transition-colors" />
                            }
                            <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest group-hover:text-green-300 transition-colors">Mnemonic Story</h3>
                        </button>

                        <button
                            onClick={handleMagicStory}
                            disabled={isGenerating}
                            className="relative overflow-hidden group flex items-center gap-1 text-[10px] bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-500/30 disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] hover:shadow-[0_0_15px_rgba(168,85,247,0.4)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                            {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} className="text-purple-200" />}
                            <span className="font-semibold">{isGenerating ? 'Weaving...' : 'Magic Story'}</span>
                        </button>
                    </div>

                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isStoryOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-1 pt-2">
                            {isEditingStory ? (
                                <textarea
                                    value={story}
                                    onChange={(e) => setStory(e.target.value)}
                                    onBlur={() => setIsEditingStory(false)}
                                    autoFocus
                                    placeholder="Write the story here..."
                                    className="w-full min-h-[300px] bg-[#1a1a1a] rounded-xl p-4 text-lg leading-loose text-white/90 focus:outline-none border border-green-500/30 resize-y font-hebrew shadow-inner"
                                    style={{ direction: 'rtl', lineHeight: '2' }}
                                />
                            ) : (
                                <div
                                    onClick={() => setIsEditingStory(true)}
                                    className="w-full min-h-[300px] bg-[#1a1a1a] rounded-xl p-4 text-lg leading-loose text-white/90 border border-white/5 font-hebrew cursor-text hover:border-white/10 transition-colors whitespace-pre-wrap"
                                    style={{ direction: 'rtl', lineHeight: '2' }}
                                    dangerouslySetInnerHTML={{
                                        __html: story
                                            ? story.replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-400 font-bold">$1</strong>')
                                            : '<span class="text-white/20">Click here to write or generate a story...</span>'
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5 w-full my-4" />

                {/* 3. MNEMONIC LOGIC (Story Summary) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setIsLogicOpen(!isLogicOpen)}
                            className="flex items-center gap-2 group"
                        >
                            {isLogicOpen ?
                                <ChevronDown size={16} className="text-blue-400 group-hover:text-blue-300 transition-colors" /> :
                                <ChevronUp size={16} className="text-blue-400 group-hover:text-blue-300 transition-colors" />
                            }
                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest group-hover:text-blue-300 transition-colors">תמצית הסיפור (לוגיקה)</h3>
                        </button>
                        <span className="text-[10px] text-white/20">איך לזכור את זה?</span>
                    </div>

                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isLogicOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-1 pt-2">
                            <textarea
                                value={mnemonicLogic}
                                onChange={(e) => setMnemonicLogic(e.target.value)}
                                placeholder="פרק את הסיפור לבתים, שלבים או רעיון מרכזי..."
                                className="w-full min-h-[200px] bg-[#1a1a1a] rounded-xl p-4 text-sm leading-relaxed text-white/80 focus:outline-none border border-white/5 resize-y font-mono"
                                style={{ direction: 'rtl' }}
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-white/5 w-full my-4" />

                {/* 4. BARS / SENTENCES (New Section) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setIsBarsOpen(!isBarsOpen)}
                            className="flex items-center gap-2 group"
                        >
                            {isBarsOpen ?
                                <ChevronDown size={16} className="text-amber-400 group-hover:text-amber-300 transition-colors" /> :
                                <ChevronUp size={16} className="text-amber-400 group-hover:text-amber-300 transition-colors" />
                            }
                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest group-hover:text-amber-300 transition-colors">Bars & Sentences</h3>
                        </button>
                        <Mic size={14} className="text-white/20" />
                    </div>

                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isBarsOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="pl-1 pt-2">
                            <textarea
                                value={bars}
                                onChange={(e) => setBars(e.target.value)}
                                placeholder="Write your bars, sentences, or punchlines here..."
                                className="w-full min-h-[150px] bg-[#1a1a1a] rounded-xl p-4 text-base leading-relaxed text-white/90 focus:outline-none border border-white/5 resize-y font-sans focus:border-amber-500/50 transition-colors"
                                style={{ direction: 'rtl' }}
                            />
                        </div>
                    </div>
                </div>

                {/* 5. LINKED CONTEXT (Usage in Sessions) */}
                {linkedSessions && linkedSessions.length > 0 && (
                    <div className="space-y-4">
                        <div className="h-px bg-white/5 w-full my-4" />
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setIsContextOpen(!isContextOpen)}
                                className="flex items-center gap-2 group"
                            >
                                {isContextOpen ?
                                    <ChevronDown size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors" /> :
                                    <ChevronUp size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
                                }
                                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-widest group-hover:text-purple-300 transition-colors">
                                    Linked Context ({linkedSessions.length})
                                </h3>
                            </button>
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isContextOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="space-y-2 pl-1">
                                {linkedSessions.map(session => {
                                    // Find lines that use this rhyme group
                                    // We filtered for sessions that match, but we want to show WHICH lines match
                                    const relevantLines: { text: string, index: number }[] = [];
                                    const links = session.metadata?.linkedRhymes || [];
                                    const lines = session.metadata?.lines || session.metadata?.lyrics?.split('\n') || [];

                                    links.forEach((l: any) => {
                                        if (Number(l.rhymeId) === parseInt(id!)) {
                                            if (lines[l.lineIndex]) {
                                                relevantLines.push({ text: lines[l.lineIndex], index: l.lineIndex });
                                            }
                                        }
                                    });

                                    // Deduplicate by index to avoid showing same line twice if multiple words match (rare but possible)
                                    const uniqueLines = Array.from(new Set(relevantLines.map(r => r.index))).map(idx => relevantLines.find(r => r.index === idx)!);

                                    return (
                                        <div key={session.id} className="bg-[#1a1a1a] rounded-lg border border-white/5 p-3 hover:border-purple-500/30 transition-colors">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="font-bold text-sm text-white/80">{session.title || "Untitled Session"}</h4>
                                                <button
                                                    onClick={() => navigate(`/library/${session.id}`)}
                                                    className="text-[10px] bg-white/5 hover:bg-white/10 text-white/50 hover:text-white px-2 py-1 rounded flex items-center gap-1 transition-colors"
                                                >
                                                    Open <ExternalLink size={10} />
                                                </button>
                                            </div>
                                            <div className="space-y-1">
                                                {uniqueLines.map((line, i) => (
                                                    <div key={i} className="text-sm font-hebrew text-white/60 bg-[#111] p-2 rounded border-l-2 border-purple-500/50" style={{ direction: 'rtl' }}>
                                                        "{line.text}"
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Dicta Modal */}
            <DictaModal
                isOpen={isDictaOpen}
                onClose={() => setIsDictaOpen(false)}
                onAddWords={(words) => {
                    setItems([...items, ...words])
                    setIsWordBankOpen(true)
                }}
            />

        </div >
    )
}
