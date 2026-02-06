
export class Syllabifier {
    static readonly NIKKUD = {
        SHEVA: '\u05B0',
        HATAFA_SEGOL: '\u05B1',
        HATAF_PATACH: '\u05B2',
        HATAF_KAMATZ: '\u05B3',
        HIRIQ: '\u05B4',
        TZERE: '\u05B5',
        SEGOL: '\u05B6',
        PATACH: '\u05B7',
        KAMATZ: '\u05B8',
        HOLAM: '\u05B9',
        KUBUTZ: '\u05BB',
        DAGESH: '\u05BC',
        METEG: '\u05BD',
        MAQAF: '\u05BE',
        RAFE: '\u05BF',
        SHIN_DOT: '\u05C1',
        SIN_DOT: '\u05C2',
        SOF_PASUK: '\u05C3',
        UPPER_DOT: '\u05C4'
    };

    static readonly VOWELS = new Set([
        Syllabifier.NIKKUD.HATAFA_SEGOL,
        Syllabifier.NIKKUD.HATAF_PATACH,
        Syllabifier.NIKKUD.HATAF_KAMATZ,
        Syllabifier.NIKKUD.HIRIQ,
        Syllabifier.NIKKUD.TZERE,
        Syllabifier.NIKKUD.SEGOL,
        Syllabifier.NIKKUD.PATACH,
        Syllabifier.NIKKUD.KAMATZ,
        Syllabifier.NIKKUD.HOLAM,
        Syllabifier.NIKKUD.KUBUTZ,
        // Dagesh and Shuruk handling is special
    ]);

    static readonly GUTTURALS = new Set(['א', 'ה', 'ח', 'ע', 'ר']);

    /**
     * Breaks a Hebrew word with Nikkud into syllables
     * ex: "מִינִימָלִי" -> ["מִי", "נִי", "מָ", "לִי"]
     */
    static syllabify(text: string): string[] {
        return this.heuristicSyllabify(text);
    }

