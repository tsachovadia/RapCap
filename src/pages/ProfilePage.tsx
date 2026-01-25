/**
 * Profile Page - Settings & Stats
 */

export default function ProfilePage() {
    const stats = [
        { value: 12, label: 'אימונים השבוע' },
        { value: 45, label: 'דקות סה"כ' },
        { value: 3, label: 'ימים ברצף' },
    ]

    return (
        <>
            {/* Header */}
            <header className="sticky top-0 z-40 backdrop-blur-md px-4 py-4" style={{ backgroundColor: 'rgba(26, 16, 34, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">פרופיל</h1>
                    <button className="w-10 h-10 rounded-full flex items-center justify-center text-white/60">
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </header>

            <div className="px-4 py-4 space-y-4">
                {/* Profile Card */}
                <div className="card p-6 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                        style={{ background: 'linear-gradient(135deg, #9213ec 0%, #ff3b30 100%)' }}>
                        ר
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold">ראפר</h2>
                        <p className="text-sm text-white/40">הצטרף ב-25/01/2025</p>
                    </div>
                    <button className="btn-secondary h-10 px-4 text-sm">ערוך</button>
                </div>

                {/* Stats */}
                <div className="card p-4">
                    <h3 className="text-sm font-bold text-white/60 mb-4">📊 סטטיסטיקות</h3>
                    <div className="grid grid-cols-3 gap-3">
                        {stats.map((stat) => (
                            <div key={stat.label} className="surface text-center p-3">
                                <p className="text-2xl font-bold" style={{ color: '#9213ec' }}>{stat.value}</p>
                                <p className="text-[10px] text-white/40">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Microphone */}
                <div className="card p-4">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="material-symbols-outlined" style={{ color: '#9213ec' }}>mic</span>
                        <h3 className="text-sm font-bold text-white/60">מיקרופון</h3>
                    </div>
                    <select className="input-field" style={{ borderRadius: '0.75rem' }}>
                        <option>Default Microphone</option>
                    </select>
                </div>

                {/* Notifications */}
                <div className="card p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined" style={{ color: '#9213ec' }}>notifications</span>
                            <div>
                                <h3 className="text-sm font-bold">התראות</h3>
                                <p className="text-xs text-white/40">תזכורות לאימונים</p>
                            </div>
                        </div>
                        <div className="w-12 h-6 rounded-full px-1 flex items-center bg-white/20">
                            <div className="w-4 h-4 bg-white rounded-full" style={{ marginRight: 'auto' }} />
                        </div>
                    </div>
                </div>

                {/* Settings List */}
                <div className="card overflow-hidden">
                    <button className="flex items-center gap-4 w-full px-4 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="material-symbols-outlined text-white/60">cloud_download</span>
                        <span className="flex-1 text-right">ייצוא נתונים</span>
                        <span className="material-symbols-outlined text-white/40">chevron_left</span>
                    </button>
                    <button className="flex items-center gap-4 w-full px-4 py-4 hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span className="material-symbols-outlined text-white/60">help</span>
                        <span className="flex-1 text-right">עזרה ותמיכה</span>
                        <span className="material-symbols-outlined text-white/40">chevron_left</span>
                    </button>
                    <button className="flex items-center gap-4 w-full px-4 py-4 hover:bg-white/5 transition-colors">
                        <span className="material-symbols-outlined text-white/60">info</span>
                        <span className="flex-1 text-right">אודות</span>
                        <span className="material-symbols-outlined text-white/40">chevron_left</span>
                    </button>
                </div>

                {/* Danger Zone */}
                <button className="w-full py-4 rounded-xl text-red-400" style={{ border: '1px solid rgba(255,59,48,0.2)', backgroundColor: 'rgba(255,59,48,0.05)' }}>
                    <span className="material-symbols-outlined text-sm align-middle ml-2">delete</span>
                    איפוס נתונים
                </button>
            </div>
        </>
    )
}
