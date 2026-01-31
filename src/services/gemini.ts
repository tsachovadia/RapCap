// Client-side service calling our own Serverless Function
// This prevents exposing the API key in the browser

export async function generateMnemonicStory(words: string[]): Promise<{ story: string; logic: string }> {
    if (!words.length) return { story: '', logic: '' };

    // Always use serverless endpoint to keep API key secure
    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ words }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return {
            story: data.story || '',
            logic: data.logic || ''
        };
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("Failed to generate story. Please try again.");
    }
}
