# Status

## Current milestone

**M08 — remaining Reactions and serializable delayed packets (in progress)**

M08 builds on accepted M02–M07 deterministic engine, deck/turn, vitality/status, enemy-intent, duo-swap, and Imprint infrastructure. It completes the sixteen material/form Reaction recipes and adds authoritative next-player-turn-start packet scheduling for Loop Reactions.

## M08 acceptance checklist

- [ ] Gore/Volt/Rot/Echo + Burst match the design at Potencies 1–3 in both handoff directions
- [ ] Gore/Volt/Rot/Echo + Siphon match the design at Potencies 1–3 in both handoff directions
- [ ] Gore/Volt/Rot/Echo + Loop match immediate and delayed values at Potencies 1–3 in both handoff directions
- [ ] All-enemy effects use living enemies in deterministic spawn order
- [ ] Siphon healing and Power Transfer Block resolve on Front
- [ ] Scheduled packets are canonical JSON-compatible authoritative data
- [ ] Delayed Reaction damage snapshots source-side value and reevaluates target-side Exposed at execution
- [ ] Dead delayed targets fizzle without retargeting
- [ ] Delayed repeats cannot recursively schedule another repeat
- [ ] Scheduled packets resolve before the normal player-turn draw and clear on combat end
- [ ] Accepted M07 Needle matrix remains green, covering all sixteen recipes at Potencies 1–3
- [ ] Prior M00–M07 suites continue to pass
- [ ] Production build passes

## Prior accepted milestones

- **M00 — repository foundation**: accepted 2026-09-10.
- **M01 — content schemas and validator**: accepted 2026-09-10.
- **M02 — authoritative engine foundation**: accepted on `codex/m02-engine-foundation`; GitHub Actions run `34478451729`.
- **M03 — deck, Energy, and turn foundation**: accepted on `codex/m03-deck-turn-foundation`; GitHub Actions run `34484850623`.
- **M04 — HP, Block, damage, and targeting**: accepted on `codex/m04-hp-damage-targeting`; final GitHub Actions run `34496069587`.
- **M05 — enemy move cycles and fixed intents**: accepted on `codex/m05-enemy-intents`; final GitHub Actions run `34498521927`.
- **M06 — status timing and escalation**: accepted on `codex/m06-status-timing`; final GitHub Actions run `34501385073`.
- **M07 — duo handoffs, Imprints, and Needle Reactions**: accepted on `codex/m07-imprint-needle-reactions`; final branch head `e35ac7b0c5561e27790dd2877b1d68da6bda60fd` passed GitHub Actions run `34506507341`.

## Current work branch

`codex/m08-reactions-delayed-packets`

## Next eligible milestone after acceptance

**M09 — bounded trigger/modifier dispatch and initial character passives.** Do not begin M09 until M08 passes its locked acceptance suite.

`main` remains unchanged by M02–M08 work.
