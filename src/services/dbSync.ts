import { db as localDb } from '../db/db';
import { db as firestore, storage, auth } from '../lib/firebase';
import { collection, doc, setDoc, addDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const syncService = {
    async syncAll() {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        console.log("🔄 Starting Sync for user:", user.uid);

        await this.syncWordGroups(user.uid);
        await this.syncSessions(user.uid);

        console.log("✅ Sync Complete");
    },

    async syncWordGroups(uid: string) {
        // Find unsynced or modified groups
        // For simplicity in this version, we look for items without syncedAt or where syncedAt < lastUsedAt
        // Dexie filtering limitations mean we might iterate.
        const groups = await localDb.wordGroups.toArray();

        for (const group of groups) {
            // Check if needs sync
            if (group.isSystem) continue; // Don't sync system default groups? Or do we? Maybe user modified them?
            // Let's sync everything for now, but only if dirty.
            // Simplified dirty check: !syncedAt or lastUsedAt > syncedAt
            const isDirty = !group.syncedAt || group.lastUsedAt > group.syncedAt;

            if (isDirty) {
                console.log(`Uploading WordGroup: ${group.name}`);
                const dataToSync = {
                    ...group,
                    updatedAt: Timestamp.fromDate(group.lastUsedAt),
                    userId: uid
                };
                delete (dataToSync as any).id; // Don't sync local ID
                delete (dataToSync as any).cloudId;
                delete (dataToSync as any).syncedAt;

                try {
                    const cleanPayload = cleanData(dataToSync);
                    if (group.cloudId) {
                        const docRef = doc(firestore, 'users', uid, 'wordGroups', group.cloudId);
                        await setDoc(docRef, cleanPayload, { merge: true });
                    } else {
                        const colRef = collection(firestore, 'users', uid, 'wordGroups');
                        const docRef = await addDoc(colRef, cleanPayload);
                        await localDb.wordGroups.update(group.id!, { cloudId: docRef.id });
                    }
                    // Mark synced
                    await localDb.wordGroups.update(group.id!, { syncedAt: new Date() });
                } catch (e) {
                    console.error(`Failed to sync WordGroup ${group.id}:`, e);
                }
            }
        }
    },

    async syncSessions(uid: string) {
        const sessions = await localDb.sessions.toArray();

        for (const session of sessions) {
            // Dirty check: !syncedAt (Sessions are immutable usually, so created once)
            // But if we edit metadata (lyrics), we might update.
            // Let's assume if !syncedAt, we sync.
            // If we add editing later, we need a 'updatedAt' field in Session.

            if (!session.syncedAt) {
                console.log(`Uploading Session: ${session.title}`);
                let cloudUrl = session.metadata?.cloudUrl;

                // 1. Upload Blob if needed
                if (session.blob && !cloudUrl) {
                    try {
                        const filename = `sessions/${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
                        const storageRef = ref(storage, `users/${uid}/${filename}`);
                        const result = await uploadBytes(storageRef, session.blob);
                        cloudUrl = await getDownloadURL(result.ref);

                        // Update local metadata immediately
                        const newMetadata = { ...session.metadata, cloudUrl };
                        await localDb.sessions.update(session.id!, { metadata: newMetadata });
                        session.metadata = newMetadata; // Update in memory object for next step
                    } catch (e) {
                        console.error(`Failed to upload audio for session ${session.id}:`, e);
                        continue; // Skip DB sync if audio upload failed
                    }
                }

                // 2. Sync to Firestore
                const dataToSync = {
                    title: session.title,
                    type: session.type,
                    subtype: session.subtype,
                    beatId: session.beatId,
                    duration: session.duration,
                    date: Timestamp.fromDate(session.date || session.createdAt),
                    createdAt: Timestamp.fromDate(session.createdAt),
                    metadata: session.metadata || {},
                    content: session.content,
                    userId: uid
                };

                // Remove blob from firestore data
                // (Already not in dataToSync structure, but ensuring we don't accidentally send it)

                try {
                    const cleanPayload = cleanData(dataToSync);
                    if (session.cloudId) {
                        const docRef = doc(firestore, 'users', uid, 'sessions', session.cloudId);
                        await setDoc(docRef, cleanPayload, { merge: true });
                    } else {
                        const colRef = collection(firestore, 'users', uid, 'sessions');
                        const docRef = await addDoc(colRef, cleanPayload);
                        await localDb.sessions.update(session.id!, { cloudId: docRef.id });
                    }
                    await localDb.sessions.update(session.id!, { syncedAt: new Date() });
                } catch (e) {
                    console.error(`Failed to sync Session ${session.id}:`, e);
                }
            }
        }
    }
};

// Helper: Remove undefined fields which Firestore rejects
function cleanData(data: any) {
    const clean = { ...data };
    Object.keys(clean).forEach(key => clean[key] === undefined && delete clean[key]);
    return clean;
}
