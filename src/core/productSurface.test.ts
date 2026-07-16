import { describe, expect, it } from 'vitest'
import {
    getActivePrimaryDestination,
    LAB_DESTINATIONS,
    PRIMARY_DESTINATIONS,
} from './productSurface'

describe('lean product surface', () => {
    it('keeps the primary product limited to freestyle, saved sessions and the lab boundary', () => {
        expect(PRIMARY_DESTINATIONS.map(item => item.id)).toEqual([
            'freestyle',
            'library',
            'lab',
        ])
    })

    it('keeps extended tools available without promoting them to the primary product', () => {
        const labIds = LAB_DESTINATIONS.map(item => item.id)

        expect(labIds).toEqual(expect.arrayContaining([
            'thoughts',
            'rhyme-groups',
            'drills',
            'verse',
            'studio',
            'dashboard',
        ]))
        expect(PRIMARY_DESTINATIONS.map(item => item.id)).not.toContain('studio')
        expect(PRIMARY_DESTINATIONS.map(item => item.id)).not.toContain('verse')
        expect(PRIMARY_DESTINATIONS.map(item => item.id)).not.toContain('rhyme-groups')
    })

    it('marks old and experimental routes as Lab while keeping recording routes clear', () => {
        expect(getActivePrimaryDestination('/record', '?mode=freestyle')).toBe('freestyle')
        expect(getActivePrimaryDestination('/record', '?mode=training')).toBe('freestyle')
        expect(getActivePrimaryDestination('/library/session-id')).toBe('library')
        expect(getActivePrimaryDestination('/record', '?mode=thoughts')).toBe('lab')
        expect(getActivePrimaryDestination('/studio')).toBe('lab')
        expect(getActivePrimaryDestination('/rhyme-library/42')).toBe('lab')
        expect(getActivePrimaryDestination('/lab/dashboard')).toBe('lab')
    })
})
