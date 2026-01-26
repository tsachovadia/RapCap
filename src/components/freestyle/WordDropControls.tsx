import { useState } from 'react'
import { Sparkles, Settings, X, Timer, Layers } from 'lucide-react'

export interface WordDropSettings {
    enabled: boolean
    interval: number // seconds
    quantity: number // 1, 2, 3
}

interface WordDropControlsProps {
    settings: WordDropSettings
    onUpdate: (settings: WordDropSettings) => void
    language: 'he' | 'en'
}

export default function WordDropControls({ settings, onUpdate, language }: WordDropControlsProps) {
    const [isOpen, setIsOpen] = useState(false)

    const toggleEnabled = () => {
        onUpdate({ ...settings, enabled: !settings.enabled })
    }

    const updateInterval = (val: number) => {
        onUpdate({ ...settings, interval: val })
    }

    const updateQuantity = (val: number) => {
        onUpdate({ ...settings, quantity: val })
    }

    return (
        <div className="relative">
            {/* Popover Content */}
            {isOpen && (
                <div className="absolute top-12 right-0 w-64 bg-[#1E1E1E] rounded-xl border border-[#333] shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                        <span className="text-xs font-bold uppercase text-subdued tracking-wider flex items-center gap-2">
                            <Settings size={12} />
                            {language === 'he' ? 'הגדרות מילים' : 'Settings'}
                        </span>
                        <button onClick={() => setIsOpen(false)} className="text-subdued hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Interval Control */}
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                            <Timer size={14} className="text-[#1DB954]" />
                            <span>{language === 'he' ? 'תדירות (שניות)' : 'Interval (sec)'}</span>
                            <span className="mr-auto font-mono text-[#1DB954]">{settings.interval}s</span>
                        </div>
                        <input
                            type="range"
                            min="2"
                            max="30"
                            step="1"
                            value={settings.interval}
                            onChange={(e) => updateInterval(Number(e.target.value))}
                            className="w-full accent-[#1DB954] bg-[#333] h-1 rounded appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-subdued mt-1 font-mono">
                            <span>2s</span>
                            <span>30s</span>
                        </div>
                    </div>

                    {/* Quantity Control */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-sm text-gray-300">
                            <Layers size={14} className="text-[#E91429]" />
                            <span>{language === 'he' ? 'כמות מילים' : 'Word Count'}</span>
                        </div>
                        <div className="flex bg-[#282828] rounded-lg p-1">
                            {[1, 2, 3].map(num => (
                                <button
                                    key={num}
                                    onClick={() => updateQuantity(num)}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${settings.quantity === num
                                        ? 'bg-[#E91429] text-white shadow-sm'
                                        : 'text-subdued hover:bg-white/5'
                                        }`}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Toggle Button Group */}
            <div className="flex items-center gap-1 bg-[#181818] rounded-full p-1 border border-[#333]">
                <button
                    onClick={() => setIsOpen(!isOpen)}
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
