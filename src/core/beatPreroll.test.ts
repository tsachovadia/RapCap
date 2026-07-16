import { describe, expect, it } from 'vitest'
import {
    evaluateBeatPreroll,
    isBeatResetObserved,
    PREROLL_RESET_WINDOW_SEC,
} from './beatPreroll'

describe('beat pre-roll gate', () => {
    it('waits until the player has actually reset and advanced', () => {
        expect(evaluateBeatPreroll({
            beatTimeSec: 8,
            elapsedMs: 100,
            resetObserved: false,
        })).toBe('waiting')

        expect(evaluateBeatPreroll({
            beatTimeSec: 2.01,
            elapsedMs: 2_100,
            resetObserved: true,
        })).toBe('ready')
    })

    it('times out instead of leaving the recording flow stuck', () => {
        expect(evaluateBeatPreroll({
            beatTimeSec: 0,
            elapsedMs: 12_000,
            resetObserved: true,
        })).toBe('timed_out')
    })

    it('recognizes only a finite time near the requested zero point', () => {
        expect(isBeatResetObserved(0.2)).toBe(true)
        expect(isBeatResetObserved(PREROLL_RESET_WINDOW_SEC)).toBe(true)
        expect(isBeatResetObserved(1.1)).toBe(false)
        expect(isBeatResetObserved(Number.NaN)).toBe(false)
    })
})
