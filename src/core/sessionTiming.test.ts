import { describe, expect, it } from 'vitest'
import { captureBeatStartTimeSec } from './sessionTiming'

describe('session timing', () => {
    it('stores the exact beat position plus calibrated latency', () => {
        expect(captureBeatStartTimeSec(2.04, 85)).toBeCloseTo(2.125)
    })

    it('clamps invalid or negative positions', () => {
        expect(captureBeatStartTimeSec(-1, 0)).toBe(0)
        expect(captureBeatStartTimeSec(Number.NaN, 80)).toBe(0)
    })
})
