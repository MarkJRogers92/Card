# Status

## Current milestone

**M09 — bounded trigger/modifier dispatch and initial passives — accepted**

M09 is accepted on `codex/m09-trigger-passives`. GitHub Actions run `34526001392` passed the substantive implementation at `05269a1bc118792ca727b427b7b2d1b99d4f961c` after an accidental package dependency omission was corrected without changing rules or weakening tests.

## M09 acceptance checklist

- [x] Morrow's first Gore Lead card each player turn grants Morrow 2 Block
- [x] Switch's first ingredient-bearing Shaper Lead card each player turn draws 1
- [x] Shared Warranty grants incoming Front 3 Block on the first swap each player turn
- [x] Card-driven free swaps can trigger Shared Warranty without consuming the manual free-swap allowance
- [x] Support cards do not consume Morrow/Switch matching trigger limits
- [x] Turn-scoped trigger counters reset at player-turn start
- [x] Combat-scoped trigger counters are serialized separately from turn counters
- [x] Trigger ties resolve by priority, stable source ID, then stable trigger ID
- [x] Preview uses the same eligibility/order path without consuming counters or RNG
- [x] Trigger dispatch fails diagnostically rather than silently dropping work beyond the 256-event development ceiling
- [x] Modifier collection is deterministic by channel, condition, priority, source ID, and modifier ID
- [x] M07 classification snapshot / swap atomicity remain intact
- [x] M08 delayed-packet timing and serialization remain intact
- [x] Prior M00–M08 suites continue to pass
- [x] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted on `codex/m02-engine-foundation`; GitHub Actions run `34478451729`.
- **M03 — deck, Energy, and turn foundation**: accepted on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623`.
- **M04 — HP, Block, damage, and targeting**: accepted on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587`.
- **M05 — enemy move cycles and fixed intents**: accepted on `codex/m05-enemy-intents`; final GitHub Actions run `34498521927`.
- **M06 — status timing and escalation**: accepted on `codex/m06-status-timing`; final GitHub Actions run `34501385073`.
- **M07 — duo handoffs, Imprints, and Needle Reactions**: accepted on `codex/m07-imprint-needle-reactions`; final head `e35ac7b0c5561e27790dd2877b1d68da6bda60fd` passed GitHub Actions run `34506507341`.
- **M08 — remaining Reactions and serializable delayed packets**: accepted on `codex/m08-reactions-delayed-packets`; final head `cbd5eed93a57b21bca3fbac7b2dea70bbb4b2977` passed GitHub Actions run `34524502196`.

## M09 verification record

M09 introduces a generic data-bound trigger layer rather than hard-coded card/relic branches. `after_swap` is emitted from the atomic swap resolver; `card_played` is emitted after the accepted M08 post-card/Reaction step through the M09 wrapper. Turn limits are serialized/reset authoritatively, previews are non-consuming, and generic modifier matching has stable ordering while leaving channel-specific arithmetic to the channel owner.

The corrected substantive branch passed the complete locked suite in GitHub Actions run `34526001392`, including every focused M03–M09 command and the production build.

`main` remains unchanged by M02–M09 work.

## Next eligible milestone

**M10 — minimal browser combat screen with starter deck, targets, swaps, End Turn, and restart.** The React debug UI must drive real engine commands; UI/animation must not own combat rules. Acceptance requires a scripted UI victory over a Claims Adjuster whose final authoritative-state hash matches a headless replay.
