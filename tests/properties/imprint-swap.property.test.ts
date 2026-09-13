import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  beginPlayerTurn,
  createAuthoritativeState,
  initializeCombatActors,
  resolvePostCardIngredient,
  snapshotCardResolutionContext,
  startCombat,
  swapCharacters,
} from "../../src/engine";

function setup() {
  let state = startCombat(
    createAuthoritativeState({
      seed: 707,
      contentVersion: "m07.property",
      contentHash: "fixture-content-v1",
    }),
    [],
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 44 },
      { actorId: "shaper", maxHp: 36 },
    ],
    enemies: [{ actorId: "enemy", maxHp: 10_000 }],
    frontCharacterId: "source",
  });
  return beginPlayerTurn(state);
}

describe("M07 Imprint and swap properties", () => {
  it("caps repeated same-owner reinforcement at Potency 3", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 1, maxLength: 30 }),
        (primes) => {
          let state = setup();
          let expected = 0;
          for (const prime of primes) {
            state = resolvePostCardIngredient(state, {
              cardContext: snapshotCardResolutionContext(state, {
                kind: "character",
                actorId: "source",
              }),
              ingredient: { kind: "material", id: "gore", prime },
              selectedEnemyActorId: "enemy",
            }).state;
            expected = Math.min(3, expected + prime);
            expect(state.combat?.imprint?.potency).toBe(expected);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("charges exactly max(0, manual swaps - 1) Energy within capacity", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4 }), (swapCount) => {
        let state = setup();
        for (let index = 0; index < swapCount; index += 1) {
          state = swapCharacters(state, "manual").state;
        }
        expect(state.combat?.manualSwapsUsedThisTurn).toBe(swapCount);
        expect(state.combat?.energy).toBe(3 - Math.max(0, swapCount - 1));
        expect(state.combat?.frontCharacterId).toBe(
          swapCount % 2 === 0 ? "source" : "shaper",
        );
      }),
      { numRuns: 100 },
    );
  });
});