    private static heuristicSyllabify(text: string): string[] {
        // Algorithm:
        // 1. Group text into "Units" (Consonant + attached Nikkud)
        // 2. Iterate units and decide where to cut.

        const units = this.groupUnits(text);
        const syllables: string[] = [];
        let buffer: string[] = [];

        for (let i = 0; i < units.length; i++) {
            const unit = units[i];
            const nextUnit = units[i + 1];

            buffer.push(unit.fullText);

            // If this is the last unit, just finish
            if (!nextUnit) {
                syllables.push(buffer.join(''));
                buffer = [];
                continue;
            }

            // Rules to SPLIT after this unit:

            // 1. Dagesh Hazak in NEXT unit? 
            // If next unit has Dagesh AND is not a guttural/first letter -> It doubles.
            // So we close current syllable here. 
            // ex: הַתָּא (Hat-ta). Current: הַ. Next: תָּ. Next has Dagesh. 
            // So we split? No, strictly 'Hat' is the first syllable.
            // The Dagesh implies the consonant is technically in BOTH.
            // But for display "hat-ta" is correct.
            // So if Next unit has Dagesh -> Split NOW.
            if (this.hasDagesh(nextUnit) && !this.isGuttural(nextUnit.char)) {
                // Strong Dagesh closes previous syllable
                syllables.push(buffer.join(''));
                buffer = [];
                continue;
            }

            // 2. Sheva Rules
            // If CURRENT unit has Sheva:
            // Is it Silent (Nach) or Vocal (Na)?
            if (this.hasSheva(unit)) {
                // START of word? Vocal -> don't split (it's own partial syllable or starts one? usually attached to next)
                // "בְּרֵאשִׁית" -> Be-Re-Shit. 'Be' is a syllable.
                // So if Sheva Na -> It IS a syllable (open, short/moving).
                // So we split AFTER it.

                // If Sheva Nach (Silent) -> It CLOSES the syllable.
                // ex: "מִדְבָּר" (Mid-bar). Dalet has Sheva. It matches 'i' (short). So Silent.
                // Split AFTER it.

                // WAIT: In both cases (Na and Nach), we often split AFTER the letter with Sheva?
                // Na: "Be-reshit". Split after Be.
                // Nach: "Mid-bar". Split after Mid.
                // So... Sheva always ends a block?
                // Exception: "Two Shevas". First silent, second vocal.
                // "וַיֵּבְךְּ" (at end).

                // Let's assume: Sheva almost always ends the current visual syllable block 
                // for the user (Mid-bar, Be-reshit).
                syllables.push(buffer.join(''));
                buffer = [];
                continue;
            }

            // 3. Open Syllable (Vowel)
            // If current unit has a full vowel (Kamatz, Patah, etc.)
            // AND the next unit is a consonant that starts a new syllable.
            // How do we know if next consonant closes this one or starts new?
            // "שָׁלוֹם" (Sha-lom). Shin+Kamatz. Next is Lamed.
            // Does Lamed close 'Sha'? No.
            // "מַחְשֵׁב" (Mach-shev). Mem+Patach. Next is Het+Sheva.
            // Het closes it.

            // Heuristic: If specific Vowel + Next unit does NOT have Sheva/Dagesh... 
            // Ideally: CV -> Splittable if next is start of new CV.
            // If next unit has NO vowel (dead consonant)? It closes.
            // If next unit has Vowel? We split.
            // ex: Sha-Lom. Shin(Kamatz) -> Next Lamed(Holam). Both vowels. Split between.

            if (this.hasVowel(unit)) {
                // If next unit has NO vowel and NO Sheva? (e.g. End of word letter?)
                // Then next unit joins this one (Closed syllable).
                // ex: "לוֹם" (Lom). Lamed(Holam). Next is Mem(Sofit). No vowel. 
                // So we don't split.

                // Include Sheva as a "vowel" for this check?
                // If next unit has Vowel or Sheva -> It starts new sound. Split.
                if (this.hasVowel(nextUnit) || this.hasSheva(nextUnit)) {
                    syllables.push(buffer.join(''));
                    buffer = [];
                    continue;
                }
            }
        }

        return syllables;
    }

    private static groupUnits(text: string): { char: string, marks: string[], fullText: string }[] {
        const units: { char: string, marks: string[], fullText: string }[] = [];
        let currentUnit: { char: string, marks: string[], fullText: string } | null = null;

        for (const char of text) {
            if (char >= '\u05D0' && char <= '\u05EA') {
                // Hebrew Consonant
                if (currentUnit) units.push(currentUnit);
                currentUnit = { char, marks: [], fullText: char };
            } else if (char >= '\u0591' && char <= '\u05C7') {
                // Nikkud / Mark
                if (currentUnit) {
                    currentUnit.marks.push(char);
                    currentUnit.fullText += char;
                } else {
                    // Mark at start? attach to nothing or prev? separate?
                    // Shouldn't happen in valid text, but handle gracefully
                    // units.push({ char: '', marks: [char], fullText: char });
                }
            } else {
                // Punctuation / Space / English
                // Treat as break or separate unit?
                // For strictly hebrew word, let's treat as separate unit or attach?
                // Let's assume input 'text' is just a clean word.
                if (currentUnit) units.push(currentUnit);
                currentUnit = { char: char, marks: [], fullText: char };
            }
        }
        if (currentUnit) units.push(currentUnit);
        return units;
    }

    private static hasDagesh(unit: { marks: string[] }): boolean {
        return unit.marks.includes(this.NIKKUD.DAGESH);
    }

    private static isGuttural(char: string): boolean {
        return this.GUTTURALS.has(char);
    }

    private static hasSheva(unit: { marks: string[] }): boolean {
        return unit.marks.includes(this.NIKKUD.SHEVA);
    }

    private static hasVowel(unit: { marks: string[] }): boolean {
        return unit.marks.some(m => this.VOWELS.has(m));
    }
}
