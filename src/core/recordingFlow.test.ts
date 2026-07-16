import { describe, expect, it } from 'vitest'
import { transitionFlow } from './recordingFlow'

describe('recording flow', () => {
    it('starts freestyle through pre-roll', () => {
        expect(transitionFlow('idle', 'START_PREROLL')).toBe('preroll')
        expect(transitionFlow('preroll', 'START_RECORDING')).toBe('recording')
    })

    it('starts a beatless recording immediately', () => {
        expect(transitionFlow('idle', 'START_RECORDING')).toBe('recording')
    })

    it('pauses and resumes the active flow', () => {
        expect(transitionFlow('recording', 'PAUSE')).toBe('paused')
        expect(transitionFlow('paused', 'RESUME')).toBe('recording')
    })

    it('does not apply invalid transitions', () => {
        expect(transitionFlow('idle', 'PAUSE')).toBe('idle')
        expect(transitionFlow('paused', 'START_PREROLL')).toBe('paused')
    })

    it('can finish from pre-roll, recording or pause', () => {
        expect(transitionFlow('preroll', 'FINISH')).toBe('idle')
        expect(transitionFlow('recording', 'FINISH')).toBe('idle')
        expect(transitionFlow('paused', 'FINISH')).toBe('idle')
    })
})
