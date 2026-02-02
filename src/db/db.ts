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
}

export interface DbSession {
    id?: number;
    cloudId?: string;
    syncedAt?: Date;
    title: string;
    type: 'freestyle' | 'drill' | 'thoughts' | 'training';
    subtype?: string;
    beatId?: string;
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
        this.version(2).stores({
            wordGroups: '++id, name, lastUsedAt, isSystem, cloudId',
            sessions: '++id, title, type, createdAt, cloudId'
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

    // Also check if we DO NOT have the new 'Lignoaḥ' entry yet.
    const hasNewLignoah = await db.wordGroups.where('name').equals("לִגְנוֹחַ").count();

    const shouldMigrate = hasOldName > 0 || hasOldVerbs > 0 || hasNewLignoah === 0;

    if (!shouldMigrate && await db.wordGroups.count() > 0) return;

    // Reset if migration needed
    if (shouldMigrate) {
        console.log("Migrating database to clean 'Yarid' + 'Lignoah' structure...");
        await db.wordGroups.clear();
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
המשבר (הבית הכואב):
1. **החוויה הפנימית**: מוח, כוח, לקדוח, לגנוח.
2. **האיום החיצוני**: לנבוח, לרצוח, לנגוח.`,
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
        }
    ];

    await db.wordGroups.bulkAdd(initialGroups);
    console.log("Database seeded with Rhyme Machine essentials! 🧠");
};
