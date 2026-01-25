/**
 * Bottom Navigation - iOS Spotify style
 */
import { NavLink } from 'react-router-dom'

const tabs = [
    { path: '/', icon: 'home', label: 'בית' },
    { path: '/freestyle', icon: 'mic', label: 'הקלטה' },
    { path: '/library', icon: 'library_music', label: 'ספריה' },
    { path: '/drills', icon: 'fitness_center', label: 'אימון' },
    { path: '/profile', icon: 'person', label: 'פרופיל' },
]

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto backdrop-blur-xl px-6 pb-6 pt-3 z-50 safe-bottom"
            style={{ backgroundColor: 'rgba(26, 16, 34, 0.9)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex justify-between items-center">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.path === '/'}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        {({ isActive }) => (
                            <>
                                <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
                                    {tab.icon}
                                </span>
                                <span className={`text-[10px] ${isActive ? 'font-bold' : ''}`}>
                                    {tab.label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
