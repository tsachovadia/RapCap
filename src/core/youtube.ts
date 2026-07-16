const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/

const validId = (value: string | null | undefined) =>
    value && VIDEO_ID_PATTERN.test(value) ? value : null

export function extractYouTubeVideoId(input: string): string | null {
    const trimmed = input.trim()
    const bareId = validId(trimmed)
    if (bareId) return bareId

    try {
        const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
        const hostname = url.hostname.replace(/^(www\.|m\.)/, '')

        if (hostname === 'youtu.be') {
            return validId(url.pathname.split('/').filter(Boolean)[0])
        }

        if (hostname === 'youtube.com' || hostname === 'music.youtube.com') {
            const queryId = validId(url.searchParams.get('v'))
            if (queryId) return queryId

            const parts = url.pathname.split('/').filter(Boolean)
            if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
                return validId(parts[1])
            }
        }
    } catch {
        return null
    }

    return null
}

export function youtubeWatchUrl(videoId: string): string | null {
    const id = validId(videoId)
    return id ? `https://www.youtube.com/watch?v=${id}` : null
}
