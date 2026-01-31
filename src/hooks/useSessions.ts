import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { syncService } from '../services/dbSync'
import { useAuth } from '../contexts/AuthContext'

export function useSessions() {
    const { user } = useAuth()
    const sessions = useLiveQuery(() =>
        db.sessions.orderBy('createdAt').reverse().toArray()
    )

    const deleteSession = async (id: number) => {
        if (confirm('Are you sure you want to delete this session?')) {
            if (user) {
                await syncService.deleteSessions(user.uid, [id])
            } else {
                await db.sessions.delete(id)
            }
        }
    }

    const clearAllSessions = async () => {
        if (confirm('WARNING: This will delete ALL sessions. Are you sure?')) {
            if (user && sessions) {
                const ids = sessions.map(s => s.id!)
                await syncService.deleteSessions(user.uid, ids)
            } else {
                await db.sessions.clear()
            }
        }
    }

    return {
        sessions,
        isLoading: !sessions,
        deleteSession,
        clearAllSessions
    }
}
