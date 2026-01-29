import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, type WordGroup } from '../db/db'
import { Plus, Trash2, Save, ArrowLeft, Sparkles, Loader2, Search, X, Check } from 'lucide-react'
import { generateMnemonicStory } from '../services/gemini'
import { getVocalization, getRhymes } from '../services/dicta'

export default function RhymeEditorPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isNew = !id || id === 'new'

    // Form State
    const [name, setName] = useState('')
    const [items, setItems] = useState<string[]>([])
    const [story, setStory] = useState('')
    const [newItem, setNewItem] = useState('')

    // AI / Dicta State
    const [mnemonicLogic, setMnemonicLogic] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isEditingStory, setIsEditingStory] = useState(false)

    // Dicta Modal State
    const [isDictaOpen, setIsDictaOpen] = useState(false)
    const [dictaQuery, setDictaQuery] = useState('')
    const [dictaResults, setDictaResults] = useState<string[]>([])
    const [selectedDictaWords, setSelectedDictaWords] = useState<string[]>([])
    const [isSearchingDicta, setIsSearchingDicta] = useState(false)

    // Load Data
    useEffect(() => {
        if (!isNew && id) {
            db.wordGroups.get(parseInt(id)).then(group => {
                if (group) {
                    setName(group.name)
                    setItems(group.items)
                    setStory(group.story || '')
                    setMnemonicLogic(group.mnemonicLogic || '')
                }
            })
        }
    }, [id, isNew])

    const handleSave = async () => {
        if (!name.trim()) return alert('Please give your rhyme group a name!')

        const groupData: WordGroup = {
            name,
            items,
            story,
            mnemonicLogic,
            createdAt: new Date(),
            lastUsedAt: new Date(),
            // Preserve ID if editing
            ...(isNew ? {} : { id: parseInt(id!) })
        }

        try {
            await db.wordGroups.put(groupData)
            navigate('/rhyme-library') // Go back to library
        } catch (err) {
            console.error("Failed to save:", err)
            alert("Error saving group.")
        }
    }

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this deck?')) {
            if (id) await db.wordGroups.delete(parseInt(id))
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
            alert("Please add at least 2 words first!");
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateMnemonicStory(items);
            setStory(result.story);
            setMnemonicLogic(result.logic);
        } catch (error) {
            alert("Failed to generate story. Check your internet or API key.");
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    }

    // --- Dicta Logic ---
    const handleDictaSearch = async () => {
        if (!dictaQuery.trim()) return;
        setIsSearchingDicta(true);
        setDictaResults([]);
        setSelectedDictaWords([]);

        try {
            // 1. Vocalize
            const vocalizedOptions = await getVocalization(dictaQuery);
            const bestOption = vocalizedOptions[0] || dictaQuery; // Naive: take first

            // 2. Search Rhymes
            const rhymes = await getRhymes(bestOption);
            setDictaResults(rhymes);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch rhymes.");
        } finally {
            setIsSearchingDicta(false);
        }
    }

    const toggleDictaSelection = (word: string) => {
        if (selectedDictaWords.includes(word)) {
            setSelectedDictaWords(selectedDictaWords.filter(w => w !== word));
        } else {
            setSelectedDictaWords([...selectedDictaWords, word]);
        }
    }

    const addSelectedDictaWords = () => {
        setItems([...items, ...selectedDictaWords]);
        setIsDictaOpen(false);
        setDictaQuery('');
        setDictaResults([]);
        setSelectedDictaWords([]);
    }


    // Simplified UI Layout for Reading Mode
    // 1. Title (Already in Header)
    // 2. Small List of all rhymes
    // 3. Story (Main Focus)
    // 4. Categories (Bottom - Placeholder)

    return (
        <div className="flex flex-col h-full bg-[#121212] text-white relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1a1a1a]">
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
                <button onClick={handleSave} className="text-green-400 p-2 font-bold ml-2">
                    <Save size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">

                {/* 1. WORD BANK & ADDER */}
                <div className="space-y-4">

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

                {/* 2. THE STORY (Main Focus) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest">Mnemonic Story</h3>
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

                {/* 3. MNEMONIC LOGIC (Story Summary) */}
                <div className="space-y-2 pb-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest">תמצית הסיפור (לוגיקה)</h3>
                        <span className="text-[10px] text-white/20">איך לזכור את זה?</span>
                    </div>
                    <textarea
                        value={mnemonicLogic}
                        onChange={(e) => setMnemonicLogic(e.target.value)}
                        placeholder="פרק את הסיפור לבתים, שלבים או רעיון מרכזי..."
                        className="w-full min-h-[200px] bg-[#1a1a1a] rounded-xl p-4 text-sm leading-relaxed text-white/80 focus:outline-none border border-white/5 resize-y font-mono"
                        style={{ direction: 'rtl' }}
                    />
                </div>
                {/* Dicta Modal */}
                {isDictaOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4">
                        <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[80vh]">
                            {/* Modal Header */}
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#252525] rounded-t-2xl">
                                <h2 className="font-bold flex items-center gap-2">
                                    <Search size={16} className="text-purple-400" />
                                    Dicta Rhyme Finder
                                </h2>
                                <button onClick={() => setIsDictaOpen(false)} className="text-white/50 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Search Bar */}
                            <div className="p-4 border-b border-white/5 flex gap-2">
                                <input
                                    value={dictaQuery}
                                    onChange={(e) => setDictaQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleDictaSearch()}
                                    placeholder="Enter a word (e.g. חבר)..."
                                    className="flex-1 bg-[#121212] rounded-lg px-4 py-2 border border-white/10 focus:border-purple-500 focus:outline-none text-right font-hebrew"
                                    autoFocus
                                />
                                <button
                                    onClick={handleDictaSearch}
                                    disabled={isSearchingDicta}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
                                >
                                    {isSearchingDicta ? <Loader2 className="animate-spin" /> : 'Search'}
                                </button>
                            </div>

                            {/* Results Area */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {isSearchingDicta ? (
                                    <div className="flex flex-col items-center justify-center py-10 opacity-50 space-y-2">
                                        <Loader2 className="animate-spin" size={32} />
                                        <p className="text-xs">Consulting Dicta...</p>
                                    </div>
                                ) : dictaResults.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {dictaResults.map((word, i) => {
                                            const isSelected = selectedDictaWords.includes(word);
                                            return (
                                                <button
                                                    key={i}
                                                    onClick={() => toggleDictaSelection(word)}
                                                    className={`
                                                    px-2 py-3 rounded-lg text-sm border transition-all flex items-center justify-center gap-2 relative
                                                    ${isSelected
                                                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg scale-[1.02]'
                                                            : 'bg-[#252525] border-white/5 text-white/70 hover:bg-[#333]'
                                                        }
                                                `}
                                                >
                                                    {word}
                                                    {isSelected && <Check size={12} className="absolute top-1 right-1" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 opacity-30">
                                        <p>Enter a word to find rhymes.</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer / Actions */}
                            <div className="p-4 border-t border-white/5 bg-[#252525] rounded-b-2xl flex justify-between items-center">
                                <span className="text-xs text-white/40">
                                    {selectedDictaWords.length} selected
                                </span>
                                <button
                                    onClick={addSelectedDictaWords}
                                    disabled={selectedDictaWords.length === 0}
                                    className="bg-green-500 text-black font-bold px-6 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                                >
                                    Add Selection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}
