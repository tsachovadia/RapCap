import { Mp3Encoder } from 'lamejs';

/**
 * Converts an audio Blob (WebM/WAV) to an MP3 Blob using lamejs.
 * @param blob The source audio blob.
 * @returns Promise resolving to an MP3 Blob.
 */
export async function convertBlobToMp3(blob: Blob): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
        try {
            // 1. Read Blob as ArrayBuffer
            const arrayBuffer = await blob.arrayBuffer();

            // 2. Decode Audio Data (WebM -> PCM)
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // 3. Prepare Encoder
            const channels = 1; // Mono is usually fine for voice and saves space, but let's match input if possible or force stereo
            const sampleRate = audioBuffer.sampleRate;
            const kbps = 128; // Standard quality

            const encoder = new Mp3Encoder(channels, sampleRate, kbps);

            // 4. Get PCM Data
            // We use channel 0 (Left) for mono. If we wanted stereo we'd verify numberOfChannels > 1
            const pcmData = audioBuffer.getChannelData(0);

            // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767) for lamejs
            const samples = new Int16Array(pcmData.length);
            for (let i = 0; i < pcmData.length; i++) {
                // simple clamping
                let s = Math.max(-1, Math.min(1, pcmData[i]));
                samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // 5. Encode
            // Mp3Encoder expects Int16Array
            // Note: If using stereo, encodeBuffer takes (left, right)
            const mp3Data: Int8Array[] = [];

            // Process in chunks to avoid blocking UI too much
            const sampleBlockSize = 1152; // multiple of 576
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

            resolve(mp3Blob);

        } catch (error) {
            console.error("MP3 Encoding Failed:", error);
            reject(error);
        }
    });
}
