import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { createFirebaseRuntimeConfig } from "../core/firebaseConfig";
// import { getAnalytics } from "firebase/analytics"; 

const isDev = import.meta.env.DEV;
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const runtime = createFirebaseRuntimeConfig({
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}, hostname, isDev);
const firebaseConfig = runtime.config;
export const firebaseEnabled = runtime.enabled;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app); // Note: We might need to rename the Dexie 'db' import in other files to avoid conflict
export const storage = getStorage(app);
// const analytics = getAnalytics(app); 

export default app;
