
export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const language = formData.get('language') || 'he';

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file uploaded' }), { status: 400 });
        }

        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return new Response(JSON.stringify({ error: 'Server configuration error: Missing API Key' }), { status: 500 });
        }

        // Prepare FormData for OpenAI
        const openaiFormData = new FormData();
        openaiFormData.append("file", file, "recording.webm");
        openaiFormData.append("model", "whisper-1");
        openaiFormData.append("response_format", "verbose_json");
        openaiFormData.append("timestamp_granularities[]", "word");
        openaiFormData.append("timestamp_granularities[]", "segment");
        openaiFormData.append("language", language);

        const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${openaiKey}`
            },
            body: openaiFormData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return new Response(JSON.stringify({ error: errorData.error?.message || `Whisper API Error: ${response.status}` }), { status: response.status });
        }

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Whisper Proxy Error:", error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
