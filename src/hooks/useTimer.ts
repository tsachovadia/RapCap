/**
 * useTimer hook - Countdown timer for drills
 */
import { useState, useEffect, useCallback, useRef } from 'react'

interface UseTimerReturn {
    timeLeft: number
    isRunning: boolean
    isFinished: boolean
    start: () => void
    pause: () => void
    resume: () => void
    reset: () => void
    formatTime: (seconds: number) => string
}

export function useTimer(durationSeconds: number): UseTimerReturn {
    const [timeLeft, setTimeLeft] = useState(durationSeconds)
    const [isRunning, setIsRunning] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const intervalRef = useRef<number | null>(null)

    const clearTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
        }
    }, [])

    const start = useCallback(() => {
        setTimeLeft(durationSeconds)
        setIsRunning(true)
        setIsFinished(false)
    }, [durationSeconds])

    const pause = useCallback(() => {
        setIsRunning(false)
        clearTimer()
    }, [clearTimer])

    const resume = useCallback(() => {
        if (!isFinished) {
            setIsRunning(true)
        }
    }, [isFinished])

    const reset = useCallback(() => {
        clearTimer()
        setTimeLeft(durationSeconds)
        setIsRunning(false)
        setIsFinished(false)
    }, [durationSeconds, clearTimer])

    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }, [])

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            intervalRef.current = window.setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearTimer()
                        setIsRunning(false)
                        setIsFinished(true)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }

        return () => clearTimer()
    }, [isRunning, clearTimer])

    // Reset when duration changes
    useEffect(() => {
        setTimeLeft(durationSeconds)
        setIsFinished(false)
    }, [durationSeconds])

    return {
        timeLeft,
        isRunning,
        isFinished,
        start,
        pause,
        resume,
        reset,
        formatTime,
    }
}
