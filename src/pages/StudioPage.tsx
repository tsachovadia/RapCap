import { StudioProvider, useStudio } from '../contexts/StudioContext';
import StudioHeader from '../components/studio/StudioHeader';
import StudioBeatBar from '../components/studio/StudioBeatBar';
import StudioLayout from '../components/studio/StudioLayout';
import FreestyleCenter from '../components/studio/FreestyleCenter';
import FreestyleTools from '../components/studio/FreestyleTools';
import RecordingFooter from '../components/studio/RecordingFooter';
import RhymePanel from '../components/verse/RhymePanel';

function StudioInner() {
    const { activeMode, bars } = useStudio();

    // Dummy verse for RhymePanel (it expects a Verse prop)
    const dummyVerse = {
        title: '',
        bars: bars.map(b => ({ id: b.id, text: b.text, words: [] })),
        schemes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const renderCenter = () => {
        switch (activeMode) {
            case 'freestyle':
                return <FreestyleCenter />;
            case 'write':
                return (
                    <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                        מצב כתיבה — בקרוב
                    </div>
                );
            case 'verse':
                return (
                    <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                        מצב בית — בקרוב
                    </div>
                );
            case 'review':
                return (
                    <div className="flex-1 flex items-center justify-center text-white/20 text-sm">
                        מצב ביקורת — בקרוב
                    </div>
                );
        }
    };

    const renderRightPanel = () => {
        switch (activeMode) {
            case 'freestyle':
                return <FreestyleTools />;
            default:
                return null;
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#121212] text-white overflow-hidden">
            <StudioHeader />
            <StudioBeatBar />
            <StudioLayout
                leftPanel={
                    <RhymePanel
                        activeScheme={null}
                        verse={dummyVerse}
                        onInsertWord={() => {}}
                    />
                }
                center={renderCenter()}
                rightPanel={renderRightPanel()}
                footer={<RecordingFooter />}
            />
        </div>
    );
}

export default function StudioPage() {
    return (
        <StudioProvider>
            <StudioInner />
        </StudioProvider>
    );
}
