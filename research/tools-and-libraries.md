# Tools & Libraries for Phonetic Analysis — Research Notes

## Key Finding: eSpeak-NG WASM
**Most important discovery.** eSpeak-NG can run in the BROWSER via WebAssembly:
- Supports Hebrew (`he`) — outputs IPA phonemes
- ~2-4 MB WASM build
- Works offline
- Can do: Text → IPA phonemes (with stress marks)
- GitHub: `espeak-ng/espeak-ng`, WASM forks: `nickvdh/espeak-ng-wasm`
- **This solves the Hebrew-to-phoneme problem client-side**

## Recommended Pipeline (Browser-Based)

```
User Input (Hebrew text, no nikud)
       |
       v
[1. Nikud Addition] ─── Dicta API (online) OR small ONNX model (offline)
       |
       v
[2. Phoneme Conversion] ─── eSpeak-NG WASM (~3MB, offline)
       |                     OR custom rule-based (~10KB, if nikud present)
       v
[3. Syllable Segmentation] ─── TeX patterns via hypher (~50KB)
       |                        OR extract from eSpeak IPA
       v
[4. Rhyme Analysis] ─── Custom algorithm (~200 lines)
       |                 Phoneme suffix matching
       |                 Phonetic feature distance
       v
[Rhyme Score + Classification]
```

## Client-Side Libraries (npm)

### Tier 1: Ready to Use

| Package | What | Size | Hebrew? |
|---------|------|------|---------|
| `cmu-pronouncing-dictionary` | 134K English words → phonemes | ~5 MB | No |
| `pronouncing` | JS port of Python lib, wraps CMU dict | Small | No |
| `syllable` | English syllable counting | Small | No |
| `hypher` / `hyphen` | TeX-pattern hyphenation (multi-lang) | ~50KB/lang | **YES** |
| `arpabet-to-ipa` | ARPAbet → IPA converter | Small | No |
| `rhyme` / `rhymer` | English rhyme checking via CMU | Small | No |

### Tier 2: Medium Effort

| Package | What | Size | Hebrew? |
|---------|------|------|---------|
| `espeak-ng-wasm` | Text → IPA phonemes in browser | ~2-4 MB | **YES** |
| `onnxruntime-web` | Run ML models in browser | ~2-8 MB | Can run nikud models |
| `natural` | Full NLP toolkit (Metaphone, SoundEx) | Large | No |

### Tier 3: Advanced

| Package | What | Notes |
|---------|------|-------|
| `transformers.js` (Xenova) | HuggingFace models in browser | 10-50MB per model |
| Wiktionary data (`kaikki.org`) | Hebrew IPA dictionary bootstrap | Incomplete coverage |

## Hebrew-Specific Tools

### What Exists
- **Dicta Nakdan API** — nikud addition (95% accuracy, online)
- **Dicta Charuzit API** — rhyme search (online)
- **eSpeak-NG** — Hebrew phoneme output (can run offline via WASM)
- **hypher with Hebrew patterns** — approximate syllable splitting (offline)
- **HebMorph** — morphological analysis (Java/.NET, not browser)
- **yap** — Hebrew NLP pipeline (Go, server-only)

### What Doesn't Exist
- Hebrew phoneme dictionary (like CMU dict for English) — **must build ourselves**
- Hebrew syllable splitting library — **must build ourselves**
- Hebrew rhyme detection library — **must build ourselves**
- Hebrew IPA npm package — **must build ourselves or use eSpeak WASM**

## Rhyme Detection Algorithms

### Basic: Phoneme Suffix Matching
```
score = matching_phonemes_from_end / total_phonemes_in_shorter_word
```

### Advanced: Phonetic Feature Distance
Instead of binary match, compute distance based on articulatory features:
- Place of articulation
- Manner of articulation
- Voicing

/p/ and /b/ are closer than /p/ and /s/ (same place, differ only in voicing).

### For Multi-Syllable Detection
1. **Sliding window**: Compare N-phoneme windows at word ends
2. **Vowel skeleton**: Extract vowels only, match patterns ("amazing" → "eI-I" matches "blazing")
3. **Syllable alignment**: Align syllables, score each pair

### Cross-Word Boundary
Convert phrases to continuous phoneme strings (remove word boundaries), then match.
"got ya" and "botcha" → same phoneme sequence when boundaries removed.

## Hebrew Consonant Equivalence Map (for rhyme matching)

```typescript
const EQUIVALENT_CONSONANTS: Record<string, string> = {
  'ת': 't', 'ט': 't',     // Both /t/
  'כּ': 'k', 'ק': 'k',    // Both /k/
  'ס': 's', 'שׂ': 's',    // Both /s/
  'א': 'ʔ', 'ע': 'ʔ',    // Both glottal (or silent)
  'כ': 'x', 'ח': 'x',    // Both /x/
  'ו': 'v', 'ב': 'v',    // Both /v/ (vet without dagesh)
};
```

## Critical Gap: Hebrew Without Nikud
Hebrew rap lyrics are typically written WITHOUT nikud. Without vowels, phonetic analysis is impossible.

**Solution**: The pipeline MUST include a nikud-addition step:
1. Online: Dicta Nakdan API
2. Offline: Small ONNX model (dicta-onnx, ~300MB) — too big for PWA?
3. Hybrid: Cache nikud results aggressively, use API when online

## Browser Compatibility Summary

| Approach | Offline? | Size | Accuracy |
|----------|---------|------|----------|
| Dicta API | No | 0 | 95% |
| eSpeak WASM | Yes | ~3 MB | Good |
| TeX hyphenation | Yes | ~50 KB | Approximate |
| Custom rules (with nikud) | Yes | ~10 KB | Good |
| ONNX nikud model | Yes | ~300 MB | High |
| CMU dict (English) | Yes | ~5 MB | Excellent |

## Next Steps
1. Test eSpeak-NG WASM with Hebrew input
2. Test hypher with Hebrew TeX patterns
3. Build Hebrew consonant equivalence map
4. Design phoneme-based rhyme scoring function
5. Prototype syllable-level UI component
