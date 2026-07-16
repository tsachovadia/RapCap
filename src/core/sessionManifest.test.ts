import { describe, expect, it } from 'vitest'
import { createSessionManifest, safeFileStem, vocalFileName } from './sessionManifest'

describe('session export manifest', () => {
    it('preserves the beat timing, transcript and moments', () => {
        const manifest = createSessionManifest({
            id: 42,
            localId: 'stable-local-session-id',
            title: 'Night Flow',
            duration: 12.5,
            createdAt: new Date('2026-07-16T10:00:00.000Z'),
            beatId: 'dQw4w9WgXcQ',
            beatStartTime: 2.125,
            syncOffset: 50,
            metadata: {
                language: 'he',
                lyrics: 'בדיקה אחת שתיים',
                lyricsSegments: [{ timestamp: 0.2, text: 'בדיקה' }],
                moments: [3.4],
            },
        }, new Date('2026-07-16T11:00:00.000Z'))

        expect(manifest.beat).toMatchObject({
            videoId: 'dQw4w9WgXcQ',
            startTimeSec: 2.125,
            manualSyncOffsetMs: 50,
        })
        expect(manifest.session.id).toBe('stable-local-session-id')
        expect(manifest.transcript.text).toBe('בדיקה אחת שתיים')
        expect(manifest.moments).toEqual([3.4])
    })

    it('creates safe vocal filenames with the actual media extension', () => {
        expect(safeFileStem(' Flow: take / 01 ')).toBe('Flow-take-01')
        expect(vocalFileName('Flow 01', 'audio/mp4')).toBe('Flow-01-vocal.m4a')
        expect(vocalFileName('Flow 01', 'audio/webm;codecs=opus')).toBe('Flow-01-vocal.webm')
        expect(vocalFileName('Flow 01', 'audio/mpeg')).toBe('Flow-01-vocal.mp3')
    })
})
