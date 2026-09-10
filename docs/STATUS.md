# Status

## Current milestone

**M03 — deck, Energy, and turn foundation**

M03 builds on accepted M02 deterministic state/RNG infrastructure and adds the
base authoritative lifecycle for card instances, card zones, deck cycling,
Energy, hand limits, and player/enemy phase transitions. HP, Block, targeting,
card effects, Imprints, Reactions, and keyword lifecycle exceptions remain out
of scope.

## M03 acceptance checklist

- [x] Deterministic combat-stream deck shuffle
- [x] Draw 5 and refill to 3 Energy at player-turn start
- [x] Hand cap of 10 with overflow routed directly to discard
- [x] Draw/discard reshuffle and empty-pile behavior
- [x] Illegal Energy costs rejected without state mutation
- [x] Ordinary M03 turn end discards the hand and clears Energy
- [x] Strict card conservation across draw/hand/discard/exhaust/deployed zones
- [x] Duplicate runtime card instance IDs rejected
- [x] Repeated seeded turn sequences produce identical authoritative-state hashes
- [x] Prior M00–M02 tests continue to pass
- [x] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on
  `codex/m02-engine-foundation`. GitHub Actions run `34478451729` passed `npm ci`,
  type/generated-content checks, engine/content tests, replay determinism,
  property tests, and production build. `main` remained untouched.

## M03 verification record

M03 was implemented on `codex/m03-deck-turn-foundation` and accepted on
2026-09-10. GitHub Actions run `34484850623` completed successfully using Node
24.20.0 on a standard Ubuntu GitHub-hosted runner.

The acceptance run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- `npm run test:m03`
- `npm run build`

The M03 suites verify deterministic shuffle/reshuffle behavior, empty-pile draw
handling, 10-card hand overflow to discard, Energy legality, ordinary turn-end
discard, duplicate-instance rejection, card conservation across all five zones,
and deterministic repeated seeded turn sequences.

`main` has not been changed by M02 or M03 work.

## Next eligible milestone

**M04 — HP, Block, damage packets, and the four target rules.** Preserve M02/M03
determinism and card-zone contracts and keep all rules inside the rendering-
independent engine boundary.
