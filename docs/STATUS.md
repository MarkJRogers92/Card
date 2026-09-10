# Status

## Current milestone

**M07 — duo handoffs, Imprints, and Needle Reactions**

M07 is accepted on `codex/m07-imprint-needle-reactions`. GitHub Actions run `34506188040` passed the full locked suite against implementation commit `c0350b4c42b571fc038fcfcfff7b1151bf7dd59d`.

## M07 acceptance checklist

- [x] Lead/Support/Crew classification comes from authoritative formation
- [x] Classification is snapshotted before base effects
- [x] Support and Crew never Prime or trigger Reactions
- [x] Shared Imprint creates, reinforces to Potency 3, replaces, and persists across phases
- [x] First manual swap is free; later manual swaps cost 1 Energy atomically
- [x] Card-driven free swaps preserve the manual allowance
- [x] Four Needle recipes are declarative and resolve at stored Potency in both directions
- [x] Reaction damage ignores Strength/Weak and respects Exposed/Block
- [x] Duplicate Claim resolves as two distinct hits
- [x] Base-effect kill retargeting uses authoritative spawn order
- [x] Imprint clears when combat ends
- [x] Prior M00–M06 suites pass locally
- [x] Production build passes locally
- [x] GitHub Actions passes against the pushed M07 implementation

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
- **M06 — status timing and escalation**: accepted 2026-09-10 on `codex/m06-status-timing`; final GitHub Actions run `34501385073` passed prior suites, focused M06 tests, and production build.

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

## M07 verification record

M07 was implemented on `codex/m07-imprint-needle-reactions` and accepted on 2026-09-10. GitHub Actions run `34506188040` passed implementation commit `c0350b4c42b571fc038fcfcfff7b1151bf7dd59d` using Node 24.20.0 on a standard Ubuntu GitHub-hosted runner.

The acceptance run passed installation, type/generated-content checks, all unit/content/replay/property suites, every focused M03–M07 suite, and the production build. The focused M07 matrix covers all four Needle recipes at Potencies 1–3 in both handoff directions, plus Support/Crew behavior, Imprint replacement and capping, swap accounting, damage modifiers, multi-hit Block, deterministic retargeting, phase persistence, and combat-end cleanup.

`main` remains unchanged by M02–M07 work.

## Next eligible milestone

**M08 — the remaining twelve Reactions and serializable delayed packets.**
