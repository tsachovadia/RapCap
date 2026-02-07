/**
 * Platform Detection Utilities
 * Detect iOS, Safari, PWA mode, and Speech API support
 */

/** Check if running on iOS (iPhone, iPad, iPod) */
export function isIOS(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
}

/** Check if running in Safari (desktop or iOS) */
export function isSafari(): boolean {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua);
}

/** Check if running on iOS Safari specifically */
export function isIOSSafari(): boolean {
    return isIOS() && isSafari();
}

/** Check if running in PWA standalone mode */
export function isStandalonePWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone === true;
}

/** Check if running in iOS PWA mode */
export function isIOSPWA(): boolean {
    return isIOS() && isStandalonePWA();
}

/** Check if running on iOS Chrome */
export function isIOSChrome(): boolean {
    const ua = navigator.userAgent;
    return isIOS() && /CriOS/i.test(ua);
}

/**
 * Check if Web Speech API is likely to work reliably
 * iOS Safari has partial support since 14.5 but with frequent failures
 * iOS Chrome (and other iOS browsers) use WebKit but have NO access to Speech API
 * Chrome/Edge on desktop/Android have full support
 */
export function hasReliableSpeechRecognition(): boolean {
    // iOS Chrome/Firefox etc. do NOT support Speech Recognition at all
    if (isIOS() && !isSafari()) {
        return false;
    }

    // Check if API exists at all
    const hasAPI = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if (!hasAPI) return false;

    // iOS Safari has partial/buggy support - we'll try it but it may fail
    // Return true to attempt it, but callers should have fallback logic
    return true;
}

/**
 * Check if MediaRecorder likely supports a given MIME type
 * Wrapper around isTypeSupported with iOS-specific handling
 */
export function getPreferredAudioMimeType(): string {
    // iOS Safari prefers MP4/AAC, doesn't support WebM well
    const iOSTypes = ['audio/mp4', 'audio/aac', 'audio/webm'];
    const standardTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];

    const typesToTry = isIOS() ? iOSTypes : standardTypes;

    for (const type of typesToTry) {
        if (MediaRecorder.isTypeSupported(type)) {
            console.log(`📦 Selected MIME type: ${type} (iOS: ${isIOS()})`);
            return type;
        }
    }

    console.warn('⚠️ No supported MIME type found, using default');
    return '';
}

/** Log platform info for debugging */
export function logPlatformInfo(): void {
    console.log('📱 Platform Info:', {
        isIOS: isIOS(),
        isSafari: isSafari(),
        isIOSSafari: isIOSSafari(),
        isStandalonePWA: isStandalonePWA(),
        isIOSPWA: isIOSPWA(),
        userAgent: navigator.userAgent
    });
}
