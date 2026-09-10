# Status

## Current milestone

**M06 — status timing and escalation (in progress)**

M06 builds on accepted M02–M05 deterministic state, deck/turn, HP/Block/targeting, and fixed-intent infrastructure. It adds Bleed, Poison, Weak, Exposed, Strength, duration decay, attack modifiers, status timing, and phase-7 anti-stall escalation while preserving revealed-intent snapshots.

## M06 acceptance checklist

- [ ] Bleed/Poison/Weak/Exposed/Strength stored authoritatively on actors
- [ ] Poison resolves before enemy action and bypasses Block
- [ ] Bleed resolves once after an enemy attack move, including multi-hit moves
- [ ] Weak multiplies outgoing attack damage by 0.75
- [ ] Exposed multiplies incoming direct attack damage by 1.5
- [ ] Strength adds to every attack hit and persists until changed
- [ ] Multipliers use one final floor
- [ ] Weak/Exposed decrement at the afflicted side's turn end
- [ ] Enemy phase 7+ grants every living enemy +2 Strength each phase
- [ ] Phase-7 escalation is included in intent forecasts before execution
- [ ] Prior M00–M05 suites continue to pass
- [ ] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on `codex/m02-engine-foundation`; GitHub Actions run `34478451729` passed the locked M02 suite and production build.
- **M03 — deck, Energy, and turn foundation**: accepted 2026-09-10 on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623` passed prior suites, focused M03 tests, and production build.
- **M04 — HP, Block, damage, and targeting**: accepted 2026-09-10 on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587` passed prior suites, focused M04 tests, and production build.
- **M05 — enemy move cycles and fixed intents**: accepted 2026-09-10 on `codex/m05-enemy-intents`; final GitHub Actions run `34498521927` passed prior suites, focused M05 tests, and production build.

## Current work branch

`codex/m06-status-timing`

## Next eligible milestone after acceptance

**M07 — Lead/Support classification, manual swaps, Imprint storage, and the four Needle Reactions.** Do not begin M07 until M06 passes its locked acceptance suite.
