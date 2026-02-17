import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function AuthPage() {
    const { signInWithGoogle, user } = useAuth();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Redirect if already logged in
    if (user) {
        navigate('/library');
        return null;
    }

    const handleGoogleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
            navigate('/library');
        } catch (error) {
            console.error(error);
            showToast('שגיאה בהתחברות', 'error');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#181818] p-8 rounded-2xl border border-[#282828] text-center">
                <h1 className="text-3xl font-bold mb-2">RapCap Cloud ☁️</h1>
                <p className="text-subdued mb-8">התחבר כדי לגבות את השירים והחרוזים שלך</p>

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isLoggingIn}
                        className="w-full py-3 px-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-3"
                    >
                        {isLoggingIn ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        )}
                        התחבר עם Google
                    </button>

                    {/* Placeholder for future Email/Password auth if needed */}
                </div>

                <p className="mt-6 text-xs text-subdued">
                    בכניסה למערכת אתה מסכים לא נשמור עליך כלום חוץ מאת המילים והשירים שלך.
                </p>
            </div>
        </div>
    );
}
