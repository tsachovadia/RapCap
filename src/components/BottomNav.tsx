/**
 * Bottom Navigation - Spotify Style
 */
import { NavLink } from 'react-router-dom'
import { Home, Mic2, Library, Dumbbell } from 'lucide-react'

const tabs = [
    { path: '/', icon: Home, label: 'בית' },
    { path: '/freestyle', icon: Mic2, label: 'הקלטה' },
    { path: '/library', icon: Library, label: 'הספריה שלך' },
    { path: '/drills', icon: Dumbbell, label: 'אימון' },
]

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-2 pb-2 pt-2 z-50 safe-bottom"
            style={{
                background: 'linear-gradient(transparent, rgba(0,0,0,0.9) 20%)',
            }}>
            <div className="flex justify-around items-center py-2 rounded-lg" style={{ backgroundColor: '#282828' }}>
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        end={tab.path === '/'}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 px-3 py-2 transition-colors ${isActive ? 'text-white' : 'text-subdued hover:text-white'
                            }`
                        }
                    >
                        {({ isActive }) => {
                            const Icon = tab.icon
                            return (
                                <>
                                    <Icon
                                        size={24}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={isActive ? 'text-white' : 'text-subdued'}
                                    />
                                    <span className="text-2xs font-medium">{tab.label}</span>
                                </>
                            )
                        }}
                    </NavLink>
                ))}
            </div>
        </nav>
    )
}
