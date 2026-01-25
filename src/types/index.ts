export interface Session {
    id: string;
    createdAt: number;

    // Inspiration (The Beat)
    beatContext: {
        provider: 'youtube' | 'local_placeholder';
        videoId?: string;
        videoTitle: string;
        playStartOffset: number; // Seconds into video where recording started
    };

    // The Recording (Vocal)
    recording: {
        localBlobUrl?: string;
        blob?: Blob; // Added for IDB storage
        durationSeconds: number;
        // Latency Compensation
        userLoopbackLatencyMs?: number;
    };

    moments: number[]; // Timestamps of "Moments"

    // Sync Events Log (Buffering safety)
    events: {
        type: 'buffering_start' | 'buffering_end' | 'pause' | 'resume';
        timestamp: number; // Session time
    }[];
}
