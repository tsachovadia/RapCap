import { db, type Beat } from './db'

interface SaveCustomBeatInput {
    videoId: string
    name: string
    presetVideoIds?: string[]
}

export type SaveCustomBeatResult =
    | { status: 'saved'; beat: Beat }
    | { status: 'existing'; beat: Beat }
    | { status: 'preset' }

export const beatRepo = {
    list: () => db.beats.orderBy('createdAt').reverse().toArray(),

    findByVideoId: (videoId: string) => db.beats.where('videoId').equals(videoId).first(),

    saveCustom: ({ videoId, name, presetVideoIds = [] }: SaveCustomBeatInput): Promise<SaveCustomBeatResult> =>
        db.transaction('rw', db.beats, async () => {
            if (presetVideoIds.includes(videoId)) return { status: 'preset' }

            const existing = await db.beats.where('videoId').equals(videoId).first()
            if (existing) return { status: 'existing', beat: existing }

            const beat: Beat = {
                name: name.trim() || 'Imported Beat',
                videoId,
                category: 'custom',
                createdAt: new Date(),
            }
            const id = await db.beats.add(beat)
            return { status: 'saved', beat: { ...beat, id: Number(id) } }
        }),
}
