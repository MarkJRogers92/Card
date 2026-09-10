# Status

## Current milestone

**M06 — status timing and escalation**

M06 builds on accepted M02–M05 deterministic state, deck/turn, HP/Block/targeting, and fixed-intent infrastructure. It adds Bleed, Poison, Weak, Exposed, Strength, duration decay, attack modifiers, status timing, and phase-7 anti-stall escalation while preserving revealed-intent snapshots.

## M06 acceptance checklist

- [x] Bleed/Poison/Weak/Exposed/Strength stored authoritatively on actors
- [x] Poison resolves before enemy action and bypasses Block
- [x] Bleed resolves once after an enemy attack move, including multi-hit moves
- [x] Weak multiplies outgoing attack damage by 0.75
- [x] Exposed multiplies incoming direct attack damage by 1.5
- [x] Strength adds to every attack hit and persists until changed
- [x] Multipliers use one final floor
- [x] Weak/Exposed decrement at the afflicted side's turn end
- [x] Enemy phase 7+ grants every living enemy +2 Strength each phase
- [x] Phase-7 escalation is included in intent forecasts before execution
- [x] Prior M00–M05 suites continue to pass
- [x] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted 2026-09-10 on `codex/m02-engine-foundation`; GitHub Actions run `34478451729` passed the locked M02 suite and production build.
- **M03 — deck, Energy, and turn foundation**: accepted 2026-09-10 on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623` passed prior suites, focused M03 tests, and production build.
- **M04 — HP, Block, damage, and targeting**: accepted 2026-09-10 on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587` passed prior suites, focused M04 tests, and production build.
- **M05 — enemy move cycles and fixed intents**: accepted 2026-09-10 on `codex/m05-enemy-intents`; final GitHub Actions run `34498521927` passed prior suites, focused M05 tests, and production build.

## M06 verification record

M06 was implemented on `codex/m06-status-timing` and accepted on 2026-09-10. GitHub Actions run `34501258403` passed the substantive implementation at commit `7020304c` using Node 24.20.0 on a standard Ubuntu GitHub-hosted runner.

The acceptance run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- `npm run test:m03`
- `npm run test:m04`
- `npm run test:m05`
- `npm run test:m06`
- `npm run build`

The M06 suite verifies Poison-before-action, damage-over-time Block bypass, one Bleed tick per attack move regardless of hit count, player/enemy Weak and Exposed duration decay, persistent Strength, one-floor basis-point damage arithmetic, and visible phase-7 escalation forecasts. The property suite independently checks randomized Strength/Weak/Exposed combinations against the exact integer formula.

`main` remains unchanged by M02–M06 work.

## Next eligible milestone

**M07 — Lead/Support classification, manual swaps, Imprint storage, and the four Needle Reactions.** Preserve all M02–M06 deterministic/timing contracts and do not begin the remaining twelve Reactions until M08.
