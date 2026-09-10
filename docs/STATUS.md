# Status

## Current milestone

**M05 — enemy move cycles and fixed intents (in progress)**

M05 builds on accepted M02–M04 deterministic state, deck/turn, HP/Block, and targeting infrastructure. It adds deterministic enemy controllers, revealed intent snapshots, intent projection, displayed-order enemy execution, and next-intent selection. Statuses, escalation, Reactions, and later content-effect operations remain out of scope.

## M05 acceptance checklist

- [ ] Initial intents selected before first player turn
- [ ] Cycle and opening-cycle selection deterministic
- [ ] Claims Adjuster repeats `stamp → paperwork → stamp_harder`
- [ ] Front/Reserve targets remain dynamic until execution
- [ ] Locked target remains fixed after formation changes
- [ ] Revealed move/effect snapshot cannot be rewritten by later definition/phase changes
- [ ] Living enemies execute in explicit displayed order
- [ ] Next intents selected only after current enemy phase execution
- [ ] Next player turn blocked until enemy phase resolves
- [ ] Prior M00–M04 suites continue to pass
- [ ] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on `codex/m02-engine-foundation`; GitHub Actions run `34478451729` passed the locked M02 suite and production build.
- **M03 — deck, Energy, and turn foundation**: accepted 2026-09-10 on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623` passed prior suites, focused M03 tests, and production build.
- **M04 — HP, Block, damage, and targeting**: accepted 2026-09-10 on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587` passed prior suites, focused M04 tests, and production build.

## Current work branch

`codex/m05-enemy-intents`

## Next eligible milestone after acceptance

**M06 — Bleed, Poison, Weak, Exposed, and escalation timing.** Do not begin M06 until M05 passes its locked acceptance suite.
