import { v4 as uuidv4 } from 'uuid'
import { db, type DbSession } from './db'

export const CURRENT_SESSION_SCHEMA_VERSION = 1

export function prepareSessionForCreate(
    session: DbSession,
    createLocalId: () => string = uuidv4,
    now = new Date(),
): DbSession {
    return {
        ...session,
        localId: session.localId || createLocalId(),
        schemaVersion: CURRENT_SESSION_SCHEMA_VERSION,
        updatedAt: now,
    }
}

export const sessionRepo = {
    async create(session: DbSession): Promise<DbSession> {
        const record = prepareSessionForCreate(session)
        delete record.id
        const id = await db.sessions.add(record)
        return { ...record, id }
    },

    async get(id: number): Promise<DbSession | undefined> {
        return db.sessions.get(id)
    },

    async getByLocalId(localId: string): Promise<DbSession | undefined> {
        return db.sessions.where('localId').equals(localId).first()
    },

    async update(id: number, changes: Partial<DbSession>): Promise<number> {
        return db.sessions.update(id, { ...changes, updatedAt: new Date() })
    },
}
