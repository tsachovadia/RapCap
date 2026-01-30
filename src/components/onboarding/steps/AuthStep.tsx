import React, { useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfile } from '../../../hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface AuthStepProps {
    onNext: () => void;
}

export const AuthStep: React.FC<AuthStepProps> = ({ onNext }) => {
    const { signInWithGoogle, user, loading } = useAuth();
    const { updateProfile } = useProfile();

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            // onNext will be called by the useEffect below once user is detected
        } catch (error) {
            console.error("Login failed in onboarding", error);
        }
    };

    useEffect(() => {
        if (user) {
            // Sync Google Profile to Local Profile
            updateProfile({
                name: user.displayName || 'Unknown Rapper',
                avatarUrl: user.photoURL,
                avatarColor: user.photoURL ? '#000000' : '#1DB954' // Use black if we have an image
            });

            // Proceed to next step automatically
            onNext();
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
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full py-4 px-6 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-transform active:scale-95 flex items-center justify-center gap-3"
                    >
                        {loading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
                        )}
                        <span className="text-lg">התחבר עם Google</span>
                    </button>

                    <p className="text-xs text-zinc-600">
                        אנחנו שומרים רק את מה שאתה יוצר. בלי שטויות.
                    </p>
                </div>
            </div>
        </div>
    );
};
