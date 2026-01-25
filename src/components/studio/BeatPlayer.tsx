import React from 'react';
import YouTube, { type YouTubeProps, type YouTubePlayer } from 'react-youtube';

interface BeatPlayerProps {
    videoId: string;
    onReady?: (player: YouTubePlayer) => void;
    onStateChange?: (event: { target: YouTubePlayer; data: number }) => void;
    className?: string;
}

const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
    },
};

export const BeatPlayer: React.FC<BeatPlayerProps> = ({ videoId, onReady, onStateChange, className }) => {

    return (
        <div className={`rounded-xl overflow-hidden bg-black aspect-video shadow-2xl ${className}`}>
            <YouTube
                videoId={videoId}
                opts={opts}
                onReady={(event) => onReady?.(event.target)}
                onStateChange={onStateChange}
                className="w-full h-full"
                iframeClassName="w-full h-full"
            />
        </div>
    );
};
