
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
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        if (req.body.type === 'deep_analyze_flow') {
            const { transcript, moments } = req.body;
            if (!transcript) return res.status(400).json({ error: 'Transcript required' });

            const prompt = `
            You are a professional Hebrew Hip Hop Editor and Flow Coach.
            Your task is to analyze a raw rap transcript, correct transcription errors based on context/rhymes, and extract deep insights.

            Raw Transcript:
            "${transcript}"

            Moments flagged by user (seconds): ${JSON.stringify(moments || [])}

            Instructions:
            1. **Corrected Lyrics**: Fix phonetic errors (e.g. "רוקי בא לבוא" -> "רוקי בלבואה") and punctuation. Match the likely intended meaning and rhythm.
            2. **Rhyme Schemes**: Identify 3-5 distinct rhyme groups/sounds.
               - Assign a color HEX code to each group.
               - List words belonging to each group.
               - Note: Include "Slant Rhymes" (Assonance), e.g., "Lishmoa" and "Lizroa" (O-a sound).
            3. **Punchlines**: Identify the strongest "Bars" or metaphors.
               - Give a "score" (1-10) and reason.
               - Pay special attention to the flagged "Moments" if they align with punchlines.
            4. **Flow Metrics**: Estimate Words Per Minute (WPM) and Density.

            Output Format (Strict JSON):
            {
                "correctedLyrics": "Full corrected text string...",
                "rhymeSchemes": [
                    { "id": "scheme_1", "name": "O-ach Sound", "color": "#FF5733", "words": [{"text": "לברוח", "index": 0}, ...] }
                ],
                "punchlines": [
                    { "text": "רוקי בלבואה... סע לדואר", "score": 9, "reason": "Complex multi-syllabic rhyme scheme and cultural reference." }
                ],
                "flowMetrics": { "wpm": 140, "density": "High" }
            }
            Return ONLY the valid JSON object.
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const data = JSON.parse(jsonString);
                return res.status(200).json(data);
            } catch (e) {
                console.error("Failed to parse deep analysis:", text);
                return res.status(500).json({ error: 'Failed to parse AI deep analysis' });
            }
        }

        if (req.body.type === 'analyze_lyrics') {
            const { lyrics } = req.body;
            if (!lyrics) return res.status(400).json({ error: 'Lyrics required' });

            const prompt = `
            Analyze the following freestyle rap lyrics/transcript:
            "${lyrics}"

            Identify 5-7 main topics, themes, or keywords that represent the content.
            Examples: "Struggle", "Money", "Family", "Cars", "Victory", "Tel Aviv".
            
            Output Format:
            Return ONLY a JSON array of strings: ["Theme1", "Theme2", ...]
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const data = JSON.parse(jsonString);
                return res.status(200).json({ keywords: data });
            } catch (e) {
                console.error("Failed to parse analysis response:", text);
                return res.status(500).json({ error: 'Failed to parse AI response' });
            }
        }

        if (req.body.type === 'filter') {
            const prompt = `
        You are a Hebrew Language Expert.
        I will provide a list of Hebrew words that rhyme with a specific target.
        Your task is to select the **20 most common, useful, and simple words** from this list.
        Ignores archaic, very biblical, or obscure words unless they are commonly known.
        
        The List: ${words.join(", ")}
        
        Output Format:
        Return ONLY a JSON array of strings: ["word1", "word2", ...]
        `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

            try {
                const data = JSON.parse(jsonString);
                return res.status(200).json(data);
            } catch (e) {
                console.error("Failed to parse filter response:", text);
                return res.status(500).json({ error: 'Failed to parse AI response' });
            }
        }

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
