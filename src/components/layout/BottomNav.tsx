/**
 * Bottom Navigation Bar
 * Spotify-style fixed bottom nav with 5 tabs
 */

import { NavLink } from 'react-router-dom';

const tabs = [
    { path: '/barz', icon: '📝', label: 'Barz' },
    { path: '/freestyle', icon: '🎤', label: 'Free' },
    { path: '/library', icon: '📚', label: 'Lib' },
    { path: '/drills', icon: '✏️', label: 'Drill' },
    { path: '/settings', icon: '⚙️', label: 'Set' },
];

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0d12] border-t border-gray-800 safe-area-bottom">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => (
                    <NavLink
                        key={tab.path}
                        to={tab.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                ? 'text-purple-400'
                                : 'text-gray-500 hover:text-gray-300'
                            }`
                        }
                    >
                        <span className="text-xl mb-1">{tab.icon}</span>
                        <span className="text-[10px] font-medium">{tab.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
}
