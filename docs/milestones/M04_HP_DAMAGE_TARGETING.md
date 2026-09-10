# M04 — HP, Block, Damage, and Targeting

Status: **in progress**

## Scope

M04 adds authoritative actor vitality, Block, direct-damage packets, formation targeting, and death/end-condition primitives. It remains rendering-independent. Enemy move selection, statuses, card effects, Imprints, Reactions, and manual-swap cost rules remain later milestones.

## Locked rules implemented

- Initial duo HP values are content/setup data rather than hard-coded actor IDs; the current design fixture uses Source 44 HP and Shaper 36 HP.
- Direct damage is absorbed by Block first; remaining damage reduces HP and HP never falls below zero.
- Front hits whoever is Front when the hit resolves.
- Reserve hits whoever is Reserve when the hit resolves.
- Both applies the printed damage separately to both player characters, with each character's Block applied independently.
- Locked names a player character and formation changes do not redirect it.
- Player Block clears at player-turn start; enemy Block clears at enemy-phase start.
- Either player reaching zero HP immediately ends combat in defeat.
- If all registered enemies reach zero HP, combat ends in victory.
- Self-HP costs bypass Block and are legal only if the paying player remains at 1+ HP.

## Implementation

- `src/engine/actors.ts` defines player/enemy vitality instances.
- `src/engine/targeting.ts` resolves Front, Reserve, Both, and Locked rules from current formation.
- `src/engine/damage.ts` applies direct damage, Block absorption, end conditions, Block gain, and nonlethal self-HP costs.
- `src/engine/combat.ts` now stores actors, duo formation, front position, outcome, and Block expiry while preserving M03 deck/Energy behavior.
- M04 unit/property fixtures cover target redirection, Locked persistence, separate Both hits, Block, death, victory, self-costs, invalid targets, and vitality bounds.

## Acceptance

M04 is accepted only when the locked GitHub Actions run passes all prior suites plus `npm run test:m04` and the production build.
