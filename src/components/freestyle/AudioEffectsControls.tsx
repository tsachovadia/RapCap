import { Activity, Disc, Mic2, Sliders, Volume2 } from "lucide-react";

interface VocalEffects {
    enabled: boolean;
    eqLow: number;
    eqHigh: number;
    compressor: number;
    gain: number;
}

interface AudioEffectsControlsProps {
    vocalEffects: VocalEffects;
    setVocalEffects: (effects: VocalEffects) => void;
    language: 'he' | 'en';
}

export function AudioEffectsControls({ vocalEffects, setVocalEffects, language }: AudioEffectsControlsProps) {
    const isEnabled = vocalEffects.enabled;

    const updateEffect = (key: keyof VocalEffects, value: number) => {
        setVocalEffects({ ...vocalEffects, [key]: value, enabled: true });
    };

    const toggleEnabled = () => {
        setVocalEffects({ ...vocalEffects, enabled: !isEnabled });
    };

    return (
        <div className={`
            w-full max-w-2xl mx-auto
            bg-[#181818] border border-[#282828] rounded-xl overflow-hidden transition-all duration-300
            ${isEnabled ? 'shadow-[0_0_15px_rgba(29,185,84,0.1)] border-[#1DB954]/30' : 'opacity-80'}
        `}>
            {/* Header / Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#222]">
                <div className="flex items-center gap-2">
                    <Sliders size={16} className={isEnabled ? "text-[#1DB954]" : "text-subdued"} />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                        {language === 'he' ? 'אפקטים (FX)' : 'Vocal FX'}
                    </span>
                </div>
                <button
                    onClick={toggleEnabled}
                    className={`
                        w-10 h-5 rounded-full relative transition-colors
                        ${isEnabled ? 'bg-[#1DB954]' : 'bg-[#444]'}
                    `}
                >
                    <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-5' : ''}`} />
                </button>
            </div>

            {/* Controls (Only visible if enabled) */}
            {isEnabled && (
                <div className="grid grid-cols-4 gap-2 p-3 animate-in slide-in-from-top-2">
                    {/* Compressor */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative group w-full h-24 bg-[#121212] rounded-lg border border-[#333] flex justify-center p-2">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={vocalEffects.compressor}
                                onChange={(e) => updateEffect('compressor', Number(e.target.value))}
                                className="h-full w-full accent-[#1DB954] appearance-none bg-transparent [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#1DB954] [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:bg-[#333] [&::-webkit-slider-runnable-track]:rounded-full"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black text-white text-[10px] px-1 rounded">{vocalEffects.compressor}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-subdued uppercase font-bold">
                            <Activity size={10} /> Comp
                        </div>
                    </div>

                    {/* EQ Low */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative group w-full h-24 bg-[#121212] rounded-lg border border-[#333] flex justify-center p-2">
                            <input
                                type="range"
                                min="-10"
                                max="10"
                                value={vocalEffects.eqLow}
                                onChange={(e) => updateEffect('eqLow', Number(e.target.value))}
                                className="h-full w-full accent-blue-500 appearance-none bg-transparent [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:bg-[#333] [&::-webkit-slider-runnable-track]:rounded-full"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black text-white text-[10px] px-1 rounded">{vocalEffects.eqLow > 0 ? '+' : ''}{vocalEffects.eqLow}dB</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-subdued uppercase font-bold">
                            <Disc size={10} /> Lows
                        </div>
                    </div>

                    {/* EQ High */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative group w-full h-24 bg-[#121212] rounded-lg border border-[#333] flex justify-center p-2">
                            <input
                                type="range"
                                min="-10"
                                max="10"
                                value={vocalEffects.eqHigh}
                                onChange={(e) => updateEffect('eqHigh', Number(e.target.value))}
                                className="h-full w-full accent-yellow-500 appearance-none bg-transparent [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-yellow-500 [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:bg-[#333] [&::-webkit-slider-runnable-track]:rounded-full"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black text-white text-[10px] px-1 rounded">{vocalEffects.eqHigh > 0 ? '+' : ''}{vocalEffects.eqHigh}dB</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-subdued uppercase font-bold">
                            <Mic2 size={10} /> Highs
                        </div>
                    </div>

                    {/* Gain */}
                    <div className="flex flex-col items-center gap-2">
                        <div className="relative group w-full h-24 bg-[#121212] rounded-lg border border-[#333] flex justify-center p-2">
                            <input
                                type="range"
                                min="0.5"
                                max="2.0"
                                step="0.1"
                                value={vocalEffects.gain}
                                onChange={(e) => updateEffect('gain', Number(e.target.value))}
                                className="h-full w-full accent-purple-500 appearance-none bg-transparent [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-runnable-track]:w-1 [&::-webkit-slider-runnable-track]:bg-[#333] [&::-webkit-slider-runnable-track]:rounded-full"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-black text-white text-[10px] px-1 rounded">{Math.round(vocalEffects.gain * 100)}%</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-subdued uppercase font-bold">
                            <Volume2 size={10} /> Gain
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
