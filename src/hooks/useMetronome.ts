import { useState, useEffect, useRef, useCallback } from 'react';

export function useMetronome(initialBpm: number = 90) {
    const [bpm, setBpm] = useState(initialBpm);
    const [isPlaying, setIsPlaying] = useState(false);

    // Web Audio API refs
    const audioContext = useRef<AudioContext | null>(null);
    const nextNoteTime = useRef<number>(0);
    const timerID = useRef<number | null>(null);
    const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
    const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

    // Tick sound synthesizer
    const playClick = useCallback((time: number) => {
        if (!audioContext.current) return;

        const osc = audioContext.current.createOscillator();
        const envelope = audioContext.current.createGain();

        osc.frequency.value = 1000;
        envelope.gain.value = 1;

        // Short, sharp click
        envelope.gain.exponentialRampToValueAtTime(1, time + 0.001);
        envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(envelope);
        envelope.connect(audioContext.current.destination);

        osc.start(time);
        osc.stop(time + 0.05);
    }, []);

    const scheduler = useCallback(() => {
        if (!audioContext.current) return;

        // while there are notes that will need to play before the next interval, 
        // schedule them and advance the pointer.
        while (nextNoteTime.current < audioContext.current.currentTime + scheduleAheadTime) {
            playClick(nextNoteTime.current);
            // Add a quarter note length to time
            const secondsPerBeat = 60.0 / bpm;
            nextNoteTime.current += secondsPerBeat;
        }

        if (isPlaying) {
            timerID.current = window.setTimeout(scheduler, lookahead);
        }
    }, [bpm, isPlaying, playClick]);

    useEffect(() => {
        if (isPlaying) {
            if (!audioContext.current) {
                audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContext.current.state === 'suspended') {
                audioContext.current.resume();
            }

            nextNoteTime.current = audioContext.current.currentTime + 0.05;
            scheduler();
        } else {
            if (timerID.current) window.clearTimeout(timerID.current);
        }

        return () => {
            if (timerID.current) window.clearTimeout(timerID.current);
        };
    }, [isPlaying, scheduler]);

    return {
        bpm,
        setBpm,
        isPlaying,
        setIsPlaying
    };
}
