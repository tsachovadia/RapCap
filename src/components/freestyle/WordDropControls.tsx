import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Settings, X, Timer, Layers, Shuffle, ListOrdered, Book } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'

export interface WordDropSettings {
    enabled: boolean
    interval: number // seconds
    quantity: number // 1, 2, 3
    mode: 'random' | 'sequential'
}

interface WordDropControlsProps {
    settings: WordDropSettings
    onUpdate: (settings: WordDropSettings) => void
    language: 'he' | 'en'
    onSelectDeck: (groupId: number | null) => void
    selectedGroupId: number | null
}

export default function WordDropControls({ settings, onUpdate, language, onSelectDeck, selectedGroupId }: WordDropControlsProps) {
    const [isOpen, setIsOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })

    // Fetch decks internally
    const groups = useLiveQuery(() => db.wordGroups.toArray())

    const toggleEnabled = () => {
        onUpdate({ ...settings, enabled: !settings.enabled })
    }

    const updateInterval = (val: number) => {
        onUpdate({ ...settings, interval: val })
    }

    const updateQuantity = (val: number) => {
        onUpdate({ ...settings, quantity: val })
    }

    const handleToggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            setMenuPosition({
                top: rect.bottom + 12,
                right: window.innerWidth - rect.right
            })
        }
        setIsOpen(!isOpen)
    }

    return (
        <div className="relative">
            {/* Focus Overlay Modal - Portaled to Body to escape stacking contexts */}
            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setIsOpen(false)}
                    />

                    <div
                        className="fixed z-[101] w-[90vw] max-w-sm md:w-80 bg-[#1E1E1E] rounded-2xl border border-[#333] shadow-2xl p-6 
                                 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 
                                 md:left-auto md:top-auto md:translate-x-0 md:translate-y-0
                                 animate-in zoom-in-95 fade-in slide-in-from-bottom-5 md:slide-in-from-bottom-0 duration-200 origin-center md:origin-top-right"
                        style={{
                            // Only apply calculated position on desktop (md breakpoint is 768px)
                            top: window.innerWidth >= 768 ? `${menuPosition.top}px` : undefined,
                            right: window.innerWidth >= 768 ? `${menuPosition.right}px` : undefined,
                            // max-height for safe mobile viewing
                            maxHeight: '85vh',
                            overflowY: 'auto'
                        }}
                    >

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                            <span className="text-lg font-bold text-white flex items-center gap-2">
                                <Sparkles size={20} className="text-[#1DB954]" />
                                {language === 'he' ? 'הגדרות זריקת מילה' : 'Word Drop Settings'}
                            </span>
                            <button onClick={() => setIsOpen(false)} className="bg-[#333] p-2 rounded-full text-subdued hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Interval Control */}
                        <div className="mb-6 space-y-3">
                            <div className="flex items-center justify-between text-sm text-gray-300">
                                <div className="flex items-center gap-2">
                                    <Timer size={16} className="text-[#1DB954]" />
                                    <span>{language === 'he' ? 'תדירות' : 'Frequency'}</span>
                                </div>
                                <span className="font-mono text-[#1DB954] font-bold bg-[#1DB954]/10 px-2 py-1 rounded">{settings.interval}s</span>
                            </div>
                            <input
                                type="range"
                                min="2"
                                max="30"
                                step="1"
                                value={settings.interval}
                                onChange={(e) => updateInterval(Number(e.target.value))}
                                className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                            />
                            <div className="flex justify-between text-[10px] text-subdued font-mono px-1">
                                <span>Fast (2s)</span>
                                <span>Slow (30s)</span>
                            </div>
                        </div>

                        {/* Quantity Control */}
                        <div className="mb-6 space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Layers size={16} className="text-[#E91429]" />
                                <span>{language === 'he' ? 'מספר מילים במקביל' : 'Words at once'}</span>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => updateQuantity(num)}
                                        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all border ${settings.quantity === num
                                            ? 'bg-[#E91429] border-[#E91429] text-white shadow-lg shadow-red-900/20'
                                            : 'bg-[#282828] border-[#333] text-subdued hover:bg-[#333] hover:text-white'
                                            }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Source Selection (Deck) */}
                        <div className="mb-6 space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <Book size={16} className="text-[#1DB954]" />
                                <span>{language === 'he' ? 'מקור המילים' : 'Word Source'}</span>
                            </div>

                            {/* Simple Dropdown / List */}
                            <div className="bg-[#282828] rounded-xl border border-[#333] overflow-hidden">
                                {/* Classic Random Option */}
                                <button
                                    onClick={() => onSelectDeck(null)}
                                    className={`w-full flex items-center justify-between p-3 border-b border-[#333] transition-colors ${selectedGroupId === null ? 'bg-[#3E3E3E] text-white' : 'text-subdued hover:bg-[#333]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 text-sm">
                                        <Shuffle size={14} />
                                        <span>{language === 'he' ? 'בלגן (מילון כללי)' : 'Classic Random'}</span>
                                    </div>
                                    {selectedGroupId === null && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                </button>

                                {/* Custom Decks */}
                                {groups?.slice(0, 3).map(group => (
                                    <button
                                        key={group.id}
                                        onClick={() => onSelectDeck(group.id!)}
                                        className={`w-full flex items-center justify-between p-3 border-b border-[#333] last:border-0 transition-colors ${selectedGroupId === group.id ? 'bg-[#3E3E3E] text-white' : 'text-subdued hover:bg-[#333]'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 text-sm">
                                            <Book size={14} />
                                            <span className="truncate max-w-[150px]">{group.name}</span>
                                        </div>
                                        {selectedGroupId === group.id && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                                    </button>
                                ))}

                                {groups && groups.length > 3 && (
                                    <div className="p-2 text-xs text-center text-subdued bg-[#222]">
                                        + {groups.length - 3} more (Manage in Library)
                                    </div>
                                )}

                                {(!groups || groups.length === 0) && (
                                    <div className="p-3 text-xs text-center text-subdued italic">
                                        {language === 'he' ? 'אין חבילות שמורות' : 'No custom decks yet'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mode Control */}
                        <div className="mb-6 space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                {settings.mode === 'random' ? <Shuffle size={16} className="text-[#1DB954]" /> : <ListOrdered size={16} className="text-[#1DB954]" />}
                                <span>{language === 'he' ? 'מצב אימון' : 'Training Mode'}</span>
                            </div>
                            <div className="flex bg-[#282828] rounded-xl p-1 border border-[#333]">
                                <button
                                    onClick={() => onUpdate({ ...settings, mode: 'random' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${settings.mode === 'random'
                                        ? 'bg-[#3E3E3E] text-white shadow-sm'
                                        : 'text-subdued hover:text-white'
                                        }`}
                                >
                                    <Shuffle size={14} />
                                    {language === 'he' ? 'אקראי' : 'Random'}
                                </button>
                                <button
                                    onClick={() => onUpdate({ ...settings, mode: 'sequential' })}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${settings.mode === 'sequential'
                                        ? 'bg-[#3E3E3E] text-white shadow-sm'
                                        : 'text-subdued hover:text-white'
                                        }`}
                                >
                                    <ListOrdered size={14} />
                                    {language === 'he' ? 'לפי סדר' : 'Sequence'}
                                </button>
                            </div>
                        </div>

                        {/* Toggle on/off inside modal as well? Optional, but useful */}
                        <button
                            onClick={toggleEnabled}
                            className={`w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 ${settings.enabled
                                ? 'bg-[#1DB954] text-black hover:bg-[#1ed760] shadow-lg shadow-green-900/20'
                                : 'bg-[#333] text-white hover:bg-[#444]'
                                }`}
                        >
                            {settings.enabled ? (
                                <><Sparkles size={20} /> {language === 'he' ? 'פעיל - לחץ לכיבוי' : 'Enabled - Tap to Disable'}</>
                            ) : (
                                <>{language === 'he' ? 'הפעל זריקת מילה' : 'Enable Word Drop'}</>
                            )}
                        </button>

                    </div>
                </>,
                document.body
            )}

            {/* Main Toggle Button Group */}
            <div className="flex items-center gap-1 bg-[#181818] rounded-full p-1 border border-[#333]">
                <button
                    ref={buttonRef}
                    onClick={handleToggleOpen}
                    className={`p-2 rounded-full transition-colors hover:bg-white/10 ${isOpen ? 'text-white bg-white/10' : 'text-subdued'}`}
                >
                    <Settings size={18} />
                </button>
                <button
                    onClick={toggleEnabled}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all ${settings.enabled
                        ? 'bg-[#1DB954] text-black shadow-[0_0_15px_rgba(29,185,84,0.4)] hover:bg-[#1ed760]'
                        : 'bg-transparent text-gray-300 hover:bg-white/5'
                        }`}
                >
                    <Sparkles size={16} className={settings.enabled ? 'animate-pulse' : ''} />
                    <span>{language === 'he' ? 'זרוק מילה' : 'Drop Words'}</span>
                </button>
            </div>
        </div>
    )
}
