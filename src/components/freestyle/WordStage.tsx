/**
 * WordStage - Display area for dropped words during training
 */
import { Sparkles, Layers } from 'lucide-react'
import type { FlowState } from '../../hooks/useFlowState'
import type { TrainingMode } from './TrainingModeBar'
import WordDropControls, { type WordDropSettings } from './WordDropControls'

interface WordStageProps {
    flowState: FlowState
    trainingMode: TrainingMode
    wordDropSettings: WordDropSettings
    onUpdateSettings: (settings: WordDropSettings) => void
    currentWords: string[]
    selectedDeckId: number | null
    onSelectDeck: (id: number | null) => void
    language: 'he' | 'en'
}

export function WordStage({
    flowState,
    trainingMode,
    wordDropSettings,
    onUpdateSettings,
    currentWords,
    selectedDeckId,
    onSelectDeck,
    language
}: WordStageProps) {
    const isRecording = flowState === 'recording'
    const showWords = wordDropSettings.enabled && isRecording && currentWords.length > 0

    return (
        <div className="flex-1 bg-[#181818] rounded-xl border border-[#282828] relative min-h-0 z-0">
            {/* Word Drop Controls (Settings gear) */}
            <div className="absolute top-2 right-2 z-50">
                <WordDropControls
                    settings={wordDropSettings}
                    onUpdate={onUpdateSettings}
                    language={language}
                    onSelectDeck={onSelectDeck}
                    selectedGroupId={selectedDeckId}
                />
            </div>

            {/* Words Container */}
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-4">
                {showWords ? (
                    <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300">
                        {currentWords.map((word, i) => (
                            <span
                                key={i}
                                className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#1DB954] to-[#1ED760] drop-shadow-[0_0_15px_rgba(29,185,84,0.4)] leading-tight tracking-tight text-center break-words"
                            >
                                {word}
                            </span>
                        ))}
                    </div>
                ) : wordDropSettings.enabled && isRecording ? (
                    <div className="text-subdued opacity-20 animate-pulse">
                        <Sparkles size={64} />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-subdued/30 select-none">
                        <span className="text-sm font-medium uppercase tracking-widest text-center">
                            {trainingMode === 'rhymes' && selectedDeckId
                                ? (language === 'he' ? 'התחל להקליט לתרגול' : 'Start recording to practice')
                                : wordDropSettings.enabled
                                    ? (language === 'he' ? 'התחל להקליט' : 'Start recording')
                                    : (language === 'he' ? 'זריקת מילה כבויה' : 'Word Drop Off')
                            }
                        </span>
                        <Layers size={24} />
                    </div>
                )}
            </div>

            {/* Training Mode Progress (future feature placeholder) */}
            {trainingMode === 'rhymes' && isRecording && (
                <div className="absolute bottom-2 left-2 right-2">
                    <div className="h-1 bg-[#282828] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#1DB954] transition-all duration-300"
                            style={{ width: '0%' }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
