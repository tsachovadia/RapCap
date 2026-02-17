import { useEffect, useRef, useState } from 'react';
import { Mic, AlertCircle, CheckCircle, RefreshCw, Play } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

interface MicrophoneSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    permissionError: Error | null;
    initializeStream: () => Promise<void>;
    audioAnalyser: AnalyserNode | undefined;
    availableDevices: MediaDeviceInfo[];
    selectedDeviceId: string;
    setDeviceId: (id: string) => void;
    resetAudioState: () => Promise<void>;
}

export function MicrophoneSetupModal({
    isOpen,
    onClose,
    permissionError,
    initializeStream,
    audioAnalyser,
    availableDevices,
    selectedDeviceId,
    setDeviceId,
    resetAudioState
}: MicrophoneSetupModalProps) {
    const { showToast } = useToast();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [testRecordingState, setTestRecordingState] = useState<'idle' | 'recording' | 'playing'>('idle');
    const testMediaRecorder = useRef<MediaRecorder | null>(null);
    const testAudioRef = useRef<HTMLAudioElement | null>(null);

    // VU Meter Logic
    useEffect(() => {
        if (!isOpen || !audioAnalyser || !canvasRef.current) return;

        let animationFrameId: number;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = audioAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            audioAnalyser.getByteFrequencyData(dataArray);

            // Calculate RMS (Volume)
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            // Normalize somewhat (0-255 -> 0-1)
            const volume = Math.min(1, average / 50);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Background Track
            ctx.fillStyle = '#333';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Volume Bar
            const barHeight = volume * canvas.height;

            // Gradient based on volume
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, '#22c55e'); // Green
            gradient.addColorStop(0.7, '#eab308'); // Yellow
            gradient.addColorStop(1, '#ef4444'); // Red

            ctx.fillStyle = gradient;
            ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

            animationFrameId = requestAnimationFrame(draw);
        };

        draw();

        return () => cancelAnimationFrame(animationFrameId);
    }, [isOpen, audioAnalyser]);


    // Handle Permission Retry
    const handleRetry = async () => {
        try {
            await initializeStream();
        } catch (e) {
            console.error("Retry failed", e);
        }
    };

    const handleHardReset = async () => {
        try {
            await resetAudioState();
        } catch (e) {
            console.error("Hard reset failed", e);
        }
    }

    // Test Recording Logic (Independent of main app recorder to avoid state conflicts)
    const startTestRecording = async () => {
        if (!audioAnalyser) return;
        // We need the stream from the analyser's context or just request a new one?
        // Actually, we can't easily grab the stream from the analyser node directly unless we stored the stream elsewhere.
        // BUT, we passed `initializeStream` but not the stream itself. 
        // Strategy: Use a new ephemeral stream for the test to be safe, or if availableDevices is working, use that.
        // However, requesting a NEW stream might conflict with the existing one if exclusive access is needed.
        // BETTER: The main hook exposes `streamRef` via `startRecording`, but we didn't pass `startRecording` to avoid triggering app logic.
        // Let's just ask for a temporary stream for this test.

        try {
            // Use the selected device or default
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined }
            });

            const mimeType = 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : '' });
            const chunks: Blob[] = [];

            recorder.ondataavailable = e => chunks.push(e.data);
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);

                // We don't save this state anymore as it was unused
                // setTestBlobUrl(url); 
                setTestRecordingState('idle');

                // Auto-play
                setTimeout(() => {
                    const audio = new Audio(url);
                    testAudioRef.current = audio;
                    setTestRecordingState('playing');
                    audio.play();
                    audio.onended = () => setTestRecordingState('idle');
                }, 500);

                // Clean up stream tracks
                stream.getTracks().forEach(t => t.stop());
            };

            recorder.start();
            testMediaRecorder.current = recorder;
            setTestRecordingState('recording');

            // Stop after 3 seconds automatically
            setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop();
            }, 3000);

        } catch (e) {
            console.error("Test recording failed", e);
            showToast('לא ניתן לבצע הקלטת בדיקה - וודא שהמיקרופון מחובר.', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#18181b] border border-gray-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">

                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#27272a]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Mic className="w-5 h-5 text-brand-purple" />
                        הגדרת מיקרופון
                    </h2>
                    {permissionError && (
                        <div className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                            גישה חסרה
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* State 1: Permission Error */}
                    {permissionError ? (
                        <div className="space-y-4">
                            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <h3 className="font-bold text-red-100">שגיאת גישה למיקרופון</h3>
                                    <p className="text-sm text-red-200/80 leading-relaxed">
                                        {(permissionError as any).diagnostic
                                            ? `אבחון: ${(permissionError as any).diagnostic}`
                                            : "הדפדפן או המערכת חוסמים את הגישה למיקרופון."
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-4 text-sm text-gray-300">
                                <p className="font-bold mb-2">פתרונות אפשריים:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    {(permissionError as any)?.name === 'NotFoundError' || (permissionError as any)?.message?.includes('NotFoundError') ? (
                                        <>
                                            <li className="text-red-300 font-bold">ב-Mac: הגדרות מערכת {'>'} פרטיות {'>'} מיקרופון.</li>
                                            <li>ודא שהמיקרופון מחובר ותקין.</li>
                                            <li>נסה להפעיל מחדש את הדפדפן לחלוטין.</li>
                                        </>
                                    ) : (
                                        <>
                                            <li>אשר גישה בחלונית הקופצת של הדפדפן (ליד הכתובת).</li>
                                            <li>לחץ על סמל המנעול 🔒 בשורת הכתובת ואפס הרשאות.</li>
                                            <li>רענן את העמוד לאחר השינוי.</li>
                                        </>
                                    )}
                                </ul>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleRetry}
                                    className="flex-1 py-3 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    נסה שוב
                                </button>
                                <button
                                    onClick={handleHardReset}
                                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                    title="נקה הרשאות והגדרות"
                                >
                                    <AlertCircle className="w-4 h-4" />
                                    איפוס
                                </button>
                            </div>
                        </div>
                    ) : (
                        // State 2: Setup & Test (Permission Granted)
                        <div className="space-y-6">

                            {/* Device Selector */}
                            <div className="space-y-2">
                                <label className="text-sm text-gray-400">בחר מיקרופון:</label>
                                <select
                                    className="w-full bg-gray-800 border-gray-700 text-white rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-purple/50"
                                    value={selectedDeviceId}
                                    onChange={(e) => setDeviceId(e.target.value)}
                                >
                                    {availableDevices.map(device => (
                                        <option key={device.deviceId} value={device.deviceId}>
                                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                                        </option>
                                    ))}
                                    {availableDevices.length === 0 && <option>ברירת מחדל (Default)</option>}
                                </select>
                            </div>

                            {/* VU Meter & Test Area */}
                            <div className="flex gap-4 h-32">
                                {/* VU Meter */}
                                <div className="w-12 bg-black rounded-lg overflow-hidden border border-gray-700 relative flex justify-center tooltipped" title="עוצמת שמע">
                                    <canvas ref={canvasRef} width={48} height={128} className="w-full h-full" />
                                </div>

                                {/* Test Controls */}
                                <div className="flex-1 bg-gray-800/50 rounded-lg border border-gray-700 p-4 flex flex-col justify-center items-center gap-3">
                                    <div className="text-gray-300 text-sm text-center">
                                        {testRecordingState === 'idle' && "בצע בדיקת סאונד (3 שניות)"}
                                        {testRecordingState === 'recording' && <span className="text-red-400 animate-pulse">● מקליט בדיקה...</span>}
                                        {testRecordingState === 'playing' && (
                                            <div className="flex items-center gap-2 text-green-400">
                                                <Play className="w-4 h-4 fill-current" />
                                                <span>מנגן בדיקה...</span>
                                            </div>
                                        )}
                                    </div>

                                    {testRecordingState === 'idle' ? (
                                        <button
                                            onClick={startTestRecording}
                                            className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Mic className="w-4 h-4" />
                                            הקלט בדיקה
                                        </button>
                                    ) : (
                                        <div className="h-9 flex items-center justify-center">
                                            {/* Placeholder for stability */}
                                            <div className="w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-purple animate-progress-indeterminate" />
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800/50 flex justify-end gap-3">
                    {permissionError && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                        >
                            סגור
                        </button>
                    )}

                    {!permissionError && (
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg shadow-green-900/20 flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            אשר והמשך
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
