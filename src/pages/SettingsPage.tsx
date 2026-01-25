/**
 * Settings Page
 * Microphone selection and app settings
 */

import { useState, useEffect } from 'react';

export default function SettingsPage() {
    const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
    const [selectedMic, setSelectedMic] = useState<string>('');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    useEffect(() => {
        // Get available microphones
        navigator.mediaDevices?.enumerateDevices().then((devices) => {
            const mics = devices.filter((d) => d.kind === 'audioinput');
            setMicrophones(mics);
            if (mics.length > 0 && !selectedMic) {
                setSelectedMic(mics[0].deviceId);
            }
        });
    }, []);

    const requestNotificationPermission = async () => {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            setNotificationsEnabled(permission === 'granted');
        }
    };

    return (
        <div className="p-4">
            {/* Header */}
            <h1 className="text-2xl font-bold mb-6">⚙️ הגדרות</h1>

            {/* Microphone */}
            <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-800">
                <h2 className="text-sm text-gray-400 mb-3">🎙️ מיקרופון</h2>
                <select
                    value={selectedMic}
                    onChange={(e) => setSelectedMic(e.target.value)}
                    className="w-full bg-gray-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                    {microphones.map((mic) => (
                        <option key={mic.deviceId} value={mic.deviceId}>
                            {mic.label || `מיקרופון ${mic.deviceId.slice(0, 8)}`}
                        </option>
                    ))}
                    {microphones.length === 0 && (
                        <option disabled>אין מיקרופון זמין</option>
                    )}
                </select>
            </div>

            {/* Notifications */}
            <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-800">
                <h2 className="text-sm text-gray-400 mb-3">🔔 התראות</h2>
                {notificationsEnabled ? (
                    <p className="text-sm text-green-400">✓ התראות מופעלות</p>
                ) : (
                    <button
                        onClick={requestNotificationPermission}
                        className="w-full py-2 bg-purple-600 rounded-lg text-sm hover:bg-purple-500 transition-colors"
                    >
                        אפשר התראות
                    </button>
                )}
                <p className="text-xs text-gray-600 mt-2">
                    תזכורות לתרגילים מוגדרות בכל תרגיל בנפרד
                </p>
            </div>

            {/* Stats */}
            <div className="bg-[#12121a] rounded-xl p-4 mb-4 border border-gray-800">
                <h2 className="text-sm text-gray-400 mb-3">📊 סטטיסטיקות</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">12</div>
                        <div className="text-xs text-gray-500">תרגילים השבוע</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">45</div>
                        <div className="text-xs text-gray-500">דקות סה"כ</div>
                    </div>
                </div>
            </div>

            {/* Reset */}
            <button className="w-full py-3 bg-red-900/30 text-red-400 rounded-xl border border-red-900 hover:bg-red-900/50 transition-colors">
                🗑️ איפוס נתונים
            </button>
        </div>
    );
}
