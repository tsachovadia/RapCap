import { describe, expect, it } from 'vitest'
import { resolveRecordingMode } from './recordingMode'

describe('recording mode routing', () => {
    it('keeps the two supported recording products', () => {
        expect(resolveRecordingMode('freestyle')).toBe('freestyle')
        expect(resolveRecordingMode('thoughts')).toBe('thoughts')
    })

    it('folds the legacy training route into freestyle', () => {
        expect(resolveRecordingMode('training')).toBe('freestyle')
        expect(resolveRecordingMode(null)).toBe('freestyle')
    })
})
