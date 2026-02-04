import type { SessionAnalysis } from "../db/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Client-side service calling our own Serverless Function
// This prevents exposing the API key in the browser in PRODUCTION
// In DEVELOPMENT, we call the SDK directly to avoid Vercel function 404s

const IS_DEV = import.meta.env.DEV;
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; // Local fallback
const genAI = IS_DEV && API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const MODEL_NAME = "gemini-2.0-flash"; // Staying bleeding edge for dev, matching api proxy

// --- Helper Functions for Local Dev ---

async function devGenerateContent(prompt: string) {
    if (!genAI) throw new Error("Gemini SDK not initialized (Missing VITE_GEMINI_API_KEY?)");
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
}

// --- Main Exports ---

export async function generateMnemonicStory(words: string[]): Promise<{ story: string; logic: string }> {
    if (!words.length) return { story: '', logic: '' };

    try {
        if (IS_DEV) {
            console.log("🔧 Dev Mode: Calling Gemini SDK directly");
            // Replicating api/gemini.js prompt logic for 'default' (story generation)
            const prompt = `
            You are a Hebrew Mnemonic Expert.
            I will provide a list of Hebrew words.
            Your task is to create a memorable short story that incorporates all these words to help a student memorize them.

            The Words: ${words.join(", ")}

            Instructions:
            1. **Story**: Write a short, coherent narrative in Hebrew. 
            - KEY REQUIREMENT: You MUST **bold** and **vocalize (Nikud)** the specific rhyme words from the list when they appear in the story.
            - Example: "הוא הלך ל**יָרִיד** ופגש **תַּלְמִיד**".

            2. **Logic (Memorization Strategy)**: 
            - Explain HOW to memorize this **IN HEBREW**. 
            - Break the story down into "Houses", "Steps", or logical chunks.
            - You can use the "Crisis -> Decision -> Leap -> Growth" structure if it fits, BUT PLEASE FEEL FREE to invent your own logical structure that best fits the specific story. 
            - If the user asked for a specific structure, follow it, otherwise use your best judgment.
            - The goal is to give the user a mental map in Hebrew.

            Output Format:
            Please verify your response is a valid JSON object with the following keys:
            {
            "story": "The Hebrew story string...",
            "logic": "The Hebrew logic explanation string..."
            }
            Return ONLY the JSON object.
            `;

            const text = await devGenerateContent(prompt);
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonString);
            return { story: data.story || '', logic: data.logic || '' };
        }

        // Production: Use Endpoint
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

export async function analyzeFreestyleLyrics(lyrics: string): Promise<string[]> {
    if (!lyrics || !lyrics.trim()) return [];

    try {
        if (IS_DEV) {
            console.log("🔧 Dev Mode: Analyzing Lyrics via SDK");
            const prompt = `
            Analyze the following freestyle rap lyrics/transcript:
            "${lyrics}"

            Identify 5-7 main topics, themes, or keywords that represent the content.
            Examples: "Struggle", "Money", "Family", "Cars", "Victory", "Tel Aviv".
            
            Output Format:
            Return ONLY a JSON array of strings: ["Theme1", "Theme2", ...]
            `;
            const text = await devGenerateContent(prompt);
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonString);
            return data || [];
        }

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'analyze_lyrics', lyrics }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.keywords || [];
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return [];
    }
}

export async function performDeepAnalysis(transcript: string, moments: number[] = []): Promise<SessionAnalysis | null> {
    if (!transcript || !transcript.trim()) return null;

    try {
        if (IS_DEV) {
            console.log("🔧 Dev Mode: Deep Analysis via SDK", { transcript, moments });
            const prompt = `
            You are a professional Hebrew Hip Hop Editor and Linguistic Expert (Hebrew Rhyme Specialist).
            Your task is to analyze a raw rap transcript, correct it, and then map *every single word* to its rhyme scheme using deep phonetic analysis.

            Raw Transcript:
            "${transcript}"

            Moments flagged by user (seconds): ${JSON.stringify(moments || [])}

            ### Phase 1: The Editor (Correction)
            - Fix phonetic errors based on context (e.g., "עם" vs "אם").
            - Fix "Rap Phonetics": If a word is mispronounced to force a rhyme (e.g., "Man-gi-na" -> "Man-gi-NA"), keep the spelling standard but note the phonetic intention in analysis.

            ### Phase 2: The Linguist (Rhyme Mapping)
            - **Tokenize**: Break the corrected text into a flat list of words (tokens).
            - **Analyze Rhyme**: Assign a "Rhyme Scheme ID" to words that share a rhyme sound.
            
            **CRITICAL HEBREW RHYME RULES (PHONETIC & ASSONANCE):**
            1. **Assonance (Tzlil/Nikud):** This is the MOST IMPORTANT rule. Group words by vowel sounds. 
               - "Saba" (ָ ָ ) matches "Bamba" (ָ ָ ). ("Kamatz-Kamatz").
               - "Sefer" matches "Gever" (Segol-Segol).
            2. **Phonetic Signature:** Generate a "Vowel Signature" for every group.
               - Format: Vowels separated by dashes.
               - "Saba" -> "a-a"
               - "Yeled" -> "e-e"
               - "Melufaf" -> "e-u-a"
            3. **Multi-Syllabics:** Look for phrases or long words that share a chain of vowels.
               - "Yeled shel Abba" (e-e-e-a-a) matches "Sere shel Drama".
            4. **Strictness:** Do not group words that share consonants but have different vowels (e.g., "Kir" and "Kor" do NOT rhyme in this context).

            ### Output Format (Strict JSON):
            {
                "correctedLyrics": "Full corrected text string, keeping the flow...",
                "tokens": [
                    { "text": "אני", "id": null },
                    { "text": "לא", "id": null },
                    { "text": "בורח", "id": "scheme_1", "phonetic": "o-a-ch" },
                    { "text": "רק", "id": null },
                    { "text": "צורח", "id": "scheme_1", "phonetic": "o-a-ch" }
                ],
                "rhymeSchemes": [
                    { "id": "scheme_1", "name": "o-a-chSound", "color": "#FF5733", "words": [{"text": "בורח", "index": 2}, {"text": "צורח", "index": 4}] }
                ],
                "detectedRhymeGroups": [
                    {
                        "id": "gen_1",
                        "words": ["בורח", "צורח", "לצרוח"], 
                        "phoneticSignature": "o-a-ch",
                        "confidence": 0.95,
                        "type": "terminal_rhyme"
                    },
                    {
                        "id": "gen_2",
                        "words": ["ילד של אבא", "סרט של דרמה"],
                        "phoneticSignature": "e-e-e-a-a",
                        "confidence": 0.85,
                        "type": "multi_syllabic"
                    }
                ],
                "punchlines": [
                    { "text": "Complete punchline sentence...", "score": 9, "reason": "Reason in Hebrew/English" }
                ],
                "flowMetrics": { "wpm": 140, "density": "High" }
            }
            Return ONLY the valid JSON object.
            `;
            const text = await devGenerateContent(prompt);
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonString);
            return data as SessionAnalysis;
        }

        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'deep_analyze_flow', transcript, moments }),
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data as SessionAnalysis;

    } catch (error) {
        console.error("Gemini Deep Analysis Error:", error);
        return null;
    }
}
