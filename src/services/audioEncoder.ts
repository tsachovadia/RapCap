import lamejs from './lame.all.js';
import { ysFixWebmDuration } from './webmFix';
import AudioEncoderWorker from './audioEncoder.worker.ts?worker';

/**
 * Converts an audio Blob (WebM/WAV) to an MP3 Blob using lamejs.
 * Decoding happens on the main thread (AudioContext required).
 * Encoding is offloaded to a Web Worker when available.
 */
export async function convertBlobToMp3(blob: Blob, durationMs?: number): Promise<Blob> {
    try {
        console.log(`Starting MP3 conversion. Blob type: ${blob.type}, size: ${blob.size} bytes`);

        // 1. Read Blob as ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();

        // 2. Decode Audio Data (must happen on main thread — needs AudioContext)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        let audioBuffer: AudioBuffer;
        try {
            if (arrayBuffer.byteLength === 0) {
                throw new Error("Empty ArrayBuffer. The source blob may be corrupted or empty.");
            }
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
        } catch (decodeError) {
            console.warn("Audio decoding failed. Attempting WebM Duration Fix...", { error: decodeError });

            if (durationMs && durationMs > 0 && blob.type.includes('webm')) {
                try {
                    const fixedBlob = await ysFixWebmDuration(blob, durationMs, true);
                    const fixedBuffer = await fixedBlob.arrayBuffer();
                    audioBuffer = await audioContext.decodeAudioData(fixedBuffer);
                } catch (fixError) {
                    console.error("WebM Fix/Second Decode Failed:", fixError);
                    audioContext.close();
                    return blob;
                }
            } else {
                console.warn("No duration provided or not WebM. Cannot fix.");
                audioContext.close();
                return blob;
            }
        }

        // 3. Extract PCM data
        const pcmData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        audioContext.close();

        // 4. Encode — try Web Worker first, fallback to main thread
        const mp3Blob = await encodeWithWorker(pcmData, sampleRate)
            .catch(() => encodeOnMainThread(pcmData, sampleRate));

        console.log(`MP3 conversion successful. Size: ${mp3Blob.size} bytes`);
        return mp3Blob;

    } catch (error) {
        console.error("MP3 Encoding Failed:", error);
        // Even on catastrophic failure, return original blob to avoid losing user data
        return blob;
    }
}

function encodeWithWorker(pcmData: Float32Array, sampleRate: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            const worker = new AudioEncoderWorker();

            worker.onmessage = (e: MessageEvent) => {
                worker.terminate();
                if (e.data.success) {
                    resolve(e.data.blob);
                } else {
                    reject(new Error(e.data.error));
                }
            };

            worker.onerror = (err) => {
                worker.terminate();
                reject(err);
            };

            worker.postMessage({ pcmData, sampleRate });
        } catch {
            reject(new Error('Worker not supported'));
        }
    });
}

function encodeOnMainThread(pcmData: Float32Array, sampleRate: number): Blob {
    const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);

    const samples = new Int16Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const mp3Data: Int8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
        const chunk = samples.subarray(i, i + sampleBlockSize);
        const mp3buf = encoder.encodeBuffer(chunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }

    const mp3buf = encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }

    return new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' });
}
