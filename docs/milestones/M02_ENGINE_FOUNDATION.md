# M02 — Authoritative Engine Foundation

Status: **in progress**

## Scope

M02 is engine-foundation work only. It must not introduce combat rules, card-zone
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

## First implementation slice

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
- `test:replay` and `test:properties` become real M02 test commands.

## Verification performed in this task

The connected GitHub environment cannot install or execute the repository's npm
workspace directly, so full repository acceptance is intentionally not claimed.

A local isolated engine harness was compiled with TypeScript 5.8.3 under Node
22.16.0 and passed. A compiled smoke harness repeated 100 seeded 80-command
sequences and confirmed identical final state hashes with and without interleaved
cosmetic RNG draws.

## Required before M02 acceptance

Run from a normal repository checkout using the locked toolchain:

```text
npm ci
npm run check
npm run test:engine
npm run test:content
npm run test:replay
npm run test:properties
npm run build
```

If any command fails, M02 remains in progress. Do not delete or weaken tests to
make the milestone appear complete.
