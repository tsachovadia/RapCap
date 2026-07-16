export interface YouTubePlayerHandle {
    seekTo(seconds: number, allowSeekAhead?: boolean): void
    playVideo(): void
    pauseVideo(): void
    setVolume(volume: number): void
    getCurrentTime(): number
}
