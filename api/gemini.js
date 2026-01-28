
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    // another common pattern
    // res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    )

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { words } = req.body;

    if (!words || !Array.isArray(words)) {
        return res.status(400).json({ error: 'Invalid input: words array required' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
        console.error("Server Error: Missing GEMINI_API_KEY");
        return res.status(500).json({ error: 'Server Configuration Error' });
    }

    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
       - Explain HOW to memorize this. Break the story down into "Houses", "Steps", or logical chunks.
       - You can use the "Crisis -> Decision -> Leap -> Growth" structure if it fits, BUT PLEASE FEEL FREE to invent your own logical structure that best fits the specific story. 
       - If the user asked for a specific structure, follow it, otherwise use your best judgment.
       - The goal is to give the user a mental map.

    Output Format:
    Please verify your response is a valid JSON object with the following keys:
    {
      "story": "The Hebrew story string...",
      "logic": "The Hebrew logic explanation string..."
    }
    Return ONLY the JSON object.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        let data;
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
            return res.status(500).json({ error: 'Failed to parse AI response', raw: text });
        }

        return res.status(200).json(data);

    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ error: 'Failed to generate story' });
    }
}
