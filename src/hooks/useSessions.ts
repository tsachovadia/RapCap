import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'

export function useSessions() {
    const sessions = useLiveQuery(() =>
        db.sessions.orderBy('createdAt').reverse().toArray()
    )

    const deleteSession = async (id: number) => {
        if (confirm('Are you sure you want to delete this session?')) {
            await db.sessions.delete(id)
        }
    }

    const clearAllSessions = async () => {
        if (confirm('WARNING: This will delete ALL sessions. Are you sure?')) {
            await db.sessions.clear()
        }
    }

    return {
        sessions,
        isLoading: !sessions,
        deleteSession,
        clearAllSessions
    }
}
