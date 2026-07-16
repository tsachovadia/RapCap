import { describe, expect, it } from 'vitest'
import { createFirebaseRuntimeConfig } from './firebaseConfig'

describe('Firebase runtime config', () => {
    it('falls back to a non-crashing local-only config when env is missing', () => {
        const runtime = createFirebaseRuntimeConfig({}, '127.0.0.1', false)

        expect(runtime.enabled).toBe(false)
        expect(runtime.config.apiKey).toBeTruthy()
        expect(runtime.config.projectId).toBe('rapcap-local')
    })

    it('uses configured Firebase values on localhost', () => {
        const runtime = createFirebaseRuntimeConfig({
            VITE_FIREBASE_API_KEY: 'test-key',
            VITE_FIREBASE_AUTH_DOMAIN: 'rapcap.firebaseapp.com',
            VITE_FIREBASE_PROJECT_ID: 'rapcap',
            VITE_FIREBASE_APP_ID: 'test-app',
        }, 'localhost', true)

        expect(runtime.enabled).toBe(true)
        expect(runtime.config.authDomain).toBe('rapcap.firebaseapp.com')
    })

    it('uses the app hostname for configured production auth', () => {
        const runtime = createFirebaseRuntimeConfig({
            VITE_FIREBASE_API_KEY: 'test-key',
            VITE_FIREBASE_AUTH_DOMAIN: 'rapcap.firebaseapp.com',
            VITE_FIREBASE_PROJECT_ID: 'rapcap',
            VITE_FIREBASE_APP_ID: 'test-app',
        }, 'app.rapcap.example', false)

        expect(runtime.config.authDomain).toBe('app.rapcap.example')
    })
})
