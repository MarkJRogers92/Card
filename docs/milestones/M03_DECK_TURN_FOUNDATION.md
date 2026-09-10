# M03 — Deck, Energy, and Turn Foundation

Status: **in progress**

## Scope

M03 implements the authoritative base lifecycle for card instances, card zones,
combat deck cycling, Energy, hand limits, and player/enemy phase transitions.
It remains rendering-independent and does not implement HP, Block, targeting,
card effects, Imprints, Reactions, or later keyword behavior.

The authoritative design values used here are:

- 3 Energy at player-turn start; Energy does not carry between turns.
- Draw 5 cards at player-turn start.
- Maximum hand size 10.
- Draws beyond the hand cap go directly to discard and never enter the hand.
- At ordinary M03 player-turn end, the hand moves to discard. Retain, Fleeting,
  Exhaust, and Protocol lifecycle exceptions remain explicitly deferred to M11.

## Implementation

- `src/engine/cards.ts` defines deterministic runtime card-instance IDs and the
  definition/instance separation described by the design.
- `src/engine/deck.ts` owns draw, hand, discard, exhaust, and deployed zones;
  deterministic combat-stream shuffling; reshuffles; overflow handling; and a
  strict card-conservation invariant.
- `src/engine/combat.ts` owns M03 combat setup, turn number/phase, Energy refill,
  player-turn draw, legal Energy payment, and ordinary player-turn cleanup.
- `src/engine/state.ts` advances authoritative state to version 2 and adds the
  optional combat state while preserving M02 RNG and hashing contracts.
- M03 unit and property tests cover deterministic setup, reshuffle, empty draw,
  hand overflow, illegal costs, phase transitions, duplicate IDs, and repeated
  card-conservation checks.

## Acceptance target

M03 is complete only when the locked GitHub Actions run passes all prior M00–M02
checks plus the M03 focused suite and demonstrates:

- reshuffle behavior is deterministic;
- empty draw/discard stops cleanly;
- hand overflow routes directly to discard;
- illegal Energy costs are rejected;
- no card instance occupies two zones and every registered combat card occupies
  exactly one zone;
- repeated seeded turn sequences produce identical authoritative-state hashes.
