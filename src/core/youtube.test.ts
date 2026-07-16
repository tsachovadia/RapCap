import { describe, expect, it } from 'vitest'
import { extractYouTubeVideoId, youtubeWatchUrl } from './youtube'

describe('YouTube references', () => {
    const id = 'dQw4w9WgXcQ'

    it.each([
        id,
        `https://www.youtube.com/watch?v=${id}`,
        `https://m.youtube.com/watch?v=${id}&feature=share`,
        `https://youtu.be/${id}?si=test`,
        `https://www.youtube.com/shorts/${id}`,
        `https://www.youtube.com/embed/${id}`,
        `https://www.youtube.com/live/${id}`,
    ])('extracts %s', (input) => {
        expect(extractYouTubeVideoId(input)).toBe(id)
    })

    it('rejects non-YouTube and malformed values', () => {
        expect(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
        expect(extractYouTubeVideoId('not-a-url')).toBeNull()
    })

    it('creates a canonical watch URL only for valid IDs', () => {
        expect(youtubeWatchUrl(id)).toBe(`https://www.youtube.com/watch?v=${id}`)
        expect(youtubeWatchUrl('bad')).toBeNull()
    })
})
