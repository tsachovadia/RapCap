import { useState, useRef, useEffect, useMemo } from 'react'
import { Link as LinkIcon, Disc, Layers } from 'lucide-react'
import BeatPlayer from '../freestyle/BeatPlayer'
import WordDropControls, { type WordDropSettings } from '../freestyle/WordDropControls'
import { commonWordsHe, commonWordsEn } from '../../data/wordBank'
import { db } from '../../db/db'
import type { FlowState } from '../../pages/RecordPage'

const STATIC_BEAT_ID = 'HAFijG6kyRk'
const PRESET_BEATS = [
    { id: 'vSsbbJlZJmc', name: 'ON MY MIND', title: '[FREE] Melodic Emotional Rap Beat “ON MY MIND” | Sad Piano Instrumental' },
    { id: 'vG2S2rL3wNo', name: 'Prestige', title: '[FREE] "Prestige" (Dark Type Beat) | Hard Boom Bap Rap Beat 2025' },
    { id: 'liJVSwOiiwg', name: 'Unchanged', title: '(FREE) Boom Bap Freestyle Joey Bada$$ x 90s Type Beat [2024] - Unchanged' },
    { id: 'P2GOkrU1vnQ', name: 'The Supply', title: '(free) 90s Old School Boom Bap type beat x Freestyle Hip hop | "The Supply"' },
    { id: 'qU_fJ6O1j7M', name: 'Behind Barz', title: 'Freestyle Rap Beat | Hard Boom Bap Type Beat - "Behind Barz"' },
    { id: 'L9Jz6yN6jE0', name: 'Streets', title: '(FREE) Old School Freestyle Boom Bap Type Beat - Streets' },
    { id: '8_v1-T-8y4Y', name: 'Dolla', title: '(FREE) Freestyle Rap Beat - Dolla | Old School Boom Bap' },
    { id: 'x_7O9zV6G3U', name: 'BLAME ME', title: '[FREE] "BLAME ME" - Rap Freestyle Type Beat 2023' },
    { id: 'p0-T-v_wE-Y', name: 'Banknotes', title: '(FREE) Boom Bap Freestyle x Old School Rap [2024] - Banknotes' },
    { id: 'Bl_z_v5_A_E', name: 'My Life', title: '"My Life" - Freestyle Rap Beat | Free Hip Hop Instrumental 2023' },
    { id: 'j_p_b_8_8_8', name: 'Bushido', title: '"Bushido" - Rap Freestyle Beat | Japanese Underground Boom Bap' },
    { id: '0mX7P-v14I4', name: 'Sing About Me', title: 'Kendrick Lamar - Sing About Me (Instrumental)' }
]

interface Props {
    flowState: FlowState
    language: 'he' | 'en'
    onPreRollComplete: () => void
    segments: any[]
    interimTranscript: string
}

