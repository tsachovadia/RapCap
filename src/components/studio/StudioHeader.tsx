import { ArrowRight, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../../contexts/StudioContext';
import type { StudioMode } from '../../types/studio';

const MODES: { key: StudioMode; label: string; short: string }[] = [
    { key: 'freestyle', label: 'פריסטייל', short: 'F' },
    { key: 'write', label: 'כתיבה', short: 'W' },
    { key: 'verse', label: 'בית', short: 'V' },
    { key: 'review', label: 'ביקורת', short: 'R' },
];

export default function StudioHeader() {
    const navigate = useNavigate();
    const { activeMode, setActiveMode, flowState, sessionTitle, setSessionTitle, language, setLanguage } = useStudio();

    const isRecording = flowState !== 'idle';

    return (
        <header className="h-12 flex items-center gap-2 px-3 bg-[#121212] border-b border-white/10 shrink-0">
            {/* Back button */}
            <button
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white shrink-0"
            >
                <ArrowRight size={18} />
            </button>

            {/* Title input */}
            <input
                type="text"
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                placeholder="שם הסשן..."
                dir="rtl"
                className="flex-1 min-w-0 bg-transparent text-sm font-medium text-white outline-none placeholder-white/30 truncate"
            />

            {/* Mode tabs — full labels on desktop, single letter on mobile */}
            <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-white/5 shrink-0">
                {MODES.map(({ key, label, short }) => {
                    const isActive = activeMode === key;
                    return (
                        <button
                            key={key}
                            onClick={() => setActiveMode(key)}
                            disabled={isRecording}
                            className={`
                                px-2 py-1 rounded-md text-xs font-medium transition-all
                                ${isActive
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/40 hover:text-white/60'
                                }
                                ${isRecording ? 'opacity-40 cursor-not-allowed' : ''}
                            `}
                        >
                            {/* Short on mobile, full on md+ */}
                            <span className="md:hidden">{short}</span>
                            <span className="hidden md:inline">{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Language toggle */}
            <button
                onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/40 hover:text-white shrink-0 text-xs font-bold"
                title={language === 'he' ? 'Switch to English' : 'עבור לעברית'}
            >
                <Globe size={16} />
            </button>
        </header>
    );
}
