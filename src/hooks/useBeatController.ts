import { useState, useRef, useCallback } from 'react';
import type { YouTubePlayer } from 'react-youtube';

export type BeatPlayerState = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'buffering' | 'error';

export const useBeatController = () => {
    const playerRef = useRef<YouTubePlayer | null>(null);
    const [status, setStatus] = useState<BeatPlayerState>('idle');
    // const [duration, setDuration] = useState(0); // Reserved for future use
    const [error, setError] = useState<string | null>(null);

    // Determines if the player is technically "playing" (even if buffering)
    // const isPlaying = status === 'playing' || status === 'buffering'; // Reserved for future use

    const setPlayer = useCallback((player: YouTubePlayer) => {
        playerRef.current = player;
        setStatus('ready');
    }, []);

    const loadBeat = useCallback((videoId: string, startSeconds = 0) => {
        if (!playerRef.current) return;
        setStatus('loading');
        // 'loadVideoById' automatically starts playing, so we might want 'cueVideoById' if we don't want auto-play?
        // But for our "Handshake", we usually want to load and then wait.
        // YouTube API: loadVideoById loads and plays. cueVideoById loads and pauses (thumb).
        // Let's use cue first, or stick to load if we are about to play.
        // For robustness, let's just load.
        playerRef.current.loadVideoById({ videoId, startSeconds });
    }, []);

    const play = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.playVideo();
        }
    }, []);

    const pause = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.pauseVideo();
        }
    }, []);

    const seek = useCallback((seconds: number) => {
        if (playerRef.current) {
            playerRef.current.seekTo(seconds, true);
        }
    }, []);

    const getCurrentTime = useCallback(() => {
        return playerRef.current?.getCurrentTime() || 0;
    }, []);

    // Handle events from the YouTube Component
    const handleStateChange = useCallback((event: { data: number }) => {
        // YouTube Player States:
        // -1 (unstarted)
        // 0 (ended)
        // 1 (playing)
        // 2 (paused)
        // 3 (buffering)
        // 5 (video cued)

        switch (event.data) {
            case -1:
                setStatus('idle');
                break;
            case 0:
                setStatus('paused'); // or ended
                break;
            case 1:
                setStatus('playing');
                break;
            case 2:
                setStatus('paused');
                break;
            case 3:
                setStatus('buffering');
                break;
            case 5:
                setStatus('ready');
                break;
            default:
                break;
        }
    }, []);

    const handleError = useCallback((event: any) => {
        console.error("YouTube Player Error:", event.data);
        setError("Failed to load beat");
        setStatus('error');
    }, []);

    // Helper for Mobile Safari: MUST be called during a direct user interaction event.
    // It "unlocks" the audio context by playing muted for a brief moment.
    const warmup = useCallback(() => {
        if (playerRef.current) {
            console.log("Warming up player for mobile...");
            playerRef.current.mute(); // Mute to avoid noise
            playerRef.current.playVideo();
            // We don't pause immediately here; we let it play until specific logic stops it or un-mutes it.
            // Or we pause after 100ms.
            // For now, let's just leave it playing muted, logic will restart it anyway? 
            // Better: Play, wait 100ms, Pause.
            setTimeout(() => {
                // Ideally we let it play, but startSession will reset it.
                // If we pause, we might lose the "active" status? 
                // YouTube IFrame API usually keeps the blessing if touched once.
                // Let's TRY leaving it playing muted.
            }, 100);
        }
    }, []);

    const unmute = useCallback(() => {
        if (playerRef.current) playerRef.current.unMute();
    }, []);

    return {
        playerRef,
        status,
        setPlayer,
        loadBeat,
        play,
        pause,
        seek,
        getCurrentTime,
        handleStateChange,
        handleError,
        warmup,
        unmute,
        error
    };
};
