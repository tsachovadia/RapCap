import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Mic, MoreHorizontal } from 'lucide-react'
import type { RecordingMode } from '../../pages/RecordPage'

interface Props {
    mode: RecordingMode
    language: 'he' | 'en'
    onLanguageToggle: () => void
    onShowMicSetup: () => void
    permissionError: boolean
}

export default function RecordingHeader({ mode, language, onLanguageToggle, onShowMicSetup, permissionError }: Props) {
    const navigate = useNavigate()

    const getTitle = () => {
        if (mode === 'freestyle') return language === 'he' ? 'סטודיו פריסטייל' : 'Freestyle Studio'
        if (mode === 'thoughts') return language === 'he' ? 'תיעוד מחשבות' : 'Thought Journal'
        return 'Record'
    }

    return (
        <header className="flex-none z-40 flex items-center justify-between py-2 bg-[#121212] -mx-4 px-4 mb-2 border-b border-[#282828]">
            <div className="flex items-center gap-2">
                <button onClick={() => navigate('/')} className="hover:bg-white/10 p-2 rounded-full transition-colors">
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
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <h1 className="text-base font-bold tracking-tight">{getTitle()}</h1>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onShowMicSetup}
                    className={`p-2 rounded-full transition-colors hover:bg-white/10 ${permissionError ? 'text-red-500 animate-pulse' : ''}`}
                    title={language === 'he' ? 'הגדרת מיקרופון' : 'Microphone Setup'}
                >
                    <Mic size={24} />
                </button>
                <button onClick={() => navigate('/settings')} className="p-2 rounded-full transition-colors hover:bg-white/10">
                    <MoreHorizontal size={24} />
                </button>
            </div>
        </header>
    )
}
