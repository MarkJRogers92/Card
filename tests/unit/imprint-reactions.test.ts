import { describe, expect, it } from "vitest";
import {
  applyCombatStatus,
  applyDirectDamage,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createDirectDamagePacket,
  endPlayerTurn,
  gainBlock,
  hashAuthoritativeState,
  initializeCombatActors,
  payEnergyCost,
  resolvePostCardIngredient,
  snapshotCardResolutionContext,
  startCombat,
  swapCharacters,
  type AuthoritativeState,
  type CardInstance,
  type Ingredient,
  type MaterialIngredientId,
} from "../../src/engine";

function cards(): CardInstance[] {
  return Array.from({ length: 10 }, (_, index) =>
    createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId: `fixture.card.${index + 1}`,
      ownerCharacterId: index % 2 === 0 ? "source" : "shaper",
    }),
  );
}

function setup(
  frontCharacterId: "source" | "shaper" = "source",
  enemyHp = 500,
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 707,
      contentVersion: "m07.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 44 },
      { actorId: "shaper", maxHp: 36 },
    ],
    enemies: [
      { actorId: "enemy-1", maxHp: enemyHp },
      { actorId: "enemy-2", maxHp: enemyHp },
    ],
    frontCharacterId,
  });
  return beginPlayerTurn(state);
}

function actor(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) {
    throw new Error(`Missing actor ${actorId}.`);
  }
  return found;
}

function ingredient(
  kind: Ingredient["kind"],
  id: MaterialIngredientId | "needle",
  prime = 1,
): Ingredient {
  return { kind, id, prime } as Ingredient;
}

function resolveIngredient(
  state: AuthoritativeState,
  ownerId: "source" | "shaper",
  nextIngredient: Ingredient | null,
  target = "enemy-1",
) {
  return resolvePostCardIngredient(state, {
    cardContext: snapshotCardResolutionContext(state, {
      kind: "character",
      actorId: ownerId,
    }),
    ingredient: nextIngredient,
    selectedEnemyActorId: target,
  });
}

function buildStoredPotency(
  state: AuthoritativeState,
  ownerId: "source" | "shaper",
  storedIngredient: Ingredient,
  potency: number,
): AuthoritativeState {
  let current = state;
  for (let value = 0; value < potency; value += 1) {
    current = resolveIngredient(current, ownerId, storedIngredient).state;
  }
  return current;
}

const expectedByMaterial = {
  gore: { damage: 6, hits: 1, status: "bleed", statusAmount: 2 },
  volt: { damage: 9, hits: 1, status: null, statusAmount: 0 },
  rot: { damage: 0, hits: 0, status: "poison", statusAmount: 4 },
  echo: { damage: 4, hits: 2, status: null, statusAmount: 0 },
} as const;

