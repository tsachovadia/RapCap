/**
 * Settings Page
 */
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2, Download, User, Moon, Volume2 } from 'lucide-react'
import { db } from '../db/db'

export default function SettingsPage() {
    const navigate = useNavigate()

    const handleDeleteAllData = async () => {
        if (confirm('האם אתה בטוח? פעולה זו תמחק את כל ההקלטות והאימונים שלך לצמיתות!')) {
            try {
                await db.sessions.clear()
                alert('הנתונים נמחקו בהצלחה')
                navigate('/')
            } catch (e) {
                console.error('Failed to clear data', e)
                alert('שגיאה במחיקת הנתונים')
            }
        }
    }

    return (
        <div className="pb-8 min-h-screen bg-black text-white">
            {/* Header */}
            <header className="flex items-center px-4 py-4 bg-[#121212] border-b border-[#282828] sticky top-0 z-10">
                <button
                    onClick={() => navigate('/')}
                    className="mr-4 text-subdued hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">הגדרות</h1>
            </header>

            <div className="p-4 space-y-6">
                {/* Profile Section */}
                <section>
                    <h2 className="text-sm font-bold text-subdued uppercase tracking-wider mb-3">פרופיל</h2>
                    <div className="bg-[#282828] rounded-lg overflow-hidden">
                        <div className="p-4 flex items-center gap-4 border-b border-[#3E3E3E]">
                            <div className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-bold text-xl">
                                Y
                            </div>
                            <div>
                                <h3 className="font-bold">משתמש אורח</h3>
                                <p className="text-xs text-subdued">תוכנית חינמית</p>
                            </div>
                        </div>
                        <button className="w-full p-4 text-right hover:bg-[#3E3E3E] transition-colors flex items-center justify-between">
                            <span className="flex items-center gap-3">
                                <User size={20} className="text-subdued" />
                                ערוך פרופיל
                            </span>
                        </button>
                    </div>
                </section>

                {/* App Settings */}
                <section>
                    <h2 className="text-sm font-bold text-subdued uppercase tracking-wider mb-3">אפליקציה</h2>
                    <div className="bg-[#282828] rounded-lg overflow-hidden">
                        <div className="p-4 flex items-center justify-between border-b border-[#3E3E3E]">
                            <div className="flex items-center gap-3">
                                <Moon size={20} className="text-subdued" />
                                <span>מצב כהה</span>
                            </div>
                            <div className="w-10 h-6 bg-[#1DB954] rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Volume2 size={20} className="text-subdued" />
                                <span>אפקטים קוליים</span>
                            </div>
                            <div className="w-10 h-6 bg-[#1DB954] rounded-full relative cursor-pointer">
                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section>
                    <h2 className="text-sm font-bold text-subdued uppercase tracking-wider mb-3">ניהול נתונים</h2>
                    <div className="bg-[#282828] rounded-lg overflow-hidden">
                        <button
                            className="w-full p-4 text-right hover:bg-[#3E3E3E] transition-colors flex items-center gap-3 text-white"
                            onClick={() => alert('לא ייושם עדיין')}
                        >
                            <Download size={20} className="text-subdued" />
                            ייצוא נתונים
                        </button>
                        <button
                            onClick={handleDeleteAllData}
                            className="w-full p-4 text-right hover:bg-[#3E3E3E] transition-colors flex items-center gap-3 text-[#E91429]"
                        >
                            <Trash2 size={20} />
                            מחק את כל הנתונים
                        </button>
                    </div>
                    <p className="text-xs text-subdued mt-2 px-1">
                        זהירות: מחיקת הנתונים היא פעולה בלתי הפיכה.
                    </p>
                </section>

                <section className="text-center pt-8 pb-4">
                    <p className="text-xs text-subdued font-mono">RapCap v0.5.0 (Alpha)</p>
                </section>
            </div>
        </div>
    )
}
