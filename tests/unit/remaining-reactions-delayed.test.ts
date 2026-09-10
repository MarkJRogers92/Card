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
  hashAuthoritativeState,
  initializeCombatActors,
  resolvePostCardIngredient,
  snapshotCardResolutionContext,
  startCombat,
  swapCharacters,
  type AuthoritativeState,
  type CardInstance,
  type FormIngredientId,
  type Ingredient,
  type MaterialIngredientId,
  type PostCardIngredientResolution,
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
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 808,
      contentVersion: "m08.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 100 },
      { actorId: "shaper", maxHp: 100 },
    ],
    enemies: [
      { actorId: "enemy-1", maxHp: 1000 },
      { actorId: "enemy-2", maxHp: 1000 },
      { actorId: "enemy-3", maxHp: 1000 },
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
  id: MaterialIngredientId | FormIngredientId,
  prime = 1,
): Ingredient {
  return { kind, id, prime } as Ingredient;
}

function resolveIngredient(
  state: AuthoritativeState,
  ownerId: "source" | "shaper",
  nextIngredient: Ingredient | null,
  target: string | null = "enemy-1",
): PostCardIngredientResolution {
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
  for (let index = 0; index < potency; index += 1) {
    current = resolveIngredient(current, ownerId, storedIngredient).state;
  }
  return current;
}

function prepareReaction(
  material: MaterialIngredientId,
  form: Exclude<FormIngredientId, "needle">,
  potency: number,
  direction: "material_to_form" | "form_to_material",
): { readonly state: AuthoritativeState; readonly incomingOwner: "source" | "shaper"; readonly incoming: Ingredient } {
  const materialIngredient = ingredient("material", material);
  const formIngredient = ingredient("form", form);
  const storedOwner = direction === "material_to_form" ? "source" : "shaper";
  const incomingOwner = direction === "material_to_form" ? "shaper" : "source";
  let state = setup(storedOwner);
  state = buildStoredPotency(
    state,
    storedOwner,
    direction === "material_to_form" ? materialIngredient : formIngredient,
    potency,
  );
  state = swapCharacters(state, "manual").state;
  return {
    state,
    incomingOwner,
    incoming: direction === "material_to_form" ? formIngredient : materialIngredient,
  };
}

const burstExpected = {
  gore: { name: "Organ Donor", damage: 3, hits: 1, status: "bleed", statusAmount: 1 },
  volt: { name: "Public Utility", damage: 5, hits: 1, status: null, statusAmount: 0 },
  rot: { name: "Shared Air", damage: 0, hits: 0, status: "poison", statusAmount: 2 },
  echo: { name: "Mass Duplication", damage: 2, hits: 2, status: null, statusAmount: 0 },
} as const;

const siphonExpected = {
  gore: { name: "Transfusion", damage: 4, hits: 1, status: null, statusAmount: 0, heal: 2, block: 0 },
  volt: { name: "Power Transfer", damage: 6, hits: 1, status: null, statusAmount: 0, heal: 0, block: 3 },
  rot: { name: "Symbiotic Error", damage: 0, hits: 0, status: "poison", statusAmount: 3, heal: 1, block: 0 },
  echo: { name: "Borrowed Tomorrow", damage: 3, hits: 2, status: null, statusAmount: 0, heal: 1, block: 0 },
} as const;

const loopExpected = {
  gore: { name: "Second Incision", damage: 4, hits: 1, status: "bleed", statusAmount: 1 },
  volt: { name: "Scheduled Outage", damage: 5, hits: 1, status: null, statusAmount: 0 },
  rot: { name: "Recurring Infection", damage: 0, hits: 0, status: "poison", statusAmount: 2 },
  echo: { name: "Administrative Recursion", damage: 3, hits: 2, status: null, statusAmount: 0 },
} as const;

const materials = Object.keys(burstExpected) as MaterialIngredientId[];
const directions = ["material_to_form", "form_to_material"] as const;

