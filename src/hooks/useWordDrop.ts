/**
 * useWordDrop - Manages word drop functionality for freestyle training
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { db } from '../db/db'
import { commonWordsHe, commonWordsEn } from '../data/wordBank'

export interface WordDropSettings {
    enabled: boolean
    interval: number
    quantity: number
    mode: 'random' | 'sequential'
}

interface UseWordDropOptions {
    language: 'he' | 'en'
    isActive: boolean // true when flowState === 'recording'
}

export function useWordDrop({ language, isActive }: UseWordDropOptions) {
    const [settings, setSettings] = useState<WordDropSettings>({
        enabled: false,
        interval: 4,
        quantity: 1,
        mode: 'random'
    })

    const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null)
    const [deckWords, setDeckWords] = useState<string[]>([])
    const [currentWords, setCurrentWords] = useState<string[]>([])

    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const sequenceIndexRef = useRef(0)

    // Fetch deck words when ID changes
    useEffect(() => {
        if (selectedDeckId !== null) {
            db.wordGroups.get(selectedDeckId).then(group => {
                if (group) setDeckWords(group.items)
            })
        } else {
            setDeckWords([])
        }
    }, [selectedDeckId])

    // Reset sequence when deck changes
    useEffect(() => {
        sequenceIndexRef.current = 0
    }, [selectedDeckId, deckWords])

    // Pool of all words (Dynamic)
    const activeWordPool = useMemo(() => {
        if (selectedDeckId !== null && deckWords.length > 0) {
            return deckWords
        }
        const source = language === 'he' ? commonWordsHe : commonWordsEn
        return source.map(w => w.word)
    }, [language, selectedDeckId, deckWords])

    // Generate next words
    const generateWords = useCallback(() => {
        const words: string[] = []

        if (settings.mode === 'sequential') {
            for (let i = 0; i < settings.quantity; i++) {
                const word = activeWordPool[sequenceIndexRef.current % activeWordPool.length]
                words.push(word)
                sequenceIndexRef.current = (sequenceIndexRef.current + 1) % activeWordPool.length
            }
        } else {
            for (let i = 0; i < settings.quantity; i++) {
                words.push(activeWordPool[Math.floor(Math.random() * activeWordPool.length)])
            }
        }

        return words
    }, [settings.mode, settings.quantity, activeWordPool])

    // Word drop interval effect
    useEffect(() => {
        if (settings.enabled && isActive) {
            const tick = () => {
                const words = generateWords()
                setCurrentWords(words)

                // Random variance (approx +/- 25% of interval)
                const variance = (settings.interval * 1000) * 0.5
                const base = settings.interval * 1000
                const nextInterval = base - (variance / 2) + Math.random() * variance

                intervalRef.current = setTimeout(tick, nextInterval)
            }
            tick()
        } else {
            setCurrentWords([])
            if (intervalRef.current) clearTimeout(intervalRef.current)
        }

        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current)
        }
    }, [settings.enabled, settings.interval, isActive, generateWords])

    const updateSettings = useCallback((updates: Partial<WordDropSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }))
    }, [])

    return {
        settings,
        setSettings,
        updateSettings,
        selectedDeckId,
        setSelectedDeckId,
        deckWords,
        currentWords,
        activeWordPool
    }
}
