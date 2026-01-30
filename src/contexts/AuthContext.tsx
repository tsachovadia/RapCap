import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut
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
        // Handle redirect result
        const checkRedirect = async () => {
            console.log("🔍 Checking redirect result...");
            try {
                const result = await getRedirectResult(auth);
                if (result) {
                    console.log("✅ Successfully logged in via redirect", {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName
                    });
                    setUser(result.user);
                } else {
                    console.log("ℹ️ No redirect result found");
                }
            } catch (error) {
                console.error("❌ Error handling redirect result", error);
            }
        };
        checkRedirect();

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log("👤 Auth State Changed:", user ? `Logged in: ${user.uid}` : "Logged out");
            setUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Google Sign In Error", error);
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
