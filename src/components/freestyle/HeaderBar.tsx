/**
 * HeaderBar - Freestyle page header with navigation and controls
 */
import { ArrowLeft, Mic, MoreHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface HeaderBarProps {
    language: 'he' | 'en'
    onLanguageToggle: () => void
    onMicSetup: () => void
    permissionError: Error | null
}

export function HeaderBar({
    language,
    onLanguageToggle,
    onMicSetup,
    permissionError
}: HeaderBarProps) {
    const navigate = useNavigate()

    return (
        <header className="flex-none z-40 flex items-center justify-between py-2 bg-[#121212] -mx-4 px-4 mb-2 border-b border-[#282828]">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/')} className="btn-icon">
                    <ArrowLeft size={24} className={language === 'he' ? '' : 'rotate-180'} />
                </button>
                <button
                    onClick={onLanguageToggle}
                    className="text-xl hover:scale-110 transition-transform"
                    title="Switch Language"
                >
                    {language === 'he' ? '🇮🇱' : '🇺🇸'}
                </button>
            </div>

            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h1 className="text-base font-bold">Live Studio</h1>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onMicSetup}
                    className={`btn-icon ${permissionError ? 'text-red-500 animate-pulse' : ''}`}
                    title={language === 'he' ? 'הגדרת מיקרופון' : 'Microphone Setup'}
                >
                    <Mic size={24} />
                </button>
                <button onClick={() => navigate('/settings')} className="btn-icon">
                    <MoreHorizontal size={24} />
                </button>
            </div>
        </header>
    )
}
