import { useRef, useEffect } from 'react'

interface WaveformTrackProps {
    peaks: number[]
    color?: string
    height?: number
    progress?: number // 0-100 indicating playback progress
}

export default function WaveformTrack({ peaks, color = '#fff', height = 64, progress = 0 }: WaveformTrackProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Handle High DPI
        const dpr = window.devicePixelRatio || 1
        const rect = canvas.getBoundingClientRect()

        canvas.width = rect.width * dpr
        canvas.height = rect.height * dpr

        ctx.scale(dpr, dpr)

        // Clear
        ctx.clearRect(0, 0, rect.width, rect.height)

        // Draw Config
        const barWidth = 3
        const gap = 1
        const totalBars = Math.floor(rect.width / (barWidth + gap))

        // Resample peaks to fit screen width
        const renderPeaks = resample(peaks, totalBars)

        // Draw
        const centerY = rect.height / 2

        renderPeaks.forEach((peak, i) => {
            const x = i * (barWidth + gap)
            const barHeight = Math.max(2, peak * rect.height) // Min height 2px

            // Color logic based on progress
            const progressX = (progress / 100) * rect.width
            const isPlayed = x < progressX

            ctx.fillStyle = isPlayed ? '#1DB954' : color
            ctx.globalAlpha = isPlayed ? 1 : 0.6

            // Draw rounded bar centered vertically
            ctx.beginPath()
            ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2)
            ctx.fill()
        })

    }, [peaks, color, height, progress])

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ height }}
        />
    )
}

function resample(data: number[], targetLength: number) {
    if (!data || data.length === 0) return []
    if (data.length <= targetLength) return data

    const step = Math.floor(data.length / targetLength)
    const result = []

    for (let i = 0; i < targetLength; i++) {
        const start = i * step
        const end = start + step
        let max = 0
        for (let j = start; j < end && j < data.length; j++) {
            if (data[j] > max) max = data[j]
        }
        result.push(max)
    }
    return result
}
