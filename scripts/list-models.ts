
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

// Load environment variables
function loadEnv() {
    const envFiles = ['.env.local', '.env'];
    for (const file of envFiles) {
        if (fs.existsSync(file)) {
            console.log(`Loading env from ${file}`);
            const content = fs.readFileSync(file, 'utf-8');
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
    console.error("❌ CRITICAL: GEMINI_API_KEY not found");
    process.exit(1);
}

// NOTE: Using fetch directly to list models as SDK method location varies
async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.version}) - ${m.supportedGenerationMethods}`);
            });
        } else {
            console.error("No models found or error:", data);
        }

    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
