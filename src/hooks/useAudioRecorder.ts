import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

export interface RecorderState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number; // seconds
    analyser?: AnalyserNode;
}

export function useAudioRecorder() {
    const { showToast } = useToast();
    const [permissionError, setPermissionError] = useState<Error | null>(null);

    const [recorderState, setRecorderState] = useState<RecorderState>({
        isRecording: false,
        isPaused: false,
        duration: 0,
    });

    // Audio Constraints State (Input)
    const [audioConstraints, setAudioConstraints] = useState<MediaTrackConstraints>(() => {
        try {
            const saved = localStorage.getItem('rapcap_audio_constraints');
            return saved ? JSON.parse(saved) : {
                echoCancellation: false,
                noiseSuppression: true,
                autoGainControl: true
            };
        } catch (e) {
            return {
                echoCancellation: false,
                noiseSuppression: true,
                autoGainControl: true
            };
        }
    });

    // NOTE: EQ and Compression removed from recording pipeline
    // These effects are now applied during playback in SessionPlayer

    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedOutputId, setSelectedOutputId] = useState<string>('');
    const [availableOutputDevices, setAvailableOutputDevices] = useState<MediaDeviceInfo[]>([]);

    // Prevent double-starts
    const [isInitializing, setIsInitializing] = useState(false);

    // Effects for persistence
    useEffect(() => {
        localStorage.setItem('rapcap_audio_constraints', JSON.stringify(audioConstraints));
    }, [audioConstraints]);

    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const startTimeRef = useRef<number>(0);
    const pausedTimeRef = useRef<number>(0);
    const pauseStartRef = useRef<number>(0);

    const audioContext = useRef<AudioContext | null>(null);
    const sourceNode = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserNode = useRef<AnalyserNode | null>(null);

    // Simplified audio graph - no EQ/compression during recording
    const gainNode = useRef<GainNode | null>(null);
    const destNode = useRef<MediaStreamAudioDestinationNode | null>(null);

    const streamRef = useRef<MediaStream | null>(null);
    // NOTE: We no longer cache processedStreamRef - fresh stream is obtained from destNode at record time

    const getDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAvailableDevices(devices.filter(d => d.kind === 'audioinput'));
            setAvailableOutputDevices(devices.filter(d => d.kind === 'audiooutput'));
        } catch (e) {
            console.warn("Failed to enumerate devices", e);
        }
    }, []);

    // NOTE: Effect settings now applied in playback, not during recording

    const initializeStream = useCallback(async (overrideConstraints?: MediaTrackConstraints) => {
        setPermissionError(null);
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }

            const currentConstraints = overrideConstraints || audioConstraints;
            let stream: MediaStream | null = null;

            if (selectedDeviceId) {
                try {
                    console.log("🎤 Requesting specific microphone...", `Device: ${selectedDeviceId}`);
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            deviceId: { exact: selectedDeviceId },
                            ...currentConstraints
                        }
                    });
                } catch (firstErr) {
                    console.warn("⚠️ Failed to get specific device, falling back to default...", firstErr);
                    // Fallback to default
                }
            }

            if (!stream) {
                try {
                    console.log("🎤 Requesting default microphone...");
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            ...currentConstraints,
                            deviceId: undefined
                        }
                    });
                    console.log("✅ Default microphone acquired");
                    // We don't reset selectedDeviceId here, maybe the user wants it but it's unavailable right now.
                    // But if it was successfully acquired as default, we might want to clear the ID if it was set but failed.
                    if (selectedDeviceId) setSelectedDeviceId('');
                } catch (secondErr) {
                    console.warn("⚠️ Failed default with constraints, trying absolute raw...", secondErr);
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                }
            }

            if (!stream) throw new Error("Could not initialize audio stream");

            streamRef.current = stream;
            console.log("✅ Microphone stream active");

            getDevices();

            if (!audioContext.current || audioContext.current.state === 'closed') {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContext.current.state === 'suspended') {
                await audioContext.current.resume();
            }

            const ctx = audioContext.current;

            // CRITICAL: Recreate ALL nodes if they don't exist OR belong to a different (closed) context
            const needsRebuild = !sourceNode.current || sourceNode.current.context !== ctx;

            if (needsRebuild) {
                console.log("🏗️ Building/Rebuilding Simplified Audio Graph...");

                // Cleanup old nodes if they exist (though context mismatch usually means they're dead)
                [sourceNode, gainNode, analyserNode, destNode].forEach(ref => {
                    if (ref.current) {
                        try { ref.current.disconnect(); } catch (e) { }
                        ref.current = null;
                    }
                });

                sourceNode.current = ctx.createMediaStreamSource(stream);

                // Simple gain node for monitoring level (no EQ/compression - that's now in playback)
                gainNode.current = ctx.createGain();
                gainNode.current.gain.value = 1.0;

                analyserNode.current = ctx.createAnalyser();
                analyserNode.current.fftSize = 256;

                destNode.current = ctx.createMediaStreamDestination();

                // Simplified Chain: Source → Gain → Analyser + Destination
                sourceNode.current.connect(gainNode.current);
                gainNode.current.connect(analyserNode.current);
                gainNode.current.connect(destNode.current);

                // Hidden destination node to keep context "alive" and clock ticking in all browsers
                const silentGain = ctx.createGain();
                silentGain.gain.value = 0;
                gainNode.current.connect(silentGain);
                silentGain.connect(ctx.destination);

                console.log("✅ Simplified Audio Graph Built (Source → Gain → Analyser/Dest)");
            } else {
                // Just update source if we are reusing nodes but have a new stream
                sourceNode.current?.disconnect();
                sourceNode.current = ctx.createMediaStreamSource(stream);
                sourceNode.current.connect(gainNode.current!);
                console.log("🎤 Stream updated on existing graph");
            }


            // NOTE: We intentionally do NOT cache destNode.stream in processedStreamRef
            // The cached stream was becoming stale/disconnected, causing silent recordings.
            // Instead, we grab a fresh stream directly from destNode at recording time.

            // Force state update to expose analyser
            setRecorderState(prev => ({ ...prev, analyser: analyserNode.current || undefined }));


        } catch (err) {
            console.error("❌ Error initializing stream:", err);

            // Diagnostic Logic
            let diagnosticMsg = "";
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                if (audioInputs.length === 0) {
                    diagnosticMsg = "No devices detected";
                } else {
                    diagnosticMsg = `${audioInputs.length} devices detected`;
                }
            } catch (e) {
                diagnosticMsg = "Enumerate failed";
            }

            // Wrap error with diagnostic
            const finalError = new Error(err instanceof Error ? err.message : String(err));
            (finalError as any).diagnostic = diagnosticMsg;
            setPermissionError(finalError);

            throw err;
        }
    }, [selectedDeviceId, getDevices, audioConstraints]);

    useEffect(() => {
        if ('setSinkId' in AudioContext.prototype && audioContext.current) {
            (audioContext.current as any).setSinkId?.(selectedOutputId).catch((err: any) => console.warn("Set Sink ID failed", err));
        }
    }, [selectedOutputId]);

    useEffect(() => {
        if (streamRef.current && !recorderState.isRecording) {
            initializeStream();
        }
    }, [selectedDeviceId, initializeStream]);

    const getSupportedMimeType = () => {
        // iOS Safari prefers MP4/AAC, doesn't support WebM well
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        const iOSTypes = ['audio/mp4', 'audio/aac', 'audio/webm'];
        const standardTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

        const typesToTry = isIOSDevice ? iOSTypes : standardTypes;

        for (const type of typesToTry) {
            if (MediaRecorder.isTypeSupported(type)) {
                console.log(`📦 Selected MIME type: ${type} (iOS: ${isIOSDevice})`);
                return type;
            }
        }
        console.warn('⚠️ No supported MIME type found');
        return '';
    };

    const startRecording = useCallback(async () => {
        if (recorderState.isRecording || isInitializing) {
            console.warn("⚠️ Start recording called while already active or initializing. Ignoring.")
            return
        }

        setIsInitializing(true)
        console.log("🎙️ Requesting Microphone Access...")

        try {
            if (!streamRef.current || !streamRef.current.active) await initializeStream();

            // CRITICAL FIX: Always get fresh stream from destination node
            // The processedStreamRef was getting stale between init and record
            let streamToRecord: MediaStream | null = null;

            if (destNode.current && destNode.current.stream && destNode.current.stream.active) {
                streamToRecord = destNode.current.stream;
                console.log("✅ Using fresh processed stream from destNode");
            } else if (streamRef.current && streamRef.current.active) {
                // Fallback to raw mic stream if processed stream unavailable
                console.warn("⚠️ destNode stream not available, falling back to raw mic stream");
                streamToRecord = streamRef.current;
            } else {
                throw new Error("No active audio stream available for recording");
            }

            // 1. Log Track Status with enhanced diagnostics
            console.log("✅ Microphone Stream Ready:", streamToRecord.id)
            streamToRecord.getTracks().forEach(track => {
                console.log(`   - Track: ${track.kind}, Label: "${track.label}", Enabled: ${track.enabled}, ReadyState: ${track.readyState}, Muted: ${track.muted}`)
            })

            // Log track settings for additional debugging
            const trackSettings = streamToRecord.getAudioTracks()[0]?.getSettings();
            if (trackSettings) {
                console.log("🔧 Track Settings:", JSON.stringify(trackSettings));
            }

            // 2. Ensure Context is Running
            if (audioContext.current?.state === 'suspended') {
                console.log("🔈 Resuming Audio Context before recording...")
                await audioContext.current.resume()
            }

            const options = getSupportedMimeType() ? { mimeType: getSupportedMimeType() } : undefined;
            const recorder = new MediaRecorder(streamToRecord, options);

            mediaRecorder.current = recorder;
            audioChunks.current = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            recorder.onstart = () => {
                console.log("🔴 MediaRecorder Started Event")
                setIsInitializing(false)
            }

            recorder.onerror = (e) => {
                console.error("❌ MediaRecorder Error:", e)
                setPermissionError(new Error("Recording error occurred"))
                setIsInitializing(false)
            }

            recorder.start();
            console.log("🔴 Recording started");

            startTimeRef.current = Date.now();
            pausedTimeRef.current = 0;
            pauseStartRef.current = 0;

            setRecorderState(prev => ({
                ...prev,
                isRecording: true,
                isPaused: false,
                duration: 0,
                analyser: analyserNode.current || undefined
            }));

            timerRef.current = window.setInterval(() => {
                const now = Date.now();
                const rawElapsed = now - startTimeRef.current - pausedTimeRef.current;
                setRecorderState(prev => ({ ...prev, duration: rawElapsed / 1000 }));
            }, 100);

        } catch (err) {
            console.error("❌ Failed to start recording:", err);
            showToast('שגיאה בהתחלת ההקלטה', 'error');
            setIsInitializing(false)
        }
    }, [initializeStream]);

    const stopRecording = useCallback((): Promise<Blob> => {
        return new Promise((resolve) => {
            // Always clear timer and reset state immediately
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            // We set recording false here, but we also rely on the onstop event for data
            // However, we must ensure UI state updates regardless of recorder health
            setRecorderState(prev => ({ ...prev, isRecording: false, isPaused: false }));

            if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
                mediaRecorder.current.onstop = () => {
                    const mimeType = mediaRecorder.current?.mimeType || 'audio/webm';
                    const audioBlob = new Blob(audioChunks.current, { type: mimeType });

                    console.log(`⏹️ Recording Stopped. Blob Size: ${audioBlob.size} bytes, Type: ${mimeType}`);
                    if (audioBlob.size < 1000) {
                        console.warn("⚠️ Warning: Created Blob is suspiciously small!");
                    }

                    resolve(audioBlob);
                };
                mediaRecorder.current.stop();
            } else {
                console.warn("Recorder already inactive or null during stop");
                resolve(new Blob([], { type: 'audio/webm' }));
            }
        });
    }, []);

    const togglePause = useCallback(() => {
        if (!mediaRecorder.current) return;
        if (recorderState.isPaused) {
            mediaRecorder.current.resume();
            const now = Date.now();
            pausedTimeRef.current += (now - pauseStartRef.current);
            timerRef.current = window.setInterval(() => {
                const currentNow = Date.now();
                const rawElapsed = currentNow - startTimeRef.current - pausedTimeRef.current;
                setRecorderState(prev => ({ ...prev, duration: rawElapsed / 1000 }));
            }, 100);
            setRecorderState(prev => ({ ...prev, isPaused: false }));
        } else {
            mediaRecorder.current.pause();
            pauseStartRef.current = Date.now();
            if (timerRef.current) clearInterval(timerRef.current);
            setRecorderState(prev => ({ ...prev, isPaused: true }));
        }
    }, [recorderState.isPaused]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (audioContext.current) {
                console.log("🚪 Closing AudioContext on cleanup");
                audioContext.current.close().catch(e => console.warn("Error closing AudioContext", e));
            }
        };
    }, []);

    const deviceLabel = streamRef.current?.getAudioTracks()[0]?.label || 'Default Mic';

    const updateAudioConstraints = useCallback((newConstraints: Partial<MediaTrackConstraints>) => {
        setAudioConstraints(prev => ({ ...prev, ...newConstraints }));
    }, []);

    const resetAudioState = useCallback(async () => {
        console.log("♻️ Resetting Audio State...");
        setPermissionError(null);
        setSelectedDeviceId('');

        // Stop current stream if exists
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }

        // Force a raw request to prompt permissions if blocked/missing
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            console.log("✅ Hard reset successful, stream acquired");
            getDevices();
            // Re-init audio graph
            initializeStream();
        } catch (err) {
            console.error("❌ Hard reset failed:", err);
            // Re-trigger error state logic via initializeStream
            initializeStream();
        }
    }, [initializeStream, getDevices]);

    return {
        initializeStream,
        permissionError,
        startRecording,
        stopRecording,
        togglePause,
        deviceLabel,
        availableDevices,
        selectedDeviceId,
        setDeviceId: setSelectedDeviceId,
        availableOutputDevices,
        selectedOutputId,
        setOutputId: setSelectedOutputId,
        getAudioInputDevices: getDevices,
        audioConstraints,
        setAudioConstraints: updateAudioConstraints,
        // NOTE: vocalEffects removed - effects now applied in playback
        audioAnalyser: analyserNode.current, // Expose
        resetAudioState, // New Function
        ...recorderState
    };
}
