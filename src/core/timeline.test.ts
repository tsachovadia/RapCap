import { describe, expect, it } from 'vitest'
import {
    beatTimeFromVocal,
    chooseDriftCorrection,
    getVocalDriftSec,
    vocalTimeFromBeat,
} from './timeline'

describe('RapCap timeline', () => {
    it('maps the beat clock to the vocal clock after pre-roll', () => {
        expect(vocalTimeFromBeat({ beatTimeSec: 12, beatStartTimeSec: 2.5 })).toBe(9.5)
    })

    it('never produces a negative vocal position during pre-roll', () => {
        expect(vocalTimeFromBeat({ beatTimeSec: 1.2, beatStartTimeSec: 2.5 })).toBe(0)
    })

    it('round-trips vocal and beat time with a manual offset', () => {
        const beatTime = beatTimeFromVocal(8, 2.5, 0.12)
        expect(beatTime).toBeCloseTo(10.62)
        expect(vocalTimeFromBeat({ beatTimeSec: beatTime, beatStartTimeSec: 2.5, syncOffsetSec: 0.12 })).toBeCloseTo(8)
    })

    it('reports positive drift when the vocal player is behind', () => {
        expect(getVocalDriftSec(10, 9.8)).toBeCloseTo(0.2)
    })

    it('ignores tiny drift to prevent jitter', () => {
        expect(chooseDriftCorrection(10, 9.98)).toEqual({ kind: 'none', playbackRate: 1 })
    })

    it('uses a small playback-rate correction for recoverable drift', () => {
        const correction = chooseDriftCorrection(10, 9.85)
        expect(correction.kind).toBe('rate')
        expect(correction.playbackRate).toBeGreaterThan(1)
        expect(correction.playbackRate).toBeLessThanOrEqual(1.03)
    })

    it('hard-seeks when drift is too large to hide', () => {
        expect(chooseDriftCorrection(10, 9.5)).toEqual({
            kind: 'seek',
            playbackRate: 1,
            targetTimeSec: 10,
        })
    })
})
