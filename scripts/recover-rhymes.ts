
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

// Configuration
const DICTA_BASE_URL = "https://charuzit-4-0.loadbalancer.dicta.org.il";
const TARGET_WORDS = ["שיר", "עכשיו"]; // No nikud this time
const API_KEY = process.env.GEMINI_API_KEY?.trim().replace(/\\n/g, '').replace(/"/g, '');

if (!API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY not found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

async function getDictaRhymes(word: string) {
    console.log(`🎤 Fetching rhymes for: ${word}...`);
    const payload = {
        soundplay_keyword: word,
        rhyme_mode: "half",
        alit_num_of_lets: 2,
        model: "Rhyme",
        soundplay_settings: { allowletswap: true, allowvocswap: true },
        semantic_keywords: [],
        semantic_models: "both",
        tavnit_search: [],
        morph_filter: { pos: 0, person: 0, status: 0, number: 0, gender: 0, tense: 0, suffix_person: 0, suffix_number: 0, suffix_gender: 0 },
        return_settings: { min_syl: 1, max_syl: 10, accreturnsettings: "matchinput", returnpropernames: false, ignoreLoazi: false, baseOnly: false }
    };

    try {
        const response = await fetch(`${DICTA_BASE_URL}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Dicta API Error: ${response.statusText}`);
        const data = await response.json();

        // Extract words
        const words: string[] = [];
        if (data.results) {
            data.results.forEach((cat: any) => {
                if (cat.results) {
                    cat.results.forEach((cluster: any) => {
                        if (cluster.forms) {
                            words.push(...cluster.forms);
                        }
                    });
                }
            });
        }

        // Top 100 unique words (simple dedup)
        const unique = [...new Set(words)];
        console.log(`✅ Found ${unique.length} raw rhymes.`);
        return unique.slice(0, 150);
    } catch (error) {
        console.error("❌ Error fetching rhymes:", error);
        return [];
    }
}

async function filterRhymesWithAI(words: string[]) {
    console.log(`🤖 Filtering ${words.length} words with AI...`);
    try {
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

        return JSON.parse(jsonString);
    } catch (error) {
        console.error("❌ Error filtering words:", error);
        return [];
    }
}

async function main() {
    const results: Record<string, string[]> = {};

    for (const word of TARGET_WORDS) {
        console.log(`\n--- Processing ${word} ---`);
        const rawRhymes = await getDictaRhymes(word);
        if (rawRhymes.length > 0) {
            const filtered = await filterRhymesWithAI(rawRhymes);
            if (filtered.length > 0) {
                // Map back to the display name with nikud if needed, but key can be simple
                // We'll manually merge later
                results[word] = filtered;
                console.log(`📝 Result for ${word}:`, filtered);
            }
        }
    }

    // Save to separate file
    const outputPath = path.join(process.cwd(), 'rhyme_results_recovery.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n💾 Saved recovery results to ${outputPath}`);
}

main();
