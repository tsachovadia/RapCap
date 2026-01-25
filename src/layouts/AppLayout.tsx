/**
 * App Layout - Main wrapper with bottom navigation
 */
import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

export default function AppLayout() {
    return (
        <div className="relative flex min-h-dvh w-full flex-col max-w-md mx-auto overflow-hidden">
            {/* Ambient glow effect */}
            <div className="ambient-glow" />

            {/* Main content */}
            <main className="flex-1 overflow-y-auto pb-24">
                <Outlet />
            </main>

            {/* Bottom navigation */}
            <BottomNav />
        </div>
    )
}
