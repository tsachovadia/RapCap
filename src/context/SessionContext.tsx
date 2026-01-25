import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useBeatController } from '../hooks/useBeatController';
import type { Session } from '../types';

interface SessionContextType {
    isRecording: boolean;
    currentSession: Session | null;
    startSession: (videoId: string) => Promise<void>;
    endSession: () => void;
    addMoment: () => void;
    error: string | null;
    audioBlob: Blob | null;
    setVideoPlayerRef?: never; // Deprecated
    videoPlayerRef?: never; // Deprecated
    beatController: ReturnType<typeof useBeatController>; // Updated SessionContextType
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
    const { isRecording, startRecording, stopRecording, audioBlob, error: micError } = useAudioRecorder();
    const beatController = useBeatController(); // New Hook

    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [startTime, setStartTime] = useState<number>(0);
    // Removed videoPlayerRef and setVideoPlayerRef as they are replaced by beatController

    const startSession = useCallback(async (videoId: string) => {
        // NEW HANDSHAKE LOGIC:
        // 1. Prepare Beat
        // 2. Start Recording
        // 3. Play Beat
        // 4. Measure Latency

        // Initialize new session structure
        // Note: We might update 'beatContext.playStartOffset' later once actual play starts?
        // Ideally we want to capture the video time exactly when the "PLAYING" event fires?
        // For now, let's assume we start from current position or 0.

        const initialVideoTime = beatController.getCurrentTime();

        // 1. Prepare/Cue if needed (assuming user already loaded it in Studio, but let's be safe)
        // If the player is not ready, we might fail. 
        if (beatController.status === 'idle' || beatController.status === 'error') {
            console.error("BeatController not ready");
            return;
        }

        try {
            console.log("[Handshake] 1. Requesting Mic...");
            // 2. Start Mic (Permissions assumed to be granted by Modal)
            await startRecording();
            const recordingStartTimestamp = performance.now(); // T1
            console.log("[Handshake] 2. Mic Started at", recordingStartTimestamp);

            // 3. Play Beat
            console.log("[Handshake] 3. Playing Beat...");
            // Unmute just in case it was muted by warmup
            beatController.unmute();
            beatController.seek(initialVideoTime); // Ensure we start fresh
            beatController.play();

            // We use the current video time as the anchor. 
            // Ideally, we should listen for the 'playing' transition to mark the EXACT video time.
            // But 'play()' is async fire-and-forget.
            // Simplified MVP: We just record the offset we REQUESTED or currently see.

            // Create Session Object
            const newSession: Session = {
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                beatContext: {
                    provider: 'youtube',
                    videoId: videoId,
                    videoTitle: beatController.playerRef.current?.getVideoData?.()?.title || 'Unknown Beat',
                    playStartOffset: initialVideoTime,
                },
                recording: {
                    durationSeconds: 0,
                    // Store the synchronization timestamp (not full implementation yet, but placeholder)
                    userLoopbackLatencyMs: 0
                },
                moments: [],
                events: []
            };

            setCurrentSession(newSession);
            setStartTime(Date.now()); // Visual timer start
            console.log("[Handshake] 4. Session Started");

        } catch (e) {
            console.error("Failed to start session handshake:", e);
            setCurrentSession(null);
        }
    }, [startRecording, beatController]);


    // Timer Effect
    useEffect(() => {
        let interval: number;
        if (isRecording && startTime > 0) {
            const updateTimer = () => {
                const now = Date.now();
                const duration = (now - startTime) / 1000;
                setCurrentSession(prev => prev ? {
                    ...prev,
                    recording: { ...prev.recording, durationSeconds: duration }
                } : null);
            };

            updateTimer();
            interval = window.setInterval(updateTimer, 100);
        }
        return () => clearInterval(interval);
    }, [isRecording, startTime]);

    // Save Session Effect: Triggers when recording stops and blob is ready
    useEffect(() => {
        const saveToDb = async () => {
            if (!isRecording && audioBlob && currentSession && startTime > 0) {
                // Create final session object with the blob content
                // Note: We store the Blob directly in IDB, we don't need a URL for storage
                // We'll generate the URL when reading back.
                // However, our Session type asks for localBlobUrl which is temporary.
                // Let's adjust the type later to allow Blob or create a transient property.
                // For now, let's just save the session and assume we handle the blob separately 
                // OR update the Session type to include optional 'blob'.

                // Actually, let's create a Blob URL for immediate testing, but storage should really be the Blob.
                // Let's cast for now to get it working, but we need to update types.ts to support Blob storage properly.

                const finalSession = {
                    ...currentSession,
                    recording: {
                        ...currentSession.recording,
                        // We are hacking the type here briefly to store the blob in the DB
                        // In a real app we might separate metadata from binary data, but IDB handles both fine.
                        // We'll store the blob in a custom field or just assume the 'localBlobUrl' is used for display.
                        blob: audioBlob
                    }
                };

                try {
                    // dynamic import to avoid circular dependency issues if any, though likely not needed here
                    const { saveSession } = await import('../services/db');
                    await saveSession(finalSession as any); // Cast as any because we added 'blob'
                    console.log("Session Saved to DB:", finalSession.id);
                } catch (err) {
                    console.error("Failed to save session:", err);
                }
            }
        };
        saveToDb();
    }, [isRecording, audioBlob, currentSession, startTime]);

    const endSession = useCallback(() => {
        stopRecording();
        beatController.pause(); // Explicitly pause beat
    }, [stopRecording, beatController]);

    // Expose error to UI
    useEffect(() => {
        if (micError) {
            alert(`Microphone Error: ${micError}\nMake sure you are using HTTPS or Localhost.`);
        }
    }, [micError]);

    const addMoment = useCallback(() => {
        if (!isRecording) return;

        const now = Date.now();
        const relativeTime = (now - startTime) / 1000; // Seconds

        setCurrentSession(prev => {
            if (!prev) return null;
            return {
                ...prev,
                moments: [...prev.moments, relativeTime]
            };
        });

        // Haptic feedback if available
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }, [isRecording, startTime]);

    return (
        <SessionContext.Provider value={{
            isRecording,
            currentSession,
            startSession,
            endSession,
            addMoment,
            error: micError || beatController.error, // Updated error to include beatController's error
            audioBlob,
            // Expose the controller to the UI for binding
            beatController
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};
