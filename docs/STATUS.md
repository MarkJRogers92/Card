# Status

## Current milestone

**M03 — deck, Energy, and turn foundation (in progress)**

M03 builds on accepted M02 deterministic state/RNG infrastructure and adds the
base authoritative lifecycle for card instances, card zones, deck cycling,
Energy, hand limits, and player/enemy phase transitions. HP, Block, targeting,
card effects, Imprints, Reactions, and keyword lifecycle exceptions remain out
of scope.

## M03 acceptance checklist

- [ ] Deterministic combat-stream deck shuffle
- [ ] Draw 5 and refill to 3 Energy at player-turn start
- [ ] Hand cap of 10 with overflow routed directly to discard
- [ ] Draw/discard reshuffle and empty-pile behavior
- [ ] Illegal Energy costs rejected without state mutation
- [ ] Ordinary M03 turn end discards the hand and clears Energy
- [ ] Strict card conservation across draw/hand/discard/exhaust/deployed zones
- [ ] Duplicate runtime card instance IDs rejected
- [ ] Repeated seeded turn sequences produce identical authoritative-state hashes
- [ ] Prior M00–M02 tests continue to pass
- [ ] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on
  `codex/m02-engine-foundation`. GitHub Actions run `34478451729` passed `npm ci`,
  type/generated-content checks, engine/content tests, replay determinism,
  property tests, and production build. `main` remained untouched.

## Current work branch

`codex/m03-deck-turn-foundation`

## Next eligible milestone after acceptance

**M04 — HP, Block, damage packets, and the four target rules.** Do not begin M04
until M03 passes its locked acceptance suite.
