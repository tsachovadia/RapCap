import { db as localDb } from '../db/db';
import { db as firestore, storage, auth } from '../lib/firebase';
import { collection, doc, setDoc, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const syncService = {
    async syncAll() {
        const user = auth.currentUser;
        if (!user) throw new Error("User not authenticated");

        console.log("🔄 Starting Sync for user:", user.uid);

        // 1. Pull from cloud first (Cloud -> Local)
        await this.pullWordGroups(user.uid);
        await this.pullSessions(user.uid);

        // 2. Push to cloud (Local -> Cloud)
        await this.syncWordGroups(user.uid);
        await this.syncSessions(user.uid);

        console.log("✅ Sync Complete");
    },

    /**
     * Silent background sync - doesn't throw errors to UI
     * Use after save operations to keep data in sync automatically
     */
    async syncInBackground() {
        try {
            await this.syncAll();
        } catch (err) {
            console.error('🔄 Background sync failed (silent):', err);
            // Don't throw - let it fail silently without interrupting user flow
        }
    },

    async pullWordGroups(uid: string) {
        console.log("📥 Pulling WordGroups from cloud...");
        const colRef = collection(firestore, 'users', uid, 'wordGroups');
        const snapshot = await getDocs(colRef);

        await localDb.transaction('rw', localDb.wordGroups, async () => {
            for (const docSnap of snapshot.docs) {
                const cloudData = docSnap.data();
                const cloudId = docSnap.id;

                const localGroup = await localDb.wordGroups.where('cloudId').equals(cloudId).first();

                const groupData = {
                    name: cloudData.name,
                    items: cloudData.items,
                    story: cloudData.story,
                    mnemonicLogic: cloudData.mnemonicLogic,
                    defaultInterval: cloudData.defaultInterval,
                    createdAt: cloudData.createdAt instanceof Timestamp ? cloudData.createdAt.toDate() : new Date(cloudData.createdAt),
                    lastUsedAt: cloudData.updatedAt instanceof Timestamp ? cloudData.updatedAt.toDate() : new Date(cloudData.updatedAt || cloudData.lastUsedAt),
                    isSystem: cloudData.isSystem || false,
                    cloudId: cloudId,
                    syncedAt: new Date()
                };

                if (localGroup) {
                    if (groupData.lastUsedAt > localGroup.lastUsedAt) {
                        await localDb.wordGroups.update(localGroup.id!, groupData);
                    }
                } else {
                    await localDb.wordGroups.add(groupData);
                }
            }
        });
    },

    async pullSessions(uid: string) {
        console.log("📥 Pulling Sessions from cloud...");
        const colRef = collection(firestore, 'users', uid, 'sessions');
        const q = query(colRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        await localDb.transaction('rw', localDb.sessions, async () => {
            for (const docSnap of snapshot.docs) {
                const cloudData = docSnap.data();
                const cloudId = docSnap.id;

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
                    const updatedMetadata = { ...localSession.metadata, ...sessionData.metadata };
                    await localDb.sessions.update(localSession.id!, {
                        metadata: updatedMetadata,
                        syncedAt: new Date()
                    });
                }
            }
        });
    },

    async syncWordGroups(uid: string) {
        const groups = await localDb.wordGroups.toArray();

        for (const group of groups) {
            if (group.isSystem) continue;
            const isDirty = !group.syncedAt || group.lastUsedAt > group.syncedAt;

            if (isDirty) {
                console.log(`Uploading WordGroup: ${group.name}`);
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
                        const docRef = await addDoc(colRef, cleanPayload);
                        await localDb.wordGroups.update(group.id!, { cloudId: docRef.id });
                    }
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
            if (!session.syncedAt) {
                console.log(`Uploading Session: ${session.title}`);
                let cloudUrl = session.metadata?.cloudUrl;

                if (session.blob && !cloudUrl) {
                    try {
                        const rawType = session.blob.type || '';
                        const isMp3 = rawType.includes('mpeg') || rawType.includes('mp3');
                        const isMp4 = rawType.includes('mp4') || rawType.includes('aac');
                        const extension = isMp3 ? 'mp3' : (isMp4 ? 'm4a' : 'webm');
                        const contentType = isMp3 ? 'audio/mpeg' : (isMp4 ? (rawType || 'audio/mp4') : 'audio/webm');

                        const filename = `sessions/${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
                        const storageRef = ref(storage, `users/${uid}/${filename}`);

                        console.log(`📤 Uploading blob of type: ${rawType} as ${filename} (${contentType})`);

                        const result = await uploadBytes(storageRef, session.blob, {
                            contentType: contentType
                        });
                        cloudUrl = await getDownloadURL(result.ref);

                        const newMetadata = { ...session.metadata, cloudUrl };
                        await localDb.sessions.update(session.id!, { metadata: newMetadata });
                        session.metadata = newMetadata;
                    } catch (e) {
                        console.error(`❌ Failed to upload audio for session ${session.id}:`, e);
                        continue;
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

function cleanData(data: any) {
    const clean = { ...data };
    Object.keys(clean).forEach(key => (clean[key] === undefined || clean[key] === null) && delete clean[key]);
    return clean;
}
