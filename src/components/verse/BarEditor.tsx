import { useRef, useState, useCallback, type KeyboardEvent } from 'react';
import type { VerseBar, VerseScheme } from '../../db/db';
import { getSchemeShades } from '../../utils/rhymeColors';
import SyllableChip from './SyllableChip';

interface BarEditorProps {
    bar: VerseBar;
    index: number;
    viewMode: 'text' | 'syllables';
    activeSchemeId: string | null;
    schemes: VerseScheme[];
    onTextChange: (text: string) => void;
    onSyllableTap: (barId: string, syllableIndex: number) => void;
    onSplit: (cursorPos: number) => void;
    onDelete: () => void;
    onFocus: () => void;
    isFocused: boolean;
}

interface SyllableSchemeInfo {
    color: string;
    positionInScheme: number;
}

export default function BarEditor({
    bar,
    index,
    viewMode,
    activeSchemeId,
    schemes,
    onTextChange,
    onSyllableTap,
    onSplit,
    onDelete,
    onFocus,
    isFocused,
}: BarEditorProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [localEditMode, setLocalEditMode] = useState(false);

    // Build a lookup: for this bar, which global syllable index → which scheme + position?
    const syllableSchemeMap = useCallback((): Map<number, SyllableSchemeInfo> => {
        const map = new Map<number, SyllableSchemeInfo>();
        for (const scheme of schemes) {
            for (const hit of scheme.hits) {
                if (hit.barId !== bar.id) continue;
                const hitLength = hit.endSyllable - hit.startSyllable + 1;
                const shades = getSchemeShades(scheme.color, hitLength);
                for (let si = hit.startSyllable; si <= hit.endSyllable; si++) {
                    const posInHit = si - hit.startSyllable;
                    map.set(si, {
                        color: shades[posInHit],
                        positionInScheme: posInHit,
                    });
                }
            }
        }
        return map;
    }, [schemes, bar.id])();

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const pos = inputRef.current?.selectionStart ?? bar.text.length;
            onSplit(pos);
        } else if (e.key === 'Backspace' && bar.text === '') {
            e.preventDefault();
            onDelete();
        }
    };

    const handleDoubleClick = () => {
        if (viewMode === 'syllables') {
            setLocalEditMode(true);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    };

    const handleBlur = () => {
        setLocalEditMode(false);
    };

    const showTextInput = viewMode === 'text' || localEditMode || bar.words.length === 0;

    // Flatten syllable count for global indexing
    let globalSylIdx = 0;

    return (
        <div
            className={`
                flex items-start gap-2 group min-h-[2rem]
                ${isFocused ? 'bg-white/5 rounded-lg' : ''}
            `}
            onClick={onFocus}
        >
            {/* Bar number */}
            <span className="text-xs text-white/20 w-5 shrink-0 pt-1.5 text-left font-mono select-none group-hover:text-white/40 transition-colors">
                {index + 1}
            </span>

            {/* Content area */}
            {showTextInput ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={bar.text}
                    onChange={(e) => onTextChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onFocus={onFocus}
                    dir="rtl"
                    placeholder={index === 0 ? 'התחל לכתוב...' : ''}
                    className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/20 py-1"
                />
            ) : (
                <div
                    className="flex-1 flex flex-wrap gap-y-1 items-center py-1"
                    dir="rtl"
                    onDoubleClick={handleDoubleClick}
                >
                    {bar.words.map((word, wi) => {
                        const wordStartIdx = globalSylIdx;
                        const chips = word.syllables.map((syl, si) => {
                            const idx = wordStartIdx + si;
                            const info = syllableSchemeMap.get(idx) || null;
                            return (
                                <SyllableChip
                                    key={`${bar.id}-${idx}`}
                                    syllable={syl}
                                    schemeInfo={info}
                                    isActiveScheme={!!activeSchemeId}
                                    isLastInWord={si === word.syllables.length - 1}
                                    onClick={() => onSyllableTap(bar.id, idx)}
                                />
                            );
                        });
                        globalSylIdx += word.syllables.length;
                        return (
                            <span key={`word-${wi}`} className="inline-flex items-center ml-2">
                                {chips}
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
