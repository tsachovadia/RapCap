import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Square, Bookmark, Mic, Settings, X, Check, Volume2, Sliders } from 'lucide-react';

export type FlowState = 'idle' | 'preroll' | 'recording' | 'paused';

interface RecordingControlsProps {
    flowState: FlowState;
    duration: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onFinish: () => void;
    onSaveMarker: () => void;
    analyser?: AnalyserNode;

    availableDevices?: { deviceId: string, label: string }[];
    selectedDeviceId?: string;
    onDeviceChange?: (id: string) => void;

    // Audio Engine Props
    audioConstraints?: MediaTrackConstraints;
    setAudioConstraints?: (c: Partial<MediaTrackConstraints>) => void;

    availableOutputDevices?: MediaDeviceInfo[];
    selectedOutputId?: string;
    onOutputChange?: (id: string) => void;

    vocalEffects?: {
        enabled: boolean;
        eqLow: number;
        eqHigh: number;
        compressor: number;
        gain: number;
    };
    setVocalEffects?: (effects: any) => void;
}

export default function RecordingControls({
    flowState,
    duration,
    onStart,
    onPause,
    onResume,
    onFinish,
    onSaveMarker,
    analyser,
    availableDevices = [],
    selectedDeviceId = '',
    onDeviceChange = () => { },
    audioConstraints = {},
    setAudioConstraints = () => { },

    availableOutputDevices = [],
    selectedOutputId = '',
    onOutputChange = () => { },

    vocalEffects = { enabled: false, eqLow: 0, eqHigh: 0, compressor: 0, gain: 1.0 },
    setVocalEffects = () => { }

}: RecordingControlsProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);
    const [showSettings, setShowSettings] = useState(false);

    // Format time MM:SS
    const formatTime = (secs: number) => {
        const floorSecs = Math.floor(secs);
        const mins = Math.floor(floorSecs / 60);
        const seconds = floorSecs % 60;
        return `${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const drawVisualizer = () => {
        if (!analyser || !canvasRef.current || flowState !== 'recording') return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
            if (flowState !== 'recording') return;
            animationRef.current = requestAnimationFrame(renderFrame);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
                gradient.addColorStop(0, '#1DB954');
                gradient.addColorStop(1, '#121212');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };
        renderFrame();
    };

    useEffect(() => {
        if (flowState === 'recording' && analyser) {
            drawVisualizer();
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
    }, [flowState, analyser]);

    // Derived States
    const isRecording = flowState === 'recording';
    const isPaused = flowState === 'paused';
    const isPreRolling = flowState === 'preroll';
    const isIdle = flowState === 'idle';

    return (
        <div className="flex flex-col items-center justify-center w-full relative">

            {/* Visualizer Canvas & Save Marker */}
            <div className="h-12 w-full max-w-xs mb-4 flex items-end justify-center relative">
                <canvas ref={canvasRef} width={300} height={60} className="w-full h-full" />

                {/* Save Moment Button (Visible only when Recording) */}
                {isRecording && (
                    <button
                        className="absolute right-0 bottom-0 btn-secondary p-2 rounded-full bg-[#282828] text-white hover:bg-[#3E3E3E] transition-all opacity-80 hover:opacity-100"
                        title="שמור רגע"
                        onClick={onSaveMarker}
                    >
                        <Bookmark size={16} />
                    </button>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-6 mb-4">

                {/* Cancel / Finish */}
                {!isIdle && (
                    <button
                        onClick={onFinish}
                        data-testid="finish-button"
                        className="w-14 h-14 rounded-full flex items-center justify-center bg-[#282828] text-white hover:bg-[#3E3E3E] transition-all"
                        title="סיום ושמירה"
                    >
                        <Square size={20} fill="currentColor" />
                    </button>
                )}

                {/* Main Action Button */}
                <button
                    onClick={isRecording ? onPause : isPaused ? onResume : onStart}
                    disabled={isPreRolling}
                    data-testid="record-toggle"
                    className={`
                        w-20 h-20 rounded-full flex items-center justify-center transition-all bg-white text-black shadow-xl
                        ${isRecording ? 'scale-100' : 'scale-105 hover:scale-110'}
                        ${isPreRolling ? 'opacity-80 cursor-wait' : ''}
                    `}
                >
                    {isPreRolling ? (
                        <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin"></div>
                    ) : isRecording ? (
                        <Pause size={32} fill="currentColor" />
                    ) : isPaused ? (
                        <Play size={32} fill="currentColor" className="ml-1" />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-[#E50914] shadow-lg shadow-red-500/20" />
                    )}
                </button>

                {/* Settings Toggle */}
                <div className="w-14 flex items-center justify-center">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-3 rounded-full bg-[#282828] text-subdued hover:text-white hover:bg-[#3E3E3E] transition-all"
                        title="Audio Settings"
                    >
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* Timer (Moved to Bottom) */}
            <div className={`text-3xl font-bold tabular-nums mb-1 transition-opacity ${isPaused ? 'opacity-50' : 'opacity-100'}`}
                style={{ fontFamily: 'ui-monospace, monospace' }}>
                {formatTime(duration)}
            </div>
            <p className="text-2xs text-subdued animate-pulse">{isPaused ? 'מושהה' : isPreRolling ? 'מתכונן...' : isRecording ? 'מקליט' : 'מוכן'}</p>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in" style={{ zIndex: 100 }}>
                    <div className="bg-[#181818] border border-[#333] rounded-2xl p-6 w-full max-w-md flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between sticky top-0 bg-[#181818] z-10 pb-2 border-b border-[#333]">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Settings size={18} /> Audio Settings
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="text-subdued hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        {/* 1. Input Device */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-subdued uppercase flex items-center gap-2">
                                <Mic size={12} /> Input Device
                            </label>
                            <div className="relative">
                                <select
                                    className="w-full bg-[#222] border border-[#333] rounded-lg p-3 text-sm text-white appearance-none focus:border-[#1DB954] focus:outline-none"
                                    value={selectedDeviceId}
                                    onChange={(e) => onDeviceChange(e.target.value)}
                                >
                                    <option value="" disabled>Select Microphone</option>
                                    {availableDevices.map(d => (
                                        <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* 2. Output Device (If supported) */}
                        {availableOutputDevices && availableOutputDevices.length > 0 && (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-subdued uppercase flex items-center gap-2">
                                    <Volume2 size={12} /> Output Device
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-[#222] border border-[#333] rounded-lg p-3 text-sm text-white appearance-none focus:border-[#1DB954] focus:outline-none"
                                        value={selectedOutputId}
                                        onChange={(e) => onOutputChange(e.target.value)}
                                    >
                                        <option value="" disabled>Default Speaker</option>
                                        {availableOutputDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* 3. Signal Processing (Hardware) */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-subdued uppercase">Signal Cleanup</label>

                            <label className="flex items-center justify-between p-3 bg-[#222] rounded-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Echo Cancellation</span>
                                    <span className="text-[10px] text-subdued">Turn OFF if beat volume drops (Ducking).</span>
                                </div>
                                <div
                                    className={`w-10 h-6 rounded-full relative transition-colors ${audioConstraints?.echoCancellation ? 'bg-[#1DB954]' : 'bg-[#444]'}`}
                                    onClick={() => setAudioConstraints({ echoCancellation: !audioConstraints?.echoCancellation })}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${audioConstraints?.echoCancellation ? 'translate-x-4' : ''}`} />
                                </div>
                            </label>

                            <label className="flex items-center justify-between p-3 bg-[#222] rounded-lg cursor-pointer hover:bg-[#2a2a2a] transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Noise Suppression</span>
                                    <span className="text-[10px] text-subdued">Filters background noise.</span>
                                </div>
                                <div
                                    className={`w-10 h-6 rounded-full relative transition-colors ${audioConstraints?.noiseSuppression ? 'bg-[#1DB954]' : 'bg-[#444]'}`}
                                    onClick={() => setAudioConstraints({ noiseSuppression: !audioConstraints?.noiseSuppression })}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${audioConstraints?.noiseSuppression ? 'translate-x-4' : ''}`} />
                                </div>
                            </label>
                        </div>

                        {/* 4. Vocal Effects (Studio Processing) */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-subdued uppercase flex items-center justify-between">
                                <span className="flex items-center gap-2"><Sliders size={12} /> Studio Effects</span>
                                {/* Master Switch */}
                                <div
                                    className={`w-8 h-4 rounded-full relative transition-colors cursor-pointer ${vocalEffects.enabled ? 'bg-[#1DB954]' : 'bg-[#444]'}`}
                                    onClick={() => setVocalEffects({ ...vocalEffects, enabled: !vocalEffects.enabled })}
                                >
                                    <div className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${vocalEffects.enabled ? 'translate-x-4' : ''}`} />
                                </div>
                            </label>

                            <div className={`flex flex-col gap-4 p-3 bg-[#222] rounded-lg transition-opacity ${vocalEffects.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                                {/* Compressor */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>Compressor (Punch)</span>
                                        <span className="text-[#1DB954]">{vocalEffects.compressor}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100"
                                        value={vocalEffects.compressor}
                                        onChange={(e) => setVocalEffects({ ...vocalEffects, compressor: Number(e.target.value) })}
                                        className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                                    />
                                </div>

                                {/* EQ Low */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>Low End (Warmth)</span>
                                        <span className={vocalEffects.eqLow > 0 ? "text-[#1DB954]" : "text-subdued"}>{vocalEffects.eqLow > 0 ? '+' : ''}{vocalEffects.eqLow}dB</span>
                                    </div>
                                    <input
                                        type="range" min="-12" max="12"
                                        value={vocalEffects.eqLow}
                                        onChange={(e) => setVocalEffects({ ...vocalEffects, eqLow: Number(e.target.value) })}
                                        className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                                    />
                                </div>

                                {/* EQ High */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span>High End (Crisp)</span>
                                        <span className={vocalEffects.eqHigh > 0 ? "text-[#1DB954]" : "text-subdued"}>{vocalEffects.eqHigh > 0 ? '+' : ''}{vocalEffects.eqHigh}dB</span>
                                    </div>
                                    <input
                                        type="range" min="-12" max="12"
                                        value={vocalEffects.eqHigh}
                                        onChange={(e) => setVocalEffects({ ...vocalEffects, eqHigh: Number(e.target.value) })}
                                        className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                                    />
                                </div>

                                {/* Output Gain */}
                                <div className="space-y-1 border-t border-[#333] pt-2">
                                    <div className="flex justify-between text-xs">
                                        <span>Output Gain</span>
                                        <span className="text-white">{Math.round(vocalEffects.gain * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2" step="0.1"
                                        value={vocalEffects.gain}
                                        onChange={(e) => setVocalEffects({ ...vocalEffects, gain: Number(e.target.value) })}
                                        className="w-full h-1 bg-[#444] rounded-lg appearance-none cursor-pointer accent-[#1DB954]"
                                    />
                                </div>
                            </div>
                        </div>


                        <button
                            onClick={() => setShowSettings(false)}
                            className="w-full py-3 bg-[#1DB954] text-black font-bold rounded-full hover:bg-[#1ed760] transition-colors flex items-center justify-center gap-2"
                        >
                            <Check size={18} /> Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
