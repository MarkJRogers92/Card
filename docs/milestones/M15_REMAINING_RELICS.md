# M15 — Remaining Relics

Status: **implemented locally, awaiting CI acceptance**

Branch: `codex/m15-remaining-relics`
Base: accepted M14 head plus the M14 duplicate-relic hardening commits

## Scope

M15 adds the remaining five Section 3.10 relics as validated production
content and the generic primitives those definitions need:

- Refund Capacitor (Circuit, uncommon)
- Arc Welder (Circuit, common)
- Counterfeit Seal (Forgery, uncommon)
- Carbon Copy (Forgery, rare)
- Blank Badge (Forgery, common)

It does not begin M16 family transformations, M18 rewards, or M24 Grafting.

## Implemented contracts

- **Refund Capacitor** gains 1 Energy after the first **Potency-3** primary
  Reaction each player turn. Potency 1–2 Reactions and repeat Reactions in
  the same turn grant nothing; the allowance refreshes on the next player
  turn.
- **Arc Welder** adds 1 Potency when a Material **reinforces an existing Volt
  Imprint**, still capped at 3. Creating a fresh Imprint and reinforcing any
  other Material are unchanged.
- **Counterfeit Seal** reduces the Energy cost of the first card carrying the
  `grafted` tag played each player turn by 1, never below 0. Non-Grafted
  cards are untouched.
- **Carbon Copy** schedules one additional repeat of the first primary **Loop**
  Reaction each player turn at **50% output** for the next player-turn start.
  Each numeric output is floored separately and a result of 0 is dropped
  rather than scheduled as an empty packet. Non-Loop Reactions do not consume
  the allowance, and the second Loop Reaction in a turn gets nothing.
- **Blank Badge** raises the card-reward option count from 3 to 4.

## Generic engine surface

No relic-ID branch exists in the engine; every effect above executes from
validated schema fields.

- `TriggerEventKind` gains `card_play_cost`: the card-play path dispatches it
  before payment, and `dispatchTriggerEvent` reports the summed
  `costReduction` back to `playContentCard`. The binding's normal turn/combat
  limit and counter machinery is what makes Counterfeit Seal once per turn,
  so no second bookkeeping system was introduced.
- New trigger effects `gain_energy`, `reduce_card_cost`, and
  `repeat_scheduled_packet`, plus the schema operations `gain_energy`
  (already present from M01), `reduce_card_cost`, and `repeat_scheduled_packet`.
- The `primary_reaction` event now carries the Reaction's `potency`, the
  `material`/`form` that produced it, and the first scheduled repeat packet's
  target and effects. Generic conditions `reaction_potency`, `has_card_tag`,
  and the existing `ingredient` condition (extended to Reaction events) match
  them; Parallel Port's M14 event fields are unchanged.
- Modifier channels `imprint.reinforce.potency_bonus` (consumed by
  `storeOrReinforceImprint`) and `reward.card_options` (exposed through
  `cardRewardOptionCount`).
- `CardDefinition.tags` (optional, validated against the existing `CardTag`
  vocabulary) so a Grafted card can be identified once M24/M25 exist.

### Consumers that arrive in later milestones

- `cardRewardOptionCount` is the real, tested accessor for Blank Badge; M18's
  reward engine is the consumer.
- The `grafted` tag is authored by M24/M25 Grafting. Until then no production
  card carries it, so Counterfeit Seal is inert for hand-authored content but
  fully functional when a tagged card is played.

## Verification

Locally passed on 2026-09-11 with Node 24.20.0 / npm 11.19.0:

- `npm run check`
- `npm run test:engine` — 265 tests
- `npm run test:content` — 29 tests
- `npm run content:validate` — 30 cards and 10 relics valid
- `npm run test:replay`
- `npm run test:properties` — 6 tests
- every focused `test:m03` through `test:m15` command
- `npm run build`
- `npm run test:browser` — 2 passed, unchanged M10 browser/replay regression

The focused M15 suite (`tests/unit/remaining-relics.test.ts`, 11 tests) covers
binding compilation, the Potency-3 gate and once-per-turn refresh, the Volt
reinforcement bonus and its cap, the Grafted discount ordering and floor,
Carbon Copy's packet contents, limits, refresh, status scaling and next-turn
resolution, the reward-option channel, and the explicit rejection of an
unsupported reward-option modifier operation.

### Acceptance

`codex/m15-remaining-relics` could not be pushed from the environment that
implemented it: the local GitHub credential is read-only (`403`), so the M15
Acceptance workflow has not run. Push the branch and confirm the workflow is
green at its head before treating M15 as accepted.

## Next milestone

M16 — the three family transformations — is eligible after this acceptance,
but it is not started here.
