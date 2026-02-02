/**
 * Latency Calibration Service
 * 
 * Measures roundtrip audio latency (output + input) by:
 * 1. Playing reference beeps through speakers
 * 2. Recording them via microphone
 * 3. Detecting peaks in recorded audio
 * 4. Calculating average offset
 */

const STORAGE_KEY = 'rapcap_calibrated_latency'
const BEEP_FREQUENCY = 1000 // 1kHz for clear detection
const BEEP_DURATION = 0.05 // 50ms beeps
const BEEP_INTERVAL = 0.5 // 500ms between beeps
const BEEP_COUNT = 5
const DETECTION_THRESHOLD = 0.3 // Minimum peak amplitude (normalized)

export interface CalibrationResult {
    success: boolean
    latencyMs: number
    confidence: 'high' | 'medium' | 'low'
    detectedPeaks: number
    message: string
}

/**
 * Get stored calibrated latency from localStorage
 */
export function getCalibratedLatency(): number {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? Number(stored) : 0
    } catch {
        return 0
    }
}

/**
 * Store calibrated latency to localStorage
 */
export function storeCalibratedLatency(latencyMs: number): void {
    try {
        localStorage.setItem(STORAGE_KEY, String(Math.round(latencyMs)))
    } catch (e) {
        console.warn('Failed to store calibrated latency:', e)
    }
}

/**
 * Clear stored calibration
 */
export function clearCalibration(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch {
        // Ignore
    }
}

/**
 * Create a beep oscillator at specified time
 */
function scheduleBeep(
    audioContext: AudioContext,
    destination: AudioNode,
    startTime: number
): void {
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = BEEP_FREQUENCY

    // Envelope for clean start/stop
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(0.5, startTime + 0.005)
    gainNode.gain.setValueAtTime(0.5, startTime + BEEP_DURATION - 0.005)
    gainNode.gain.linearRampToValueAtTime(0, startTime + BEEP_DURATION)

    oscillator.connect(gainNode)
    gainNode.connect(destination)

    oscillator.start(startTime)
    oscillator.stop(startTime + BEEP_DURATION)
}

/**
 * Play calibration beeps and return expected timestamps
 */
export async function playCalibrationBeeps(
    audioContext: AudioContext
): Promise<{ expectedTimes: number[]; startTime: number }> {
    // Ensure context is running
    if (audioContext.state === 'suspended') {
        await audioContext.resume()
    }

    const startTime = audioContext.currentTime + 0.5 // 500ms lead time
    const expectedTimes: number[] = []

    for (let i = 0; i < BEEP_COUNT; i++) {
        const beepTime = startTime + i * BEEP_INTERVAL
        scheduleBeep(audioContext, audioContext.destination, beepTime)
        expectedTimes.push((i * BEEP_INTERVAL) * 1000) // Convert to ms relative to start
    }

    return { expectedTimes, startTime }
}

/**
 * Analyze recorded audio buffer for peaks
 * Returns timestamps (in ms) of detected peaks
 */
export function analyzeRecordingForPeaks(
    audioBuffer: AudioBuffer
): number[] {
    const channelData = audioBuffer.getChannelData(0)
    const sampleRate = audioBuffer.sampleRate
    const peaks: number[] = []

    // Find peak amplitudes
    let maxAmplitude = 0
    for (let i = 0; i < channelData.length; i++) {
        const absVal = Math.abs(channelData[i])
        if (absVal > maxAmplitude) maxAmplitude = absVal
    }

    if (maxAmplitude < 0.01) {
        console.warn('Recording appears silent - no peaks detected')
        return []
    }

    // Normalize threshold
    const threshold = maxAmplitude * DETECTION_THRESHOLD

    // Sliding window peak detection
    const windowSize = Math.floor(sampleRate * 0.02) // 20ms window
    const minPeakDistance = Math.floor(sampleRate * 0.3) // 300ms between peaks

    let lastPeakSample = -minPeakDistance

    for (let i = windowSize; i < channelData.length - windowSize; i++) {
        // Skip if too close to last peak
        if (i - lastPeakSample < minPeakDistance) continue

        // Check if this is a local maximum
        const current = Math.abs(channelData[i])
        if (current < threshold) continue

        let isLocalMax = true
        for (let j = i - windowSize; j <= i + windowSize; j++) {
            if (Math.abs(channelData[j]) > current) {
                isLocalMax = false
                break
            }
        }

        if (isLocalMax) {
            const timeMs = (i / sampleRate) * 1000
            peaks.push(timeMs)
            lastPeakSample = i
        }
    }

    return peaks
}