describe("M07 Lead/Support, Imprints, and Needle Reactions", () => {
  for (const material of Object.keys(expectedByMaterial) as MaterialIngredientId[]) {
    for (const potency of [1, 2, 3] as const) {
      for (const direction of ["material_to_needle", "needle_to_material"] as const) {
        it(`${material} + Needle resolves at P${potency} in ${direction}`, () => {
          const materialIngredient = ingredient("material", material);
          const needle = ingredient("form", "needle");
          let state = setup(direction === "material_to_needle" ? "source" : "shaper");
          state = buildStoredPotency(
            state,
            direction === "material_to_needle" ? "source" : "shaper",
            direction === "material_to_needle" ? materialIngredient : needle,
            potency,
          );
          state = swapCharacters(state, "manual").state;
          const result = resolveIngredient(
            state,
            direction === "material_to_needle" ? "shaper" : "source",
            direction === "material_to_needle" ? needle : materialIngredient,
          );
          const expected = expectedByMaterial[material];

          expect(result.classification).toBe("lead");
          expect(result.reaction?.potency).toBe(potency);
          expect(result.reaction?.damageResults).toHaveLength(expected.hits);
          expect(
            result.reaction?.damageResults.map((entry) => entry.requestedDamage),
          ).toStrictEqual(Array(expected.hits).fill(expected.damage * potency));
          if (expected.status === null) {
            expect(result.reaction?.statusesApplied).toStrictEqual([]);
          } else {
            expect(result.reaction?.statusesApplied).toStrictEqual([
              {
                actorId: "enemy-1",
                status: expected.status,
                amount: expected.statusAmount * potency,
              },
            ]);
          }
          expect(result.resultingImprint).toMatchObject({
            ownerCharacterId:
              direction === "material_to_needle" ? "shaper" : "source",
            potency: 1,
          });
        });
      }
    }
  }

  it("reinforces the same ingredient to the cap and resets a replacement", () => {
    let state = setup();
    state = resolveIngredient(state, "source", ingredient("material", "gore", 2)).state;
    expect(state.combat?.imprint?.potency).toBe(2);
    state = resolveIngredient(state, "source", ingredient("material", "gore", 2)).state;
    expect(state.combat?.imprint?.potency).toBe(3);
    state = resolveIngredient(state, "source", ingredient("material", "volt", 2)).state;
    expect(state.combat?.imprint).toMatchObject({
      ownerCharacterId: "source",
      ingredient: { kind: "material", id: "volt" },
      potency: 2,
    });
  });

  it("uses stored Potency for the Reaction and stores incoming Prime afterward", () => {
    let state = setup();
    state = resolveIngredient(state, "source", ingredient("material", "volt", 1)).state;
    state = swapCharacters(state, "manual").state;
    const result = resolveIngredient(state, "shaper", ingredient("form", "needle", 3));

    expect(result.reaction?.potency).toBe(1);
    expect(result.reaction?.damageResults[0]?.requestedDamage).toBe(9);
    expect(result.resultingImprint?.potency).toBe(3);
  });

  it("snapshots Lead classification before a card's base effects can swap formation", () => {
    let state = setup();
    const cardContext = snapshotCardResolutionContext(state, {
      kind: "character",
      actorId: "source",
    });
    state = swapCharacters(state, "card_free").state;
    const result = resolvePostCardIngredient(state, {
      cardContext,
      ingredient: ingredient("material", "gore"),
      selectedEnemyActorId: "enemy-1",
    });

    expect(result.classification).toBe("lead");
    expect(result.state.combat).toMatchObject({
      frontCharacterId: "shaper",
      manualSwapsUsedThisTurn: 0,
      imprint: { ownerCharacterId: "source", potency: 1 },
    });
  });

  it("never Primes or reacts from Support, Crew, or ingredientless cards", () => {
    let state = setup();
    state = resolveIngredient(state, "source", ingredient("material", "gore")).state;
    const original = state.combat?.imprint;

    const support = resolveIngredient(state, "shaper", ingredient("form", "needle"));
    expect(support.classification).toBe("support");
    expect(support.reaction).toBeNull();
    expect(support.state.combat?.imprint).toStrictEqual(original);

    const crew = resolvePostCardIngredient(state, {
      cardContext: snapshotCardResolutionContext(state, { kind: "crew" }),
      ingredient: ingredient("form", "needle"),
      selectedEnemyActorId: "enemy-1",
    });
    expect(crew.classification).toBe("crew");
    expect(crew.state.combat?.imprint).toStrictEqual(original);

    const noIngredient = resolveIngredient(state, "source", null);
    expect(noIngredient.state.combat?.imprint).toStrictEqual(original);
  });

  it("applies Exposed and Block to Reaction damage but ignores Strength and Weak", () => {
    let state = setup();
    state = applyCombatStatus(state, "source", "strength", 99);
    state = applyCombatStatus(state, "source", "weak", 2);
    state = resolveIngredient(state, "source", ingredient("material", "volt")).state;
    state = swapCharacters(state, "manual").state;
    state = applyCombatStatus(state, "shaper", "strength", 99);
    state = applyCombatStatus(state, "shaper", "weak", 2);
    state = applyCombatStatus(state, "enemy-1", "exposed", 2);
    state = gainBlock(state, "enemy-1", 3);
    const result = resolveIngredient(state, "shaper", ingredient("form", "needle"));

    expect(result.reaction?.damageResults[0]).toMatchObject({
      requestedDamage: 13,
      blockedDamage: 3,
      hpLost: 10,
    });
  });

  it("resolves Duplicate Claim as two separately blocked hits", () => {
    let state = setup();
    state = resolveIngredient(state, "source", ingredient("material", "echo", 2)).state;
    state = swapCharacters(state, "manual").state;
    state = gainBlock(state, "enemy-1", 10);
    const result = resolveIngredient(state, "shaper", ingredient("form", "needle"));

    expect(result.reaction?.damageResults).toStrictEqual([
      {
        targetActorId: "enemy-1",
        requestedDamage: 8,
        blockedDamage: 8,
        hpLost: 0,
        remainingHp: 500,
        remainingBlock: 2,
      },
      {
        targetActorId: "enemy-1",
        requestedDamage: 8,
        blockedDamage: 2,
        hpLost: 6,
        remainingHp: 494,
        remainingBlock: 0,
      },
    ]);
  });

  it("retargets a base-effect kill to the earliest living spawn deterministically", () => {
    let state = setup();
    state = resolveIngredient(state, "source", ingredient("material", "volt")).state;
    state = swapCharacters(state, "manual").state;
    state = applyDirectDamage(
      state,
      "enemy-1",
      createDirectDamagePacket(500),
    ).state;
    const result = resolveIngredient(
      state,
      "shaper",
      ingredient("form", "needle"),
      "enemy-1",
    );

    expect(result.reaction).toMatchObject({
      targetActorId: "enemy-2",
      retargeted: true,
      fizzled: false,
    });
    expect(actor(result.state, "enemy-2").hp).toBe(491);
  });

  it("clears the Imprint when a Reaction ends combat", () => {
    let state = setup("source", 6);
    state = applyDirectDamage(
      state,
      "enemy-2",
      createDirectDamagePacket(6),
    ).state;
    state = resolveIngredient(state, "source", ingredient("material", "gore")).state;
    state = swapCharacters(state, "manual").state;
    const result = resolveIngredient(state, "shaper", ingredient("form", "needle"));

    expect(result.state.combat?.outcome).toBe("victory");
    expect(result.state.combat?.imprint).toBeNull();
    expect(result.reaction?.statusesApplied).toStrictEqual([]);
  });
});

