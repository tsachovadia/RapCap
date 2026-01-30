declare const __BUILD_TIME__: string;

declare module 'virtual:pwa-register/react' {
    import type { Dispatch, SetStateAction } from 'react'

    export interface RegisterSWOptions {
        immediate?: boolean
        onNeedRefresh?: () => void
        onOfflineReady?: () => void
        onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
        onRegisterError?: (error: any) => void
    }

    export function useRegisterSW(options?: RegisterSWOptions): {
        needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
        offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
        updateServiceWorker: (reloadPage?: boolean) => Promise<void>
    }
}


/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OPENAI_API_KEY: string
    // more env variables...
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
