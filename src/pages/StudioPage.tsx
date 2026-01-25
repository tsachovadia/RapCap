import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Zap, Library, Search } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { BeatPlayer } from '../components/studio/BeatPlayer';

export default function StudioPage() {
  const navigate = useNavigate();
  const { isRecording, startSession, endSession, addMoment, currentSession, beatController } = useSession();

  // Default beat (User requested specific track)
  const [videoUrl, setVideoUrl] = useState('https://youtu.be/7dgSqJ95Q8k?si=txTVFkGlokdfRqXM');
  const [videoId, setVideoId] = useState('7dgSqJ95Q8k');

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);
    const id = extractVideoId(url);
    if (id) {
      setVideoId(id);
    }
  };

  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const handleToggleRecord = async () => {
    if (isRecording) {
      endSession();
    } else {
      // Show modal instead of starting immediately
      setShowPermissionModal(true);
    }
  };

  const handleConfirmRecording = async () => {
    // 1. Mobile Safari Hack: Wake up the player IMMEDIATELY on click
    beatController.warmup();

    setShowPermissionModal(false);
    await startSession(videoId);
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-950 p-6 driver-mode-safe overflow-hidden relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h1 className="text-2xl font-bold tracking-tighter text-gray-100">RAPCAP</h1>
        <button
          onClick={() => navigate('/library')}
          className="p-3 bg-gray-900 rounded-full active:scale-95 transition-transform"
        >
          <Library className="w-6 h-6 text-gray-400" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-20">

        {/* Beat Player Section */}
        <div className="w-full relative">
          {/* URL Input (Hidden when recording for focus) */}
          {!isRecording && (
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={videoUrl}
                onChange={handleUrlChange}
                placeholder="Paste YouTube Link..."
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-gray-300 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          )}

          {/* The Player */}
          <BeatPlayer
            videoId={videoId}
            onReady={beatController.setPlayer}
            onStateChange={beatController.handleStateChange}
            className={`w-full transition-all duration-500 ${isRecording ? 'opacity-80 scale-105 shadow-red-900/20 shadow-2xl' : 'opacity-100'}`}
          />
          {/* Debug Status Indicator */}
          <div className="text-center mt-2 text-xs font-mono text-gray-500">
            Engine Status: <span className={beatController.status === 'playing' ? 'text-green-500' : 'text-yellow-500'}>{beatController.status.toUpperCase()}</span>
            {beatController.error && <span className="text-red-500 block">{beatController.error}</span>}
          </div>

          {isRecording && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse shadow-lg flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              ON AIR
            </div>
          )}
        </div>

        {/* Controls Area */}
        <div className="flex flex-col items-center gap-6 mt-4">

          {/* Timer Display */}
          <div className={`text-6xl font-mono font-medium tracking-widest text-gray-100 transition-all ${isRecording ? 'scale-110' : ''}`}>
            {isRecording && currentSession
              ? formatTime(currentSession.recording.durationSeconds)
              : '0:00'
            }
          </div>

          {/* Dynamic Controls */}
          <div className="w-full max-w-xs flex flex-col gap-6">

            {/* Main Action Button (Record / Stop) */}
            <button
              onClick={handleToggleRecord}
              className={`
                    w-full aspect-square rounded-full flex items-center justify-center mx-auto
                    transition-all duration-300 shadow-xl relative overflow-hidden
                    ${isRecording
                  ? 'bg-red-500/20 border-4 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]'
                  : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700'
                }
                    `}
              style={{ width: '80px', height: '80px' }} // Fixed size for stability
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-red-500 fill-current z-10" />
              ) : (
                <Mic className="w-8 h-8 text-white z-10" />
              )}
              {/* Ripple effect could go here */}
            </button>

            {/* Moment Button (Only visible when recording) */}
            <button
              onClick={addMoment}
              disabled={!isRecording}
              className={`
                    w-full py-6 rounded-2xl font-bold text-xl tracking-wide flex items-center justify-center gap-2
                    transition-all duration-300 transform
                    ${isRecording
                  ? 'bg-yellow-400 text-black shadow-[0_0_30px_rgba(250,204,21,0.3)] translate-y-0 opacity-100'
                  : 'bg-gray-900 text-gray-600 translate-y-4 opacity-0 pointer-events-none' // Hide completely when not recording
                }
                    `}
            >
              <Zap className={`w-6 h-6 ${isRecording ? 'fill-black' : ''}`} />
              MOMENT
            </button>
          </div>
        </div>
      </div>

      {/* Permission Modal */}
      {showPermissionModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl transform transition-all scale-100 opacity-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-indigo-500/10 rounded-full">
                <Mic className="w-8 h-8 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Microphone Access</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  To record your session, we need permission to access your microphone.
                  <br /><br />
                  We'll start the beat automatically once you approve.
                </p>
              </div>

              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRecording}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
                >
                  Start & Allow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
