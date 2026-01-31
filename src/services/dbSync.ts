import { db as localDb } from '../db/db';
import { db as firestore, storage, auth } from '../lib/firebase';
import {
    collection,
    doc,
    setDoc,
    Timestamp,
    onSnapshot,
    deleteDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const syncService = {
    unsubscribes: [] as (() => void)[],

    async syncAll() {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        console.log("🔄 Starting Sync for user:", user.uid);

        // 1. Setup listeners first to catch changes while syncing
        this.setupRealtimeListeners(user.uid);

        // 2. Push local changes to cloud (incremental sync is now handled by listeners)
        await this.syncWordGroups(user.uid);
        await this.syncSessions(user.uid);

        console.log("✅ Sync Complete");
    },

    /**
     * Listen for real-time changes in Firestore and update Dexie
     */
    setupRealtimeListeners(uid: string) {
        // Clear previous listeners if any
        this.stopListeners();

        console.log("📡 Setting up Real-time Listeners...");

        // Word Groups Listener
        const wgUnsub = onSnapshot(collection(firestore, 'users', uid, 'wordGroups'), async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                const cloudData = change.doc.data();
                const cloudId = change.doc.id;

                if (change.type === 'removed') {
                    console.log(`🗑️ Cloud deleted WordGroup: ${cloudId}`);
                    await localDb.wordGroups.where('cloudId').equals(cloudId).delete();
                } else {
                    const localGroup = await localDb.wordGroups.where('cloudId').equals(cloudId).first();
                    const groupData = {
                        name: cloudData.name,
                        items: cloudData.items,
                        story: cloudData.story,
                        mnemonicLogic: cloudData.mnemonicLogic,
                        bars: cloudData.bars,
                        defaultInterval: cloudData.defaultInterval,
                        createdAt: cloudData.createdAt instanceof Timestamp ? cloudData.createdAt.toDate() : new Date(cloudData.createdAt),
                        lastUsedAt: cloudData.updatedAt instanceof Timestamp ? cloudData.updatedAt.toDate() : new Date(cloudData.updatedAt || cloudData.lastUsedAt),
                        isSystem: cloudData.isSystem || false,
                        cloudId: cloudId,
                        syncedAt: new Date()
                    };

                    if (!localGroup) {
                        await localDb.wordGroups.add(groupData);
                    } else if (groupData.lastUsedAt > localGroup.lastUsedAt) {
                        await localDb.wordGroups.update(localGroup.id!, groupData);
                    }
                }
            }
        });

        // Sessions Listener
        const sUnsub = onSnapshot(collection(firestore, 'users', uid, 'sessions'), async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                const cloudData = change.doc.data();
                const cloudId = change.doc.id;

                if (change.type === 'removed') {
                    console.log(`🗑️ Cloud deleted Session: ${cloudId}`);
                    await localDb.sessions.where('cloudId').equals(cloudId).delete();
                } else {
                    const localSession = await localDb.sessions.where('cloudId').equals(cloudId).first();
                    const sessionData = {
                        title: cloudData.title,
                        type: cloudData.type,
                        subtype: cloudData.subtype,
                        beatId: cloudData.beatId,
                        duration: cloudData.duration,
                        date: cloudData.date instanceof Timestamp ? cloudData.date.toDate() : new Date(cloudData.date),
                        createdAt: cloudData.createdAt instanceof Timestamp ? cloudData.createdAt.toDate() : new Date(cloudData.createdAt),
                        metadata: cloudData.metadata || {},
                        content: cloudData.content,
                        cloudId: cloudId,
                        syncedAt: new Date()
                    };

                    if (!localSession) {
                        await localDb.sessions.add(sessionData);
                    } else {
                        // Merge metadata - clouds usually wins if newer
                        const updatedMetadata = { ...localSession.metadata, ...sessionData.metadata };
                        await localDb.sessions.update(localSession.id!, {
                            ...sessionData,
                            metadata: updatedMetadata,
                            syncedAt: new Date()
                        });
                    }
                }
            }
        });

        this.unsubscribes.push(wgUnsub, sUnsub);
    },

    stopListeners() {
        this.unsubscribes.forEach(unsub => unsub());
        this.unsubscribes = [];
    },

    async syncInBackground() {
        try {
            const user = auth.currentUser;
            if (!user) return;
            await this.syncWordGroups(user.uid);
            await this.syncSessions(user.uid);
        } catch (err) {
            console.error('🔄 Background sync failed:', err);
        }
    },

    async syncWordGroups(uid: string) {
        const groups = await localDb.wordGroups.toArray();

        for (const group of groups) {
            if (group.isSystem) continue;
            const isDirty = !group.syncedAt || group.lastUsedAt > group.syncedAt;

            if (isDirty) {
                const dataToSync = {
                    ...group,
                    updatedAt: Timestamp.fromDate(group.lastUsedAt),
                    userId: uid
                };
                delete (dataToSync as any).id;
                delete (dataToSync as any).cloudId;
                delete (dataToSync as any).syncedAt;

                try {
                    const cleanPayload = cleanData(dataToSync);
                    if (group.cloudId) {
                        const docRef = doc(firestore, 'users', uid, 'wordGroups', group.cloudId);
                        await setDoc(docRef, cleanPayload, { merge: true });
                    } else {
                        const colRef = collection(firestore, 'users', uid, 'wordGroups');
                        const docRef = doc(colRef);
                        // Update local with cloudId FIRST to prevent duplication by snapshot listener
                        await localDb.wordGroups.update(group.id!, { cloudId: docRef.id });
                        await setDoc(docRef, cleanPayload);
                    }
                    await localDb.wordGroups.update(group.id!, { syncedAt: new Date() });
                } catch (e) {
                    console.error(`Failed to sync WordGroup ${group.id}:`, e);
                }
            }
        }
    },

    async deleteWordGroups(uid: string, ids: number[]) {
        for (const id of ids) {
            const group = await localDb.wordGroups.get(id);
            if (group?.cloudId) {
                const docRef = doc(firestore, 'users', uid, 'wordGroups', group.cloudId);
                await deleteDoc(docRef);
            }
            await localDb.wordGroups.delete(id);
        }
    },

    async syncSessions(uid: string) {
        // Since Dexie doesn't support complex null/undefined queries well in some versions, 
        // let's just filter the whole array for simplicity and safety
        const allSessions = await localDb.sessions.toArray();
        const pendingSessions = allSessions.filter(s => !s.syncedAt || !s.cloudId);

        for (const session of pendingSessions) {
            let cloudUrl = session.metadata?.cloudUrl;

            // 1. Upload Audio if needed
            if (session.blob && !cloudUrl) {
                try {
                    console.log(`📤 Uploading audio for session: ${session.title}`);
                    const rawType = session.blob.type || '';
                    const isMp3 = rawType.includes('mpeg') || rawType.includes('mp3');
                    const isMp4 = rawType.includes('mp4') || rawType.includes('aac');
                    const extension = isMp3 ? 'mp3' : (isMp4 ? 'm4a' : 'webm');
                    const contentType = isMp3 ? 'audio/mpeg' : (isMp4 ? (rawType || 'audio/mp4') : 'audio/webm');

                    const filename = `sessions/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
                    const storageRef = ref(storage, `users/${uid}/${filename}`);

                    const result = await uploadBytes(storageRef, session.blob, { contentType });
                    cloudUrl = await getDownloadURL(result.ref);

                    const newMetadata = { ...session.metadata, cloudUrl };
                    await localDb.sessions.update(session.id!, { metadata: newMetadata });
                    session.metadata = newMetadata;
                } catch (e) {
                    console.error(`❌ Failed to upload audio for session ${session.id}:`, e);
                    continue; // Stay local until next sync attempt
                }
            }

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

            try {
                const cleanPayload = cleanData(dataToSync);
                if (session.cloudId) {
                    const docRef = doc(firestore, 'users', uid, 'sessions', session.cloudId);
                    await setDoc(docRef, cleanPayload, { merge: true });
                } else {
                    const colRef = collection(firestore, 'users', uid, 'sessions');
                    const docRef = doc(colRef);
                    // Update local with cloudId FIRST to prevent duplication by snapshot listener
                    await localDb.sessions.update(session.id!, { cloudId: docRef.id });
                    await setDoc(docRef, cleanPayload);
                }
                await localDb.sessions.update(session.id!, { syncedAt: new Date() });
            } catch (e) {
                console.error(`Failed to sync Session ${session.id}:`, e);
            }
        }
    },

    async deleteSessions(uid: string, ids: number[]) {
        for (const id of ids) {
            const session = await localDb.sessions.get(id);
            if (session?.cloudId) {
                const docRef = doc(firestore, 'users', uid, 'sessions', session.cloudId);
                await deleteDoc(docRef);
            }
            await localDb.sessions.delete(id);
        }
    }
};

function cleanData(data: any) {
    const clean = { ...data };
    Object.keys(clean).forEach(key => (clean[key] === undefined || clean[key] === null) && delete clean[key]);
    return clean;
}
