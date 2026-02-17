# Dicta API Research Notes

## Overview
Dicta (DICTA: The Israel Center for Text Analysis) — Israeli non-profit, Bar-Ilan University, founded 2015.
All web tools are free. HuggingFace models are open source.

## What Dicta Provides

### 1. Nakdan (Vocalization/Nikud)
- **Accuracy**: 95.12% letter, 88.23% word (modern Hebrew)
- **Architecture**: bi-LSTM + linguistic rules + dictionary (50K+ lexemes, 5.5M+ inflections)
- **Access**: Web UI, Android app, Chrome extension, HuggingFace model, ONNX runtime
- **Our current usage**: `charuzit-4-0.loadbalancer.dicta.org.il/tipsoundplay` (POST, payload: `{w: "word"}`)

### 2. Charuzit (Rhyme Finder)
- **Endpoint**: `charuzit-4-0.loadbalancer.dicta.org.il/api` (POST)
- **Our usage**: Half-rhyme mode, 1-10 syllables, up to 50 results
- **Capabilities**: rhyme_mode (half/full), syllable range, morphological filters, letter/vowel swap allowance

### 3. DictaBERT Models (HuggingFace - Python only)
| Model | Task | Output |
|-------|------|--------|
| dictabert-large-parse | Joint parsing | POS, morphology, lemmas, syntax, NER |
| dictabert-morph | Morphological tagging | POS, gender, number, person, tense |
| dictabert-lex | Lemmatization | Dictionary headword |
| dictabert-seg | Prefix segmentation | Prefix/stem separation |
| dictabert-large-char-menaked | Nikud | Full vocalization |

## What Dicta Does NOT Provide
- **Syllable decomposition** — No tool does this
- **Root (shoresh) extraction** — Only lemma, not 3-letter root
- **Mishkal/Binyan identification** — Not in any model output
- **IPA/Phoneme conversion** — Not available (see Phonikud below)
- **JavaScript SDK** — Python only

## Related Tools

### Phonikud (3rd party, builds on Dicta)
- GitHub: thewh1teagle/phonikud
- Converts vocalized Hebrew to IPA phonemes with stress marks
- Python + ONNX
- `phonemize("שָׁלוֹם עוֹלָם")` → `ʃalˈom olˈam`
- Closest thing to syllable-level analysis that exists

### dicta-onnx (3rd party)
- Offline nikud using ONNX runtime
- 0.1s per sentence on Apple M1
- ~300MB model
- `pip install -U dicta-onnx`

### Hspell
- Spell check + morphology engine (C library + Python wrapper)
- Root-based inflection tables
- Could potentially provide root extraction

### YAP Parser
- Go-based REST API
- Morphological analysis + parsing
- No syllable/phoneme output

## API Details (Undocumented - Reverse Engineered)

### Vocalization Endpoint
```
POST https://charuzit-4-0.loadbalancer.dicta.org.il/tipsoundplay
Content-Type: application/json
Body: {"w": "שלום"}
Returns: Array of vocalized forms with nikkud
```

### Rhyme Search Endpoint
```
POST https://charuzit-4-0.loadbalancer.dicta.org.il/api
Content-Type: application/json
Body: {
  soundplay_keyword: "שָׁלוֹם",
  rhyme_mode: "half",
  model: "Rhyme",
  soundplay_settings: { allowletswap: true, allowvocswap: true },
  return_settings: { min_syl: 1, max_syl: 10, ... },
  morph_filter: { pos: 0, ... }
}
Returns: { results: [{ results: [{ forms: ["word1", "word2"] }] }] }
```

## Rate Limits & Authentication
- No API key required
- No published rate limits
- Free (non-profit)
- No terms of service for API usage (undocumented API)

## Gap Analysis for RapCap
| Need | Available? | Source |
|------|-----------|--------|
| Nikud | YES | Dicta Nakdan API |
| Rhyme search | YES | Dicta Charuzit API |
| Syllable decomposition | NO | Must build custom |
| Root extraction | PARTIAL | Hspell or custom lookup from lemma |
| Mishkal identification | NO | Must build custom or use pattern matching |
| Phoneme/IPA | PARTIAL | Phonikud (Python, 3rd party) |
| Stress detection | NO | Must build custom heuristic |
| Consonant equivalence | NO | Must build custom mapping |
