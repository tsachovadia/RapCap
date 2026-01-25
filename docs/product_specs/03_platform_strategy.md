# Platform Strategy: PWA vs Native (Truthseeking)

## 1. The Decision: Mobile Web App (PWA)
We have decided to build Artifex as a **Progressive Web App (PWA)** for the MVP phase.

### Why PWA? (The Trade-offs)

| Consideration | Native App (iOS/Android) | PWA (Web App) | Decision Factor |
| :--- | :--- | :--- | :--- |
| **YouTube Integration** | **Risky**. Embedding YouTube in native views often violates Terms of Service or App Store guidelines (background play restrictions). | **Safe**. Standard IFrame API usage is fully supported and expected in web environments. | **YouTube Legal Safety** |
| **Background Audio** | **Strong**. Can record while phone is OFF. | **Weak**. iOS Safari kills audio in background tabs aggressively. | **Mitigation Required** |
| **Distribution** | Slow (App Store Review). | Instant (URL). | **Velocity** |

## 2. Technical Mitigations for "Driver Mode"
Since we cannot record in the background on iOS Web efficiently:

1.  **Wake Lock API**: We MUST implement the `Screen Wake Lock API`.
    *   **Behavior**: When "Record" is active, the screen must NOT dim or lock.
    *   **UX**: The UI should encourage the user to keep the phone mounted (e.g., on a bike mount) or active.
2.  **Manifest.json**:
    *   `display: standalone`: To remove the URL bar and browser chrome.
    *   `apple-mobile-web-app-capable: yes`: For iOS home screen integration.

## 3. Future Native Path
If we hit a hard ceiling with PWA (e.g., Background Audio is too critical), we will wrap the codebase using **Capacitor** to access native plugins while keeping the React core.
