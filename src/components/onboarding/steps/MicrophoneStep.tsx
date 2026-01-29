
import React, { useState } from 'react';
import { Mic, AlertCircle } from 'lucide-react';

interface MicrophoneStepProps {
    onNext: () => void;
    checkPermissions: () => Promise<void>;
}

export const MicrophoneStep: React.FC<MicrophoneStepProps> = ({ onNext, checkPermissions }) => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleEnableMic = async () => {
        setLoading(true);
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop tracks immediately after granting to release the mic
            stream.getTracks().forEach(track => track.stop());
            await checkPermissions(); // Update state
            onNext(); // Auto advance on success
        } catch (err) {
            console.error("Mic permission denied", err);
            setError("Permission denied. We need the mic to hear your bars!");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center justify-center space-y-8">
                <div className="relative">
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mb-2 z-10 relative animate-pulse">
                        <Mic className="w-12 h-12 text-red-500" />
                    </div>
                    <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                </div>

                <div className="space-y-4 max-w-sm">
                    <h2 className="text-2xl font-bold text-white">Enable Microphone</h2>
                    <p className="text-zinc-400">
                        RapCap needs access to your microphone to record your sessions and analyze your flow.
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

                )}
            </div>

            <div className="w-full flex flex-col items-center gap-4 mt-8 pb-8">
                <button
                    onClick={handleEnableMic}
                    disabled={loading}
                    className="w-full max-w-xs bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Requesting...' : 'Enable Access'}
                </button>

                <button
                    onClick={onNext}
                    className="text-zinc-500 text-sm hover:text-zinc-300 underline"
                >
                    Skip for now
                </button>
            </div>
        </div >
    );
};
