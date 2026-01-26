import { useEffect, useRef } from 'react';
import { Play, Pause, Square, Bookmark, Mic } from 'lucide-react';

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
    onDeviceChange = () => { }
}: RecordingControlsProps & {
    availableDevices?: { deviceId: string, label: string }[];
    selectedDeviceId?: string;
    onDeviceChange?: (id: string) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);

    // Format time MM:SS
    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const seconds = secs % 60;
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

            {/* Timer */}
            <div className={`text-6xl font-bold tabular-nums mb-4 transition-opacity ${isPaused ? 'opacity-50' : 'opacity-100'}`}
                style={{ fontFamily: 'ui-monospace, monospace' }}>
                {formatTime(duration)}
            </div>
            <p className="text-2xs text-subdued mb-8">{isPaused ? 'מושהה' : isPreRolling ? 'מתכונן...' : isRecording ? 'מקליט' : 'מוכן'}</p>

            {/* Visualizer Canvas & Save Marker */}
            <div className="h-16 w-full max-w-xs mb-8 flex items-end justify-center relative">
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
            <div className="flex items-center gap-6">

                {/* Cancel / Finish (Only visible when ACTIVE or PAUSED) */}
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

                {/* Device Picker (Right of Record Button) - Always visible or active logic */}
                <div className="w-14 flex items-center justify-center">
                    <div className="relative flex items-center justify-center group">
                        <div className="p-3 rounded-full bg-[#282828] text-subdued hover:text-white hover:bg-[#3E3E3E] transition-all cursor-pointer">
                            <Mic size={20} />
                        </div>
                        {/* Dropdown (Opacity 0 by default, check if we want explicit click or hover) */}
                        <select
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            value={selectedDeviceId}
                            onChange={(e) => onDeviceChange(e.target.value)}
                            title="Select Microphone"
                        >
                            <option value="" disabled>Select Mic</option>
                            {availableDevices.map(d => (
                                <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Helper Text */}
            {isPaused && (
                <div className="mt-4 text-xs text-subdued animate-pulse">
                    ההקלטה מושהית. לחץ להמשך או סיום לשמירה.
                </div>
            )}
        </div>
    );
}
