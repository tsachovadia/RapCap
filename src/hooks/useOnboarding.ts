import { useState, useEffect } from 'react';

export type OnboardingStep = 'welcome' | 'auth' | 'install' | 'microphone' | 'notifications' | 'completed';

interface OnboardingState {
    step: OnboardingStep;
    isOpen: boolean;
    isStandalone: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    hasMicPermission: boolean;
    hasNotificationPermission: boolean;
    completeOnboarding: () => void;
    nextStep: () => void;
    checkPermissions: () => Promise<void>;
}

export const useOnboarding = (): OnboardingState => {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<OnboardingStep>('welcome');
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAndroid, setIsAndroid] = useState(false);
    const [hasMicPermission, setHasMicPermission] = useState(false);
    const [hasNotificationPermission, setHasNotificationPermission] = useState(false);

    useEffect(() => {
        // 1. Check if onboarding is already completed
        const completed = localStorage.getItem('rapcap-onboarding-completed');
        if (completed === 'true') {
            return; // Do nothing, keep isOpen false
        }

        // 2. Detect Environment
        const ua = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(ua);
        const android = /android/.test(ua);

        // Check standalone mode (PWA installed)
        const standalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsIOS(ios);
        setIsAndroid(android);
        setIsStandalone(standalone);

        // 3. Determine Initial Step
        // If not installed and on mobile, we might want to suggest install first.
        // However, we start with 'welcome' always for a smooth intro.
        setStep('welcome');
        setIsOpen(true);

        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        // Check Notification logic (safely)
        if (typeof Notification !== 'undefined') {
            setHasNotificationPermission(Notification.permission === 'granted');
        }

        // Mic permission is harder to check without triggering it in some browsers,
        // but we can check if we effectively have access via enumerateDevices if previously granted.
        // For onboarding flow, we usually assume false until they click 'Enable'.
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasMic = devices.some(d => d.kind === 'audioinput' && d.label !== '');
            setHasMicPermission(hasMic);
        } catch (e) {
            console.warn("Could not check audio devices", e);
        }
    };

    const nextStep = () => {
        switch (step) {
            case 'welcome':
                setStep('auth');
                break;

            case 'auth':
                // Check standalone/mobile logic for install step
                if (!isStandalone && (isIOS || isAndroid)) {
                    setStep('install');
                } else {
                    setStep('microphone');
                }
                break;

            case 'install':
                // If they are in the browser, they might be stuck here until they install.
                // But we allow them to 'Continue' to try the app in browser if they really want,
                // OR the 'Next' button typically moves to Mic if they say "I'll do it later".
                setStep('microphone');
                break;

            case 'microphone':
                // iOS only supports Notifications in Standalone.
                // Android supports them generally.
                // If iOS browser (not standalone), skip notifications as they won't work.
                if (isIOS && !isStandalone) {
                    completeOnboarding();
                } else {
                    setStep('notifications');
                }
                break;

            case 'notifications':
                completeOnboarding();
                break;
        }
    };

    const completeOnboarding = () => {
        localStorage.setItem('rapcap-onboarding-completed', 'true');
        setIsOpen(false);
        setStep('completed');
    };

    return {
        step,
        isOpen,
        isStandalone,
        isIOS,
        isAndroid,
        hasMicPermission,
        hasNotificationPermission,
        completeOnboarding,
        nextStep,
        checkPermissions
    };
};
