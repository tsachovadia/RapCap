/**
 * Drill data and types
 */

export interface DrillPrompt {
    id: string
    word: string
    wordEn: string
    category: 'object' | 'emotion' | 'place' | 'action'
}

export interface Drill {
    id: string
    name: string
    nameEn: string
    description: string
    duration: number // seconds
    color: string
    icon: string
    instructions: string[]
    prompts: DrillPrompt[]
}

// Object Writing - Sensory Rich
export const objectWritingPrompts: DrillPrompt[] = [
    // Original
    { id: 'coffee', word: 'קפה', wordEn: 'Coffee', category: 'object' },
    { id: 'mirror', word: 'מראה', wordEn: 'Mirror', category: 'object' },
    { id: 'keys', word: 'מפתחות', wordEn: 'Keys', category: 'object' },
    { id: 'rain', word: 'גשם', wordEn: 'Rain', category: 'object' },

    // New - Everyday Items
    { id: 'wallet', word: 'ארנק', wordEn: 'Wallet', category: 'object' },
    { id: 'shoes', word: 'נעליים', wordEn: 'Shoes', category: 'object' },
    { id: 'candle', word: 'נר', wordEn: 'Candle', category: 'object' },
    { id: 'knife', word: 'סכין', wordEn: 'Knife', category: 'object' },
    { id: 'coin', word: 'מטבע', wordEn: 'Coin', category: 'object' },
    { id: 'plant', word: 'עציץ', wordEn: 'Potted Plant', category: 'object' },
    { id: 'ice', word: 'קרח', wordEn: 'Ice', category: 'object' },

    // New - Places / Textures
    { id: 'sand', word: 'חול', wordEn: 'Sand', category: 'object' },
    { id: 'rust', word: 'חלודה', wordEn: 'Rust', category: 'object' },
    { id: 'glass', word: 'זכוכית', wordEn: 'Glass', category: 'object' },
    { id: 'smoke', word: 'עשן', wordEn: 'Smoke', category: 'object' },

    // New - Nature
    { id: 'ocean', word: 'אוקיינוס', wordEn: 'Ocean', category: 'place' },
    { id: 'desert', word: 'מדבר', wordEn: 'Desert', category: 'place' },
    { id: 'forest', word: 'יער', wordEn: 'Forest', category: 'place' },
    { id: 'mountain', word: 'הר', wordEn: 'Mountain', category: 'place' },

    // New - Urban
    { id: 'alley', word: 'סמטה', wordEn: 'Alley', category: 'place' },
    { id: 'rooftop', word: 'גג', wordEn: 'Rooftop', category: 'place' },
    { id: 'subway', word: 'רכבת', wordEn: 'Subway', category: 'place' },
    { id: 'bridge', word: 'גשר', wordEn: 'Bridge', category: 'place' },
]

// Word Association - Abstracts
export const wordAssociationPrompts: DrillPrompt[] = [
    // Original
    { id: 'freedom', word: 'חופש', wordEn: 'Freedom', category: 'emotion' },
    { id: 'fear', word: 'פחד', wordEn: 'Fear', category: 'emotion' },
    { id: 'love', word: 'אהבה', wordEn: 'Love', category: 'emotion' },

    // Concepts
    { id: 'time', word: 'זמן', wordEn: 'Time', category: 'emotion' },
    { id: 'power', word: 'כוח', wordEn: 'Power', category: 'emotion' },
    { id: 'money', word: 'כסף', wordEn: 'Money', category: 'object' },
    { id: 'god', word: 'אלוהים', wordEn: 'God', category: 'emotion' },
    { id: 'death', word: 'מוות', wordEn: 'Death', category: 'emotion' },
    { id: 'life', word: 'חיים', wordEn: 'Life', category: 'emotion' },
    { id: 'war', word: 'מלחמה', wordEn: 'War', category: 'action' },
    { id: 'peace', word: 'שלום', wordEn: 'Peace', category: 'emotion' },

    // Emotions
    { id: 'anger', word: 'כעס', wordEn: 'Anger', category: 'emotion' },
    { id: 'joy', word: 'שמחה', wordEn: 'Joy', category: 'emotion' },
    { id: 'envy', word: 'קנאה', wordEn: 'Envy', category: 'emotion' },
    { id: 'regret', word: 'חרטה', wordEn: 'Regret', category: 'emotion' },
    { id: 'hope', word: 'תקווה', wordEn: 'Hope', category: 'emotion' },
    { id: 'pride', word: 'גאווה', wordEn: 'Pride', category: 'emotion' },

    // Archetypes
    { id: 'king', word: 'מלך', wordEn: 'King', category: 'object' },
    { id: 'soldier', word: 'חייל', wordEn: 'Soldier', category: 'object' },
    { id: 'child', word: 'ילד', wordEn: 'Child', category: 'object' },
    { id: 'mother', word: 'אמא', wordEn: 'Mother', category: 'object' },
]

