import { createContext, useContext, useEffect, useState, useRef } from 'react';
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
import { syncService } from '../services/dbSync';

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
            console.log("🚀 Auth: Initializing...", {
                domain: auth.config.authDomain,
                isPWA: (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches
            });
            try {
                // 1. Set persistence explicitly
                console.log("🔍 Auth: Setting persistence...");
                await setPersistence(auth, browserLocalPersistence);
                console.log("✅ Auth: Persistence set.");

                // 2. Check for redirect result with a timeout to prevent hanging
                console.log("🔍 Auth: Checking redirect result...");

                // Create a promise that rejects after 5 seconds
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Redirect result check timed out')), 5000)
                );

                try {
                    const result = await Promise.race([
                        getRedirectResult(auth),
                        timeoutPromise
                    ]) as any; // Cast to any to avoid complex type union issues with the timeout

                    if (result && isMounted) {
                        console.log("✅ Auth: Redirect result found for", result.user.email);
                        setUser(result.user);
                    } else {
                        console.log("ℹ️ Auth: No redirect result found on this load");
                    }
                } catch (timeoutError) {
                    console.warn("⚠️ Auth: Redirect check timed out or failed, proceeding anyway:", timeoutError);
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

    // Automatic background sync when user logs in
    const lastSyncedUserRef = useRef<string | null>(null);
    useEffect(() => {
        if (user && user.uid !== lastSyncedUserRef.current) {
            console.log("🔄 Auth: User detected, launching background sync...");
            lastSyncedUserRef.current = user.uid;
            syncService.syncAll().catch(err => {
                console.error("❌ Auth: Background sync failed", err);
            });
        } else if (!user) {
            if (lastSyncedUserRef.current) {
                console.log("📡 Auth: User logged out, stopping listeners...");
                syncService.stopListeners();
            }
            lastSyncedUserRef.current = null;
        }

        return () => {
            // Usually AuthProvider stays mounted, but if it unmounts, stop listeners
            syncService.stopListeners();
        };
    }, [user]);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        // Force account selection to help with debug/switching
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
            console.log("🔑 Auth: Starting Sign-In Flow...", {
                isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                isStandalone: (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches,
                currentUrl: window.location.href
            });

            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

            if (isMobile || isStandalone) {
                console.log("📱 Mobile/PWA detected, using signInWithRedirect");
                await signInWithRedirect(auth, provider);
            } else {
                console.log("💻 Desktop detected, using signInWithPopup");
                const result = await signInWithPopup(auth, provider);
                console.log("✅ Auth: Popup success for", result.user.email);
                setUser(result.user);
            }
        } catch (error: any) {
            console.error("❌ Auth: Sign-In Error", {
                code: error.code,
                message: error.message,
                detail: error
            });
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
