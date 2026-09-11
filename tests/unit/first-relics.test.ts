import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RelicDefinition } from "../../src/content/generated";
import {
  applyCombatStatus,
  beginPlayerTurn,
  compileRelicContent,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  endPlayerTurn,
  initializeCombatActors,
  installInitialPassives,
  installRelicContent,
  resolvePostCardIngredientWithTriggers,
  snapshotCardResolutionContext,
  startCombat,
  swapCharacters,
  type AuthoritativeState,
  type CardInstance,
  type FormIngredientId,
  type Ingredient,
  type MaterialIngredientId,
} from "../../src/engine";

const RELIC_IDS = [
  "shared_warranty",
  "wetware_die",
  "clot_filter",
  "organ_bag",
  "parallel_port",
] as const;

function relic(name: (typeof RELIC_IDS)[number]): RelicDefinition {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "content", "relics", `${name}.json`), "utf8"),
  ) as RelicDefinition;
}

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
  definitions: readonly RelicDefinition[],
  hp = 100,
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 1414,
      contentVersion: "m14.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 100, hp },
      { actorId: "shaper", maxHp: 100, hp },
    ],
    enemies: [
      { actorId: "enemy-1", maxHp: 1000 },
      { actorId: "enemy-2", maxHp: 1000 },
    ],
    frontCharacterId: "source",
  });
  state = installRelicContent(state, definitions);
  return beginPlayerTurn(state);
}

function actor(state: AuthoritativeState, actorId: string) {
  const value = state.combat?.actors[actorId];
  if (value === undefined) throw new Error(`Missing actor ${actorId}.`);
  return value;
}

function ingredient(
  kind: Ingredient["kind"],
  id: MaterialIngredientId | FormIngredientId,
  prime = 1,
): Ingredient {
  return { kind, id, prime } as Ingredient;
}

function playIngredient(
  state: AuthoritativeState,
  ownerActorId: "source" | "shaper",
  value: Ingredient,
  targetActorId = "enemy-1",
) {
  return resolvePostCardIngredientWithTriggers(state, {
    cardContext: snapshotCardResolutionContext(state, {
      kind: "character",
      actorId: ownerActorId,
    }),
    ingredient: value,
    selectedEnemyActorId: targetActorId,
  });
}

function prepareReaction(
  state: AuthoritativeState,
  material: MaterialIngredientId,
  form: FormIngredientId,
  potency = 1,
) {
  let current = state;
  for (let index = 0; index < potency; index += 1) {
    current = playIngredient(current, "source", ingredient("material", material)).state;
  }
  current = swapCharacters(current, "manual").state;
  return playIngredient(current, "shaper", ingredient("form", form));
}

