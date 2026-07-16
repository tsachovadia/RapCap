export function captureBeatStartTimeSec(
    playerTimeSec: number,
    calibratedLatencyMs: number,
): number {
    if (!Number.isFinite(playerTimeSec) || !Number.isFinite(calibratedLatencyMs)) return 0
    return Math.max(0, playerTimeSec + calibratedLatencyMs / 1000)
}
