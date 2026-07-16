import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRestartDelay, isSpeechRecognitionSupported } from './speechRecognition'

describe('speech recognition capabilities', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('reports unsupported when the browser API is missing', () => {
        vi.stubGlobal('window', {})
        expect(isSpeechRecognitionSupported()).toBe(false)
    })

    it('accepts the prefixed browser implementation', () => {
        vi.stubGlobal('window', { webkitSpeechRecognition: class MockRecognition {} })
        expect(isSpeechRecognitionSupported()).toBe(true)
    })

    it('restarts planned recognition quickly', () => {
        expect(getRestartDelay(8, true)).toBe(50)
    })

    it('caps repeated-error backoff', () => {
        expect(getRestartDelay(100, false)).toBe(5000)
    })
})
