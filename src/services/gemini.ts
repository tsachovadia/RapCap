// Client-side service calling our own Serverless Function
// This prevents exposing the API key in the browser

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateMnemonicStory(words: string[]): Promise<{ story: string; logic: string }> {
    if (!words.length) return { story: '', logic: '' };

    // LOCAL DEVELOPMENT FALLBACK
    // If we are in dev mode, try to use the client-side key to avoid 404s on /api/gemini
    if (import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `
            You are a Hebrew Mnemonic Expert.
            Create a short, memorable, absurd story connecting these Hebrew words: ${words.join(', ')}.
            Also explain the mnemonic logic.
            Output JSON: { "story": "...", "logic": "..." }
            `;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(jsonString);
        } catch (e) {
            console.warn("Local Gemini Fallback failed, trying API...", e);
        }
    }

    // PRODUCTION / SERVERLESS ROUTE
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
