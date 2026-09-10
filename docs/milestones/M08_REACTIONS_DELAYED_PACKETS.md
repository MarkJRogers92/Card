# M08 — Remaining Reactions and Serializable Delayed Packets

Status: **in progress**

## Scope

M08 completes the sixteen-recipe material/form Reaction matrix by adding Burst, Siphon, and Loop for Gore, Volt, Rot, and Echo. It also adds serializable delayed packets for the four Loop Reactions.

M08 preserves M07's classification snapshot, swap atomicity, shared Imprint lifecycle, stored-Potency calculation, generic data-defined recipe resolution, and deterministic primary-Reaction spawn-order reacquisition. It does not begin M09 trigger/passive work.

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

## Acceptance target

M08 is accepted only when the locked GitHub Actions run passes every prior suite plus `npm run test:m08` and the production build. Acceptance coverage must include:

- all twelve new recipes at Potencies 1–3 in both handoff directions;
- the accepted M07 Needle matrix remaining green, giving independent coverage of all sixteen recipes at Potencies 1–3;
- all-enemy living-target behavior and deterministic spawn ordering;
- Siphon healing and Power Transfer Block values;
- each Loop recipe's immediate and delayed values;
- delayed packet JSON/hash round-trip stability;
- target-side Exposed reevaluation on delayed Reaction damage;
- dead delayed targets fizzling without retargeting;
- structural prevention of recursive repeats;
- all M00–M07 regressions and production build remaining green.
