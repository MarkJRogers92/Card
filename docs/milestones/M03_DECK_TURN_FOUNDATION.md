# M03 — Deck, Energy, and Turn Foundation

Status: **accepted**

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

## Acceptance verification

GitHub Actions run `34484850623` completed successfully on 2026-09-10 using
Node 24.20.0 on an Ubuntu GitHub-hosted runner.

The run passed:

- `npm ci`
- `npm run check`
- `npm run test:engine`
- `npm run test:content`
- `npm run test:replay`
- `npm run test:properties`
- `npm run test:m03`
- `npm run build`

The accepted tests demonstrate:

- deterministic combat-stream shuffle and reshuffle behavior;
- clean handling when both draw and discard are empty;
- hand overflow routing directly to discard;
- rejection of illegal Energy costs without state mutation;
- strict conservation across draw, hand, discard, exhaust, and deployed zones;
- rejection of duplicate runtime card instance IDs;
- deterministic authoritative-state hashes across repeated seeded turn sequences.

M04 remains out of scope for this branch.
