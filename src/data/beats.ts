/**
 * Beat Presets - Shared data for beats across app
 */

export interface BeatPreset {
    id: string
    name: string
}

export const PRESET_BEATS: BeatPreset[] = [
    { id: 'vSsbbJlZJmc', name: 'ON MY MIND' },
    { id: 'vG2S2rL3wNo', name: 'Prestige' },
    { id: 'liJVSwOiiwg', name: 'Unchanged' },
    { id: 'P2GOkrU1vnQ', name: 'The Supply' },
    { id: 'qU_fJ6O1j7M', name: 'Behind Barz' },
    { id: 'L9Jz6yN6jE0', name: 'Streets' },
    { id: '8_v1-T-8y4Y', name: 'Dolla' },
    { id: 'x_7O9zV6G3U', name: 'BLAME ME' },
    { id: 'p0-T-v_wE-Y', name: 'Banknotes' },
    { id: 'Bl_z_v5_A_E', name: 'My Life' },
    { id: 'j_p_b_8_8_8', name: 'Bushido' },
    { id: '0mX7P-v14I4', name: 'Sing About Me' },
    { id: 'HAFijG6kyRk', name: 'Default Beat' } // Default beat
]

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

export const DEFAULT_BEAT_ID = 'HAFijG6kyRk'