export default function FreestyleModeUI({ flowState, language, onPreRollComplete, segments, interimTranscript }: Props) {
    const [videoId, setVideoId] = useState(STATIC_BEAT_ID)
    const [beatVolume, setBeatVolume] = useState(50)
    const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
    const [showUrlInput, setShowUrlInput] = useState(false)
    const [urlInput, setUrlInput] = useState('')
    const preRollCheckRef = useRef<number | null>(null)

    // Word Drop State
    const [wordDropSettings, setWordDropSettings] = useState<WordDropSettings>({
        enabled: false,
        interval: 4,
        quantity: 1,
        mode: 'random'
    })
    const [currentRandomWords, setCurrentRandomWords] = useState<string[]>([])
    const randomIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sequenceIndexRef = useRef(0)
    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null)
    const [deckWords, setDeckWords] = useState<string[]>([])

    // Auto-scroll refs
    const transcriptEndRef = useRef<HTMLDivElement>(null)
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // Fetch deck words
    useEffect(() => {
        if (selectedDeckId !== null) {
            db.wordGroups.get(selectedDeckId).then(group => {
                if (group) setDeckWords(group.items)
            })
        } else {
            setDeckWords([])
        }
    }, [selectedDeckId])

    const activeWordPool = useMemo(() => {
        if (selectedDeckId !== null && deckWords.length > 0) return deckWords
        const source = language === 'he' ? commonWordsHe : commonWordsEn
        return source.map(w => w.word)
    }, [language, selectedDeckId, deckWords])

    // Word Drop Clock
    useEffect(() => {
        if (wordDropSettings.enabled && flowState === 'recording') {
            const tick = () => {
                const words = []
                if (wordDropSettings.mode === 'sequential') {
                    for (let i = 0; i < wordDropSettings.quantity; i++) {
                        const word = activeWordPool[sequenceIndexRef.current % activeWordPool.length]
                        words.push(word)
                        sequenceIndexRef.current = (sequenceIndexRef.current + 1) % activeWordPool.length
                    }
                } else {
                    for (let i = 0; i < wordDropSettings.quantity; i++) {
                        words.push(activeWordPool[Math.floor(Math.random() * activeWordPool.length)])
                    }
                }
                setCurrentRandomWords(words)
                const variance = (wordDropSettings.interval * 1000) * 0.5
                const base = wordDropSettings.interval * 1000
                const nextInterval = base - (variance / 2) + Math.random() * variance
                randomIntervalRef.current = setTimeout(tick, nextInterval)
            }
            tick()
        } else {
            setCurrentRandomWords([])
            if (randomIntervalRef.current) clearTimeout(randomIntervalRef.current)
        }
        return () => { if (randomIntervalRef.current) clearTimeout(randomIntervalRef.current) }
    }, [wordDropSettings.enabled, wordDropSettings.interval, wordDropSettings.quantity, wordDropSettings.mode, flowState, activeWordPool])

    // Pre-roll Monitoring
    useEffect(() => {
        if (flowState === 'preroll' && youtubePlayer) {
            const safetyTimeout = setTimeout(() => {
                if (preRollCheckRef.current) {
                    cancelAnimationFrame(preRollCheckRef.current)
                    onPreRollComplete()
                }
            }, 4000)

            const check = () => {
                if (!youtubePlayer) return
                const currentTime = youtubePlayer.getCurrentTime()
                if (currentTime >= 2.0) {
                    clearTimeout(safetyTimeout)
                    onPreRollComplete()
                    if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current)
                } else {
                    preRollCheckRef.current = requestAnimationFrame(check)
                }
            }
            preRollCheckRef.current = requestAnimationFrame(check)
            return () => { if (preRollCheckRef.current) cancelAnimationFrame(preRollCheckRef.current) }
        }
    }, [flowState, youtubePlayer, onPreRollComplete])

    // Auto-scroll Transcript
    useEffect(() => {
        if (segments.length > 0 || interimTranscript) {
            transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
    }, [segments, interimTranscript])

    const extractYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
        const match = url.match(regExp)
        return (match && match[2].length === 11) ? match[2] : null
    }

    const handleUrlSubmit = () => {
        const id = extractYoutubeId(urlInput)
        if (id) {
            setVideoId(id)
            setShowUrlInput(false)
            setUrlInput('')
        } else {
            alert(language === 'he' ? 'קישור לא תקין' : 'Invalid YouTube URL')
        }
    }

    return (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* Upper Section: Beat & Words */}
            <div className="flex-1 flex gap-2 min-h-0 relative">
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                    {/* Beat Player */}
                    <div className="h-20 flex-none bg-[#181818] rounded-xl overflow-hidden relative border border-[#282828] group">
                        <BeatPlayer
                            videoId={videoId}
                            isPlaying={flowState !== 'idle' && flowState !== 'paused'}
                            volume={beatVolume}
                            onReady={(player) => setYoutubePlayer(player)}
                        />
                        <div className="absolute top-2 left-2 flex gap-2 pointer-events-none z-10">
                            {flowState === 'preroll' && (
                                <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded animate-pulse">מתכונן...</span>
                            )}
                            {flowState === 'recording' && (
                                <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded animate-pulse">REC</span>
                            )}
                        </div>

                        {showUrlInput ? (
                            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                                <div className="w-full max-w-md bg-[#181818] p-4 rounded-xl border border-[#333] shadow-2xl space-y-4">
                                    <h3 className="text-lg font-bold text-white text-center">{language === 'he' ? 'בחר ביט' : 'Select Beat'}</h3>
                                    <select
                                        className="w-full bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1DB954]"
                                        onChange={(e) => { if (e.target.value) { setVideoId(e.target.value); setShowUrlInput(false); } }}
                                        value={PRESET_BEATS.some(b => b.id === videoId) ? videoId : ''}
                                    >
                                        <option value="" disabled>{language === 'he' ? 'בחר מהרשימה...' : 'Choose from list...'}</option>
                                        {PRESET_BEATS.map(beat => <option key={beat.id} value={beat.id}>{beat.name}</option>)}
                                    </select>
                                    <div className="flex w-full gap-2">
                                        <input
                                            type="text"
                                            placeholder="Paste YouTube Link..."
                                            className="flex-1 bg-[#222] border border-[#333] rounded-lg px-4 py-3 text-sm text-white"
                                            value={urlInput}
                                            onChange={e => setUrlInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                                        />
                                        <button onClick={handleUrlSubmit} className="bg-[#1DB954] text-black px-4 py-3 rounded-lg font-bold">Go</button>
                                    </div>
                                    <button onClick={() => setShowUrlInput(false)} className="w-full py-2 text-sm text-subdued hover:text-white">Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowUrlInput(true)}
                                className="absolute top-2 right-2 bg-black/80 hover:bg-[#1DB954] hover:text-black text-white px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-2 z-20 border border-white/10 backdrop-blur-sm"
                            >
                                <LinkIcon size={12} />
                                <span>{language === 'he' ? 'שנה ביט' : 'Change Beat'}</span>
                            </button>
                        )}
                    </div>

                    {/* Word Stage */}
                    <div className="flex-1 bg-[#181818] rounded-xl border border-[#282828] relative min-h-0 z-0">
                        <div className="absolute top-2 right-2 z-50">
                            <WordDropControls
                                settings={wordDropSettings}
                                onUpdate={setWordDropSettings}
                                language={language}
                                onSelectDeck={setSelectedDeckId}
                                selectedGroupId={selectedDeckId}
                            />
                        </div>
                        <div className="absolute inset-0 overflow-y-auto flex flex-col items-center justify-start pt-14 p-4 min-h-[120px]">
                            {wordDropSettings.enabled && flowState === 'recording' ? (
                                <div className="flex flex-wrap justify-center gap-6 animate-in fade-in zoom-in duration-300">
                                    {currentRandomWords.map((word: string, i: number) => (
                                        <span key={i} className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1DB954] to-[#1ED760]">
                                            {word}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 text-subdued/30 mt-4">
                                    <Layers size={24} />
                                    <span className="text-xs uppercase tracking-widest">{language === 'he' ? 'זריקת מילה כבויה' : 'Word Drop Off'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Volume Column */}
                <div className="w-12 bg-[#181818] rounded-xl flex flex-col items-center py-4 gap-4 border border-[#282828] h-full">
                    <div className="text-[10px] text-subdued font-bold uppercase tracking-wider -rotate-90 mt-2">VOL</div>
                    <div className="flex-1 w-full flex justify-center py-2">
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={beatVolume}
                            onChange={(e) => {
                                const val = Number(e.target.value)
                                setBeatVolume(val)
                                if (youtubePlayer) youtubePlayer.setVolume(val)
                            }}
                            className="h-full w-1 accent-[#1DB954] bg-[#3E3E3E] rounded appearance-none cursor-pointer"
                            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                        />
                    </div>
                </div>
            </div>

            {/* Transcript Area */}
            <div className="flex-1 min-h-[160px] bg-[#121212]/50 rounded-xl border border-[#282828] p-4 overflow-y-auto no-scrollbar relative flex flex-col gap-4">
                <div className="max-w-2xl mx-auto pt-4 pb-16 w-full" ref={scrollContainerRef}>
                    <div className="space-y-4">
                        {segments.map((seg, i) => (
                            <div key={i} className="flex items-start gap-4 text-white/40 hover:text-white/90 transition-colors">
                                <span className="text-xs font-mono text-[#1DB954]/40 mt-1 shrink-0">{Math.floor(seg.timestamp / 60)}:{Math.floor(seg.timestamp % 60).toString().padStart(2, '0')}</span>
                                <p className="text-xl md:text-2xl font-bold leading-tight">{seg.text}</p>
                            </div>
                        ))}
                        {interimTranscript && (
                            <div className="flex items-start gap-4 text-white animate-in fade-in duration-300">
                                <div className="w-2 h-2 rounded-full bg-[#1DB954] mt-2.5 animate-pulse shrink-0" />
                                <p className="text-xl md:text-2xl font-bold leading-tight">{interimTranscript}</p>
                            </div>
                        )}
                        <div ref={transcriptEndRef} className="h-4" />
                    </div>
                </div>
            </div>
        </div>
    )
}
