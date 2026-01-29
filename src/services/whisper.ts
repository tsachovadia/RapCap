
export interface WhisperSegment {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
}

export interface WhisperWord {
    word: string;
    start: number;
    end: number;
}

export interface WhisperResponse {
    task: string;
    language: string;
    duration: number;
    text: string;
    segments: WhisperSegment[];
    words: WhisperWord[];
}

/**
 * Transcribes audio using OpenAI's Whisper API
 * @param audioBlob The audio blob to transcribe (webm/mp3/wav)
 * @param language Language code (default 'he')
 * @returns Structured transcription with word-level timestamps
 */
export async function transcribeAudio(
    audioBlob: Blob,
    language: 'he' | 'en' = 'he'
): Promise<{ text: string; segments: { text: string; timestamp: number }[]; wordSegments: { word: string; timestamp: number }[] }> {

    let data: WhisperResponse;

    // STRATEGY 1: LOCAL DEV (Direct with VITE_ key)
    if (import.meta.env.DEV && import.meta.env.VITE_OPENAI_API_KEY) {
        // console.log("🎙️ [DEV] Direct Whisper Call");
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("model", "whisper-1");
        formData.append("response_format", "verbose_json");
        formData.append("timestamp_granularities[]", "word");
        formData.append("timestamp_granularities[]", "segment");
        formData.append("language", language);

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Whisper API Error: ${response.status}`);
        }
        data = await response.json();

    } else {
        // STRATEGY 2: PRODUCTION (Proxy to protect key)
        // console.log("🎙️ [PROD] Proxy Whisper Call");
        const formData = new FormData();
        formData.append("file", audioBlob, "recording.webm");
        formData.append("language", language);

        const response = await fetch("/api/whisper", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Whisper API Error: ${response.status}`);
        }
        data = await response.json();
    }

    // TRANSFORM DATA matched app's format (Unified for both strategies)
    // 1. Word Segments (Defensive check)
    const wordSegments = (data.words || []).map(w => ({
        word: w.word,
        timestamp: w.start
    }));

    // 2. Line Segments (Defensive check)
    const segments = (data.segments || []).map(s => ({
        text: s.text.trim(),
        timestamp: s.start
    }));

    return {
        text: data.text,
        segments,
        wordSegments
    };
}
