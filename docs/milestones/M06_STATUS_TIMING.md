# M06 — Status Timing and Escalation

Status: **in progress**

## Scope

M06 implements Bleed, Poison, Weak, Exposed, Strength, duration timing, attack-damage modifiers, and the global enemy-phase-7 anti-stall escalation. It preserves M05 fixed revealed intents and does not introduce Imprints, Reactions, player swap costs, card-effect compilation, or later trigger systems.

## Locked rules

- Bleed X: after an enemy completes an attack move, it loses X HP, then Bleed decreases by 1. A multi-hit move causes one Bleed tick.
- Poison X: at enemy-phase start, the enemy loses X HP, then Poison decreases by 1.
- Weak X: attack damage is multiplied by 0.75 while active; duration decreases by 1 at the afflicted side's turn end.
- Exposed X: incoming direct damage is multiplied by 1.5 while active; duration decreases by 1 at the afflicted side's turn end.
- Strength X: adds X damage to every attack hit and does not decay automatically.
- Bleed and Poison bypass Block.
- Attack math floors once after all multiplicative stages, not after each multiplier.
- Beginning with enemy phase 7, every living enemy gains 2 Strength at the beginning of every enemy phase.

## Timing order

Enemy phase resolution is:

1. Enemy Block has already expired at enemy-phase entry under the M04/M05 transition contract.
2. Resolve Poison on living enemies.
3. Beginning at phase 7, grant living enemies +2 Strength.
4. Living enemies execute their already revealed intents in displayed order.
5. After each enemy attack move, resolve exactly one Bleed tick on that attacker.
6. Decrement enemy Weak/Exposed durations.
7. Select/reveal next intents.

Player Weak/Exposed durations decrement when the player turn ends.

## Projection contract

Intent projections retain printed damage and additionally expose projected per-target damage using the same integer calculation as execution. Projections include the +2 Strength that will be granted at the beginning of an upcoming phase 7+ so the anti-stall escalation is forecast rather than hidden.

## Acceptance target

M06 is accepted only when the locked GitHub Actions run passes all prior suites plus `npm run test:m06` and the production build. Focused fixtures must prove Poison-before-action, Bleed once per multi-hit move, duration expiry, single-floor Weak/Exposed multiplication, persistent Strength, Block bypass for damage-over-time, and phase-7 escalation forecasts/execution.
