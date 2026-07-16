export interface FirebaseEnvironment {
    VITE_FIREBASE_API_KEY?: string
    VITE_FIREBASE_AUTH_DOMAIN?: string
    VITE_FIREBASE_PROJECT_ID?: string
    VITE_FIREBASE_STORAGE_BUCKET?: string
    VITE_FIREBASE_MESSAGING_SENDER_ID?: string
    VITE_FIREBASE_APP_ID?: string
    VITE_FIREBASE_MEASUREMENT_ID?: string
}

const offlineConfig = {
    apiKey: 'AIzaSyD-rapcap-local-only-development-key',
    authDomain: 'localhost',
    projectId: 'rapcap-local',
    storageBucket: 'rapcap-local.invalid',
    messagingSenderId: '0',
    appId: '1:0:web:rapcap-local',
}

export function createFirebaseRuntimeConfig(
    env: FirebaseEnvironment,
    hostname: string,
    isDev: boolean,
) {
    const enabled = Boolean(
        env.VITE_FIREBASE_API_KEY &&
        env.VITE_FIREBASE_AUTH_DOMAIN &&
        env.VITE_FIREBASE_PROJECT_ID &&
        env.VITE_FIREBASE_APP_ID,
    )

    if (!enabled) return { enabled, config: offlineConfig }

    return {
        enabled,
        config: {
            apiKey: env.VITE_FIREBASE_API_KEY,
            authDomain: isDev || hostname === 'localhost' || hostname === '127.0.0.1'
                ? env.VITE_FIREBASE_AUTH_DOMAIN
                : hostname,
            projectId: env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: env.VITE_FIREBASE_APP_ID,
            measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
        },
    }
}
