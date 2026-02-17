import { useNavigate } from 'react-router-dom'
import { useSessions } from '../hooks/useSessions'
import { Bell, Music, Play } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useProfile } from '../hooks/useProfile'

export default function HomePage() {
    const navigate = useNavigate()
    const { sessions } = useSessions()
    const { profile } = useProfile()
    const { showToast } = useToast()

    // Get recent items (last 4 sessions)
    const recentSessions = sessions?.slice(0, 4) || []

    const streak = calculateStreak(sessions || [])

    return (
        <div className="pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 px-4 py-4"
                style={{ background: 'linear-gradient(#1a1a2e 0%, #121212 100%)' }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{getGreeting(profile.name)}</h1>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-[#282828] px-3 py-1.5 rounded-full mr-2" title="ימי רצף">
                            <span className="text-lg">🔥</span>
                            <span className="text-sm font-bold font-mono">{streak}</span>
                        </div>
                        <button className="btn-icon" title="התראות" onClick={() => showToast('אין התראות חדשות', 'info')}>
                            <Bell size={20} />
                        </button>
                        <button
                            onClick={() => navigate('/settings')}
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-black border-2 border-transparent hover:border-white transition-all transform hover:scale-105"
                            style={{ backgroundColor: profile.avatarColor }}
                            title="הגדרות פרופיל"
                        >
                            {profile.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                profile.name[0].toUpperCase()
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-4">
                {/* Recent Sessions Section */}
                <section className="mb-8 mt-6">
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
                                            <Music className="text-[#E91429]" size={20} />
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
                                    onClick={() => navigate('/record?mode=freestyle')}
                                    className="text-sm font-bold text-white hover:underline"
                                >
                                    התחל להקליט עכשיו
                                </button>
                            </div>
                        )}
                    </div>
                </section>

                <div className="text-center pb-8 opacity-30 text-[10px] text-subdued font-mono">
                    <p>RapCap v1.1.0</p>
                    <p>Last Update: 26/01/26 09:40</p>
                </div>
            </div>
        </div>
    )
}

function getGreeting(name: string) {
    const hour = new Date().getHours()
    let timeGreeting = ''
    if (hour < 5) timeGreeting = 'לילה טוב'
    else if (hour < 12) timeGreeting = 'בוקר טוב'
    else if (hour < 18) timeGreeting = 'צהריים טובים'
    else timeGreeting = 'ערב טוב'

    return `${timeGreeting}, ${name}`
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


