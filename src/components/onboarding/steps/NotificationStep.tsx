import React, { useState } from 'react';
import { Bell, AlertCircle } from 'lucide-react';

interface NotificationStepProps {
    onNext: () => void;
    checkPermissions: () => Promise<void>;
}

export const NotificationStep: React.FC<NotificationStepProps> = ({ onNext, checkPermissions }) => {
    const [error, setError] = useState<string | null>(null);

    const handleEnableNotifications = async () => {
        setError(null);
        try {
            if (typeof Notification === 'undefined') {
                throw new Error("Notifications not supported");
            }

            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await checkPermissions();
                onNext();
            } else {
                setError("Notifications disabled. Enable in Settings.");
            }
        } catch (err) {
            console.error("Notification permission error", err);
            // Since this is optional/last step, we can just proceed or show error
            setError("Could not enable notifications.");
            setTimeout(onNext, 1500); // Auto skip after error
        }
    };

    return (
        <div className="flex flex-col items-center justify-between h-full p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="w-24 h-24 bg-purple-500/10 rounded-full flex items-center justify-center mb-2">
                    <Bell className="w-12 h-12 text-purple-400" />
                </div>

                <div className="space-y-4 max-w-sm">
                    <h2 className="text-2xl font-bold text-white">Stay Consistent</h2>
                    <p className="text-zinc-400">
                        Get reminders to hit your weekly freestyle goals. No spam, just motivation.
                    </p>
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-lg text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            <button
                onClick={handleEnableNotifications}
                className="w-full max-w-xs bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-full transition-all active:scale-95"
            >
                Enable Notifications
            </button>

            <button
                onClick={onNext}
                className="mt-4 text-zinc-500 text-sm hover:text-zinc-300 underline"
            >
                Maybe later
            </button>
        </div>
    );
};
