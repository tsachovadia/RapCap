import { youtubeWatchUrl } from './youtube'

export interface ExportableSession {
    id?: number | string
    title: string
    duration: number
    createdAt: Date | string
    beatId?: string
    beatStartTime?: number
    syncOffset?: number
    metadata?: {
        language?: string
        lyrics?: string
        lyricsSegments?: unknown[]
        lyricsWords?: unknown[]
        moments?: unknown[]
        notes?: string
    }
}

const safeIso = (value: Date | string) => {
    const date = value instanceof Date ? value : new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function safeFileStem(title: string): string {
    const stem = title
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80)

    return stem || 'rapcap-session'
}

export function vocalFileName(title: string, mimeType: string): string {
    const normalized = mimeType.toLowerCase()
    const extension = normalized.includes('mp4') || normalized.includes('aac')
        ? 'm4a'
        : normalized.includes('ogg')
            ? 'ogg'
            : normalized.includes('webm')
                ? 'webm'
                : 'mp3'

    return `${safeFileStem(title)}-vocal.${extension}`
}

export function createSessionManifest(session: ExportableSession, exportedAt = new Date()) {
    const beatUrl = session.beatId ? youtubeWatchUrl(session.beatId) : null

    return {
        format: 'rapcap-session',
        version: 1,
        exportedAt: exportedAt.toISOString(),
        session: {
            id: session.id ?? null,
            title: session.title,
            createdAt: safeIso(session.createdAt),
            durationSec: session.duration,
            language: session.metadata?.language ?? null,
        },
        beat: session.beatId ? {
            source: 'youtube-reference',
            videoId: session.beatId,
            url: beatUrl,
            startTimeSec: session.beatStartTime ?? 0,
            manualSyncOffsetMs: session.syncOffset ?? 0,
        } : null,
        transcript: {
            text: session.metadata?.lyrics ?? '',
            segments: session.metadata?.lyricsSegments ?? [],
            words: session.metadata?.lyricsWords ?? [],
        },
        moments: session.metadata?.moments ?? [],
        notes: session.metadata?.notes ?? '',
    } as const
}
