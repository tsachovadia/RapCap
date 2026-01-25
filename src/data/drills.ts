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

// Object Writing prompts - everyday objects for sensory description
export const objectWritingPrompts: DrillPrompt[] = [
    { id: 'coffee', word: 'קפה', wordEn: 'Coffee', category: 'object' },
    { id: 'mirror', word: 'מראה', wordEn: 'Mirror', category: 'object' },
    { id: 'keys', word: 'מפתחות', wordEn: 'Keys', category: 'object' },
    { id: 'rain', word: 'גשם', wordEn: 'Rain', category: 'object' },
    { id: 'phone', word: 'טלפון', wordEn: 'Phone', category: 'object' },
    { id: 'window', word: 'חלון', wordEn: 'Window', category: 'object' },
    { id: 'street', word: 'רחוב', wordEn: 'Street', category: 'place' },
    { id: 'fire', word: 'אש', wordEn: 'Fire', category: 'object' },
    { id: 'shadow', word: 'צל', wordEn: 'Shadow', category: 'object' },
    { id: 'clock', word: 'שעון', wordEn: 'Clock', category: 'object' },
    { id: 'bread', word: 'לחם', wordEn: 'Bread', category: 'object' },
    { id: 'door', word: 'דלת', wordEn: 'Door', category: 'object' },
    { id: 'moon', word: 'ירח', wordEn: 'Moon', category: 'object' },
    { id: 'pen', word: 'עט', wordEn: 'Pen', category: 'object' },
    { id: 'water', word: 'מים', wordEn: 'Water', category: 'object' },
]

// Word association prompts - abstract concepts
export const wordAssociationPrompts: DrillPrompt[] = [
    { id: 'freedom', word: 'חופש', wordEn: 'Freedom', category: 'emotion' },
    { id: 'fear', word: 'פחד', wordEn: 'Fear', category: 'emotion' },
    { id: 'love', word: 'אהבה', wordEn: 'Love', category: 'emotion' },
    { id: 'power', word: 'כוח', wordEn: 'Power', category: 'emotion' },
    { id: 'time', word: 'זמן', wordEn: 'Time', category: 'emotion' },
    { id: 'truth', word: 'אמת', wordEn: 'Truth', category: 'emotion' },
    { id: 'money', word: 'כסף', wordEn: 'Money', category: 'object' },
    { id: 'home', word: 'בית', wordEn: 'Home', category: 'place' },
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
        prompts: objectWritingPrompts.slice(0, 6),
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
