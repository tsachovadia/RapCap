import { useParams, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import SessionPlayer from '../components/library/SessionPlayer'
import WritingSessionViewer from '../components/library/WritingSessionViewer'
import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'

export default function SessionDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    // UI State for player (kept local to page now)
    const [isPlaying, setIsPlaying] = useState(false)
    const [_isBuffering, setIsBuffering] = useState(false)

    // Fetch session
    const session = useLiveQuery(
        () => id ? db.sessions.get(parseInt(id, 10)) : undefined,
        [id]
    )

    if (!id) return <div className="p-8 text-center text-subdued">Invalid Session ID</div>
    if (!session) return <div className="p-8 text-center text-subdued">Loading session...</div>

    const handleClose = () => navigate('/library')

    // Branch: View for Writing Sessions
    if (session.type === 'writing') {
        return (
            <div className="flex flex-col h-[calc(100dvh-80px)] bg-[#121212] text-white">
                <div className="p-4 bg-[#121212] border-b border-[#282828] shrink-0 z-10">
                    <button
                        onClick={handleClose}
                        className="flex items-center gap-2 text-subdued hover:text-white transition-colors"
                    >
                        <ChevronLeft size={20} />
                        <span className="font-bold text-sm">Back to Library</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar px-4 pt-4">
                    <WritingSessionViewer session={session} onClose={handleClose} />
                </div>
            </div>
        )
    }

    // Default: View for Audio/Freestyle Sessions
    return (
        <div className="flex flex-col h-[calc(100dvh-80px)] bg-[#121212] text-white">
            {/* Header / Nav */}
            <div className="p-4 bg-[#121212] border-b border-[#282828] shrink-0 z-10">
                <button
                    onClick={handleClose}
                    className="flex items-center gap-2 text-subdued hover:text-white transition-colors"
                >
                    <ChevronLeft size={20} />
                    <span className="font-bold text-sm">Back to Library</span>
                </button>
            </div>

            {/* Main Content - Player */}
            <div className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
                <div className="max-w-screen-md mx-auto p-4 pb-8">
                    <SessionPlayer
                        session={session}
                        isPlaying={isPlaying}
                        onPlayPause={() => setIsPlaying(!isPlaying)}
                        onEnded={() => setIsPlaying(false)}
                        onLoadingChange={setIsBuffering}
                        onClose={handleClose}
                    />
                </div>
            </div>
        </div>
    )
}
