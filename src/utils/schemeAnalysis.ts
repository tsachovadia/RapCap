import type { Verse, VerseScheme, HebrewVowel } from '../db/db';

export interface SchemeStats {
    totalSyllables: number;
    barCount: number;
    vowelPattern: HebrewVowel[];
}

export function computeSchemeStats(scheme: VerseScheme, verse: Verse): SchemeStats {
    const barIds = new Set<string>();
    let totalSyllables = 0;
    const vowels: HebrewVowel[] = [];

    for (const hit of scheme.hits) {
        barIds.add(hit.barId);
        const bar = verse.bars.find(b => b.id === hit.barId);
        if (!bar) continue;

        const allSyllables = bar.words.flatMap(w => w.syllables);
        for (let si = hit.startSyllable; si <= hit.endSyllable; si++) {
            totalSyllables++;
            const syl = allSyllables[si];
            if (syl?.vowel) {
                vowels.push(syl.vowel);
            }
        }
    }

    return { totalSyllables, barCount: barIds.size, vowelPattern: vowels };
}
