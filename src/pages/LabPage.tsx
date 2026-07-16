import {
    ArrowLeft,
    BookOpen,
    Brain,
    Dumbbell,
    FlaskConical,
    LayoutDashboard,
    Layers3,
    Settings,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { LAB_DESTINATIONS } from '../core/productSurface'

const ICONS: Record<string, typeof Brain> = {
    thoughts: Brain,
    'rhyme-groups': BookOpen,
    drills: Dumbbell,
    verse: Layers3,
    studio: FlaskConical,
    dashboard: LayoutDashboard,
    settings: Settings,
}

export default function LabPage() {
    return (
        <div className="mx-auto min-h-full w-full max-w-3xl px-4 pb-28" dir="rtl">
            <header className="sticky top-0 z-30 -mx-4 border-b border-white/5 bg-[#121212]/95 px-4 py-4 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-xs font-bold text-[#1DB954]">
                            <FlaskConical size={15} />
                            <span>RapCap Lab</span>
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">העבודה המורחבת נשמרה כאן</h1>
                    </div>
                    <Link
                        to="/record?mode=freestyle"
                        className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-black transition-transform hover:scale-105"
                    >
                        <span>לפריסטייל</span>
                        <ArrowLeft size={17} />
                    </Link>
                </div>
            </header>

            <section className="py-6">
                <div className="mb-5 rounded-2xl border border-[#1DB954]/20 bg-[#1DB954]/8 p-4">
                    <p className="text-sm font-bold text-white">ה־MVP נשאר רזה: פריסטייל, סשנים שמורים וייצוא.</p>
                    <p className="mt-1 text-sm leading-6 text-subdued">
                        כלי הכתיבה, החריזה והאימון לא נמחקו. הם מופרדים כאן כדי שנוכל לשפר אותם בלי לפגוע בהקלטה המרכזית.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {LAB_DESTINATIONS.map((destination) => {
                        const Icon = ICONS[destination.id] ?? FlaskConical

                        return (
                            <Link
                                key={destination.id}
                                to={destination.href}
                                className="group flex min-h-28 items-start gap-4 rounded-2xl border border-white/5 bg-[#1b1b1b] p-4 transition-colors hover:border-white/15 hover:bg-[#242424]"
                            >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/7 text-white group-hover:bg-white group-hover:text-black">
                                    <Icon size={21} />
                                </span>
                                <span>
                                    <span className="block font-black text-white">{destination.label}</span>
                                    <span className="mt-1 block text-sm leading-5 text-subdued">{destination.description}</span>
                                    <span className="mt-2 block text-[11px] font-bold text-[#1DB954]">נשמר להמשך פיתוח</span>
                                </span>
                            </Link>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}
