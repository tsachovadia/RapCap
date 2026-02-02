import { useState, useRef, useCallback, useEffect } from 'react';

export interface PlaybackEffects {
    enabled: boolean;
    eqLow: number;    // dB (-12 to +12)
    eqMid: number;    // dB (-12 to +12) 
    eqHigh: number;   // dB (-12 to +12)
    compressor: number; // 0-100 (controls threshold)
    gain: number;     // 0.5 to 5.0 (up to 500% boost)
}

const DEFAULT_EFFECTS: PlaybackEffects = {
    enabled: true,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    compressor: 50, // Default to moderate compression
    gain: 1.0
};

/**
 * Hook for applying real-time audio effects during playback
 * Creates an AudioContext and processing chain that processes the audio element output
 */
export function usePlaybackEffects(audioElement: HTMLAudioElement | null) {
    const [effects, setEffects] = useState<PlaybackEffects>(() => {
        try {
            const saved = localStorage.getItem('rapcap_playback_effects');
            return saved ? { ...DEFAULT_EFFECTS, ...JSON.parse(saved) } : DEFAULT_EFFECTS;
        } catch {
            return DEFAULT_EFFECTS;
        }
    });

    // Audio nodes
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const eqLowRef = useRef<BiquadFilterNode | null>(null);
    const eqMidRef = useRef<BiquadFilterNode | null>(null);
    const eqHighRef = useRef<BiquadFilterNode | null>(null);
    const compressorRef = useRef<DynamicsCompressorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const isConnectedRef = useRef(false);

    // Persist effects settings
    useEffect(() => {
        localStorage.setItem('rapcap_playback_effects', JSON.stringify(effects));
    }, [effects]);

    // Connect audio element to effects chain
    const connect = useCallback(() => {
        if (!audioElement || isConnectedRef.current) return;

        try {
            // Create or resume audio context
            if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;

            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            // Create source from audio element (can only be created once per element)
            if (!sourceNodeRef.current) {
                sourceNodeRef.current = ctx.createMediaElementSource(audioElement);
            }

            // Create EQ nodes
            eqLowRef.current = ctx.createBiquadFilter();
            eqLowRef.current.type = 'lowshelf';
            eqLowRef.current.frequency.value = 200;

            eqMidRef.current = ctx.createBiquadFilter();
            eqMidRef.current.type = 'peaking';
            eqMidRef.current.frequency.value = 1000;
            eqMidRef.current.Q.value = 1;

            eqHighRef.current = ctx.createBiquadFilter();
            eqHighRef.current.type = 'highshelf';
            eqHighRef.current.frequency.value = 3000;

            // Create compressor
            compressorRef.current = ctx.createDynamicsCompressor();
            compressorRef.current.knee.value = 30;
            compressorRef.current.attack.value = 0.003;
            compressorRef.current.release.value = 0.25;

            // Create gain node
            gainNodeRef.current = ctx.createGain();

            // Build chain: Source → EQ Low → EQ Mid → EQ High → Compressor → Gain → Destination
            sourceNodeRef.current.connect(eqLowRef.current);
            eqLowRef.current.connect(eqMidRef.current);
            eqMidRef.current.connect(eqHighRef.current);
            eqHighRef.current.connect(compressorRef.current);
            compressorRef.current.connect(gainNodeRef.current);
            gainNodeRef.current.connect(ctx.destination);

            isConnectedRef.current = true;
            console.log('✅ Playback effects chain connected');

            // Apply current effect values
            applyEffects(effects);

        } catch (err) {
            console.error('❌ Failed to connect playback effects:', err);
        }
    }, [audioElement, effects]);

    // Apply effects to nodes
    const applyEffects = useCallback((fx: PlaybackEffects) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const now = ctx.currentTime;

        // EQ
        if (eqLowRef.current) {
            eqLowRef.current.gain.setTargetAtTime(fx.enabled ? fx.eqLow : 0, now, 0.05);
        }
        if (eqMidRef.current) {
            eqMidRef.current.gain.setTargetAtTime(fx.enabled ? fx.eqMid : 0, now, 0.05);
        }
        if (eqHighRef.current) {
            eqHighRef.current.gain.setTargetAtTime(fx.enabled ? fx.eqHigh : 0, now, 0.05);
        }

        // Compressor
        if (compressorRef.current) {
            // Map compressor 0-100 to threshold -50 to 0 dB
            const threshold = fx.enabled ? -50 + (fx.compressor * 0.5) : 0;
            const ratio = fx.enabled ? 4 + (fx.compressor * 0.08) : 1; // 4:1 to 12:1
            compressorRef.current.threshold.setTargetAtTime(threshold, now, 0.05);
            compressorRef.current.ratio.setTargetAtTime(ratio, now, 0.05);
        }

        // Gain
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(fx.enabled ? fx.gain : 1.0, now, 0.05);
        }
    }, []);

    // Apply effects when they change
    useEffect(() => {
        if (isConnectedRef.current) {
            applyEffects(effects);
        }
    }, [effects, applyEffects]);

    // Disconnect and cleanup
    const disconnect = useCallback(() => {
        try {
            sourceNodeRef.current?.disconnect();
            eqLowRef.current?.disconnect();
            eqMidRef.current?.disconnect();
            eqHighRef.current?.disconnect();
            compressorRef.current?.disconnect();
            gainNodeRef.current?.disconnect();

            // Don't close the context as the source node can't be recreated
            isConnectedRef.current = false;
            console.log('🔌 Playback effects disconnected');
        } catch (err) {
            console.error('Error disconnecting effects:', err);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [disconnect]);

    // Helper functions for updating individual effects
    const updateEffect = useCallback(<K extends keyof PlaybackEffects>(key: K, value: PlaybackEffects[K]) => {
        setEffects(prev => ({ ...prev, [key]: value, enabled: true }));
    }, []);

    const toggleEnabled = useCallback(() => {
        setEffects(prev => ({ ...prev, enabled: !prev.enabled }));
    }, []);

    const resetEffects = useCallback(() => {
        setEffects(DEFAULT_EFFECTS);
    }, []);

    return {
        effects,
        setEffects,
        updateEffect,
        toggleEnabled,
        resetEffects,
        connect,
        disconnect,
        isConnected: isConnectedRef.current,
        DEFAULT_EFFECTS
    };
}
