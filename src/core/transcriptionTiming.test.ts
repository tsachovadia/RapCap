import { describe, expect, it } from 'vitest'
import { getRecognitionSessionStartMs } from './transcriptionTiming'

describe('transcription session timing', () => {
    it('starts at the current clock for a new recording', () => {
        expect(getRecognitionSessionStartMs(10_000, 0)).toBe(10_000)
    })

    it('keeps timestamps continuous when recognition resumes after pause', () => {
        const resumedAt = 30_000
        const sessionStart = getRecognitionSessionStartMs(resumedAt, 12.4)

        expect(sessionStart).toBe(17_600)
        expect((resumedAt - sessionStart) / 1000).toBe(12.4)
    })

    it('sanitizes invalid or negative elapsed time', () => {
        expect(getRecognitionSessionStartMs(10_000, -3)).toBe(10_000)
        expect(getRecognitionSessionStartMs(10_000, Number.NaN)).toBe(10_000)
    })
})
