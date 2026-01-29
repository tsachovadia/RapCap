import React from 'react';
import { Share, PlusSquare, Smartphone, ArrowRight } from 'lucide-react';

interface InstallStepProps {
    onNext: () => void;
    isIOS: boolean;
}

export const InstallStep: React.FC<InstallStepProps> = ({ onNext, isIOS }) => {
    return (
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                    <Smartphone className="w-10 h-10 text-blue-400" />
                </div>

                <h2 className="text-2xl font-bold text-white">Install the App</h2>

                <p className="text-zinc-400">
                    For the best experience (and to prevent black screens), install RapCap to your home screen.
                </p>

                {isIOS ? (
                    <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 w-full max-w-sm text-left space-y-4 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg text-blue-400">
                                <Share className="w-4 h-4" />
                            </div>
                            <span className="text-zinc-300">1. Tap the <span className="text-blue-400 font-semibold">Share</span> icon below</span>
                        </div>
                        <div className="w-px h-6 bg-zinc-800 ml-4"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-lg text-zinc-300">
                                <PlusSquare className="w-4 h-4" />
                            </div>
                            <span className="text-zinc-300">2. Select <span className="text-white font-semibold">Add to Home Screen</span></span>
                        </div>
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 text-left space-y-4">
                        <p className="text-zinc-300">Tap the browser menu (⋮) and select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</p>
                    </div>
                )}
            </div>

            <div className="w-full max-w-xs space-y-4 mt-8 pb-8">
                <div className="text-xs text-zinc-500">
                    Note: If you are already in the app, just click Continue.
                </div>
                <button
                    onClick={onNext}
                    className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 px-8 rounded-full transition-all active:scale-95"
                >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
    );
};
