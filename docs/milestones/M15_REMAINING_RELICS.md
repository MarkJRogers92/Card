# M15 — Remaining Relics

Status: **accepted**

Branch: `codex/m15-remaining-relics`

Accepted head: `295af4a5ddd719afacccb58343bced9a4bac0b16`

GitHub Actions acceptance run: [`34557264949`](https://github.com/MarkJRogers92/Card/actions/runs/34557264949)

Base: accepted M14 line plus the duplicate-relic hardening included in the M15
history.

## Scope

M15 adds the remaining five Section 3.10 relics as validated production
content and the generic primitives those definitions need:

- Refund Capacitor (Circuit, uncommon)
- Arc Welder (Circuit, common)
- Counterfeit Seal (Forgery, uncommon)
- Carbon Copy (Forgery, rare)
- Blank Badge (Forgery, common)

It does not begin M16 family transformations, M18 rewards, or M24 Grafting.

## Accepted contracts

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

- `TriggerEventKind` includes `card_play_cost`: the card-play path dispatches it
  before payment, and `dispatchTriggerEvent` reports the summed
  `costReduction` back to `playContentCard`. The binding's normal turn/combat
  limit and counter machinery makes Counterfeit Seal once per turn without a
  second bookkeeping system.
- Trigger effects include `gain_energy`, `reduce_card_cost`, and
  `repeat_scheduled_packet`, with matching validated schema operations.
- The `primary_reaction` event carries the Reaction's `potency`, the
  `material`/`form` that produced it, and the first scheduled repeat packet's
  target and effects. Generic conditions `reaction_potency`, `has_card_tag`,
  and the existing `ingredient` condition match those fields; Parallel Port's
  accepted M14 event fields remain intact.
- Modifier channels `imprint.reinforce.potency_bonus` (consumed by
  `storeOrReinforceImprint`) and `reward.card_options` (exposed through
  `cardRewardOptionCount`).
- `CardDefinition.tags` is optional and validated against the existing
  `CardTag` vocabulary so M24/M25 can identify generated Grafted cards without
  introducing an M15 special case.

### Consumers that arrive in later milestones

- `cardRewardOptionCount` is the accepted accessor for Blank Badge; M18's
  reward engine is the consumer.
- The `grafted` tag is authored by M24/M25 Grafting. Until then no production
  card carries it, so Counterfeit Seal is inert for hand-authored content but
  fully functional when a tagged card is played.

## Verification

The implementing environment's local stack passed on 2026-09-11 with Node
24.20.0 / npm 11.19.0, including `npm run check`, engine/content/validation,
replay/property suites, every focused M03-M15 command, production build, and
the unchanged M10 browser regression.

Final acceptance evidence is GitHub Actions run `34557264949` at exact head
`295af4a5ddd719afacccb58343bced9a4bac0b16`. The single acceptance job passed:

- locked dependency installation
- generated-content/type checks
- general engine tests
- content tests and production content validation
- replay determinism tests
- engine property tests
- every focused M03-M15 command
- production build
- Chromium installation
- unchanged M10 browser/replay regression

The focused M15 suite (`tests/unit/remaining-relics.test.ts`, 11 tests) covers
binding compilation, the Potency-3 gate and once-per-turn refresh, the Volt
reinforcement bonus and its cap, the Grafted discount ordering and floor,
Carbon Copy's packet contents, limits, refresh, status scaling and next-turn
resolution, the reward-option channel, and explicit rejection of an
unsupported reward-option modifier operation.

## Next milestone

M16 — the three family transformations — is now eligible, but it is not
started in this acceptance record.
