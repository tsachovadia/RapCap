
import Dexie, { type Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';

console.log('[RapCap] 💽 db.ts module evaluating...');

// --- Verse Editor Types ---

export type HebrewVowel = 'A' | 'E' | 'I' | 'O' | 'U' | '';

export interface VerseSyllable {
    text: string;           // "אַר" — the vocalized syllable text
    vowel: HebrewVowel;     // extracted from nikkud
    onset: string;          // opening consonant(s)
    coda: string;           // closing consonant(s)
}

export interface VerseWord {
    text: string;           // "ארנב" — original unvocalized
    vocalized: string;      // "אַרְנָב" — with nikkud
    syllables: VerseSyllable[];
}

export interface VerseBar {
    id: string;             // UUID
    text: string;           // raw text user typed
    words: VerseWord[];     // computed from text + Dicta vocalization
}

export interface SchemeHit {
    barId: string;
    startSyllable: number;  // index in flattened bar syllables
    endSyllable: number;    // inclusive
}

export interface VerseScheme {
    id: string;
    color: string;          // hex color from palette
    name?: string;          // optional user label
    syllableCount: number;  // how many syllables this scheme targets
    hits: SchemeHit[];
}

export interface Verse {
    id?: number;
    title: string;
    bars: VerseBar[];
    schemes: VerseScheme[];
    beatBpm?: number;
    timeSignature?: string; // "4/4" default
    createdAt: Date;
    updatedAt: Date;
}

export interface VocalizationCacheEntry {
    word: string;           // primary key — clean word
    vocalized: string;      // vocalized form with nikkud
}

export interface Punchline {
    text: string;
    score: number;
    reason: string;
}

export interface VaultItem {
    id?: number;
    type: 'punchline' | 'bar' | 'flow_pattern';
    content: string;
    metadata?: any; // Score, tags, source session title
    createdAt: Date;
    sessionId?: number; // Origin session ID
}

export interface RhymeScheme {
    id: string;
    name?: string; // e.g., "O-ach Family"
    color: string;
    words: { text: string; index: number }[];
}


export interface AnalysisToken {
    text: string;
    id: string | null; // rhyme scheme id
    phonetic?: string;
}

export interface DetectedRhymeGroup {
    id: string; // temporary UUID
    words: (string | {
        lineId?: string;
        wordIndex?: number;
        text: string;
        syllables?: string[];   // NEW: For decomposition view
        phonemes?: string[];    // NEW: For granular analysis
        charIndices?: number[]; // NEW: For manual fine-grained annotation
    })[];
    phoneticSignature: string; // e.g., "a-a-a-n"
    confidence: number;
    // Updated types for new engine
    type: 'terminal_rhyme' | 'multi_syllabic' | 'assonance' | 'perfect' | 'slant' | 'none' | 'anchor' | 'multi';
    status?: 'new' | 'match' | 'partial'; // Client-side state
    existingGroupId?: number; // if matching an existing group
    color?: string;
}

export interface SessionAnalysis {
    correctedLyrics: string;
    tokens: AnalysisToken[];
    rhymeSchemes: RhymeScheme[];
    detectedRhymeGroups?: DetectedRhymeGroup[]; // Newly detected groups from the session
    punchlines: Punchline[];
    flowMetrics: {
        wpm: number;
        density: string; // "High", "Low"
    };
    corrections?: {
        mergedGroups: string[][]; // Array of merged Group IDs
        splitWords: { word: string; originalGroupId: string }[];
        ignoredWords: string[];
    };
}

export interface WordGroup {
    id?: number;
    name: string;
    items: string[]; // Supports single words or phrases
    story?: string;
    mnemonicLogic?: string; // How to memorize this? (Houses, Logic)
    bars?: string; // User written lyrics/sentences
    defaultInterval?: number;
    createdAt: Date;
    lastUsedAt: Date;
    isSystem?: boolean; // To protect seed data from accidental deletion if needed
    cloudId?: string;
    syncedAt?: Date;
    category?: string;
    language?: string;
    itemsMetadata?: Record<string, {
        syllableCount?: number;
        wordCount?: number;
        stressPattern?: string; // e.g., "0101" (0=unstressed, 1=stressed)
        weight?: string; // e.g., "Mishkal X"
    }>;
    connections?: {
        targetGroupId: number;
        type: 'perfect' | 'slant' | 'family';
        strength?: number;
    }[];
}

export interface DbSession {
    id?: number;
    localId?: string;
    schemaVersion?: number;
    cloudId?: string;
    syncedAt?: Date;
    updatedAt?: Date;
    title: string;
    type: 'freestyle' | 'drill' | 'thoughts' | 'training' | 'writing';
    subtype?: string;
    beatId?: string;
    beatStartTime?: number; // The timestamp in the beat where recording started
    duration: number;
    date: Date;
    createdAt: Date;
    blob?: Blob;
    syncOffset?: number;
    metadata?: {
        lyrics?: string; // Legacy: full text
        lyricsSegments?: any[];
        lyricsWords?: any[];
        language?: string;
        moments?: number[]; // Array of timestamps
        notes?: string; // Session notes
        aiKeywords?: string[]; // AI extracted keywords
        analysis?: SessionAnalysis; // Deep AI Analysis
        userAnnotations?: {
            groupId: string;
            wordIndex: number;
            lineId?: string;
            syllableIndices?: number[];
            text: string;
        }[];
        bars?: Bar[]; // NEW: Structured bars with audio
        [key: string]: any;
    };
    content?: string; // For generic content like drill words
}

export interface Beat {
    id?: number;
    name: string;
    videoId: string;
    category?: 'custom' | 'preset';
    createdAt: Date;
}

// NEW: Structured Bar Interface
export interface Bar {
    id: string; // UUID
    text: string;
    audioId?: string; // reference to barRecordings.id
}

// NEW: Audio Recording for a specific bar
export interface BarRecording {
    id: string; // UUID
    blob: Blob;
    sessionId: number; // Foreign key to session
    barId: string; // Foreign key to bar (in metadata)
    createdAt: Date;
    duration: number; // in seconds
}

export class RapCapDatabase extends Dexie {
    wordGroups!: Table<WordGroup>;
    sessions!: Table<DbSession>;
    beats!: Table<Beat>;
    vault!: Table<VaultItem>;
    barRecordings!: Table<BarRecording>;
    verses!: Table<Verse>;
    vocalizationCache!: Table<VocalizationCacheEntry>;

    constructor() {
        super('rapCapDB');

        this.version(5).stores({
            wordGroups: '++id, name, lastUsedAt, isSystem, cloudId',
            sessions: '++id, title, type, createdAt, updatedAt, cloudId',
            beats: '++id, videoId, name, createdAt',
            vault: '++id, type, createdAt, sessionId',
            barRecordings: 'id, sessionId, barId, createdAt'
        });

        this.version(6).stores({
            wordGroups: '++id, name, lastUsedAt, isSystem, cloudId',
            sessions: '++id, title, type, createdAt, updatedAt, cloudId',
            beats: '++id, videoId, name, createdAt',
            vault: '++id, type, createdAt, sessionId',
            barRecordings: 'id, sessionId, barId, createdAt',
            verses: '++id, title, createdAt, updatedAt',
            vocalizationCache: '&word'
        });

        this.version(7).stores({
            wordGroups: '++id, name, lastUsedAt, isSystem, cloudId',
            sessions: '++id, &localId, title, type, createdAt, updatedAt, cloudId',
            beats: '++id, videoId, name, createdAt',
            vault: '++id, type, createdAt, sessionId',
            barRecordings: 'id, sessionId, barId, createdAt',
            verses: '++id, title, createdAt, updatedAt',
            vocalizationCache: '&word'
        }).upgrade(transaction => transaction.table('sessions').toCollection().modify((session: DbSession) => {
            if (!session.localId) session.localId = uuidv4();
            if (!session.schemaVersion) session.schemaVersion = 1;
        }));
    }
}

export const db = new RapCapDatabase();

// Handle version upgrade blocked by other tabs
db.on('blocked', () => {
    console.error('⛔️ DB upgrade blocked! Please close other tabs.');
    alert('Database upgrade blocked. Please close all other RapCap tabs and refresh.');
});

db.on('versionchange', () => {
    // Another tab is trying to upgrade the DB — close our connection
    console.warn('⚠️ DB version changed in another tab — reloading...');
    db.close();
    window.location.reload();
});

// Force open to catch errors early
db.open().then(() => {
    console.log('✅ DB: Critical connection established (v' + db.verno + ')');
}).catch(err => {
    console.error('❌ DB: Failed to open database:', err);
});

// Seed function to populate default data
export const seedDatabase = async () => {
    // DB SEED VERSION - Bump this number to force re-seeding of system groups
    const CURRENT_SEED_VERSION = 5;
    const storedVersion = parseInt(localStorage.getItem('rapcap_seed_version') || '0');

    if (storedVersion >= CURRENT_SEED_VERSION) {
        return; // Already up to date
    }

    console.log(`🌱 Improving Database (Migration v${storedVersion} -> v${CURRENT_SEED_VERSION})...`);

    // Reset system groups if this is a migration
    if (storedVersion > 0) {
        console.log("Updating system word groups...");
        // Safely delete only system groups to preserve user data
        await db.wordGroups.filter(g => !!g.isSystem).delete();
    }

    // Update stored version
    localStorage.setItem('rapcap_seed_version', CURRENT_SEED_VERSION.toString());

    const now = new Date();

    const initialGroups: WordGroup[] = [
        {
            name: "יריד",
            items: [
                "תלמיד", "חסיד", "צמיד", "רביד",
                "יריד", "עתיד", "אנדרואיד", "סטרואיד",
                "להפחיד", "להשמיד", "ציאניד", "להפסיד",
                "נזיד", "עמיד", "להקליד"
            ],
            story: `היה פעם תלמיד שהפך לחסיד, הוא שם על היד צמיד ועל הצוואר רביד.
הוא הלך ליריד של העתיד, שם הוא פגש אנדרואיד שלקח סטרואיד.
האנדרואיד ניסה להפחיד ואיים להשמיד את העולם עם ציאניד.
אבל התלמיד לא רצה להפסיד! הוא זרק עליו נזיד וקופסה של חלב עמיד.
בסוף הוא התיישב להקליד את הסיפור...`,
            mnemonicLogic: `(דוגמה ללוגיקה):
1. הגיבור: תלמיד, חסיד.
2. הציוד: צמיד, רביד.
3. המקום והמפגש: יריד, עתיד, אנדרואיד, סטרואיד.
4. הקונפליקט: להפחיד, להשמיד, ציאניד.
5. הפתרון: להפסיד (לא רצה), נזיד, חלב עמיד.
6. הסוף: להקליד.`,
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "לִגְנוֹחַ",
            items: [
                "מוֹחַ", "כּוֹחַ", "לִקְדּוֹחַ", "לִגְנוֹחַ", "לִנְבּוֹחַ", "לִרְצוֹחַ", "לִנְגּוֹחַ"
            ],
            story: `זה התחיל כשהרגשתי שהמחשבות חונקות לי את **המוֹחַ**, חיפשתי בתוכי ולא מצאתי אפילו טיפת **כּוֹחַ**. הכאב היה חד, התחיל ברקות **לִקְדּוֹחַ**, שכבתי במיטה, לא הפסקתי **לִגְנוֹחַ**.
בחוץ העולם המשיך, כלב רחוק לא הפסיק **לִנְבּוֹחַ**, הרגשתי שהדיכאון הזה מנסה אותי **לִרְצוֹחַ**, המציאות באה מולי חזיתית, ניסתה בי **לִנְגּוֹחַ**.`,
            mnemonicLogic: `(שיטת ה-4 שלבים) - חלק 1:
1. המשבר (הבית הכואב):
2. **החוויה הפנימית**: מוח, כוח, לקדוח, לגנוח.
3. **האיום החיצוני**: לנבוח, לרצוח, לנגוח.`,
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "מנפילה להמראה (וח)",
            items: [
                "מוֹחַ", "כּוֹחַ", "לִקְדּוֹחַ", "לִגְנוֹחַ", "לִנְבּוֹחַ", "לִרְצוֹחַ", "לִנְגּוֹחַ",
                "לִזְנוֹחַ", "לָקוֹחַ", "מִשְׁלוֹחַ", "לִטְרוֹחַ",
                "לִצְנוֹחַ", "אֶפְרוֹחַ", "לִפְסוֹחַ", "לִזְבּוֹחַ", "לִבְטוֹחַ", "לִתְפּוֹחַ", "לִפְקוֹחַ", "לִפְתּוֹחַ",
                "לִטְפּוֹחַ", "נִיחוֹחַ", "לִצְמוֹחַ", "לִפְרוֹחַ", "לִשְׁכּוֹחַ", "לִסְלוֹחַ", "לִשְׂמוֹחַ"
            ],
            story: `המונולוג: מנפילה להמראה
זה התחיל כשהרגשתי שהמחשבות חונקות לי את המוֹחַ, חיפשתי בתוכי ולא מצאתי אפילו טיפת כּוֹחַ. הכאב היה חד, התחיל ברקות לִקְדּוֹחַ, שכבתי במיטה, לא הפסקתי לִגְנוֹחַ.
בחוץ העולם המשיך, כלב רחוק לא הפסיק לִנְבּוֹחַ, הרגשתי שהדיכאון הזה מנסה אותי לִרְצוֹחַ, המציאות באה מולי חזיתית, ניסתה בי לִנְגּוֹחַ.
אז הבנתי: את מה שלא מדויק לי – אני חייב לִזְנוֹחַ. אני לא עוד סתם לָקוֹחַ שמחכה שיגיע איזה מִשְׁלוֹחַ של מזל, הפסקתי להתאמץ על ריק, הפסקתי לִטְרוֹחַ.
עליתי גבוה, מעל הפחד, רק כדי ללמוד איך לִצְנוֹחַ, הרגשתי קטן ושברירי, ממש כמו אֶפְרוֹחַ. החלטתי שעל השלבים הבטוחים בסולם אני עומד לִפְסוֹחַ, את האגו הישן שלי הייתי מוכן לִזְבּוֹחַ.
פתאום, בתוך הנפילה, למדתי מחדש לִבְטוֹחַ. הרגשתי את הריאות באוויר נקי מתחילות לִתְפּוֹחַ, העזתי סוף סוף את העניים לִפְקוֹחַ, ואת הדלת הנעולה של הלב שלי לִפְתּוֹחַ.
עכשיו, כשאני למטה אבל שלם, אני יכול לעצמי על השכם לִטְפּוֹחַ, יש לאוויר סביבי פתאום איזה נִיחוֹחַ. מהאדמה הזאת אני בוחר מחדש לִצְמוֹחַ, הנפש שלי מתחילה לִפְרוֹחַ.
את הכעס הישן אני בוחר לִשְׁכּוֹחַ, לעצמי ולעולם אני מוכן לִסְלוֹחַ, וזה הניצחון האמיתי – פשוט לִשְׂמוֹחַ.`,
            mnemonicLogic: `(שיטת ה-4 שלבים):
1. **המשבר (הבית הכואב)**: מוח, כוח, לקדוח, לגנוח, לנבוח, לרצוח, לנגוח.
2. **ההחלטה (השינוי)**: לזנוח, לקוח, משלוח, לטרוח.
3. **הקפיצה (האומץ)**: לצנוח, אפרוח, לפסוח, לזבוח, לבטוח, לתפוח, לפקוח, לפתוח.
4. **הצמיחה (הסוף הטוב)**: לטפוח, ניחוח, לצמוח, לפרוח, לשכוח, לסלוח, לשמוח.`,
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "לְהִתְגַּבֵּר",
            items: [
                "חָבֵר", "לְהִתְחַבֵר", "מִתְחַבֵר", "הִתְחַבֵר", "לְהִתְעוֹרֵר", "מִתְעוֹרֵר",
                "הִתְעוֹרֵר", "עִוֵּר", "לְעוֹרֵר", "מְשׁוֹרֵר", "לְהִתְחַוֵּר", "הִתְחַוֵּר",
                "לְהִשָּׁבֵר", "נִשָּׁבֵר", "יִשָּׁבֵר", "לְהִקָּבֵר", "לְהִצָּבֵר", "לְהִגָּבֵר",
                "הַעֲבֵר", "לְהִדָּבֵר"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "מִגְדָּל",
            items: [
                "מִגְדַּל", "גָּדַל", "מֻגְדָּל", "סַנְדָּל", "חַרְדָּל", "אֲגוּדָל",
                "סְקַנְדָּל", "גּוֹזָל", "מֶחְדָּל", "וַנְדָּל", "נִבְדָּל", "דַּל",
                "חָדַל", "פֵּדָל", "נָדָל", "בְּדָל", "מְגֻדָּל", "מְסֻנְדָּל",
                "מְבֻדָּל", "גָּאַל"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "עֶרֶב",
            items: [
                "עֵרֶב", "חֶרֶב", "קֶרֶב", "גֶּרֶב", "שֶׁרֶב", "סֶרֶב",
                "יֶקֶב", "עֵקֶב", "קֶצֶב", "רֶכֶב", "רֹטֶב", "נֶגֶב",
                "עֶצֶב", "קֶשֶׁב", "קֹטֶב", "עֵשֶׂב", "כֶּלֶב", "סֶבֶב",
                "צֶלֶב", "שֶׁלֶב"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        // --- New Beginner Groups (Added Feb 2026) ---
        {
            name: "זְמַן",
            items: [
                "מֻזְמָן", "מִזְּמַן", "הֻזְמַן", "מְתֻזְמָן", "מֻטְמָן", "נִטְמַן", "אַרְגְּמַן", "מְתֻרְגְּמָן",
                "רַחְמָן", "אַלְמָן", "דֻּגְמָן", "נַקְמָן", "נַמְנְמָן", "גַּמְגְּמָן", "תַּחְמָן", "חַרְמָן",
                "חַכְמָן", "סַמְמַן", "שְׁמַן", "רַשְׁמָן"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "גָּדוֹל",
            items: [
                "יָכוֹל", "לֶאֱכֹל", "חוֹל", "מוֹל", "כָּפוֹל", "מָחוֹל", "לִגְדֹּל", "לִכְלֹל",
                "לִמְחֹל", "לִטְבֹּל", "לִגְלֹל", "לַחֲדֹל", "לִגְזֹל", "לִגְמֹל", "לִכְשֹׁל", "לַחְמֹל",
                "נִמּוֹל", "לִכְפֹּל", "לִדְגֹּל", "גְּבֹל"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "מָקוֹם",
            items: [
                "שׁוּמָקוֹם", "מְקוֹם", "בִּמְקוֹם", "קוֹם", "אָדוֹם", "דָּרוֹם", "חָלוֹם", "חֹם",
                "סָכוֹם", "לִגְרֹם", "עָקוֹם", "תְּהוֹם", "לִרְקֹם", "לִנְקֹם", "לִרְתֹּם", "דֹּם",
                "יַחֲלֹם", "רָקוֹם", "לִסְכֹּם", "חֲסֹם"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "מָתַי",
            items: [
                "מִמָּתַי", "בְּנוֹתַי", "חֲלוֹמוֹתַי", "תַּחְתַּי", "פְּרָטַי", "סְרָטַי", "שְׁלָטַי", "רַבּוֹתַי",
                "שְׁנוֹתַי", "מַבָּטַי", "שְׂפָתַי", "פֵּרוֹתַי", "מִפְרָטַי", "מִשְׁפָּטַי", "קְמָטַי", "לְבָטַי",
                "אַמְבָּטַי", "בָּתַּי", "מַכּוֹתַי", "שְׂרָטַי"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "אֱמֶת",
            items: [
                "בֶּאֱמֶת", "מֵת", "צוֹמֶת", "מְשַׁעֲמֶמֶת", "נֶעֱלֶמֶת", "מִשְׁתַּמֵּט", "לְאַמֵּת", "לְקַמֵּט",
                "צָמֵאת", "אֲדַמְדֶּמֶת", "מְרֻדֶּמֶת", "לְכַמֵּת", "הִשְׁתַּמֵּט", "לְהִשְׁתַּמֵּט", "שְׁחַמְחֶמֶת", "כְּתַמְתֶּמֶת",
                "דּוֹמֶמֶת", "שׁוֹמֶמֶת", "מְאַמֵּת", "מְקַמֵּט"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "לֵב",
            items: [
                "לְהֵעָלֵב", "לְהִשְׁתַּלֵּב", "לְשַׁלֵּב", "לְהִצְטַלֵּב", "שָׁלֵו", "כִּסְלֵו", "חוֹלֵב", "לִבְלֵב",
                "לְלַבְלֵב", "מְשַׁלֵּב", "מִשְׁתַּלֵּב", "מִצְטַלֵּב", "מְלַבְלֵב", "שִׁלֵּב", "הִשְׁתַּלֵּב", "הִצְטַלֵּב",
                "יִשְׁתַּלֵּב", "יֵעָלֵב", "תֵּעָלֵב", "שַׁלֵּב"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "שִׁיר",
            items: [
                "הַעִיר", "קִיר", "יָשִׁיר", "עָשִׁיר", "מַכִּיר", "צָעִיר", "שָׁבִיר",
                "בָּהִיר", "מְהִיר", "זָהִיר", "הִסְבִּיר", "הִזְהִיר", "הִשְׂכִּיר", "הִבְהִיר",
                "מַזְכִּיר", "מַסְבִּיר", "מַזְהִיר", "מַבְהִיר", "מַשְׂכִּיר", "תָּמִיר"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "עַכְשָׁיו",
            items: [
                "כּוֹכָב", "מַצָּב", "זָהָב", "אָהַב", "גַּב", "חָלָב", "כְּתָב", "שָׁב",
                "רַב", "קְרָב", "נִגְנַב", "אַרְנָב", "עֵנָב", "מוּטָב", "הִתְאַהֵב", "יָהָב",
                "כָּזָב", "אֶצְבַּע", "צָב", "מְאַכְזֵב", "אָב", "יוֹאָב"
            ],
            story: "",
            mnemonicLogic: "",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        // --- Multi-Syllabic Phrases (Phase 8) ---
        {
            name: "דיברתי (A-ti)",
            items: ["מָה עָשִׂיתִי", "לֹא טָעִיתִי"],
            itemsMetadata: {
                "מָה עָשִׂיתִי": { syllableCount: 4, wordCount: 2, stressPattern: "1010" },
                "לֹא טָעִיתִי": { syllableCount: 4, wordCount: 2, stressPattern: "0010" }
            },
            story: "",
            mnemonicLogic: "Phrases ending in -ati (past tense verbs)",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "עושה (O-eh)",
            items: ["לֹא רוֹאֶה", "מָה שֶׁקּוֹרֶה"],
            itemsMetadata: {
                "לֹא רוֹאֶה": { syllableCount: 3, wordCount: 2, stressPattern: "001" },
                "מָה שֶׁקּוֹרֶה": { syllableCount: 4, wordCount: 2, stressPattern: "0001" }
            },
            story: "",
            mnemonicLogic: "Phrases ending in -oeh/-oah (present tense)",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "יכולת (O-let)",
            items: ["יֵשׁ יְכֹלֶת", "מָה אַתְּ אוֹכֶלֶת"],
            itemsMetadata: {
                "יֵשׁ יְכֹלֶת": { syllableCount: 4, wordCount: 2, stressPattern: "1010" },
                "מָה אַתְּ אוֹכֶלֶת": { syllableCount: 5, wordCount: 3, stressPattern: "10100" }
            },
            story: "",
            mnemonicLogic: "Phrases ending in -olet (nouns/ability)",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        },
        {
            name: "רבים (A-im)",
            items: ["עִם הַחֲבֵרִים", "חַיִּים בִּסְרָטִים"],
            itemsMetadata: {
                "עִם הַחֲבֵרִים": { syllableCount: 5, wordCount: 2, stressPattern: "10001" },
                "חַיִּים בִּסְרָטִים": { syllableCount: 5, wordCount: 2, stressPattern: "01001" }
            },
            story: "",
            mnemonicLogic: "Phrases ending in -im (plural)",
            createdAt: now,
            lastUsedAt: now,
            isSystem: true
        }
    ];

    await db.wordGroups.bulkAdd(initialGroups);
    console.log("Database seeded with Rhyme Machine essentials! 🧠");
};
