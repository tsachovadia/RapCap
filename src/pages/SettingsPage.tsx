/**
 * Settings Page
 */
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Download, Upload, Save, UserCircle } from 'lucide-react'
import { db } from '../db/db'
import { useProfile } from '../hooks/useProfile'

const AVATAR_COLORS = [
    '#1DB954', // Green
    '#1E3264', // Blue
    '#E91429', // Red
    '#E8115B', // Pink
    '#F573A0', // Light Pink
    '#509BF5', // Light Blue
    '#FF6437', // Orange
    '#B49BC8', // Purple
]

export default function SettingsPage() {
    const navigate = useNavigate()
    const { profile, updateProfile, resetProfile } = useProfile()
    const [name, setName] = useState(profile.name)
    const [bio, setBio] = useState(profile.bio)
    const [selectedColor, setSelectedColor] = useState(profile.avatarColor)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Data Management
    const handleDeleteAllData = async () => {
        if (window.confirm('האם אתה בטוח? פעולה זו תמחק את כל ההקלטות והאימונים שלך לצמיתות.')) {
            try {
                await db.delete()
                await db.open()
                resetProfile()
                alert('כל הנתונים נמחקו בהצלחה.')
                navigate('/')
            } catch (error) {
                console.error('Failed to delete database:', error)
                alert('שגיאה במחיקת הנתונים.')
            }
        }
    }

    const handleExportData = async () => {
        try {
            const sessions = await db.sessions.toArray()
            const exportData = {
                metadata: {
                    version: 1,
                    date: new Date().toISOString(),
                    app: 'RapCap'
                },
                profile: profile,
                sessions: sessions
            }

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `rapcap-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (e) {
            console.error('Export failed', e)
            alert('שגיאה בייצוא הנתונים')
        }
    }

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!window.confirm('ייבוא נתונים ימזג את ההקלטות החדשות עם הקיימות. האם להמשיך?')) {
            return
        }

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string)

                // Validate basic structure
                if (!data.sessions || !Array.isArray(data.sessions)) {
                    throw new Error('Invalid backup file format')
                }

                // Import sessions
                const sessionsToImport = data.sessions.map((s: any) => {
                    const { id, ...rest } = s
                    return {
                        ...rest,
                        createdAt: new Date(s.createdAt) // Fix date parsing
                    }
                })

                await db.sessions.bulkAdd(sessionsToImport)

                // Ask about profile backup
                if (data.profile && window.confirm('נמצאו הגדרות פרופיל בגיבוי. האם לשחזר גם אותן?')) {
                    updateProfile(data.profile)
                }

                alert(`שוחזרו בהצלחה ${sessionsToImport.length} פריטים!`)
                navigate('/')
            } catch (error) {
                console.error('Import failed', error)
                alert('שגיאה בטעינת הקובץ. וודא שזהו קובץ גיבוי תקין.')
            }
        }
        reader.readAsText(file)
    }

    const handleSaveProfile = () => {
        updateProfile({
            name,
            bio,
            avatarColor: selectedColor,
            isOnboarded: true
        })
        alert('הפרופיל עודכן בהצלחה! ✨')
    }

    return (
        <div className="pb-24 p-4 min-h-screen">
            {/* Header */}
            <header className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="btn-icon bg-[#282828] text-white hover:bg-[#3E3E3E]"
                >
                    <span className="material-symbols-rounded">arrow_forward</span>
                </button>
                <h1 className="text-2xl font-bold">הגדרות</h1>
            </header>

            <div className="space-y-8 max-w-2xl mx-auto">
                {/* Profile Section */}
                <section className="bg-[#181818] rounded-lg p-6 border border-[#282828]">
                    <div className="flex items-center gap-3 mb-6">
                        <UserCircle className="text-white" size={24} />
                        <h2 className="text-xl font-bold">הפרופיל שלי</h2>
                    </div>

                    <div className="space-y-6">
                        {/* Avatar Color Picker */}
                        <div>
                            <label className="block text-sm font-medium text-subdued mb-3">צבע דמות</label>
                            <div className="flex flex-wrap gap-3">
                                {AVATAR_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setSelectedColor(color)}
                                        className={`w-10 h-10 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Name Input */}
                        <div>
                            <label className="block text-sm font-medium text-subdued mb-2">כינוי (Rap Name)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#282828] border border-[#3E3E3E] rounded p-3 text-white focus:outline-none focus:border-[#1DB954] transition-colors"
                                placeholder="MC..."
                            />
                        </div>

                        {/* Bio Input */}
                        <div>
                            <label className="block text-sm font-medium text-subdued mb-2">קצת עליי</label>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full bg-[#282828] border border-[#3E3E3E] rounded p-3 text-white focus:outline-none focus:border-[#1DB954] transition-colors resize-none h-24"
                                placeholder="מה הסגנון שלך? מאיפה באת?"
                            />
                        </div>

                        <button
                            onClick={handleSaveProfile}
                            className="btn-spotify w-full flex items-center justify-center gap-2"
                        >
                            <Save size={18} />
                            שמור שינויים
                        </button>
                    </div>
                </section>

                {/* Data Management Section */}
                <section className="bg-[#181818] rounded-lg p-6 border border-[#282828]">
                    <h2 className="text-xl font-bold mb-4 text-subdued uppercase text-sm tracking-wider">ניהול נתונים</h2>

                    <div className="space-y-4">
                        <button
                            onClick={handleExportData}
                            className="w-full flex items-center justify-between p-4 bg-[#282828] rounded hover:bg-[#3E3E3E] transition-colors text-right"
                        >
                            <div className="flex items-center gap-3">
                                <Download size={20} className="text-subdued" />
                                <div>
                                    <span className="block font-bold">ייצוא נתונים (Backup)</span>
                                    <span className="text-xs text-subdued">הורד את כל ההקלטות והאימונים לקובץ</span>
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-between p-4 bg-[#282828] rounded hover:bg-[#3E3E3E] transition-colors text-right"
                        >
                            <div className="flex items-center gap-3">
                                <Upload size={20} className="text-subdued" />
                                <div>
                                    <span className="block font-bold">ייבוא נתונים (Restore)</span>
                                    <span className="text-xs text-subdued">שחזר נתונים מקובץ גיבוי</span>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImportData}
                                accept=".json"
                                className="hidden"
                            />
                        </button>

                        <button
                            onClick={handleDeleteAllData}
                            className="w-full flex items-center justify-between p-4 bg-[#282828] rounded hover:bg-red-900/20 group transition-colors text-right border border-transparent hover:border-red-900/50"
                        >
                            <div className="flex items-center gap-3">
                                <Trash2 size={20} className="text-red-500" />
                                <div>
                                    <span className="block font-bold text-red-500">מחיקת כל הנתונים</span>
                                    <span className="text-xs text-subdued group-hover:text-red-400">פעולה זו הינה בלתי הפיכה</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </section>

                <div className="text-center text-xs text-subdued pt-8">
                    <p>RapCap v0.5.0 Alpha</p>
                    <p>Built with ❤️ by Artifex</p>
                </div>
            </div>
        </div>
    )
}
