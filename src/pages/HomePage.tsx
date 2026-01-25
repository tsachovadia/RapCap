/**
 * Home Page - Spotify Style - Real Data
 */
import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { Mic, Eye, Bell, Settings, Music, Play, Link2, BrainCircuit, Waves } from 'lucide-react'
import { drills } from '../data/drills'


export default function HomePage() {
    const navigate = useNavigate()
    const greeting = getGreeting()
    const { sessions } = useSessions()

    // Get recent items (last 4 sessions)
    const recentSessions = sessions?.slice(0, 4) || []

    const quickAccessItems = [
        { id: 'freestyle', title: 'פריסטייל מהיר', icon: Mic, color: '#1DB954', path: '/freestyle' },
        { id: 'flow-patterns', title: 'אימון פלואו', icon: Waves, color: '#1E3264', path: '/drills/flow-patterns' },
        { id: 'rhyme-chains', title: 'שרשרת חרוזים', icon: Link2, color: '#E91429', path: '/drills/rhyme-chains' },
        { id: 'word-association', title: 'אסוציאציות', icon: BrainCircuit, color: '#E8115B', path: '/drills/word-association' },
    ]

    const streak = calculateStreak(sessions || [])
    const weeklyProgress = calculateWeeklyProgress(sessions || [])
    const WEEKLY_GOAL = 3

    return (
        <div className="pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-4"
                style={{ background: 'linear-gradient(#1a1a2e 0%, #121212 100%)' }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{greeting}</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#282828] px-3 py-1.5 rounded-full mr-2">
                            <span className="text-lg">🔥</span>
                            <span className="text-sm font-bold font-mono">{streak}</span>
                        </div>
                        <button className="w-8 h-8 rounded-full flex items-center justify-center text-subdued hover:text-white hover:bg-white/10 transition-colors">
                            <Bell size={20} />
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-subdued hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4">
                {/* Quick Actions Grid - Spotify style */}
                <div className="grid grid-cols-2 gap-2 mb-8">
                    {quickAccessItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className="flex items-center gap-3 rounded overflow-hidden text-right transition-colors pr-0"
                            style={{ backgroundColor: '#282828' }}
                        >
                            <div className="w-12 h-12 flex items-center justify-center text-xl shrink-0"
                                style={{ backgroundColor: item.color, color: '#000' }}>
                                <item.icon size={24} />
                            </div>
                            <span className="flex-1 text-sm font-bold truncate pl-2">{item.title}</span>
                        </button>
                    ))}
                </div>

                {/* Weekly Goal */}
                <section className="mb-8">
                    <div className="bg-gradient-to-r from-[#282828] to-[#181818] p-4 rounded-lg border border-[#3E3E3E]">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-bold text-subdued uppercase tracking-wider">יעד שבועי</h3>
                            <span className="text-sm font-bold">{weeklyProgress} / {WEEKLY_GOAL}</span>
                        </div>
                        <div className="w-full bg-[#121212] rounded-full h-2 mb-2">
                            <div
                                className="bg-[#1DB954] h-2 rounded-full transition-all duration-1000"
                                style={{ width: `${Math.min(100, (weeklyProgress / WEEKLY_GOAL) * 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-subdued text-left">
                            {weeklyProgress >= WEEKLY_GOAL ? '🎉 עמדת ביעד השבועי!' : `עוד ${WEEKLY_GOAL - weeklyProgress} אימונים להשלמת היעד`}
                        </p>
                    </div>
                </section>

                {/* Daily Mix Section */}
                <section className="mb-8">
                    <h2 className="text-xl font-bold mb-4">המיקס היומי שלך</h2>
                    <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
                        {drills.map((drill) => (
                            <div
                                key={drill.id}
                                onClick={() => navigate(`/drills/${drill.id}`)}
                                className="snap-center shrink-0 w-36 bg-[#282828] p-4 rounded-lg cursor-pointer hover:bg-[#3E3E3E] transition-colors"
                            >
                                <div className="w-full aspect-square rounded mb-3 flex items-center justify-center"
                                    style={{ background: drill.color }}>
                                    {drill.id === 'object-writing' && <Eye className="text-white" size={32} />}
                                    {drill.id === 'rhyme-chains' && <Link2 className="text-white" size={32} />}
                                    {drill.id === 'word-association' && <BrainCircuit className="text-white" size={32} />}
                                    {drill.id === 'flow-patterns' && <Waves className="text-white" size={32} />}
                                </div>
                                <h3 className="text-sm font-bold truncate">{drill.name}</h3>
                                <p className="text-xs text-subdued truncate">{drill.duration / 60} דקות</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recent Sessions Section */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">הקלטות אחרונות</h2>
                        <button
                            onClick={() => navigate('/library')}
                            className="text-subdued text-xs font-bold uppercase tracking-wider hover:text-white transition-colors"
                        >
                            הכל
                        </button>
                    </div>

                    <div className="space-y-2">
                        {recentSessions.length > 0 ? (
                            recentSessions.map((session) => (
                                <div
                                    key={session.id}
                                    onClick={() => navigate(session.type === 'drill' ? '/drills' : '/library')} // Interim: Go to drills dashboard for drills
                                    className="spotify-list-item cursor-pointer group"
                                >
                                    <div className="w-10 h-10 rounded flex items-center justify-center text-lg shrink-0"
                                        style={{ backgroundColor: session.type === 'drill' ? '#E9142920' : '#282828' }}>
                                        {session.type === 'drill' ? (
                                            <Eye className="text-[#E91429]" size={20} />
                                        ) : (
                                            <Music className="text-white" size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{session.title}</p>
                                        <p className="text-2xs text-subdued">
                                            {formatDate(session.createdAt)} • {formatDuration(session.duration)}
                                        </p>
                                    </div>
                                    <button className="btn-play w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-black rounded-full flex items-center justify-center">
                                        <Play size={18} fill="currentColor" />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-6 bg-[#181818] rounded-lg">
                                <p className="text-subdued text-sm mb-3">אין הקלטות עדיין</p>
                                <button
                                    onClick={() => navigate('/freestyle')}
                                    className="text-sm font-bold text-white hover:underline"
                                >
                                    התחל להקליט עכשיו
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                {/* Big CTA */}
                <section className="mb-8">
                    <div className="spotify-card p-6 text-center">
                        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                            style={{ backgroundColor: '#1DB954' }}>
                            <Mic className="text-black" size={32} />
                        </div>
                        <h3 className="text-lg font-bold mb-2">מוכן לזרום?</h3>
                        <p className="text-subdued text-sm mb-4">תפוס את הרגע והקלט את ה-Flow שלך</p>
                        <button
                            onClick={() => navigate('/freestyle')}
                            className="btn-spotify w-full py-3 font-bold"
                        >
                            התחל הקלטה
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}

function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 5) return 'לילה טוב'
    if (hour < 12) return 'בוקר טוב'
    if (hour < 18) return 'צהריים טובים'
    return 'ערב טוב'
}

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

function formatDuration(seconds: number) {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
}

function calculateStreak(sessions: any[]) {
    if (!sessions || sessions.length === 0) return 0

    const dates = sessions.map(s => new Date(s.createdAt).setHours(0, 0, 0, 0))
    const uniqueDates = Array.from(new Set(dates)).sort((a, b) => b - a)

    const today = new Date().setHours(0, 0, 0, 0)
    const yesterday = new Date(Date.now() - 86400000).setHours(0, 0, 0, 0)

    if (!uniqueDates.includes(today) && !uniqueDates.includes(yesterday)) {
        return 0
    }

    let streak = 0
    let currentCheck = uniqueDates.includes(today) ? today : yesterday

    while (uniqueDates.includes(currentCheck)) {
        streak++
        currentCheck -= 86400000
    }

    return streak
}

function calculateWeeklyProgress(sessions: any[]) {
    if (!sessions || sessions.length === 0) return 0

    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    startOfWeek.setHours(0, 0, 0, 0)

    return sessions.filter(s => new Date(s.createdAt) >= startOfWeek).length
}
