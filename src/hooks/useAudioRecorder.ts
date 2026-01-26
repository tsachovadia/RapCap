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

    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);
    const audioContext = useRef<AudioContext | null>(null);
    const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserNode = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Fetch devices
    const getAudioInputDevices = useCallback(async () => {
        try {
            // Must have permission first to see labels
            // We assume permission is requested on init, but we can try to enumerate anyway
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            setAvailableDevices(inputs);
            return inputs;
        } catch (e) {
            console.warn("Failed to enumerate devices", e);
            return [];
        }
    }, []);

    const initializeStream = useCallback(async () => {
        try {
            // Stop existing tracks if any
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            console.log("🎤 Requesting microphone access...", selectedDeviceId ? `Device: ${selectedDeviceId}` : 'Default');
            const constraints: MediaStreamConstraints = {
                audio: {
                    deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            console.log("✅ Microphone access granted");

            // Update available devices list after permission granted
            getAudioInputDevices();

            // Initialize AudioContext if needed (for visualizer)
            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }

            // Setup Visualizer (Analyser) immediately so it's ready even before recording
            if (!analyserNode.current && audioContext.current) {
                analyserNode.current = audioContext.current.createAnalyser();
                analyserNode.current.fftSize = 256;
                sourceNode.current = audioContext.current.createMediaStreamSource(stream);
                sourceNode.current.connect(analyserNode.current);
            } else if (audioContext.current && sourceNode.current && analyserNode.current) {
                // Re-connect new stream to existing analyser
                // Disconnect old source is tricky, easier to just recreate source
                sourceNode.current.disconnect();
                sourceNode.current = audioContext.current.createMediaStreamSource(stream);
                sourceNode.current.connect(analyserNode.current);
            }

        } catch (err) {
            console.error("❌ Error initializing stream:", err);
            alert("לא ניתן לגשת למיקרופון/התקן נבחר. אנא בדוק הרשאות או בחר התקן אחר.");
            throw err;
        }
    }, [selectedDeviceId, getAudioInputDevices]);

    // Re-init stream if device changes
    useEffect(() => {
        // Only auto-reinit if we already had a stream running or explicitly requested
        if (streamRef.current) {
            initializeStream();
        }
    }, [selectedDeviceId, initializeStream]);

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
                return type;
            }
        }
        return '';
    };

    const startRecording = useCallback(async () => {
        try {
            // Ensure stream is ready and active
            if (!streamRef.current || !streamRef.current.active) {
                await initializeStream();
            }

            const stream = streamRef.current;
            if (!stream) throw new Error("No active stream");

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

            recorder.start(100);
            console.log("🔴 Recording started");

            setRecorderState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                duration: 0,
                analyser: analyserNode.current || undefined // Ensure analyser is passed
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
                    resolve(audioBlob);
                };
                mediaRecorder.current.stop();

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

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (audioContext.current) audioContext.current.close();
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

    // Device Label (reactive)
    const deviceLabel = streamRef.current?.getAudioTracks()[0]?.label || 'Default Mic';

    return {
        initializeStream,
        startRecording,
        stopRecording,
        togglePause,
        deviceLabel,
        availableDevices,
        selectedDeviceId,
        setDeviceId: setSelectedDeviceId,
        getAudioInputDevices,
        ...recorderState
    };
}
