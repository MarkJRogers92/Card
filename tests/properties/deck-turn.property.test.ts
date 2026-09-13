import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  assertCardConservation,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  endPlayerTurn,
  hashAuthoritativeState,
  payEnergyCost,
  startCombat,
  type CardInstance,
} from "../../src/engine";

function makeCards(count: number): CardInstance[] {
  return Array.from({ length: count }, (_, index) =>
    createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId: `property.card.${index + 1}`,
      ownerCharacterId: index % 2 === 0 ? "source" : "shaper",
    }),
  );
}

function runTurns(seed: number, deckSize: number, turns: number): string {
  let state = startCombat(
    createAuthoritativeState({
      seed,
      contentVersion: "m03.property-fixture",
      contentHash: "fixture-content-v1",
    }),
    makeCards(deckSize),
  );

  for (let turn = 0; turn < turns; turn += 1) {
    state = beginPlayerTurn(state);
    if (state.combat === null) {
      throw new Error("Expected active combat.");
    }
    assertCardConservation(state.combat.deck);

    const cost = Math.min(state.combat.energy, turn % 4);
    state = payEnergyCost(state, cost);
    state = endPlayerTurn(state);
    if (state.combat === null) {
      throw new Error("Expected active combat.");
    }
    assertCardConservation(state.combat.deck);
  }

  return hashAuthoritativeState(state);
}

describe("M03 deck and turn properties", () => {
  it("preserves card conservation and deterministic state across repeated turns", () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 1, max: 20 }),
        (seed, deckSize, turns) => {
          expect(runTurns(seed, deckSize, turns)).toBe(
            runTurns(seed, deckSize, turns),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
