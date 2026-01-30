import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r)
            // Check for updates every 60 minutes
            if (r) {
                setInterval(() => {
                    r.update()
                }, 60 * 60 * 1000)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    // Aggressive check: whenever user returns to the app
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('🔍 PWA: App visible, checking for updates...')
                navigator.serviceWorker?.getRegistration().then(reg => {
                    reg?.update()
                })
            }
        }
        window.addEventListener('visibilitychange', handleVisibilityChange)
        return () => window.removeEventListener('visibilitychange', handleVisibilityChange)
    }, [])

    const close = () => {
        setNeedRefresh(false)
    }

    if (!needRefresh) return null

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[9999] md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5 duration-300">
            <div className="bg-[#1E1E1E] border border-[#333] rounded-xl shadow-2xl p-4 flex items-start gap-4">
                <div className="bg-[#1DB954]/10 p-2 rounded-full text-[#1DB954] shrink-0">
                    <AlertCircle size={24} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-white text-sm mb-1">Update Available</h3>
                    <p className="text-subdued text-xs mb-3">
                        A new version of RapCap is available. Refresh to get the latest features.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => updateServiceWorker(true)}
                            className="bg-[#1DB954] text-black text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#1ed760] transition-colors flex items-center gap-1"
                        >
                            <RefreshCw size={14} />
                            Reload
                        </button>
                        <button
                            onClick={close}
                            className="bg-[#333] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#444] transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