// Rhyme Chains - Good starters
export const rhymePrompts: DrillPrompt[] = [
    { id: 'light', word: 'אור', wordEn: 'Light', category: 'object' },
    { id: 'hand', word: 'יד', wordEn: 'Hand', category: 'object' },
    { id: 'game', word: 'משחק', wordEn: 'Game', category: 'object' },
    { id: 'tomorrow', word: 'מחר', wordEn: 'Tomorrow', category: 'emotion' },
    { id: 'now', word: 'עכשיו', wordEn: 'Now', category: 'emotion' },
    { id: 'head', word: 'ראש', wordEn: 'Head', category: 'object' },
    { id: 'heart', word: 'לב', wordEn: 'Heart', category: 'object' },
    { id: 'voice', word: 'קול', wordEn: 'Voice', category: 'object' },
    { id: 'street', word: 'רחוב', wordEn: 'Street', category: 'place' },
    { id: 'party', word: 'מסיבה', wordEn: 'Party', category: 'action' },
]

export const drills: Drill[] = [
    {
        id: 'object-writing',
        name: 'כתיבת אובייקטים',
        nameEn: 'Object Writing',
        description: 'תרגיל יצירתיות - כתוב על אובייקט באמצעות כל החושים',
        duration: 600, // 10 minutes
        color: '#1DB954',
        icon: 'psychology',
        instructions: [
            'בחר אובייקט אקראי',
            'כתוב עליו באמצעות כל 5 החושים',
            'אל תעצור - תזרום עם המחשבות',
            'אין טוב ורע, רק כתיבה חופשית',
        ],
        prompts: objectWritingPrompts,
    },
    {
        id: 'word-association',
        name: 'אסוציאציות',
        nameEn: 'Word Association',
        description: 'קישור מילים מהיר - בנה שרשרת מחשבות',
        duration: 180, // 3 minutes
        color: '#E8115B',
        icon: 'hub',
        instructions: [
            'קבל מילה התחלתית',
            'כתוב את המילה הראשונה שעולה לך',
            'המשך מהמילה החדשה',
            'מטרה: 30+ מילים',
        ],
        prompts: wordAssociationPrompts,
    },
    {
        id: 'rhyme-chains',
        name: 'שרשרות חרוזים',
        nameEn: 'Rhyme Chains',
        description: 'בנה רצף חרוזים ללא עצירה',
        duration: 300, // 5 minutes
        color: '#E91429',
        icon: 'link',
        instructions: [
            'קבל מילה להתחיל',
            'מצא חריזה',
            'בנה שורה עם החריזה',
            'חזור - מצא חריזה חדשה',
        ],
        prompts: rhymePrompts,
    },
    {
        id: 'flow-patterns',
        name: 'דפוסי פלואו',
        nameEn: 'Flow Patterns',
        description: 'תרגל קצבים ומקצבים שונים על ביט',
        duration: 480, // 8 minutes
        color: '#1E3264',
        icon: 'waves',
        instructions: [
            'הפעל ביט',
            'ספור את הביטים',
            'נסה לראפ בדפוסים שונים',
            'החלף בין slow flow ל-quick flow',
        ],
        prompts: [],
    },
]

export function getRandomPrompt(drill: Drill): DrillPrompt | null {
    if (drill.prompts.length === 0) return null
    const randomIndex = Math.floor(Math.random() * drill.prompts.length)
    return drill.prompts[randomIndex]
}

export function getDrillById(id: string): Drill | undefined {
    return drills.find(d => d.id === id)
}
