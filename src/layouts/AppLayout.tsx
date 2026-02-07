/**
 * App Layout - Spotify Style
 */
import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { WifiOff } from 'lucide-react'

export default function AppLayout() {
    const isOnline = useOnlineStatus()

    return (
        <div className="relative flex h-full w-full flex-col overflow-hidden safe-left safe-right"
            style={{ backgroundColor: '#121212' }}>

            {/* Offline Indicator */}
            {!isOnline && (
                <div className="relative bg-amber-600/90 text-white text-xs py-1 px-3 text-center w-full z-50 flex items-center justify-center gap-2 backdrop-blur-sm safe-top">
                    <WifiOff size={12} />
                    <span>Offline Mode - Changes saved locally</span>
                </div>
            )}

            {/* Main content */}
            <main className={`flex-1 overflow-y-auto pb-24 overscroll-contain ${isOnline ? 'safe-top' : ''}`}>
                <Outlet />
            </main>

            {/* Bottom navigation */}
            <BottomNav />
        </div>
    )
}
