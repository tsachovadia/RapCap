export const DEFAULT_PREROLL_TARGET_SEC = 2
export const DEFAULT_PREROLL_TIMEOUT_MS = 12_000
export const PREROLL_RESET_WINDOW_SEC = 0.75

export type BeatPrerollStatus = 'waiting' | 'ready' | 'timed_out'

interface BeatPrerollInput {
    beatTimeSec: number
    elapsedMs: number
    resetObserved: boolean
    targetSec?: number
    timeoutMs?: number
}

/**
 * A recording may start only after the player was observed near zero and then
 * advanced through the requested pre-roll. This prevents a stale YouTube time
 * from a previous play from being mistaken for a ready beat.
 */
export function evaluateBeatPreroll({
    beatTimeSec,
    elapsedMs,
    resetObserved,
    targetSec = DEFAULT_PREROLL_TARGET_SEC,
    timeoutMs = DEFAULT_PREROLL_TIMEOUT_MS,
}: BeatPrerollInput): BeatPrerollStatus {
    if (resetObserved && Number.isFinite(beatTimeSec) && beatTimeSec >= targetSec) {
        return 'ready'
    }

    if (elapsedMs >= timeoutMs) return 'timed_out'
    return 'waiting'
}

export function isBeatResetObserved(beatTimeSec: number): boolean {
    return Number.isFinite(beatTimeSec)
        && beatTimeSec >= 0
        && beatTimeSec <= PREROLL_RESET_WINDOW_SEC
}
