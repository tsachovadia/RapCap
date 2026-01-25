/**
 * App Layout - Spotify Style
 */
import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function AppLayout() {
    return (
        <div className="relative flex min-h-dvh w-full flex-col max-w-lg mx-auto"
            style={{ backgroundColor: '#121212' }}>
            {/* Main content */}
            <main className="flex-1 overflow-y-auto pb-24">
                <Outlet />
            </main>

            {/* Bottom navigation */}
            <BottomNav />
        </div>
    )
}
