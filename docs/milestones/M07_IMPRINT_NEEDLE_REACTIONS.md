# M07 — Duo Handoffs, Imprints, and Needle Reactions

Status: **implementation complete; cloud verification pending**

## Scope

M07 adds formation-derived Lead/Support/Crew classification, atomic manual and card-driven swaps, the authoritative shared Imprint, and the first four data-defined Reactions: Gore/Volt/Rot/Echo combined with Needle. It preserves all M02–M06 determinism, damage, targeting, intent, and status contracts.

M07 does not add the Burst, Siphon, or Loop recipes; delayed packets; character passives; relic triggers; a full card-effect compiler; or browser combat controls.

## Runtime contracts

- Card classification is derived from the card owner and authoritative formation. A card-play context snapshots that classification before base effects, so a swap effect inside the card cannot retroactively change Lead into Support or vice versa.
- Support and Crew cards resolve their future base effects normally but never create, reinforce, replace, or consume the Imprint and never trigger a primary Reaction.
- The Imprint stores one owner character, one typed ingredient identity, and Potency 1–3.
- Same-owner/same-ingredient Lead cards add incoming Prime, capped at 3. Same-owner/different-ingredient Lead cards replace and reset to incoming Prime.
- An opposite-owner compatible material/form handoff resolves at the stored Potency. The incoming ingredient is stored afterward at its own Prime.
- The Imprint persists through swaps and phase boundaries but is cleared when combat ends.
- The first manual swap each player turn is free. Every later manual swap costs 1 Energy. Card-driven free swaps spend no Energy and do not consume the manual allowance.
- `setFrontCharacter` is setup-only. Player actions must use the atomic swap resolver.

## Needle recipes

Recipes are declarative effect data consumed by one generic resolver:

| Material | Reaction | Effect at stored Potency P |
|---|---|---|
| Gore | Staple Gun | 6P Reaction damage, then 2P Bleed |
| Volt | Live Ammunition | 9P Reaction damage |
| Rot | Contaminated Sample | 4P Poison |
| Echo | Duplicate Claim | Two separate hits of 4P Reaction damage |

Reaction damage ignores Strength and Weak, uses one final floor, respects Exposed, and is then absorbed by Block. Duplicate Claim resolves as two independent packets. If the initiating base effect killed the selected enemy, the primary Reaction acquires the earliest living actor in authoritative spawn order; it never retargets between its own hits.

## Validation additions

Content semantic validation now rejects owner/ingredient mismatches: Source cards require Material, Shaper cards require Form, and Crew cards cannot carry an ingredient.

## Local verification

The full acceptance sequence passed locally on 2026-09-10 with the locked dependencies:

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
- `npm run build`

Cloud acceptance is intentionally not claimed until the branch workflow passes against the pushed commit.

## Next milestone after acceptance

**M08 — the remaining twelve Reactions and serializable delayed packets.**
