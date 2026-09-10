# M08 — Remaining Reactions and Serializable Delayed Packets

Status: **accepted**

## Scope

M08 completes the sixteen-recipe material/form Reaction matrix by adding Burst, Siphon, and Loop for Gore, Volt, Rot, and Echo. It also adds serializable delayed packets for the four Loop Reactions.

M08 preserves M07's classification snapshot, swap atomicity, shared Imprint lifecycle, stored-Potency calculation, generic data-defined recipe resolution, and deterministic primary-Reaction spawn-order reacquisition. M09 trigger/passive work was not started.

## Reaction matrix added in M08

| Material | Burst | Siphon | Loop |
|---|---|---|---|
| Gore | Organ Donor — 3P damage to all; P Bleed to each | Transfusion — 4P damage; heal Front 2P | Second Incision — 4P damage + P Bleed now; repeat next player-turn start |
| Volt | Public Utility — 5P damage to all | Power Transfer — 6P damage; Front gains 3P Block | Scheduled Outage — 5P damage now and next player-turn start |
| Rot | Shared Air — 2P Poison to all | Symbiotic Error — 3P Poison; heal Front P | Recurring Infection — 2P Poison now and next player-turn start |
| Echo | Mass Duplication — 2P damage to all twice | Borrowed Tomorrow — 3P damage twice; heal Front P once | Administrative Recursion — 3P damage twice now and repeat both hits next player-turn start |

“All enemies” means all living enemies when the relevant all-enemy effect resolves.

## Delayed packet contract

- Delayed packets are plain authoritative data and survive JSON serialization without closures, functions, or presentation state.
- Loop packets are scheduled for `next_player_turn_start` and are consumed exactly once.
- Packet IDs are deterministic, monotonic, combat-local IDs and are not reused after consumption.
- A packet snapshots Reaction damage after source-side calculation and before target-side direct-damage modifiers. Target-side Exposed is reevaluated when the delayed hit actually lands.
- A delayed packet retains its original enemy actor ID. If that target is dead when the packet becomes due, it fizzles and never reacquires another enemy.
- Packet effect data cannot contain `schedule_repeat`, so repeats cannot recursively copy themselves.
- Delayed execution is independent of card play: it does not classify a card, Prime an Imprint, create a primary Reaction, or replace the current Imprint.
- Due packets resolve after player Block expiry/Energy and manual-swap reset but before the normal draw at player-turn start.
- Scheduled packets are cleared with the rest of combat-only state when combat ends.

## Acceptance record

M08 was accepted on 2026-09-10. GitHub Actions run `34524366346` passed the substantive M08 branch at commit `ce875b8ed3eff9535627aba8d3f274b7d73ac8f4` using Node 24.20.0 on Ubuntu.

The locked run passed:

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
- `npm run test:m07`
- `npm run test:m08`
- `npm run build`

The focused M08 suite covers all twelve new recipes at Potencies 1–3 in both handoff directions, all-enemy living-target behavior, Siphon healing and Block, each Loop recipe's immediate/delayed values, JSON/hash round trips, delayed Exposed reevaluation, fixed-target fizzle behavior, and structural prevention of recursive repeats. The accepted M07 Needle matrix remains part of the same regression run, so all sixteen recipes are covered at Potencies 1–3.

## Next milestone

**M09 — bounded trigger/modifier dispatch and initial character passives.**
