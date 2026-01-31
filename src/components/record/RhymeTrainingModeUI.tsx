import { Link2 } from 'lucide-react'

export default function RhymeTrainingModeUI() {
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#121212] rounded-3xl border border-white/5 mx-2 my-10">
            <div className="w-20 h-20 rounded-full bg-[#E91429]/20 flex items-center justify-center text-[#E91429] mb-6 animate-pulse">
                <Link2 size={40} />
            </div>
            <h2 className="text-2xl font-bold mb-2">אימון חרוזים</h2>
            <p className="text-subdued max-w-xs leading-relaxed">
                מצב זה נמצא כעת בפיתוח. בקרוב תוכל להתאמן על קבוצות חרוזים ספציפיות תוך כדי הקלטה!
            </p>
            <div className="mt-8 px-4 py-2 bg-[#282828] rounded-full text-xs font-mono text-subdued uppercase tracking-widest">
                Coming Soon
            </div>
        </div>
    )
}
