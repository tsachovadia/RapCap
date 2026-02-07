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
        <div className="relative flex h-dvh w-full flex-col overflow-hidden"
            style={{ backgroundColor: '#121212' }}>

            {/* Offline Indicator */}
            {!isOnline && (
                <div className="bg-amber-600/90 text-white text-xs py-1 px-3 text-center w-full z-50 flex items-center justify-center gap-2 backdrop-blur-sm absolute top-0 left-0">
                    <WifiOff size={12} />
                    <span>Offline Mode - Changes saved locally</span>
                </div>
            )}

            {/* Main content */}
            <main className={`flex-1 overflow-y-auto pb-24 overscroll-contain ${!isOnline ? 'pt-6' : ''}`}>
                <Outlet />
            </main>

            {/* Bottom navigation */}
            <BottomNav />
        </div>
    )
}
