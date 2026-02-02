import { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, Volume2 } from 'lucide-react'
import type { PlaybackEffects } from '../../hooks/usePlaybackEffects'

interface PlaybackEffectsPanelProps {
    effects: PlaybackEffects;
    onUpdateEffect: <K extends keyof PlaybackEffects>(key: K, value: PlaybackEffects[K]) => void;
    onToggleEnabled: () => void;
    onReset: () => void;
}

export default function PlaybackEffectsPanel({
    effects,
    onUpdateEffect,
    onToggleEnabled,
    onReset
}: PlaybackEffectsPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-[#121212] rounded-lg border border-[#282828] overflow-hidden">
            {/* Header - Toggle Expand */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#1a1a1a] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Volume2 size={14} className={effects.enabled ? 'text-green-500' : 'text-subdued'} />
                    <span className="text-sm font-medium">
                        עיבוד קולי
                    </span>
                    {effects.enabled && (
                        <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                            פעיל
                        </span>
                    )}
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {/* Effects Controls */}
            {isExpanded && (
                <div className="px-3 py-3 border-t border-[#282828] space-y-3">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-subdued">הפעל עיבוד</span>
                        <button
                            onClick={onToggleEnabled}
                            className={`w-10 h-5 rounded-full transition-colors relative ${effects.enabled ? 'bg-green-500' : 'bg-[#333]'
                                }`}
                        >
                            <div
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${effects.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* EQ Section */}
                    <div className="space-y-2">
                        <div className="text-[10px] text-subdued uppercase tracking-wider">EQ</div>

                        {/* Low */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-12 text-subdued">בס</span>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={effects.eqLow}
                                onChange={(e) => onUpdateEffect('eqLow', Number(e.target.value))}
                                className="flex-1 h-1 accent-green-500"
                            />
                            <span className="text-[10px] w-10 text-left text-subdued">
                                {effects.eqLow > 0 ? '+' : ''}{effects.eqLow}dB
                            </span>
                        </div>

                        {/* Mid */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-12 text-subdued">אמצע</span>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={effects.eqMid}
                                onChange={(e) => onUpdateEffect('eqMid', Number(e.target.value))}
                                className="flex-1 h-1 accent-yellow-500"
                            />
                            <span className="text-[10px] w-10 text-left text-subdued">
                                {effects.eqMid > 0 ? '+' : ''}{effects.eqMid}dB
                            </span>
                        </div>

                        {/* High */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-12 text-subdued">טרבל</span>
                            <input
                                type="range"
                                min="-12"
                                max="12"
                                step="1"
                                value={effects.eqHigh}
                                onChange={(e) => onUpdateEffect('eqHigh', Number(e.target.value))}
                                className="flex-1 h-1 accent-purple-500"
                            />
                            <span className="text-[10px] w-10 text-left text-subdued">
                                {effects.eqHigh > 0 ? '+' : ''}{effects.eqHigh}dB
                            </span>
                        </div>
                    </div>

                    {/* Compressor */}
                    <div className="space-y-2">
                        <div className="text-[10px] text-subdued uppercase tracking-wider">קומפרסור</div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-12 text-subdued">עוצמה</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={effects.compressor}
                                onChange={(e) => onUpdateEffect('compressor', Number(e.target.value))}
                                className="flex-1 h-1 accent-orange-500"
                            />
                            <span className="text-[10px] w-10 text-left text-subdued">
                                {effects.compressor}%
                            </span>
                        </div>
                    </div>

                    {/* Output Gain */}
                    <div className="space-y-2">
                        <div className="text-[10px] text-subdued uppercase tracking-wider">גיין סופי</div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs w-12 text-subdued">עוצמה</span>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={effects.gain}
                                onChange={(e) => onUpdateEffect('gain', Number(e.target.value))}
                                className="flex-1 h-1 accent-green-500"
                            />
                            <span className="text-[10px] w-10 text-left text-subdued">
                                {Math.round(effects.gain * 100)}%
                            </span>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={onReset}
                        className="flex items-center gap-1 text-xs text-subdued hover:text-white transition-colors"
                    >
                        <RotateCcw size={12} />
                        איפוס
                    </button>
                </div>
            )}
        </div>
    )
}
