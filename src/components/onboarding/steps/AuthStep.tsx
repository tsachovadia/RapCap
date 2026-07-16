import React, { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface AuthStepProps {
    onNext: () => void;
}

export const AuthStep: React.FC<AuthStepProps> = ({ onNext }) => {
    const { signInWithGoogle, user, cloudEnabled } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = React.useState(false);
    const { updateProfile } = useProfile();

    const handleLogin = async () => {
        if (isLoggingIn) return;
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
        } catch (error: unknown) {
            console.error("Login failed in onboarding", error);
            const code = typeof error === 'object' && error !== null && 'code' in error
                ? String((error as { code?: unknown }).code)
                : '';
            // reset loading if it was a cancel or close
            if (code === 'auth/cancelled-popup-request' || code === 'auth/popup-closed-by-user') {
                setIsLoggingIn(false);
            }
        } finally {
            // Note: we don't set setIsLoggingIn(false) here if successful 
            // because the useEffect will handle the transition once the user object arrives
        }
    };

    useEffect(() => {
        if (user) {
            console.log("Onboarding AuthStep: User detected, updating profile and moving next...", user.uid);
            // Sync Google Profile to Local Profile
            updateProfile({
                name: user.displayName || 'Unknown Rapper',
                avatarUrl: user.photoURL,
                avatarColor: user.photoURL ? '#000000' : '#1DB954' // Use black if we have an image
            });

            // Proceed to next step automatically
            onNext();
        } else {
            console.log("Onboarding AuthStep: No user detected in context");
        }
    }, [user, onNext, updateProfile]);

    return (
        <div className="flex flex-col h-full p-6 text-center animate-in slide-in-from-right duration-300">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white">שמור את האמנות שלך</h2>
                    <p className="text-lg text-zinc-400 max-w-xs mx-auto">
                        התחבר כדי לגבות את הפריסטיילים, המילים והתרגילים שלך בענן.
                    </p>
                </div>

                <div className="w-full max-w-sm space-y-4">
                    {!cloudEnabled ? (
                        <button
                            onClick={onNext}
                            className="w-full py-4 px-6 bg-[#1DB954] text-black font-bold rounded-xl hover:bg-[#1ed760] transition-transform active:scale-95"
                        >
                            המשך במצב מקומי
                        </button>
                    ) : (
                    <button
                        onClick={handleLogin}
                        disabled={isLoggingIn}
                        className="w-full py-4 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isLoggingIn ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                        )}
                        <span className="text-lg">התחבר עם Google</span>
                    </button>
                    )}

                    <p className="text-xs text-zinc-600">
                        {cloudEnabled
                            ? 'אנחנו שומרים רק את מה שאתה יוצר. בלי שטויות.'
                            : 'הסשנים נשמרים במכשיר. אפשר לחבר גיבוי ענן בהמשך.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