describe("M14 first relics", () => {
  it("compiles all five definitions into stable modifier and trigger bindings", () => {
    const definitions = RELIC_IDS.map(relic);
    const compiled = compileRelicContent(definitions);

    expect(compiled.modifierBindings.map((binding) => binding.sourceId)).toStrictEqual([
      "relic.wetware_die",
      "relic.organ_bag",
    ]);
    expect(compiled.triggerBindings.map((binding) => binding.sourceId)).toStrictEqual([
      "relic.shared_warranty",
      "relic.clot_filter",
      "relic.parallel_port",
    ]);
    expect(() => compileRelicContent([definitions[0], definitions[0]])).toThrow(
      "Duplicate relic definition",
    );
  });

  it("appends relics alongside character passives during setup", () => {
    let state = startCombat(
      createAuthoritativeState({ seed: 14, contentVersion: "m14", contentHash: "m14" }),
      cards(),
    );
    state = initializeCombatActors(state, {
      playerCharacters: [
        { actorId: "source", maxHp: 44 },
        { actorId: "shaper", maxHp: 36 },
      ],
      enemies: [{ actorId: "enemy-1", maxHp: 100 }],
      frontCharacterId: "source",
    });
    state = installInitialPassives(state, {
      morrowActorId: "source",
      switchActorId: "shaper",
      includeSharedWarranty: false,
    });
    state = installRelicContent(state, [relic("shared_warranty"), relic("wetware_die")]);
    expect(state.combat?.triggerBindings).toHaveLength(3);
    expect(state.combat?.modifierBindings).toHaveLength(1);
  });

  it("Shared Warranty grants 3 Block to the first incoming Front each turn", () => {
    let state = setup([relic("shared_warranty")]);
    state = swapCharacters(state, "manual").state;
    expect(actor(state, "shaper").block).toBe(3);
    state = swapCharacters(state, "manual").state;
    expect(actor(state, "source").block).toBe(0);

    state = beginPlayerTurn(endPlayerTurn(state));
    state = swapCharacters(state, "card_free").state;
    expect(actor(state, "shaper").block).toBe(3);
  });

  it("Wetware Die multiplies Reaction damage only for Bleeding targets", () => {
    let state = setup([relic("wetware_die")]);
    state = applyCombatStatus(state, "enemy-1", "bleed", 1);
    const result = prepareReaction(state, "volt", "burst");

    expect(result.reaction?.damageResults.map((entry) => entry.requestedDamage)).toStrictEqual([
      7,
      5,
    ]);
  });

  it("Clot Filter grants 2 Block per distinct enemy affected by Bleed on every Reaction", () => {
    let state = setup([relic("clot_filter")]);
    let result = prepareReaction(state, "gore", "burst");
    state = result.state;
    expect(result.reaction?.statusesApplied).toHaveLength(2);
    expect(actor(state, "shaper").block).toBe(4);

    state = swapCharacters(state, "manual").state;
    result = playIngredient(state, "source", ingredient("material", "gore"));
    state = result.state;
    expect(result.reaction?.statusesApplied).toHaveLength(2);
    expect(actor(state, "source").block).toBe(4);
  });

  it("Clot Filter does nothing when the primary Reaction applies no Bleed", () => {
    const result = prepareReaction(setup([relic("clot_filter")]), "volt", "needle");
    expect(actor(result.state, "shaper").block).toBe(0);
  });

  it("Organ Bag raises the per-combat Reaction Recovery allowance from 6 to 10", () => {
    function recovered(definitions: readonly RelicDefinition[]) {
      let state = setup(definitions, 80);
      state = prepareReaction(state, "gore", "siphon", 3).state;
      state = swapCharacters(state, "manual").state;
      state = playIngredient(state, "source", ingredient("material", "gore")).state;
      state = swapCharacters(state, "manual").state;
      state = playIngredient(state, "shaper", ingredient("form", "siphon")).state;
      return state;
    }

    expect(recovered([]).combat?.reactionRecoveryUsed).toBe(6);
    const withBag = recovered([relic("organ_bag")]);
    expect(withBag.combat?.reactionRecoveryUsed).toBe(10);
    expect(actor(withBag, "shaper").hp + actor(withBag, "source").hp).toBe(170);
  });

  it("Parallel Port repeats the largest packet at 50% only for the first Reaction each turn", () => {
    let state = setup([relic("parallel_port")]);
    state = prepareReaction(state, "volt", "needle").state;
    expect(actor(state, "enemy-1").hp).toBe(987);

    state = swapCharacters(state, "manual").state;
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(actor(state, "enemy-1").hp).toBe(978);

    state = beginPlayerTurn(endPlayerTurn(state));
    state = swapCharacters(state, "manual").state;
    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    expect(actor(state, "enemy-1").hp).toBe(965);
  });

  it("Parallel Port spends its turn trigger on a Reaction with no direct damage", () => {
    let state = setup([relic("parallel_port")]);
    state = prepareReaction(state, "rot", "needle").state;
    expect(actor(state, "enemy-1").hp).toBe(1000);
    state = swapCharacters(state, "manual").state;
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(actor(state, "enemy-1").hp).toBe(991);
  });

  it("Parallel Port snapshots outgoing damage before scaling and reapplies target modifiers", () => {
    let state = setup([relic("wetware_die"), relic("parallel_port")]);
    state = applyCombatStatus(state, "enemy-1", "bleed", 1);
    state = applyCombatStatus(state, "enemy-1", "exposed", 1);
    const result = prepareReaction(state, "volt", "needle");

    expect(result.reaction?.largestDirectDamage).toStrictEqual({
      targetActorId: "enemy-1",
      amountBeforeTargetModifiers: 13,
    });
    expect(result.reaction?.damageResults[0]?.requestedDamage).toBe(19);
    expect(actor(result.state, "enemy-1").hp).toBe(972);
  });
});
