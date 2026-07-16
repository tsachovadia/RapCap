import { describe, expect, it } from 'vitest'
import { getNextOnboardingStep } from './onboardingFlow'

describe('lean onboarding flow', () => {
    it('offers installation once in a mobile browser', () => {
        expect(getNextOnboardingStep({
            step: 'welcome',
            isMobile: true,
            isStandalone: false,
        })).toBe('install')
    })

    it('goes straight to the product when already installed', () => {
        expect(getNextOnboardingStep({
            step: 'welcome',
            isMobile: true,
            isStandalone: true,
        })).toBe('completed')
    })

    it('finishes after the installation explanation', () => {
        expect(getNextOnboardingStep({
            step: 'install',
            isMobile: true,
            isStandalone: false,
        })).toBe('completed')
    })
})
