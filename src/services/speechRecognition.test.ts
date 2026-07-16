import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRecognition, getRestartDelay, isSpeechRecognitionSupported } from './speechRecognition'

class MockRecognition {
    continuous = false
    interimResults = false
    lang = ''
    onstart = null
    onresult = null
    onerror = null
    onend = null
    start = vi.fn()
    stop = vi.fn()
    abort = vi.fn()
}

const callbacks = () => ({
    onStart: vi.fn(),
    onInterim: vi.fn(),
    onFinal: vi.fn(),
    onEnd: vi.fn(),
    onError: vi.fn(),
})

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

    it.each([
        ['he', 'he-IL'],
        ['en', 'en-US'],
    ] as const)('maps %s sessions to the correct browser locale', (language, locale) => {
        vi.stubGlobal('window', { SpeechRecognition: MockRecognition })

        const recognition = createRecognition({ language }, callbacks())

        expect(recognition?.lang).toBe(locale)
        expect(recognition?.continuous).toBe(true)
        expect(recognition?.interimResults).toBe(true)
    })

    it('restarts planned recognition quickly', () => {
        expect(getRestartDelay(8, true)).toBe(50)
    })

    it('caps repeated-error backoff', () => {
        expect(getRestartDelay(100, false)).toBe(5000)
    })
})
