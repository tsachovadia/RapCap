export type RecordingMode = 'freestyle' | 'thoughts'

export function resolveRecordingMode(value: string | null): RecordingMode {
    return value === 'thoughts' ? 'thoughts' : 'freestyle'
}
