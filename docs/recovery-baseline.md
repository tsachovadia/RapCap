# RapCap recovery baseline

The iCloud checkout is treated as read-only evidence because its Git object store is corrupt.
Development continues from a fresh clone outside iCloud on feature branches and through pull requests.

## Preserved product work

The clean remote already contains the existing training work, including Zen Mode, rhyme groups,
the rhyme-training UI, and word-drop controls. These features remain in the repository and will be
organized as a secondary Training layer over the recording experience; they are not being deleted.

## Baseline gates

- `npm ci`
- `npm test`
- `npm run build`

The legacy full-repository lint currently reports pre-existing debt and is not a merge gate until it
has been reduced deliberately. New core modules and touched MVP files should be kept lint-clean.
