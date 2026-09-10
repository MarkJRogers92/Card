# M02 — Authoritative Engine Foundation

Status: **accepted on `codex/m02-engine-foundation`**

## Scope

M02 is engine-foundation work only. It does not introduce combat rules, card-zone
behavior, UI-owned state, or content-ID special cases.

The design acceptance target is:

- 100 repeated seeded command sequences produce identical authoritative-state
  hashes.
- Cosmetic randomness cannot perturb gameplay randomness.
- Gameplay randomness uses pinned, versioned, independent streams for map,
  encounter, combat, reward, and event selection.
- Commands and emitted event records receive deterministic sequence-derived IDs.
- Authoritative state can be serialized canonically and hashed without browser,
  React, PixiJS, storage, clock, or network dependencies.

## Implementation

- `src/engine/canonical.ts` — canonical JSON-compatible serialization and a
  versioned deterministic 64-bit FNV-1a hash over canonical UTF-8 bytes.
- `src/engine/rng.ts` — pinned `mulberry32-v1` PRNG cursors, independent gameplay
  streams, rejection-sampled integer draws, and a separate cosmetic cursor.
- `src/engine/state.ts` — minimal M02 authoritative state containing engine/content
  identity, content hash, command sequence, and gameplay RNG state.
- `src/engine/commands.ts` — deterministic command envelopes and strict sequential
  commit guard.
- `src/engine/events.ts` — deterministic command-scoped event records with no
  timestamps or presentation state.
- Engine exports updated through `src/engine/index.ts`.
- `test:replay` and `test:properties` are real M02 test commands.
- `.github/workflows/m02-ci.yml` runs the locked M02 acceptance suite on the M02
  branch so the project can be tested from connected GitHub work without a local
  checkout.

## Acceptance verification

GitHub Actions run `34478451729` executed on 2026-09-10 using the repository's
locked dependencies and completed successfully.

The following all passed:

```text
npm ci
npm run check
npm run test:engine
npm run test:content
npm run test:replay
npm run test:properties
npm run build
```

The replay suite repeats 100 seeded 80-command sequences and verifies identical
sampled values, event IDs, RNG state, and final authoritative-state hashes. The
same sequences are also run with interleaved cosmetic RNG draws and must remain
identical.

The property suite independently verifies that arbitrary cosmetic draw counts do
not perturb the first gameplay draw or resulting authoritative-state hash.

## Result

M02 meets its design acceptance criterion on `codex/m02-engine-foundation`.
`main` remains unchanged until this branch is explicitly merged.

## Next eligible milestone after merge

**M03 — deck cycling, Energy, hand cap, card zones, and turn transitions.**
