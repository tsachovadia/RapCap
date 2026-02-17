# Current RapCap Codebase — Rhyme/Phonetic System State

## Decision: Keep vs Remove

### KEEP (Works well)
- `src/services/dicta.ts` — Dicta API client (vocalization + rhyme search)
- `src/components/shared/DictaModal.tsx` — Rhyme search UI
- `src/db/db.ts` — WordGroup data model and seed data
- RhymeLibraryPage, RhymeEditorPage — Group management UI
- The concept of WordGroups with items, stories, bars, connections

### REMOVE (Will be redesigned)
- `src/services/PhoneticEngine.ts` — 3-layer rhyme detection (too simplistic)
- `src/services/phonetic/Syllabifier.ts` — Heuristic syllabifier (needs complete rewrite)
- `src/hooks/usePhoneticAnalysis.ts` — Hook wrapping the old engine
- Post-session phonetic analysis model (SessionAnalysis.detectedRhymeGroups)

## Current DB Schema (5 tables)

### wordGroups
```
++id, name, lastUsedAt, isSystem, cloudId
Fields: name, items[], story, mnemonicLogic, bars,
        itemsMetadata{}, connections[], category, language
```

### sessions
```
++id, title, type, createdAt, updatedAt, cloudId
Fields: title, type (freestyle|drill|thoughts|training|writing),
        duration, date, blob, metadata{lyrics, analysis, bars[], ...}
```

### beats
```
++id, videoId, name, createdAt
```

### vault
```
++id, type, createdAt, sessionId
Fields: type (punchline|bar|flow_pattern), content, metadata
```

### barRecordings
```
id, sessionId, barId, createdAt
Fields: blob, duration
```

## Current Dicta Integration Points
| Component | Usage |
|-----------|-------|
| RhymeLibraryPage | Find rhymes for groups |
| RhymeEditorPage | Find rhymes while editing |
| WritingSessionPage | Find rhymes for visible groups |
| FreestyleModeUI | Find rhymes during freestyle |
| RhymeZenMode | Find rhymes during zen writing |
| PhoneticEngine | Fetch vocalizations for analysis (TO BE REMOVED) |

## Data Model Observations

### What's Good
- WordGroup supports both single words and phrases (items[])
- itemsMetadata allows per-item syllable count, stress pattern, weight
- connections[] allows linking groups (perfect/slant/family)
- Vault stores punchlines, bars, flow_patterns separately

### What's Missing
- No standalone "Word" entity with phonetic breakdown
- No "Syllable" entity
- No linking between bars and rhyme groups at the word level
- No flow/chain entity (ordered sequence of rhyming items)
- No verse/song structure entity
- No phonetic signature stored per word
- stress pattern is a string ("0101") but not connected to actual syllable data
