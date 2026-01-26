import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecorderState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number; // seconds
    analyser?: AnalyserNode;
}

export function useAudioRecorder() {
    const [recorderState, setRecorderState] = useState<RecorderState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
    });

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserNode = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const initializeStream = useCallback(async () => {
        try {
            // Check if stream is already active and valid
            if (streamRef.current && streamRef.current.active) {
                return;
            }

            console.log("🎤 Requesting microphone access...");
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            streamRef.current = stream;
            console.log("✅ Microphone access granted");

            // Initialize AudioContext if needed (for visualizer)
            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }

        } catch (err) {
            console.error("❌ Error initializing stream:", err);
            alert("לא ניתן לגשת למיקרופון. אנא וודא שאישרת גישה בהגדרות הדפדפן.");
            throw err;
        }
    }, []);

    const getSupportedMimeType = () => {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/mp4',
            'audio/aac',
            'audio/ogg;codecs=opus'
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log(`Using MIME type: ${type}`);
                return type;
            }
        }
        console.warn("No specific MIME type supported, using default.");
        return ''; // Let browser choose default
    };

    const startRecording = useCallback(async () => {
        try {
            // Ensure stream is ready
            if (!streamRef.current || !streamRef.current.active) {
                await initializeStream();
            }

            const stream = streamRef.current;
            if (!stream) throw new Error("No active stream");

            // Setup Visualizer (Analyser)
            if (!analyserNode.current && audioContext.current) {
                analyserNode.current = audioContext.current.createAnalyser();
                analyserNode.current.fftSize = 256;
                // re-connect source
                sourceNode.current = audioContext.current.createMediaStreamSource(stream);
                sourceNode.current.connect(analyserNode.current);
            }

            // Create MediaRecorder
            const options = getSupportedMimeType() ? { mimeType: getSupportedMimeType() } : undefined;
            const recorder = new MediaRecorder(stream, options);

            mediaRecorder.current = recorder;
            audioChunks.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            recorder.start(100); // Collect 100ms chunks
            console.log("🔴 Recording started");

            // Start Timer
            setRecorderState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                duration: 0,
                analyser: analyserNode.current || undefined
            }));

            timerRef.current = window.setInterval(() => {
                setRecorderState(prev => ({ ...prev, duration: prev.duration + 1 }));
            }, 1000);

        } catch (err) {
            console.error("❌ Failed to start recording:", err);
            alert("שגיאה בהתחלת ההקלטה");
        }
    }, [initializeStream]);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                mediaRecorder.current.onstop = () => {
                    const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks.current, { type: mimeType });
                    console.log(`✅ Recording stopped. Blob size: ${audioBlob.size}, Type: ${mimeType}`);
                    resolve(audioBlob);
                };
                mediaRecorder.current.stop();

                // Clear Timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }

                setRecorderState(prev => ({ ...prev, isRecording: false, isPaused: false }));
            } else {
                resolve(new Blob());
            }
        });
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioContext.current) {
                audioContext.current.close();
            }
        };
    }, []);

    const togglePause = useCallback(() => {
        if (!mediaRecorder.current) return;

        if (recorderState.isPaused) {
            mediaRecorder.current.resume();
            timerRef.current = window.setInterval(() => {
                setRecorderState(prev => ({ ...prev, duration: prev.duration + 1 }));
            }, 1000);
            setRecorderState(prev => ({ ...prev, isPaused: false }));
        } else {
            mediaRecorder.current.pause();
            if (timerRef.current) clearInterval(timerRef.current);
            setRecorderState(prev => ({ ...prev, isPaused: true }));
        }
    }, [recorderState.isPaused]);

    return {
        initializeStream,
        startRecording,
        stopRecording,
        togglePause,
        ...recorderState
    };
}
