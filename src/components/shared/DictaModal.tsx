import { useState } from 'react'
import { Search, Loader2, X, Check } from 'lucide-react'
import { getVocalization, getRhymes } from '../../services/dicta'
import { useToast } from '../../contexts/ToastContext'

interface DictaModalProps {
    isOpen: boolean
    onClose: () => void
    onAddWords: (words: string[]) => void
}

export default function DictaModal({ isOpen, onClose, onAddWords }: DictaModalProps) {
    const { showToast } = useToast()
    const [dictaQuery, setDictaQuery] = useState('')
    const [dictaResults, setDictaResults] = useState<string[]>([])
    const [selectedDictaWords, setSelectedDictaWords] = useState<string[]>([])
    const [isSearchingDicta, setIsSearchingDicta] = useState(false)

    const handleDictaSearch = async () => {
        if (!dictaQuery.trim()) return
        setIsSearchingDicta(true)
        setDictaResults([])
        setSelectedDictaWords([])

        try {
            // 1. Vocalize
            const vocalizedOptions = await getVocalization(dictaQuery)
            const bestOption = vocalizedOptions[0] || dictaQuery // Naive: take first

            // 2. Search Rhymes
            const rhymes = await getRhymes(bestOption)
            setDictaResults(rhymes)
        } catch (err) {
            console.error(err)
            showToast('Failed to fetch rhymes.', 'error')
        } finally {
            setIsSearchingDicta(false)
        }
    }

    const toggleDictaSelection = (word: string) => {
        if (selectedDictaWords.includes(word)) {
            setSelectedDictaWords(selectedDictaWords.filter(w => w !== word))
        } else {
            setSelectedDictaWords([...selectedDictaWords, word])
        }
    }

    const handleAddSelection = () => {
        onAddWords(selectedDictaWords)
        setDictaQuery('')
        setDictaResults([])
        setSelectedDictaWords([])
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4">
            <div className="bg-[#1e1e1e] w-full max-w-md rounded-2xl border border-white/10 shadow-2xl flex flex-col max-h-[70vh] sm:max-h-[80vh]">
                {/* Modal Header */}
                <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#252525] rounded-t-2xl">
                    <h2 className="font-bold flex items-center gap-2 text-white">
                        <Search size={16} className="text-purple-400" />
                        Dicta Rhyme Finder
                    </h2>
                    <button onClick={onClose} className="text-white/50 hover:text-white">
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
                        className="flex-1 bg-transparent rounded-lg px-4 py-2 border border-white/10 focus:border-purple-500 focus:outline-none text-right font-hebrew text-white"
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
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isSearchingDicta ? (
                        <div className="flex flex-col items-center justify-center py-10 opacity-50 space-y-2 text-white">
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
                        <div className="text-center py-10 opacity-30 text-white">
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
                        onClick={handleAddSelection}
                        disabled={selectedDictaWords.length === 0}
                        className="bg-green-500 text-black font-bold px-6 py-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
                    >
                        Add Selection
                    </button>
                </div>
            </div>
        </div>
    )
}
