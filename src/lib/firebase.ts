import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getAnalytics } from "firebase/analytics"; 

const isDev = import.meta.env.DEV;
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    // Use app's own domain for auth in production to bypass 3rd party cookie blocking
    authDomain: (isDev || hostname === 'localhost')
        ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
        : hostname,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app); // Note: We might need to rename the Dexie 'db' import in other files to avoid conflict
export const storage = getStorage(app);
// const analytics = getAnalytics(app); 

export default app;
