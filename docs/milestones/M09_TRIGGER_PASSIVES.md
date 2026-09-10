# M09 — Bounded Trigger/Modifier Dispatch and Initial Passives

Status: **in progress**

## Scope

M09 adds a rendering-independent, deterministic trigger dispatcher, stable modifier collection, serialized trigger counters, and the initial Morrow, Switch, and Shared Warranty behaviors. It preserves M07 card-classification snapshots and swap atomicity and M08 delayed-packet timing.

M09 does not add browser UI, Protocol deployment, the later relic catalog, Grafts, or M10 work.

## Trigger contract

- Trigger ties resolve by ascending declared priority, then stable source ID, then stable trigger ID.
- Turn-scoped counters reset at player-turn start; combat-scoped counters persist for the combat.
- Preview and projection use the same eligibility/order checks but never consume counters or RNG.
- Dispatch has a development ceiling of 256 generated activation/effect events. Exceeding it throws a diagnostic instead of silently deleting effects.
- Trigger definitions are data bindings; gameplay hooks emit generic card-play or swap events and do not branch on card/relic IDs.
- M09 implements turn/combat limits used by the initial passives. Command/run-scoped trigger storage remains tied to later command/run-state milestones rather than being represented with incorrect combat lifetime.

## Modifier contract

Applicable modifiers are selected by channel and condition, then ordered by declared priority, stable source ID, and stable modifier ID. M09 establishes deterministic collection only; channel owners retain responsibility for arithmetic so later damage channels can preserve their required single-final-rounding rules.

## Initial behaviors

- **Morrow — Thick Blood:** after Morrow's first Gore Lead card each player turn, Morrow gains 2 Block.
- **Switch — Open Channel:** after Switch's first ingredient-bearing Shaper Lead card each player turn, draw 1 card.
- **Shared Warranty:** after the first swap each player turn, the incoming Front character gains 3 Block. Card-driven free swaps count for Shared Warranty but do not consume the separate manual free-swap allowance.

## Acceptance target

M09 is accepted only when the locked GitHub Actions workflow passes all prior suites plus `npm run test:m09` and production build. Focused tests must verify all three initial behaviors, turn reset, Support non-consumption, stable trigger/modifier ordering, preview immutability, and the generated-event ceiling.
