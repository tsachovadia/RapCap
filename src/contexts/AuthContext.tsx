import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithRedirect,
    signInWithPopup,
    getRedirectResult,
    signOut,
    setPersistence,
    browserLocalPersistence
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const initAuth = async () => {
            console.log("🚀 Auth: Initializing...");
            try {
                // 1. Set persistence explicitly
                await setPersistence(auth, browserLocalPersistence);

                // 2. Check for redirect result
                console.log("🔍 Auth: Checking redirect result...");
                const result = await getRedirectResult(auth);
                if (result && isMounted) {
                    console.log("✅ Auth: Redirect result found for", result.user.email);
                    setUser(result.user);
                } else {
                    console.log("ℹ️ Auth: No redirect result found on this load");
                }
            } catch (error) {
                console.error("❌ Auth: Initialization error", error);
            }

            // 3. Setup long-term listener
            const unsubscribe = onAuthStateChanged(auth, (u) => {
                if (!isMounted) return;
                console.log("👤 Auth: State Changed ->", u ? `Member (${u.email})` : "Guest");
                setUser(u);
                setLoading(false);
            });

            return unsubscribe;
        };

        const authPromise = initAuth();

        return () => {
            isMounted = false;
            authPromise.then(unsub => unsub && unsub());
        };
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        // Force account selection to help with debug/switching
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            console.log("🔑 Auth: Starting Sign-In Flow...");

            // On mobile/PWA, try redirect. On desktop, try popup.
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

            if (isMobile || isStandalone) {
                console.log("📱 Mobile/PWA detected, using signInWithRedirect");
                await signInWithRedirect(auth, provider);
            } else {
                console.log("💻 Desktop detected, using signInWithPopup");
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error("❌ Auth: Sign-In Error", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error", error);
        }
    };

    const value = {
        user,
        loading,
        signInWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
