import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import Dexie from 'dexie'
import { db, type DbSession } from './db'
import { CURRENT_SESSION_SCHEMA_VERSION, prepareSessionForCreate, sessionRepo } from './sessionRepo'
import { beatRepo } from './beatRepo'

const makeSession = (): DbSession => ({
    title: 'Phone Flow',
    type: 'freestyle',
    duration: 18.4,
    date: new Date('2026-07-16T10:00:00.000Z'),
    createdAt: new Date('2026-07-16T10:00:00.000Z'),
    beatId: 'dQw4w9WgXcQ',
    beatStartTime: 2.125,
    syncOffset: 50,
    blob: new Blob(['vocal-audio'], { type: 'audio/webm' }),
    metadata: {
        language: 'he',
        lyrics: 'בדיקה אחת שתיים',
        lyricsSegments: [{ timestamp: 0.2, text: 'בדיקה' }],
        moments: [4.5],
    },
})

describe('session repository', () => {
    beforeEach(async () => {
        db.close()
        await db.delete()
        await db.open()
    })

    afterAll(async () => {
        db.close()
        await db.delete()
    })

    it('stamps a stable local ID and schema without changing beat timing', () => {
        const session = prepareSessionForCreate(
            makeSession(),
            () => 'stable-session-id',
            new Date('2026-07-16T11:00:00.000Z'),
        )

        expect(session.localId).toBe('stable-session-id')
        expect(session.schemaVersion).toBe(CURRENT_SESSION_SCHEMA_VERSION)
        expect(session.beatStartTime).toBe(2.125)
        expect(session.syncOffset).toBe(50)
    })

    it('saves and reopens the complete freestyle session', async () => {
        const saved = await sessionRepo.create(makeSession())
        const reopened = await sessionRepo.get(saved.id!)

        expect(reopened?.localId).toBe(saved.localId)
        expect(reopened?.blob?.size).toBeGreaterThan(0)
        expect(reopened?.beatId).toBe('dQw4w9WgXcQ')
        expect(reopened?.beatStartTime).toBe(2.125)
        expect(reopened?.syncOffset).toBe(50)
        expect(reopened?.metadata?.lyrics).toBe('בדיקה אחת שתיים')
        expect(reopened?.metadata?.moments).toEqual([4.5])
    })

    it('persists manual sync changes and resolves by stable ID', async () => {
        const saved = await sessionRepo.create(makeSession())
        await sessionRepo.update(saved.id!, { syncOffset: -100 })

        const reopened = await sessionRepo.getByLocalId(saved.localId!)
        expect(reopened?.syncOffset).toBe(-100)
    })

    it('migrates legacy sessions to stable IDs without losing timing data', async () => {
        db.close()
        await db.delete()

        const legacy = new Dexie('rapCapDB')
        legacy.version(6).stores({
            sessions: '++id, title, type, createdAt, updatedAt, cloudId',
        })
        await legacy.table('sessions').add(makeSession())
        legacy.close()

        await db.open()
        const migrated = await db.sessions.toCollection().first()

        expect(migrated?.localId).toMatch(/^[0-9a-f-]{36}$/i)
        expect(migrated?.schemaVersion).toBe(CURRENT_SESSION_SCHEMA_VERSION)
        expect(migrated?.beatStartTime).toBe(2.125)
        expect(migrated?.metadata?.lyrics).toBe('בדיקה אחת שתיים')
    })

    it('persists a saved YouTube beat across a database reopen', async () => {
        const result = await beatRepo.saveCustom({
            videoId: 'abcdefghijk',
            name: 'My practice beat',
        })

        expect(result.status).toBe('saved')
        db.close()
        await db.open()

        const reopened = await beatRepo.findByVideoId('abcdefghijk')
        expect(reopened).toMatchObject({
            videoId: 'abcdefghijk',
            name: 'My practice beat',
            category: 'custom',
        })
    })

    it('does not duplicate saved or preset beats', async () => {
        await beatRepo.saveCustom({ videoId: 'abcdefghijk', name: 'First name' })
        const duplicate = await beatRepo.saveCustom({ videoId: 'abcdefghijk', name: 'Second name' })
        const preset = await beatRepo.saveCustom({
            videoId: 'preset12345',
            name: 'Preset',
            presetVideoIds: ['preset12345'],
        })

        expect(duplicate.status).toBe('existing')
        expect(preset.status).toBe('preset')
        expect(await db.beats.count()).toBe(1)
    })
})
