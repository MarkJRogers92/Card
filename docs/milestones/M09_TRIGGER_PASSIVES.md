# M09 — Bounded Trigger/Modifier Dispatch and Initial Passives

Status: **accepted**

## Scope

M09 adds a rendering-independent deterministic trigger dispatcher, stable modifier collection, serialized trigger counters, and the initial Morrow, Switch, and Shared Warranty behaviors. It preserves M07 card-classification snapshots and swap atomicity and M08 delayed-packet timing.

M09 does not add browser UI, Protocol deployment, the later relic catalog, Grafts, or M10 work.

## Trigger contract

- Trigger ties resolve by ascending declared priority, then stable source ID, then stable trigger ID.
- Turn-scoped counters reset at player-turn start; combat-scoped counters persist for the combat.
- Preview and projection use the same eligibility/order checks but never consume counters or RNG.
- Dispatch has a development ceiling of 256 generated activation/effect events. Exceeding it throws a diagnostic instead of silently deleting effects.
- Trigger definitions are data bindings; gameplay hooks emit generic card-play or swap events and do not branch on card/relic IDs.
- The initial trigger effects use existing engine primitives for Block and draw rather than duplicating those rules.
- M09 implements turn/combat limits used by the initial passives. Command/run-scoped lifetime is deferred until the corresponding command/run orchestration exists rather than being represented with incorrect combat lifetime.
- M09 trigger effects cannot dispatch descendants, so self-reentry is structurally unavailable in this slice. Later trigger-producing effects must carry the Section 8.12 ancestry metadata and preserve the same ceiling.

## Modifier contract

Applicable modifiers are selected by channel and condition, then ordered by declared priority, stable source ID, and stable modifier ID. M09 establishes deterministic collection only; channel owners retain responsibility for arithmetic so later damage channels can preserve their required single-final-rounding rules.

## Initial behaviors

- **Morrow — Thick Blood:** after Morrow's first Gore Lead card each player turn, Morrow gains 2 Block.
- **Switch — Open Channel:** after Switch's first ingredient-bearing Shaper Lead card each player turn, draw 1 card.
- **Shared Warranty:** after the first swap each player turn, the incoming Front character gains 3 Block. Card-driven free swaps count for Shared Warranty but do not consume the separate manual free-swap allowance.

## Integration boundaries

- `src/engine/triggers.ts` owns deterministic trigger selection, limits/counters, preview-safe eligibility, effect dispatch, and modifier collection.
- `src/engine/initial-passives.ts` declares the three M09 behavior bindings.
- `src/engine/duo.ts` emits the generic `after_swap` event only after the atomic formation/Energy update is constructed.
- `src/engine/passive-card.ts` wraps the accepted M08 post-card ingredient/Reaction resolver and emits `card_played` afterward, preserving the original card-position snapshot and handoff timing.
- `beginPlayerTurn` resets turn-scoped trigger counters before scheduled M08 packets and the normal draw.

## Acceptance record

M09 was accepted on 2026-09-10. GitHub Actions run `34526001392` passed the substantive M09 implementation at commit `05269a1bc118792ca727b427b7b2d1b99d4f961c` using Node 24.20.0 on Ubuntu.

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
- `npm run test:m09`
- `npm run build`

The first two workflow attempts exposed an accidental omission of the existing `@vitejs/plugin-react` devDependency while editing `package.json`. The dependency was restored exactly; no rules or tests were weakened. The corrected implementation then passed the complete suite.

## Next milestone

**M10 — minimal browser combat screen with starter deck, targets, swaps, End Turn, and restart.** Do not move combat rules into React/Pixi; the UI must drive the authoritative engine and a scripted browser fight must match a headless replay hash.
