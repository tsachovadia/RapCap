
import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helpers to load env
function loadEnv() {
    const cwd = process.cwd();
    const envFiles = ['.env.local', '.env'];
    for (const file of envFiles) {
        const filePath = path.join(cwd, file);
        if (fs.existsSync(filePath)) {
            console.log(`Loading env from ${file}`);
            const content = fs.readFileSync(filePath, 'utf-8');
            content.split('\n').forEach(line => {
                const [key, ...values] = line.split('=');
                if (key && values.length > 0) {
                    process.env[key.trim()] = values.join('=').trim().replace(/^["']|["']$/g, '');
                }
            });
        }
    }
}

loadEnv();

const API_KEY = process.env.GEMINI_API_KEY?.trim().replace(/\\n/g, '').replace(/"/g, '');

if (!API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY not found in .env or .env.local");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

// Target multi-syllabic schemes to generate
const SCHEMES = [
    { name: "Talked (A-ti)", description: "Phrases ending in -ati (past tense verbs), e.g., 'Lo raiti', 'Ma asita'" },
    { name: "Doing (O-eh)", description: "Phrases ending in -oeh/-oah (present tense), e.g., 'Lo roeh', 'Eich at bochah'" },
    { name: "Ability (O-let)", description: "Phrases ending in -olet (nouns/ability), e.g., 'Yesh yecholet', 'Ma at ochelet'" },
    { name: "Plural (A-im)", description: "Phrases ending in -im (plural), e.g., 'Im ha-cha-ve-rim', 'Anashim Acherim'" }
];

async function generatePhrases(scheme: { name: string, description: string }) {
    console.log(`🎤 Generating phrases for scheme: ${scheme.name}...`);
    try {
        const prompt = `
        You are a Hebrew Rap & Freestyle Expert.
        Generate a list of **the top 2 most useful and common colloquial Hebrew phrases** (2-4 words long) that rhyme with the sound described below.
        
        Target Sound/Scheme: ${scheme.description}
        
        Rules:
        1. Phrases must be naturally used in conversation or rap (slang is good).
        2. Phrases must STRICTLY END with the target rhyming sound.
        3. Do NOT provide English translations, only Hebrew vocalized text (Nikud).
        4. Return a JSON array of objects with metadata.
        
        Metadata Requirements:
        - text: The vocalized Hebrew phrase
        - syllableCount: Number of syllables
        - wordCount: Number of words
        - stressPattern: A string of 0s and 1s representing unstressed(0) and stressed(1) syllables (e.g., "0101"). Estimate best based on natural speech.
        
        Example Output format:
        [
            { "text": "לֹא רָאִיתִי", "syllableCount": 4, "wordCount": 2, "stressPattern": "0010" },
            { "text": "מָה עָשִׂיתִי", "syllableCount": 4, "wordCount": 2, "stressPattern": "1010" }
        ]
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Basic validation
        const phrases = JSON.parse(jsonString);
        if (Array.isArray(phrases) && phrases.length > 0) {
            console.log(`✅ Generated ${phrases.length} phrases for ${scheme.name}.`);
            return phrases;
        } else {
            throw new Error("Invalid format");
        }
    } catch (error) {
        console.error(`❌ Error generating for ${scheme.name}:`, error);
        return [];
    }
}

async function main() {
    const results: Record<string, any[]> = {};

    for (const scheme of SCHEMES) {
        const phrases = await generatePhrases(scheme);
        if (phrases.length > 0) {
            results[scheme.name] = phrases;
        }
    }

    // Save to results file
    const outputPath = path.join(process.cwd(), 'phrase_results_meta.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n💾 Saved detailed phrase results to ${outputPath}`);
}

main();
