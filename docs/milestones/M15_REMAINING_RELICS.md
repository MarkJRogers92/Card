# M15 — Remaining Relics

Status: **acceptance candidate; GitHub Actions pending**

## Scope

M15 adds the remaining five Section 3.10 relics as validated production content:
Refund Capacitor, Arc Welder, Counterfeit Seal, Carbon Copy, and Blank Badge.
It adds only the generic resource/cost/reward hooks needed to express those
contracts and does not begin M16 family transformations, M18 rewards, or M24
Grafting.

## Implemented contracts

- **Refund Capacitor**: after the first Potency-3 primary Reaction each player
  turn, gain 1 Energy. Potency-1/2 Reactions do not consume the allowance.
- **Arc Welder**: reinforcing an existing Volt Imprint adds 1 extra Potency,
  still capped at 3. Creating or replacing with Volt does not receive the
  bonus.
- **Counterfeit Seal**: the generic Grafted-card cost hook reduces the first
  Grafted card each player turn by 1 Energy, minimum 0. Non-Grafted cards do
  not consume the allowance. The Graft compiler itself remains M24 work.
- **Carbon Copy**: the first primary Loop Reaction each player turn schedules
  one additional next-player-turn repeat at 50% output. Every numeric output
  is floored separately and zero-valued effects are omitted. The copy is built
  only from the primary Reaction's original scheduled packet IDs, so it cannot
  recursively copy itself.
- **Blank Badge**: the generic card-reward option-count hook changes the base
  option count from 3 to 4. Reward generation remains M18 work.

## Generic engine surface

`src/engine/relic-runtime.ts` consumes M15 relic definitions through modifier
channels rather than relic-ID branches. It provides generic Imprint
reinforcement, primary-Reaction resource/delayed-copy handling, first-Grafted
Energy-cost resolution, and card-reward option-count resolution. First-per-turn
modifier allowances use namespaced entries in the already authoritative
`triggerCounters.turn` bucket, so the existing player-turn reset also resets
these allowances without introducing a second counter system.

`src/engine/passive-card.ts` applies the combat-relevant M15 hooks around the
existing post-card/Reaction trigger sequence while preserving M09-M14 trigger
ordering and Protocol non-retroactivity.

## Boundaries

- No relic ID is special-cased in engine logic.
- Graft creation/eligibility/runtime representation beyond the already present
  `CardInstance.graftData` placeholder remains M24.
- Card reward generation remains M18; M15 exposes only the option-count rule.
- Relic-family transformations remain M16.
- The stable M10 browser fixture is unchanged.
- `main` is not modified.

## Verification target

The M15 acceptance workflow must pass:

- locked dependency installation
- generated-content/type checks
- general engine/content/validation suites
- replay determinism and property suites
- every focused M03-M15 suite
- production build
- Chromium installation
- unchanged M10 browser/replay regression

The focused M15 suite covers all five relic definitions, M14 coexistence,
Potency/turn-limit boundaries, Volt replacement versus reinforcement, zero-cost
Grafted-card consumption, per-output Carbon Copy flooring, delayed status
copies, and the reward-option hook.

## Next milestone

M16 — relic-family transformations — is not eligible until the exact M15
GitHub Actions acceptance run and commit are recorded.
