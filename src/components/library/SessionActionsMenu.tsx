import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Sparkles, Download, Copy, Trash2, X } from 'lucide-react'

interface SessionActionsMenuProps {
    onTranscribe: () => void
    onDownload: () => void
    onCopyLyrics: () => void
    onDelete: () => void
    isTranscribing?: boolean
    hasLyrics?: boolean
    hasBlob?: boolean
    disabled?: boolean
}

export default function SessionActionsMenu({
    onTranscribe,
    onDownload,
    onCopyLyrics,
    onDelete,
    isTranscribing = false,
    hasLyrics = false,
    hasBlob = false,
    disabled = false
}: SessionActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                className="btn-icon w-8 h-8 hover:bg-white/10 rounded-full transition-colors"
                disabled={disabled}
            >
                {isOpen ? <X size={18} /> : <MoreVertical size={18} />}
            </button>

            {isOpen && (
                <div
                    className="absolute left-0 top-full mt-1 bg-[#282828] rounded-lg shadow-xl border border-[#383838] py-1 min-w-[160px] z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Transcribe */}
                    <button
                        onClick={() => {
                            onTranscribe()
                            setIsOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right hover:bg-white/10 transition-colors disabled:opacity-50"
                        disabled={isTranscribing}
                        dir="rtl"
                    >
                        <Sparkles size={16} className="text-yellow-400" />
                        <span>{isTranscribing ? 'מתמלל...' : 'שפר תמלול'}</span>
                    </button>

                    {/* Download */}
                    {hasBlob && (
                        <button
                            onClick={() => {
                                onDownload()
                                setIsOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right hover:bg-white/10 transition-colors"
                            dir="rtl"
                        >
                            <Download size={16} className="text-[#1DB954]" />
                            <span>הורד MP3</span>
                        </button>
                    )}

                    {/* Copy Lyrics */}
                    {hasLyrics && (
                        <button
                            onClick={() => {
                                onCopyLyrics()
                                setIsOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right hover:bg-white/10 transition-colors"
                            dir="rtl"
                        >
                            <Copy size={16} className="text-blue-400" />
                            <span>העתק מילים</span>
                        </button>
                    )}

                    {/* Divider */}
                    <div className="h-px bg-[#383838] my-1" />

                    {/* Delete */}
                    <button
                        onClick={() => {
                            onDelete()
                            setIsOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right hover:bg-red-500/20 text-red-400 transition-colors"
                        dir="rtl"
                    >
                        <Trash2 size={16} />
                        <span>מחק</span>
                    </button>
                </div>
            )}
        </div>
    )
}
