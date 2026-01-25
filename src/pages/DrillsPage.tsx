/**
 * Drills Page - Spotify Style
 */
import { useNavigate } from 'react-router-dom'
import { Eye, Link2, Waves, BrainCircuit, Play, ChevronLeft } from 'lucide-react'

const drills = [
    {
        id: 'object-writing',
        title: 'Vision', // was Object Writing
        subtitle: 'התבוננות',
        description: 'שפר את יכולת התיאור והדימויים',
        duration: '10 דק׳',
        color: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)',
        icon: Eye
    },
    {
        id: 'rhyme-chains',
        title: 'Links', // was Rhyme Chains
        subtitle: 'שרשרות חרוזים',
        description: 'בנה רצף חרוזים ללא עצירה',
        duration: '5 דק׳',
        color: 'linear-gradient(135deg, #E91429 0%, #191414 100%)',
        icon: Link2
    },
    {
        id: 'flow-patterns',
        title: 'Flow', // was Flow Patterns
        subtitle: 'זרימה',
        description: 'תרגל קצבים ומקצבים שונים',
        duration: '8 דק׳',
        color: 'linear-gradient(135deg, #1E3264 0%, #191414 100%)',
        icon: Waves
    },
    {
        id: 'word-association',
        title: 'Spark', // was Word Association
        subtitle: 'אסוציאציות',
        description: 'קישור מילים מהיר ויצירתי',
        duration: '3 דק׳',
        color: 'linear-gradient(135deg, #E8115B 0%, #191414 100%)',
        icon: BrainCircuit
    },
]

export default function DrillsPage() {
    const navigate = useNavigate()

    return (
        <div className="pb-8">
            {/* Header with gradient */}
            <div className="px-4 pt-12 pb-6"
                style={{ background: 'linear-gradient(#1a1a2e 0%, #121212 100%)' }}>
                <h1 className="text-3xl font-bold mb-2">אימונים</h1>
                <p className="text-subdued">שפר את הכישורים שלך כל יום</p>
            </div>

            <div className="px-4">
                {/* Featured Drill */}
                <section className="mb-8">
                    <h2 className="text-base font-bold mb-4">המומלץ היום</h2>
                    <div
                        onClick={() => navigate('/drills/object-writing')}
                        className="rounded-lg overflow-hidden cursor-pointer transition-transform active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #1DB954 0%, #191414 100%)' }}
                    >
                        <div className="p-6 text-white">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                    <Eye size={32} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-2xs font-bold uppercase tracking-wider opacity-70">Focus</p>
                                    <h3 className="text-2xl font-black mb-1 tracking-tight">VISION</h3>
                                    <p className="text-sm opacity-90 font-medium">שפר את יכולת התיאור</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-6">
                                <span className="text-sm font-semibold opacity-80">10 דקות</span>
                                <button
                                    className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm text-black transition-transform hover:scale-105"
                                    style={{ backgroundColor: '#ffffff' }}
                                >
                                    <Play size={20} fill="currentColor" />
                                    התחל
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* All Drills */}
                <section>
                    <h2 className="text-base font-bold mb-4">כל האימונים</h2>
                    <div className="space-y-2">
                        {drills.map((drill) => (
                            <div
                                key={drill.id}
                                className="spotify-list-item group cursor-pointer"
                                onClick={() => navigate(`/drills/${drill.id}`)}
                            >
                                <div
                                    className="w-12 h-12 rounded flex items-center justify-center shrink-0"
                                    style={{ background: drill.color }}
                                >
                                    <drill.icon className="text-white" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold tracking-wide">{drill.title}</p>
                                    <p className="text-2xs text-subdued">{drill.subtitle} • {drill.duration}</p>
                                </div>
                                <ChevronLeft className="text-subdued" size={24} />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
