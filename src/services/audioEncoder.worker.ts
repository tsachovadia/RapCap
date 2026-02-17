import lamejs from './lame.all.js'

interface EncodeMessage {
  pcmData: Float32Array
  sampleRate: number
}

self.onmessage = (e: MessageEvent<EncodeMessage>) => {
  const { pcmData, sampleRate } = e.data

  try {
    const channels = 1
    const kbps = 128
    const encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps)

    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    const samples = new Int16Array(pcmData.length)
    for (let i = 0; i < pcmData.length; i++) {
      const s = Math.max(-1, Math.min(1, pcmData[i]))
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    // Encode in chunks
    const mp3Data: Int8Array[] = []
    const sampleBlockSize = 1152

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const chunk = samples.subarray(i, i + sampleBlockSize)
      const mp3buf = encoder.encodeBuffer(chunk)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
    }

    // Flush
    const mp3buf = encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    const mp3Blob = new Blob(mp3Data as unknown as BlobPart[], { type: 'audio/mp3' })
    self.postMessage({ success: true, blob: mp3Blob })
  } catch (error) {
    self.postMessage({ success: false, error: String(error) })
  }
}