describe("M07 swapping", () => {
  it("makes the first manual swap free and later swaps cost one Energy", () => {
    let state = setup();
    const first = swapCharacters(state, "manual");
    state = first.state;
    expect(first).toMatchObject({ energyPaid: 0, manualSwapsUsedThisTurn: 1 });
    expect(state.combat).toMatchObject({ frontCharacterId: "shaper", energy: 3 });

    const second = swapCharacters(state, "manual");
    state = second.state;
    expect(second).toMatchObject({ energyPaid: 1, manualSwapsUsedThisTurn: 2 });
    expect(state.combat).toMatchObject({ frontCharacterId: "source", energy: 2 });

    const third = swapCharacters(state, "manual");
    expect(third).toMatchObject({ energyPaid: 1, manualSwapsUsedThisTurn: 3 });
    expect(third.state.combat).toMatchObject({ frontCharacterId: "shaper", energy: 1 });
  });

  it("does not let a card-driven free swap consume the manual allowance", () => {
    let state = setup();
    state = swapCharacters(state, "card_free").state;
    expect(state.combat).toMatchObject({
      frontCharacterId: "shaper",
      energy: 3,
      manualSwapsUsedThisTurn: 0,
    });
    const manual = swapCharacters(state, "manual");
    expect(manual).toMatchObject({ energyPaid: 0, manualSwapsUsedThisTurn: 1 });
    expect(manual.state.combat?.energy).toBe(3);
  });

  it("rejects an unaffordable extra swap atomically", () => {
    let state = setup();
    state = swapCharacters(state, "manual").state;
    state = payEnergyCost(state, 3);
    const before = hashAuthoritativeState(state);
    expect(() => swapCharacters(state, "manual")).toThrow(/Insufficient Energy/);
    expect(hashAuthoritativeState(state)).toBe(before);
  });

  it("resets manual swaps each player turn while preserving the shared Imprint", () => {
    let state = setup();
    state = resolveIngredient(state, "source", ingredient("material", "gore", 2)).state;
    state = swapCharacters(state, "manual").state;
    state = swapCharacters(state, "manual").state;
    const imprint = state.combat?.imprint;

    state = endPlayerTurn(state);
    expect(state.combat?.imprint).toStrictEqual(imprint);
    state = beginPlayerTurn(state);
    expect(state.combat).toMatchObject({
      manualSwapsUsedThisTurn: 0,
      energy: 3,
      imprint,
    });
  });
});
