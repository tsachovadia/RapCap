/**
 * SpeechRecognition restarts after pause. Anchor each recognition window to
 * the already-recorded vocal duration so new words continue on the same
 * session timeline instead of starting again at zero.
 */
export function getRecognitionSessionStartMs(
    nowMs: number,
    recordedElapsedSec: number,
): number {
    const safeNow = Number.isFinite(nowMs) ? nowMs : 0
    const safeElapsedSec = Number.isFinite(recordedElapsedSec)
        ? Math.max(0, recordedElapsedSec)
        : 0

    return safeNow - safeElapsedSec * 1000
}
