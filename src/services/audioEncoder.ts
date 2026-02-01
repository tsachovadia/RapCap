import lamejs from './lame.all.js';
import { ysFixWebmDuration } from './webmFix';

/**
 * Converts an audio Blob (WebM/WAV) to an MP3 Blob using lamejs.
 * @param blob The source audio blob.
 * @param durationMs Optional duration in milliseconds to inject if decoding fails (WebM fix).
 * @returns Promise resolving to an MP3 Blob.
 */
export async function convertBlobToMp3(blob: Blob, durationMs?: number): Promise<Blob> {
    return new Promise(async (resolve) => {
        try {
            console.log(`🎙️ Starting MP3 conversion. Blob type: ${blob.type}, size: ${blob.size} bytes`);

            // 1. Read Blob as ArrayBuffer
            let arrayBuffer = await blob.arrayBuffer();

            // 2. Decode Audio Data (WebM -> PCM)
            // Use .slice(0) to create a copy, which is safer for decodeAudioData in some browsers
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            let audioBuffer: AudioBuffer;
            try {
                if (arrayBuffer.byteLength === 0) {
                    throw new Error("Empty ArrayBuffer. The source blob may be corrupted or empty.");
                }
                audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            } catch (decodeError) {
                console.warn("⚠️ Audio decoding failed. Attempting WebM Duration Fix...", { error: decodeError });

                // Attempt to fix WebM duration if provided
                if (durationMs && durationMs > 0 && blob.type.includes('webm')) {
                    try {
                        const fixedBlob = await ysFixWebmDuration(blob, durationMs, true);
                        const fixedBuffer = await fixedBlob.arrayBuffer();
                        audioBuffer = await audioContext.decodeAudioData(fixedBuffer);
                        console.log("✅ WebM Fix Successful! Decoding proceeded.");
                    } catch (fixError) {
                        console.error("❌ WebM Fix/Second Decode Failed:", fixError);
                        audioContext.close();
                        return resolve(blob);
                    }
                } else {
                    console.warn("⚠️ No duration provided or not WebM. Cannot fix.");
                    audioContext.close();
                    return resolve(blob);
                }
            }

            // 3. Prepare Encoder
            const channels = 1;
            const sampleRate = audioBuffer.sampleRate;
            const kbps = 128;

            const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);

            // 4. Get PCM Data
            const pcmData = audioBuffer.getChannelData(0);

            // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767) for lamejs
            const samples = new Int16Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                let s = Math.max(-1, Math.min(1, pcmData[i]));
                samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // 5. Encode
            const mp3Data: Int8Array[] = [];
            const sampleBlockSize = 1152;

            for (let i = 0; i < samples.length; i += sampleBlockSize) {
                const chunk = samples.subarray(i, i + sampleBlockSize);
                const mp3buf = encoder.encodeBuffer(chunk);
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }
            }

            // Flush
            const mp3buf = encoder.flush();
            if (mp3buf.length > 0) {
                mp3Data.push(mp3buf);
            }

            // 6. Create Blob
            const mp3Blob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });

            // Cleanup
            audioContext.close();
            console.log(`✅ MP3 conversion successful. Size: ${mp3Blob.size} bytes`);
            resolve(mp3Blob);

        } catch (error) {
            console.error("❌ MP3 Encoding Failed:", error);
            // Even on catastrophic failure, return original blob to avoid losing user data
            resolve(blob);
        }
    });
}
