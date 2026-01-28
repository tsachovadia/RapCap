import { useRef, useEffect } from 'react';
import YouTube, { type YouTubeProps } from 'react-youtube';

interface BeatPlayerProps {
    videoId: string;
    isPlaying: boolean;
    onReady?: (player: any) => void;
    onStateChange?: (event: any) => void;
    volume: number; // 0-100
}

export default function BeatPlayer({ videoId, isPlaying, onReady, onStateChange, volume }: BeatPlayerProps) {
    const playerRef = useRef<any>(null);

    const opts: YouTubeProps['opts'] = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
            controls: 1, // Show controls (User req)
            disablekb: 0, // Enable KB shortcuts for better control
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
            rel: 0, // Don't show related videos on pause
        },
    };

    // We still keep the effect for declarative updates, but direct calls are better for mobile
    useEffect(() => {
        if (playerRef.current) {
            if (isPlaying) {
                // Try catch to avoid errors if player not fully ready
                try { playerRef.current.playVideo(); } catch (e) { }
            } else {
                try { playerRef.current.pauseVideo(); } catch (e) { }
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (playerRef.current) {
            playerRef.current.setVolume(volume);
        }
    }, [volume]);

    const _onReady: YouTubeProps['onReady'] = (event) => {
        playerRef.current = event.target;
        event.target.setVolume(volume);
        if (onReady) onReady(event.target);
    };

    return (
        <div className="w-full h-full rounded-lg overflow-hidden bg-black shadow-lg relative">
            <YouTube
                videoId={videoId}
                opts={opts}
                onReady={_onReady}
                onStateChange={onStateChange}
                className="w-full h-full"
            />
        </div>
    );
}
