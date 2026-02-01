import { Volume2, Music } from 'lucide-react'

interface VolumeControlsProps {
    vocalVolume: number
    beatVolume: number
    onVocalVolumeChange: (volume: number) => void
    onBeatVolumeChange: (volume: number) => void
    hasBeat: boolean
}

export default function VolumeControls({
    vocalVolume,
    beatVolume,
    onVocalVolumeChange,
    onBeatVolumeChange,
    hasBeat
}: VolumeControlsProps) {
    return (
        <div className={`grid ${hasBeat ? 'grid-cols-2' : 'grid-cols-1'} gap-4 bg-[#121212] p-3 rounded-lg`}>
            {/* Vocal Volume */}
            <div className="flex items-center gap-3">
                <Volume2 size={16} className="text-[#1DB954] shrink-0" />
                <div className="flex-1">
                    <label className="text-[10px] uppercase text-subdued font-bold block mb-1">
                        קולות
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={vocalVolume}
                        onChange={(e) => onVocalVolumeChange(parseFloat(e.target.value))}
                        className="w-full accent-[#1DB954] h-1.5 bg-[#282828] rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <span className="text-xs text-subdued w-8 text-left">
                    {Math.round(vocalVolume * 100)}%
                </span>
            </div>

            {/* Beat Volume */}
            {hasBeat && (
                <div className="flex items-center gap-3">
                    <Music size={16} className="text-purple-500 shrink-0" />
                    <div className="flex-1">
                        <label className="text-[10px] uppercase text-subdued font-bold block mb-1">
                            ביט
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={beatVolume}
                            onChange={(e) => onBeatVolumeChange(parseInt(e.target.value))}
                            className="w-full accent-purple-500 h-1.5 bg-[#282828] rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <span className="text-xs text-subdued w-8 text-left">
                        {beatVolume}%
                    </span>
                </div>
            )}
        </div>
    )
}
