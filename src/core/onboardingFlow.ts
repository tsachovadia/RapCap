export type LeanOnboardingStep = 'welcome' | 'install' | 'completed'

interface NextOnboardingStepInput {
    step: LeanOnboardingStep
    isMobile: boolean
    isStandalone: boolean
}

export function getNextOnboardingStep({
    step,
    isMobile,
    isStandalone,
}: NextOnboardingStepInput): LeanOnboardingStep {
    if (step === 'welcome') {
        return isMobile && !isStandalone ? 'install' : 'completed'
    }

    return 'completed'
}
