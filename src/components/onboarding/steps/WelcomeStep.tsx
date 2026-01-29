import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface WelcomeStepProps {
    onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
    return (
        <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                <Sparkles className="w-10 h-10 text-green-400" />
            </div>

            <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter text-white">
                    Welcome to <span className="text-green-400">RapCap</span>
                </h2>
                <p className="text-zinc-400 text-lg">
                    Your personal AI freestyle coach.
                </p>
            </div>

            <p className="text-zinc-500 leading-relaxed max-w-sm">
                We'll get you set up in just a few seconds so you can start spitting bars instantly.
            </p>

            <button
                onClick={onNext}
                className="group relative w-full max-w-xs flex items-center justify-center gap-3 bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-8 rounded-full transition-all active:scale-95"
            >
                <span>Let's Go</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
};
