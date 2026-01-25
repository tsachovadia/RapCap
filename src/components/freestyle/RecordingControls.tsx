import { useEffect, useRef } from 'react';

interface RecordingControlsProps {
    isRecording: boolean;
    isWaiting?: boolean;
    onToggleRecording: () => void;
    duration: number;
    analyser?: AnalyserNode;
}

export default function RecordingControls({ isRecording, isWaiting, onToggleRecording, duration, analyser }: RecordingControlsProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number | undefined>(undefined);

    // Format time MM:SS
    const formatTime = (secs: number) => {
        const mins = Math.floor(secs / 60);
        const seconds = secs % 60;
        return `${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const drawVisualizer = () => {
        if (!analyser || !canvasRef.current || !isRecording) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const renderFrame = () => {
            animationRef.current = requestAnimationFrame(renderFrame);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

            // Draw logic (Simple bar visualizer)
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2; // Scale down

                // Spotify Green Gradients
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
        if (isRecording && analyser) {
            drawVisualizer();
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            // Clear canvas when stopped
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
    }, [isRecording, analyser]);


    return (
        <div className="flex flex-col items-center justify-center w-full">

            {/* Timer */}
            <div className="text-6xl font-bold tabular-nums mb-4" style={{ fontFamily: 'ui-monospace, monospace' }}>
                {formatTime(duration)}
            </div>
            <p className="text-2xs text-subdued mb-8">דקות : שניות</p>

            {/* Visualizer Canvas */}
            <div className="h-16 w-full max-w-xs mb-8 flex items-end justify-center">
                <canvas ref={canvasRef} width={300} height={60} className="w-full h-full" />
            </div>

            {/* Main Record Button */}
            <button
                onClick={onToggleRecording}
                disabled={isWaiting}
                className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all bg-white
                    ${isRecording ? 'scale-90 hover:scale-95' : 'hover:scale-105 active:scale-95'}
                    ${isWaiting ? 'opacity-80 cursor-wait' : ''}
                `}
            >
                {isWaiting ? (
                    <div className="w-8 h-8 border-4 border-[#121212] border-t-transparent rounded-full animate-spin"></div>
                ) : isRecording ? (
                    <div className="w-8 h-8 rounded-sm bg-[#121212]" />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-[#E50914]" />
                )}
            </button>
        </div>
    );
}
