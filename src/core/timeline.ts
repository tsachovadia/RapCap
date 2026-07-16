export interface BeatTimelinePosition {
    beatTimeSec: number
    beatStartTimeSec: number
    syncOffsetSec?: number
}

export interface DriftCorrection {
    kind: 'none' | 'rate' | 'seek'
    playbackRate: number
    targetTimeSec?: number
}

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value))

/**
 * Converts the YouTube/local beat clock into the matching vocal clock.
 * A positive sync offset delays the vocal relative to the beat.
 */
export function vocalTimeFromBeat({
    beatTimeSec,
    beatStartTimeSec,
    syncOffsetSec = 0,
}: BeatTimelinePosition): number {
    return Math.max(0, beatTimeSec - beatStartTimeSec - syncOffsetSec)
}

export function beatTimeFromVocal(
    vocalTimeSec: number,
    beatStartTimeSec: number,
    syncOffsetSec = 0,
): number {
    return Math.max(0, vocalTimeSec + beatStartTimeSec + syncOffsetSec)
}

/** Positive drift means the vocal player is behind the expected position. */
export function getVocalDriftSec(expectedVocalTimeSec: number, actualVocalTimeSec: number): number {
    return expectedVocalTimeSec - actualVocalTimeSec
}

export function chooseDriftCorrection(
    expectedVocalTimeSec: number,
    actualVocalTimeSec: number,
    options: { deadZoneSec?: number; hardSeekSec?: number } = {},
): DriftCorrection {
    const deadZoneSec = options.deadZoneSec ?? 0.04
    const hardSeekSec = options.hardSeekSec ?? 0.3
    const driftSec = getVocalDriftSec(expectedVocalTimeSec, actualVocalTimeSec)
    const absoluteDrift = Math.abs(driftSec)

    if (absoluteDrift <= deadZoneSec) {
        return { kind: 'none', playbackRate: 1 }
    }

    if (absoluteDrift >= hardSeekSec) {
        return {
            kind: 'seek',
            playbackRate: 1,
            targetTimeSec: Math.max(0, expectedVocalTimeSec),
        }
    }

    return {
        kind: 'rate',
        playbackRate: clamp(1 + driftSec * 0.2, 0.97, 1.03),
    }
}
