/**
 * TrainingModeBar - Mode selector for freestyle training
 */
import { useState, useEffect } from 'react'
import { Shuffle, BookOpen, Mic2, Lightbulb, ChevronDown } from 'lucide-react'
import { db, type WordGroup } from '../../db/db'

export type TrainingMode = 'free' | 'rhymes' | 'flow' | 'topic'

interface TrainingModeBarProps {
    mode: TrainingMode
    onModeChange: (mode: TrainingMode) => void
    selectedDeckId: number | null
    onDeckSelect: (id: number | null) => void
    language: 'he' | 'en'
    wordDropEnabled: boolean
    onWordDropToggle: (enabled: boolean) => void
}

export function TrainingModeBar({
    mode,
    onModeChange,
    selectedDeckId,
    onDeckSelect,
    language,
    wordDropEnabled: _wordDropEnabled,
    onWordDropToggle
}: TrainingModeBarProps) {
    const [decks, setDecks] = useState<WordGroup[]>([])
    const [showDeckPicker, setShowDeckPicker] = useState(false)

    useEffect(() => {
        db.wordGroups.toArray().then(setDecks)
    }, [])

    const selectedDeck = decks.find(d => d.id === selectedDeckId)

    const modes = [
        { id: 'free' as TrainingMode, icon: Shuffle, label: language === 'he' ? 'חופשי' : 'Free' },
        { id: 'rhymes' as TrainingMode, icon: BookOpen, label: language === 'he' ? 'חריזות' : 'Rhymes' },
        { id: 'flow' as TrainingMode, icon: Mic2, label: 'Flow' },
        { id: 'topic' as TrainingMode, icon: Lightbulb, label: language === 'he' ? 'נושא' : 'Topic' },
    ]

    const handleModeClick = (modeId: TrainingMode) => {
        onModeChange(modeId)

        // Enable word drop when rhymes mode is selected
        if (modeId === 'rhymes') {
            onWordDropToggle(true)
            if (!selectedDeckId && decks.length > 0) {
                setShowDeckPicker(true)
            }
        } else if (modeId === 'free') {
            // Keep word drop setting as is in free mode
        } else {
            onWordDropToggle(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            {/* Mode Chips */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {modes.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => handleModeClick(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${mode === id
                            ? 'bg-[#1DB954] text-black'
                            : 'bg-[#282828] text-white/70 hover:text-white hover:bg-[#333]'
                            }`}
                    >
                        <Icon size={16} />
                        {label}
                    </button>
                ))}
            </div>

            {/* Deck Selector (when Rhymes mode active) */}
            {mode === 'rhymes' && (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowDeckPicker(!showDeckPicker)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#282828] rounded-lg text-sm hover:bg-[#333] transition-colors"
                    >
                        <BookOpen size={14} />
                        <span className="text-white/80">
                            {selectedDeck?.name || (language === 'he' ? 'בחר קבוצה' : 'Select Deck')}
                        </span>
                        <ChevronDown size={14} className={showDeckPicker ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>

                    {selectedDeck && (
                        <span className="text-xs text-subdued">
                            {selectedDeck.items.length} {language === 'he' ? 'מילים' : 'words'}
                        </span>
                    )}
                </div>
            )}

            {/* Deck Picker Dropdown */}
            {showDeckPicker && mode === 'rhymes' && (
                <div className="bg-[#181818] border border-[#333] rounded-lg p-2 max-h-40 overflow-y-auto">
                    {decks.length === 0 ? (
                        <p className="text-sm text-subdued p-2">
                            {language === 'he' ? 'אין קבוצות עדיין' : 'No decks yet'}
                        </p>
                    ) : (
                        decks.map(deck => (
                            <button
                                key={deck.id}
                                onClick={() => {
                                    onDeckSelect(deck.id!)
                                    setShowDeckPicker(false)
                                    onWordDropToggle(true)
                                }}
                                className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-[#282828] transition-colors ${selectedDeckId === deck.id ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-white'
                                    }`}
                            >
                                <span className="font-bold">{deck.name}</span>
                                <span className="text-subdued ml-2">({deck.items.length})</span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
