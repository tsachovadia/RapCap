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
            if (!streamRef.current || !streamRef.current.active) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                streamRef.current = stream;
            }
            // Audio Context setup can happen here too to be safe
            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new AudioContext();
            }
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }
        } catch (err) {
            console.error("Error initializing stream:", err);
            alert("Microphone access denied.");
            throw err;
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            // Ensure stream is ready (should be called after initializeStream ideally)
            let stream = streamRef.current;
            if (!stream || !stream.active) {
                await initializeStream();
                stream = streamRef.current;
            }

            if (!stream) return; // Should not happen

            // Connect Analyser if not connected
            if (!analyserNode.current) {
                // Ensure context exists
                if (!audioContext.current) audioContext.current = new AudioContext();
                analyserNode.current = audioContext.current.createAnalyser();
                analyserNode.current.fftSize = 256;
            }
            if (!sourceNode.current && stream) {
                sourceNode.current = audioContext.current!.createMediaStreamSource(stream);
                sourceNode.current.connect(analyserNode.current);
            }

            const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/mp4'
            });

            mediaRecorder.current = recorder;
            audioChunks.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            recorder.start(100);

            // Timer
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
            console.error("Error accessing microphone:", err);
            // Alert handled in initializeStream mostly, but if it fails here:
            alert("Could not start recording.");
        }
    }, [initializeStream]);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            if (mediaRecorder.current && recorderState.isRecording) {
                mediaRecorder.current.onstop = () => {
                    const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                    resolve(audioBlob);
                };
                mediaRecorder.current.stop();

                // NOTE: NOT stopping the stream tracks here anymore to keep permission alive!

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
    }, [recorderState.isRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Stop tracks only when leaving hook (component unmount)
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (audioContext.current) {
                audioContext.current.close();
                audioContext.current = null;
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [])

    const togglePause = useCallback(() => {
        if (mediaRecorder.current && recorderState.isRecording) {
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
        }
    }, [recorderState.isRecording, recorderState.isPaused]);

    return {
        initializeStream,
        startRecording,
        stopRecording,
        togglePause,
        ...recorderState
    };
}