describe("M08 Burst Reactions", () => {
  for (const material of materials) {
    for (const potency of [1, 2, 3] as const) {
      for (const direction of directions) {
        it(`${material} + Burst resolves at P${potency} in ${direction}`, () => {
          const prepared = prepareReaction(material, "burst", potency, direction);
          const result = resolveIngredient(
            prepared.state,
            prepared.incomingOwner,
            prepared.incoming,
            null,
          );
          const expected = burstExpected[material];

          expect(result.reaction?.recipeName).toBe(expected.name);
          expect(result.reaction?.potency).toBe(potency);
          expect(result.reaction?.targetActorId).toBeNull();
          expect(result.reaction?.targetActorIds).toStrictEqual([
            "enemy-1",
            "enemy-2",
            "enemy-3",
          ]);
          expect(result.reaction?.damageResults).toHaveLength(expected.hits * 3);
          expect(
            result.reaction?.damageResults.map((entry) => entry.requestedDamage),
          ).toStrictEqual(
            Array(expected.hits * 3).fill(expected.damage * potency),
          );
          if (expected.status === null) {
            expect(result.reaction?.statusesApplied).toStrictEqual([]);
          } else {
            expect(result.reaction?.statusesApplied).toStrictEqual(
              ["enemy-1", "enemy-2", "enemy-3"].map((actorId) => ({
                actorId,
                status: expected.status,
                amount: expected.statusAmount * potency,
              })),
            );
          }
        });
      }
    }
  }

  it("targets only enemies living when an all-enemy effect resolves", () => {
    const prepared = prepareReaction("volt", "burst", 1, "material_to_form");
    const afterKill = applyDirectDamage(
      prepared.state,
      "enemy-2",
      createDirectDamagePacket(1000),
    ).state;
    const result = resolveIngredient(
      afterKill,
      prepared.incomingOwner,
      prepared.incoming,
      null,
    );

    expect(result.reaction?.targetActorIds).toStrictEqual(["enemy-1", "enemy-3"]);
    expect(actor(result.state, "enemy-1").hp).toBe(995);
    expect(actor(result.state, "enemy-2").hp).toBe(0);
    expect(actor(result.state, "enemy-3").hp).toBe(995);
  });
});

describe("M08 Siphon Reactions", () => {
  for (const material of materials) {
    for (const potency of [1, 2, 3] as const) {
      for (const direction of directions) {
        it(`${material} + Siphon resolves at P${potency} in ${direction}`, () => {
          const prepared = prepareReaction(material, "siphon", potency, direction);
          const front = prepared.state.combat?.frontCharacterId;
          if (front === null || front === undefined) {
            throw new Error("Expected initialized Front character.");
          }
          const wounded = applyDirectDamage(
            prepared.state,
            front,
            createDirectDamagePacket(20),
          ).state;
          const result = resolveIngredient(
            wounded,
            prepared.incomingOwner,
            prepared.incoming,
          );
          const expected = siphonExpected[material];

          expect(result.reaction?.recipeName).toBe(expected.name);
          expect(result.reaction?.targetActorIds).toStrictEqual(["enemy-1"]);
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
          if (expected.heal === 0) {
            expect(result.reaction?.healingResults).toStrictEqual([]);
          } else {
            expect(result.reaction?.healingResults).toStrictEqual([
              {
                targetActorId: front,
                requestedHealing: expected.heal * potency,
                hpGained: expected.heal * potency,
                remainingHp: 80 + expected.heal * potency,
              },
            ]);
          }
          if (expected.block === 0) {
            expect(result.reaction?.blockApplied).toStrictEqual([]);
          } else {
            expect(result.reaction?.blockApplied).toStrictEqual([
              { actorId: front, amount: expected.block * potency },
            ]);
            expect(actor(result.state, front).block).toBe(expected.block * potency);
          }
        });
      }
    }
  }
});