/**
 * Calculate roundtrip latency from expected and detected peak times
 */
export function calculateLatency(
    expectedTimes: number[],
    detectedTimes: number[]
): CalibrationResult {
    if (detectedTimes.length === 0) {
        return {
            success: false,
            latencyMs: 0,
            confidence: 'low',
            detectedPeaks: 0,
            message: 'No peaks detected. Make sure your microphone can hear your speakers.'
        }
    }

    if (detectedTimes.length < 3) {
        return {
            success: false,
            latencyMs: 0,
            confidence: 'low',
            detectedPeaks: detectedTimes.length,
            message: `Only ${detectedTimes.length} beeps detected. Try increasing volume or moving closer to mic.`
        }
    }

    // Match detected peaks to expected peaks and calculate offsets
    const offsets: number[] = []

    for (let i = 0; i < Math.min(expectedTimes.length, detectedTimes.length); i++) {
        const expected = expectedTimes[i]
        const detected = detectedTimes[i]
        const offset = detected - expected

        // Sanity check: offset should be positive and < 500ms
        if (offset > 0 && offset < 500) {
            offsets.push(offset)
        }
    }

    if (offsets.length === 0) {
        return {
            success: false,
            latencyMs: 0,
            confidence: 'low',
            detectedPeaks: detectedTimes.length,
            message: 'Could not match beeps. Try again in a quieter environment.'
        }
    }

    // Calculate average and standard deviation
    const avgOffset = offsets.reduce((a, b) => a + b, 0) / offsets.length
    const variance = offsets.reduce((acc, val) => acc + Math.pow(val - avgOffset, 2), 0) / offsets.length
    const stdDev = Math.sqrt(variance)

    // Determine confidence based on consistency
    let confidence: 'high' | 'medium' | 'low'
    if (offsets.length >= 4 && stdDev < 15) {
        confidence = 'high'
    } else if (offsets.length >= 3 && stdDev < 30) {
        confidence = 'medium'
    } else {
        confidence = 'low'
    }

    // Warn about potential Bluetooth
    let message = `Detected ${offsets.length} beeps. Latency: ${Math.round(avgOffset)}ms`
    if (avgOffset > 200) {
        message += ' (High latency - Bluetooth device?)'
    }

    return {
        success: true,
        latencyMs: avgOffset,
        confidence,
        detectedPeaks: offsets.length,
        message
    }
}

/**
 * Run full calibration procedure
 * Returns the latency result. Caller should handle UI.
 */
export async function runCalibration(
    micStream: MediaStream
): Promise<CalibrationResult> {
    const audioContext = new AudioContext()

    try {
        // Create MediaRecorder for mic input
        const mediaRecorder = new MediaRecorder(micStream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : undefined
        })

        const audioChunks: Blob[] = []
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) audioChunks.push(e.data)
        }

        // Start recording
        mediaRecorder.start()

        // Small delay to ensure recorder is ready
        await new Promise(r => setTimeout(r, 200))

        // Play beeps and get expected times
        const { expectedTimes } = await playCalibrationBeeps(audioContext)

        // Wait for all beeps to complete plus buffer
        const totalDuration = (BEEP_COUNT * BEEP_INTERVAL + 1) * 1000
        await new Promise(r => setTimeout(r, totalDuration))

        // Stop recording
        mediaRecorder.stop()
        await new Promise<void>(resolve => {
            mediaRecorder.onstop = () => resolve()
        })

        // Decode recorded audio
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
        const arrayBuffer = await audioBlob.arrayBuffer()

        let audioBuffer: AudioBuffer
        try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        } catch (e) {
            return {
                success: false,
                latencyMs: 0,
                confidence: 'low',
                detectedPeaks: 0,
                message: 'Failed to decode recorded audio. Please try again.'
            }
        }

        // Analyze for peaks
        const detectedTimes = analyzeRecordingForPeaks(audioBuffer)

        // Calculate latency
        const result = calculateLatency(expectedTimes, detectedTimes)

        // Store if successful
        if (result.success) {
            storeCalibratedLatency(result.latencyMs)
        }

        return result

    } finally {
        // Cleanup
        await audioContext.close()
    }
}
