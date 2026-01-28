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
            // Use gemini-3-flash-preview as requested
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const prompt = `
            You are a Hebrew Mnemonic Expert.
            I will provide a list of Hebrew words: ${words.join(', ')}.
            
            Instructions:
            1. **Story**: Write a short, absurd, memorable narrative **IN HEBREW**.
               - KEY REQUIREMENT: You MUST **bold** and **vocalize (Nikud)** the specific rhyme words from the list when they appear.
            
            2. **Logic**: Explain the memorization strategy **IN HEBREW**.
               - Break it down into "Houses" or logical steps.
               - ALL explanations must be in Hebrew.

            Output JSON: { "story": "The Hebrew story...", "logic": "The Hebrew logic..." }
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
