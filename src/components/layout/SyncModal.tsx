/**
 * Sync Modal
 * Controls timing offset between recording and beat
 */

interface SyncModalProps {
    onClose: () => void;
}

export default function SyncModal({ onClose }: SyncModalProps) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#12121a] rounded-2xl p-6 w-[90%] max-w-md border border-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold">🔗 סנכרון הקלטה וביט</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Offset Slider */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">
                        ⏱ השהיית ההקלטה:
                    </label>
                    <div className="flex items-center gap-3">
                        <button className="px-2 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700">
                            -50ms
                        </button>
                        <span className="text-lg font-mono flex-1 text-center">0 ms</span>
                        <button className="px-2 py-1 bg-gray-800 rounded text-sm hover:bg-gray-700">
                            +50ms
                        </button>
                    </div>
                    <input
                        type="range"
                        min="-500"
                        max="500"
                        defaultValue="0"
                        className="w-full mt-3 accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                        <span>-500ms</span>
                        <span>0</span>
                        <span>+500ms</span>
                    </div>
                </div>

                {/* Tap to Mark */}
                <div className="mb-6">
                    <label className="block text-sm text-gray-400 mb-2">
                        📍 סמן התחלה:
                    </label>
                    <button className="w-full py-3 bg-gray-800 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors">
                        הקש כשהביט מתחיל
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        איפוס
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-purple-600 rounded-lg hover:bg-purple-500 transition-colors"
                    >
                        שמור
                    </button>
                </div>
            </div>
        </div>
    );
}
