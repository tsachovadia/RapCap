import type { VerseSyllable } from '../../db/db';

interface SchemeInfo {
    color: string;        // the shade for this specific position
    positionInScheme: number;
}

interface SyllableChipProps {
    syllable: VerseSyllable;
    schemeInfo: SchemeInfo | null;
    isActiveScheme: boolean;
    isLastInWord: boolean;
    onClick: () => void;
}

export default function SyllableChip({
    syllable,
    schemeInfo,

    isLastInWord,
    onClick,
}: SyllableChipProps) {
    const bgColor = schemeInfo ? schemeInfo.color : '#252525';
    const isColored = !!schemeInfo;

    return (
        <span className="inline-flex items-center">
            <button
                type="button"
                onClick={onClick}
                className={`
                    px-1.5 py-0.5 rounded-md text-sm leading-tight cursor-pointer
                    transition-all duration-150 hover:brightness-110 active:scale-95
                    ${isColored ? 'text-white font-medium shadow-sm' : 'text-white/80'}
                `}
                style={{ backgroundColor: bgColor }}
                title={syllable.vowel ? `${syllable.vowel} — ${syllable.onset}${syllable.vowel}${syllable.coda}` : undefined}
            >
                {syllable.text}
            </button>
            {!isLastInWord && (
                <span className="text-white/30 text-xs select-none">-</span>
            )}
        </span>
    );
}
