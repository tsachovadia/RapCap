/**
 * Beat Presets - Shared data for beats across app
 */

export interface BeatPreset {
    id: string
    name: string
}

export const PRESET_BEATS: BeatPreset[] = [
    { id: 'mLDfvBexor4', name: 'Sing About Me' },
    { id: 'HAFijG6kyRk', name: 'Classic Beat' }
]

/**
 * Default beat - Sing About Me by Kendrick Lamar
 */
export const DEFAULT_BEAT_ID = 'mLDfvBexor4'

/**
 * Get beat name by video ID
 */
export function getBeatName(videoId: string | undefined): string | null {
    if (!videoId) return null
    const beat = PRESET_BEATS.find(b => b.id === videoId)
    return beat?.name || null
}

/**
 * Get beat by video ID
 */
export function getBeatById(videoId: string): BeatPreset | undefined {
    return PRESET_BEATS.find(b => b.id === videoId)
}
