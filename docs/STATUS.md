# Status

## Current milestone

**M08 — remaining Reactions and serializable delayed packets — accepted**

M08 is accepted on `codex/m08-reactions-delayed-packets`. GitHub Actions run `34524366346` passed the substantive implementation at `ce875b8ed3eff9535627aba8d3f274b7d73ac8f4`.

## M08 acceptance checklist

- [x] Gore/Volt/Rot/Echo + Burst match the design at Potencies 1–3 in both handoff directions
- [x] Gore/Volt/Rot/Echo + Siphon match the design at Potencies 1–3 in both handoff directions
- [x] Gore/Volt/Rot/Echo + Loop match immediate and delayed values at Potencies 1–3 in both handoff directions
- [x] All-enemy effects use living enemies in deterministic spawn order
- [x] Siphon healing and Power Transfer Block resolve on Front
- [x] Scheduled packets are canonical JSON-compatible authoritative data
- [x] Delayed Reaction damage snapshots source-side value and reevaluates target-side Exposed at execution
- [x] Dead delayed targets fizzle without retargeting
- [x] Delayed repeats cannot recursively schedule another repeat
- [x] Scheduled packets resolve before the normal player-turn draw and clear on combat end
- [x] Accepted M07 Needle matrix remains green, covering all sixteen recipes at Potencies 1–3
- [x] Prior M00–M07 suites continue to pass
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

## M08 verification record

M08 adds all remaining Burst/Siphon/Loop recipes through the same declarative resolver introduced in M07. Loop Reactions create serializable, combat-local scheduled packets that snapshot their fixed target and source-side Reaction amount, resolve before the next player-turn draw, reevaluate Exposed at hit time, consume once, and cannot recursively schedule themselves.

The complete locked GitHub Actions suite passed at `ce875b8e`, including all general unit/property/content/replay suites, every focused M03–M08 command, and the production build.

`main` remains unchanged by M02–M08 work.

## Next eligible milestone

**M09 — bounded trigger/modifier dispatch and initial character passives.** Preserve M08 packet serialization and M07 handoff timing; do not begin M10 UI work until M09 is accepted.
