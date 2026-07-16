import { FlaskConical, Library, Mic2 } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
    getActivePrimaryDestination,
    PRIMARY_DESTINATIONS,
    type PrimaryDestinationId,
} from '../core/productSurface'

const ICONS = {
    freestyle: Mic2,
    library: Library,
    lab: FlaskConical,
} satisfies Record<PrimaryDestinationId, typeof Mic2>

export default function BottomNav() {
    const location = useLocation()
    const activeId = getActivePrimaryDestination(location.pathname, location.search)

    return (
        <nav
            aria-label="ניווט ראשי"
            className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg px-3 pb-2 pt-2 safe-bottom"
            style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.92) 20%)' }}
        >
            <div className="grid grid-cols-3 items-center rounded-2xl border border-white/5 bg-[#202020]/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {PRIMARY_DESTINATIONS.map((destination) => {
                    const id = destination.id as PrimaryDestinationId
                    const Icon = ICONS[id]
                    const isActive = id === activeId

                    return (
                        <Link
                            key={destination.id}
                            to={destination.href}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 transition-colors ${
                                isActive
                                    ? 'bg-white text-black'
                                    : 'text-subdued hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon size={21} strokeWidth={isActive ? 2.7 : 2} />
                            <span className="text-[11px] font-bold">{destination.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
