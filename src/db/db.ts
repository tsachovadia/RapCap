import Dexie, { type Table } from 'dexie';

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
}

export interface DbSession {
    id?: number;
    cloudId?: string;
    syncedAt?: Date;
    updatedAt?: Date;
    title: string;
    type: 'freestyle' | 'drill' | 'thoughts' | 'training';
    subtype?: string;
    beatId?: string;
    beatStartTime?: number; // The timestamp in the beat where recording started
    duration: number;
    date: Date;
    createdAt: Date;
    blob?: Blob;
    syncOffset?: number;
    metadata?: {
        lyrics?: string;
        lyricsSegments?: any[];
        lyricsWords?: any[];
        language?: string;
        [key: string]: any;
    };
    content?: string; // For generic content like drill words
}

export class RapCapDatabase extends Dexie {
    wordGroups!: Table<WordGroup>;
    sessions!: Table<DbSession>; // Typed sessions table

    constructor() {
        super('rapCapDB');

        // Define tables and indexes
        this.version(3).stores({
            wordGroups: '++id, name, lastUsedAt, isSystem, cloudId',
            sessions: '++id, title, type, createdAt, updatedAt, cloudId'
        });
    }
}

export const db = new RapCapDatabase();

// Seed function to populate default data
export const seedDatabase = async () => {
    // Check for old data to force a migration/reset
    // If we find the old "Full Story" name, we know we need to migrate to the new "Yarid" name.
    const hasOldName = await db.wordGroups.where('name').equals("תרגיל ה-Story המלא").count();
    const hasOldVerbs = await db.wordGroups.where('name').startsWith("להשמיד").count();

    // Also check if we DO NOT have the new 'Lignoaḥ' or 'Migdal' entry yet.
    const hasNewLignoah = await db.wordGroups.where('name').equals("לִגְנוֹחַ").count();
    const hasMigdal = await db.wordGroups.where('name').equals("מִגְדָּל").count();
    const hasZman = await db.wordGroups.where('name').equals("זְמַן").count();

    // Check for "Av" update in Achshav group
    const achshavGroup = await db.wordGroups.where('name').equals("עַכְשָׁיו").first();
    const needsAvUpdate = achshavGroup && !achshavGroup.items.includes("אָב");

    const shouldMigrate = hasOldName > 0 || hasOldVerbs > 0 || hasNewLignoah === 0 || hasMigdal === 0 || hasZman === 0 || !!needsAvUpdate;

    if (!shouldMigrate && await db.wordGroups.count() > 0) return;

    // Reset if migration needed
    if (shouldMigrate) {
        console.log("Updating system word groups...");
        // Safely delete only system groups to preserve user data
        await db.wordGroups.filter(g => !!g.isSystem).delete();
    }

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