describe("M08 Loop Reactions and delayed packets", () => {
  for (const material of materials) {
    for (const potency of [1, 2, 3] as const) {
      for (const direction of directions) {
        it(`${material} + Loop repeats once at the next player-turn start at P${potency} in ${direction}`, () => {
          const prepared = prepareReaction(material, "loop", potency, direction);
          const result = resolveIngredient(
            prepared.state,
            prepared.incomingOwner,
            prepared.incoming,
          );
          const expected = loopExpected[material];

          expect(result.reaction?.recipeName).toBe(expected.name);
          expect(result.reaction?.scheduledPacketIds).toHaveLength(1);
          expect(result.state.combat?.scheduledPackets).toHaveLength(1);
          expect(result.reaction?.damageResults).toHaveLength(expected.hits);
          expect(
            result.reaction?.damageResults.map((entry) => entry.requestedDamage),
          ).toStrictEqual(Array(expected.hits).fill(expected.damage * potency));

          const hpAfterImmediate = actor(result.state, "enemy-1").hp;
          const statusAfterImmediate = expected.status === null
            ? 0
            : actor(result.state, "enemy-1").statuses[expected.status];
          let state = endPlayerTurn(result.state);
          state = beginPlayerTurn(state);

          expect(state.combat?.scheduledPackets).toStrictEqual([]);
          expect(actor(state, "enemy-1").hp).toBe(
            hpAfterImmediate - expected.damage * potency * expected.hits,
          );
          if (expected.status !== null) {
            expect(actor(state, "enemy-1").statuses[expected.status]).toBe(
              statusAfterImmediate + expected.statusAmount * potency,
            );
          }
        });
      }
    }
  }

  it("serializes scheduled packets as authoritative data and cannot encode recursive repeats", () => {
    const prepared = prepareReaction("gore", "loop", 2, "material_to_form");
    const result = resolveIngredient(
      prepared.state,
      prepared.incomingOwner,
      prepared.incoming,
    );
    const serialized = JSON.stringify(result.state);
    const roundTrip = JSON.parse(serialized) as AuthoritativeState;

    expect(hashAuthoritativeState(roundTrip)).toBe(hashAuthoritativeState(result.state));
    expect(roundTrip.combat?.scheduledPackets).toStrictEqual(result.state.combat?.scheduledPackets);
    expect(JSON.stringify(roundTrip.combat?.scheduledPackets)).not.toContain("schedule_repeat");
  });

  it("reevaluates target-side Exposed when a delayed Reaction hit actually lands", () => {
    const prepared = prepareReaction("volt", "loop", 2, "material_to_form");
    const result = resolveIngredient(
      prepared.state,
      prepared.incomingOwner,
      prepared.incoming,
    );
    expect(actor(result.state, "enemy-1").hp).toBe(990);

    let state = endPlayerTurn(result.state);
    state = applyCombatStatus(state, "enemy-1", "exposed", 1);
    state = beginPlayerTurn(state);

    expect(actor(state, "enemy-1").hp).toBe(975);
  });

  it("consumes a delayed packet without retargeting when its fixed target is dead", () => {
    const prepared = prepareReaction("volt", "loop", 1, "material_to_form");
    const result = resolveIngredient(
      prepared.state,
      prepared.incomingOwner,
      prepared.incoming,
    );
    let state = endPlayerTurn(result.state);
    state = applyDirectDamage(
      state,
      "enemy-1",
      createDirectDamagePacket(995),
    ).state;
    expect(actor(state, "enemy-1").hp).toBe(0);
    expect(actor(state, "enemy-2").hp).toBe(1000);

    state = beginPlayerTurn(state);

    expect(state.combat?.scheduledPackets).toStrictEqual([]);
    expect(actor(state, "enemy-1").hp).toBe(0);
    expect(actor(state, "enemy-2").hp).toBe(1000);
    expect(actor(state, "enemy-3").hp).toBe(1000);
  });
});
