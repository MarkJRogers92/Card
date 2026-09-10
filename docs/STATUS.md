# Status

## Current milestone

**M04 — HP, Block, damage, and targeting**

M04 builds on accepted M02/M03 deterministic state, deck, Energy, and turn infrastructure and adds authoritative actor vitality, Block, direct-damage packets, Front/Reserve/Both/Locked target resolution, combat end states, and nonlethal self-HP costs. Enemy move selection, statuses, card effects, Imprints, Reactions, and manual-swap cost rules remain out of scope.

## M04 acceptance checklist

- [x] Player and enemy actors have authoritative max HP, current HP, and Block
- [x] Direct damage consumes Block before HP and never creates negative values
- [x] Front resolves against the current Front character at hit time
- [x] Reserve resolves against the current Reserve character at hit time
- [x] Both resolves two distinct hits with independent Block absorption
- [x] Locked remains attached to the named player character after formation changes
- [x] Player Block expires at player-turn start
- [x] Enemy Block expires at enemy-phase start
- [x] Either player reaching 0 HP ends combat in defeat
- [x] All registered enemies reaching 0 HP ends combat in victory
- [x] Self-HP costs bypass Block and must leave at least 1 HP
- [x] Invalid targets and damage inputs are rejected without mutating state
- [x] Prior M00–M03 suites continue to pass
- [x] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on `codex/m02-engine-foundation`; GitHub Actions run `34478451729` passed the locked M02 suite and production build.
- **M03 — deck, Energy, and turn foundation**: accepted 2026-09-10 on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623` passed prior suites, focused M03 tests, and production build.

## M04 verification record

M04 was implemented on `codex/m04-hp-damage-targeting` and accepted on 2026-09-10. The first GitHub Actions attempt caught a TypeScript null-narrowing problem in formation targeting. That implementation error was fixed directly without weakening or deleting any tests.

GitHub Actions run `34495930333` then passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- `npm run test:m03`
- `npm run test:m04`
- `npm run build`

The focused M04 fixtures verify Front redirection, Reserve targeting, Locked persistence, separate Both hits, independent Block absorption, Block expiry, defeat/victory end states, nonlethal self-HP costs, and invalid-input immutability. The property suite checks HP/Block bounds and damage accounting across randomized values.

`main` remains unchanged by M02–M04 work.

## Next eligible milestone

**M05 — enemy move cycles and fixed-intent selection.** Claims Adjuster must execute its authored move cycle deterministically; formation changes must never rewrite a Locked target; and state/HP changes must not silently replace an already selected move.
