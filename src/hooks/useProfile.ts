import { useState, useEffect } from 'react'

export interface UserProfile {
    name: string
    bio: string
    avatarColor: string
    avatarUrl?: string | null
    isOnboarded: boolean
}

const DEFAULT_PROFILE: UserProfile = {
    name: 'אורח',
    bio: '',
    avatarColor: '#1DB954', // Spotify Green
    isOnboarded: false
}

export function useProfile() {
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE)
    const [isLoading, setIsLoading] = useState(true)

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('rapcap_profile')
        if (saved) {
            try {
                setProfile({ ...DEFAULT_PROFILE, ...JSON.parse(saved) })
            } catch (e) {
                console.error('Failed to parse profile', e)
            }
        }
        setIsLoading(false)
    }, [])

    // Save to localStorage
    const updateProfile = (updates: Partial<UserProfile>) => {
        const newProfile = { ...profile, ...updates }
        setProfile(newProfile)
        localStorage.setItem('rapcap_profile', JSON.stringify(newProfile))
    }

    // Reset profile (for "Delete All Data")
    const resetProfile = () => {
        setProfile(DEFAULT_PROFILE)
        localStorage.removeItem('rapcap_profile')
    }

    return {
        profile,
        updateProfile,
        resetProfile,
        isLoading
    }
}
