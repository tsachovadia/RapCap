import React from 'react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { WelcomeStep } from './steps/WelcomeStep';
import { InstallStep } from './steps/InstallStep';
import { MicrophoneStep } from './steps/MicrophoneStep';
import { NotificationStep } from './steps/NotificationStep';
import { X } from 'lucide-react';

export const OnboardingWizard: React.FC = () => {
    const {
        step,
        isOpen,
        nextStep,
        completeOnboarding,
        isIOS,
        checkPermissions,
        hasMicPermission
    } = useOnboarding();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full sm:max-w-md h-[85vh] sm:h-auto sm:min-h-[500px] bg-zinc-950 border-t sm:border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">

                {/* Close/Skip Button (Top Right) */}
                <button
                    onClick={completeOnboarding}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors z-20"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {step === 'welcome' && <WelcomeStep onNext={nextStep} />}
                    {step === 'install' && <InstallStep onNext={nextStep} isIOS={isIOS} />}
                    {step === 'microphone' && (
                        <MicrophoneStep
                            onNext={nextStep}
                            checkPermissions={checkPermissions}
                            checkPermissions={checkPermissions}
                        />
                    )}
                    {step === 'notifications' && (
                        <NotificationStep
                            onNext={nextStep}
                            checkPermissions={checkPermissions}
                        />
                    )}
                </div>

                {/* Progress Indicator (Optional) */}
                <div className="h-1 flex w-full bg-zinc-900 mt-auto">
                    <div
                        className="bg-green-500 transition-all duration-500"
                        style={{
                            width: step === 'welcome' ? '25%'
                                : step === 'install' ? '50%'
                                    : step === 'microphone' ? '75%'
                                        : '100%'
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
