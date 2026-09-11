import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { RelicDefinition } from "../../src/content/generated";
import {
  beginPlayerTurn,
  compileRelicContent,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  endPlayerTurn,
  initializeCombatActors,
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
import {
  BASE_CARD_REWARD_OPTION_COUNT,
  resolveCardRewardOptionCount,
  resolveFirstGraftedCardEnergyCost,
} from "../../src/engine/relic-runtime";

const M15_RELIC_IDS = [
  "refund_capacitor",
  "arc_welder",
  "counterfeit_seal",
  "carbon_copy",
  "blank_badge",
] as const;

const M14_RELIC_IDS = [
  "shared_warranty",
  "wetware_die",
  "clot_filter",
  "organ_bag",
  "parallel_port",
] as const;

function relic(name: string): RelicDefinition {
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

function setup(definitions: readonly RelicDefinition[]): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 1515,
      contentVersion: "m15.fixture",
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
    ],
    frontCharacterId: "source",
  });
  state = installRelicContent(state, definitions);
  return beginPlayerTurn(state);
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

function potency(state: AuthoritativeState): number | null {
  return state.combat?.imprint?.potency ?? null;
}

describe("M15 remaining relics", () => {
  it("compiles all five definitions as generic modifier bindings and coexists with M14", () => {
    const definitions = M15_RELIC_IDS.map(relic);
    const compiled = compileRelicContent(definitions);

    expect(compiled.modifierBindings.map((binding) => binding.sourceId)).toStrictEqual([
      "relic.refund_capacitor",
      "relic.arc_welder",
      "relic.counterfeit_seal",
      "relic.carbon_copy",
      "relic.blank_badge",
    ]);
    expect(compiled.triggerBindings).toStrictEqual([]);

    const allTen = [...M14_RELIC_IDS, ...M15_RELIC_IDS].map(relic);
    const installed = setup(allTen);
    expect(installed.combat?.modifierBindings).toHaveLength(7);
    expect(installed.combat?.triggerBindings).toHaveLength(3);
  });

  it("Refund Capacitor waits for Potency 3, refunds only the first qualifying Reaction each turn, and resets next turn", () => {
    let state = setup([relic("refund_capacitor")]);

    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    state = swapCharacters(state, "card_free").state;
    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    expect(state.combat?.energy).toBe(3);

    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    state = swapCharacters(state, "card_free").state;
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(state.combat?.energy).toBe(3);

    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(potency(state)).toBe(3);
    state = swapCharacters(state, "card_free").state;
    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    expect(state.combat?.energy).toBe(4);

    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    state = swapCharacters(state, "card_free").state;
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(state.combat?.energy).toBe(4);

    state = beginPlayerTurn(endPlayerTurn(state));
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    state = swapCharacters(state, "card_free").state;
    state = playIngredient(state, "shaper", ingredient("form", "needle")).state;
    expect(state.combat?.energy).toBe(4);
  });

  it("Arc Welder adds one extra Potency only when an existing Volt Imprint is reinforced and still caps at 3", () => {
    let state = setup([relic("arc_welder")]);
    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(potency(state)).toBe(1);

    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(potency(state)).toBe(3);

    state = playIngredient(state, "source", ingredient("material", "volt")).state;
    expect(potency(state)).toBe(3);

    let replacement = setup([relic("arc_welder")]);
    replacement = playIngredient(replacement, "source", ingredient("material", "gore")).state;
    replacement = playIngredient(replacement, "source", ingredient("material", "volt")).state;
    expect(replacement.combat?.imprint).toMatchObject({
      ingredient: { kind: "material", id: "volt" },
      potency: 1,
    });
  });

  it("Counterfeit Seal discounts only the first Grafted card each turn, clamps at zero, and non-Grafted cards do not consume it", () => {
    let state = setup([relic("counterfeit_seal")]);

    let resolved = resolveFirstGraftedCardEnergyCost(state, 2, ["attack"]);
    expect(resolved.cost).toBe(2);
    state = resolved.state;

    resolved = resolveFirstGraftedCardEnergyCost(state, 2, ["attack", "grafted"]);
    expect(resolved).toMatchObject({ cost: 1, discount: 1 });
    state = resolved.state;

    resolved = resolveFirstGraftedCardEnergyCost(state, 2, ["grafted"]);
    expect(resolved).toMatchObject({ cost: 2, discount: 0 });

    state = beginPlayerTurn(endPlayerTurn(resolved.state));
    resolved = resolveFirstGraftedCardEnergyCost(state, 2, ["grafted"]);
    expect(resolved).toMatchObject({ cost: 1, discount: 1 });

    let zero = setup([relic("counterfeit_seal")]);
    let zeroResolved = resolveFirstGraftedCardEnergyCost(zero, 0, ["grafted"]);
    expect(zeroResolved).toMatchObject({ cost: 0, discount: 0 });
    zero = zeroResolved.state;
    zeroResolved = resolveFirstGraftedCardEnergyCost(zero, 2, ["grafted"]);
    expect(zeroResolved.cost).toBe(2);
  });

  it("Carbon Copy adds one 50% delayed Loop repeat, floors each numeric output separately, and obeys its turn limit", () => {
    let state = setup([relic("carbon_copy")]);
    state = playIngredient(state, "source", ingredient("material", "gore")).state;
    state = swapCharacters(state, "card_free").state;
    let result = playIngredient(state, "shaper", ingredient("form", "loop"));
    state = result.state;

    expect(result.reaction?.scheduledPacketIds).toHaveLength(2);
    expect(state.combat?.scheduledPackets).toHaveLength(2);
    expect(state.combat?.scheduledPackets[0]?.effects).toStrictEqual([
      {
        op: "reaction_damage",
        amountBeforeTargetModifiers: 4,
        hits: 1,
        targetActorId: "enemy-1",
      },
      {
        op: "apply_status",
        status: "bleed",
        amount: 1,
        targetActorId: "enemy-1",
      },
    ]);
    expect(state.combat?.scheduledPackets[1]?.effects).toStrictEqual([
      {
        op: "reaction_damage",
        amountBeforeTargetModifiers: 2,
        hits: 1,
        targetActorId: "enemy-1",
      },
    ]);

    state = swapCharacters(state, "card_free").state;
    result = playIngredient(state, "source", ingredient("material", "gore"));
    state = result.state;
    expect(result.reaction?.scheduledPacketIds).toHaveLength(1);
    expect(state.combat?.scheduledPackets).toHaveLength(3);

    state = beginPlayerTurn(endPlayerTurn(state));
    state = swapCharacters(state, "card_free").state;
    result = playIngredient(state, "shaper", ingredient("form", "loop"));
    expect(result.reaction?.scheduledPacketIds).toHaveLength(2);
  });

  it("Carbon Copy scales delayed status output as well as damage", () => {
    let state = setup([relic("carbon_copy")]);
    state = playIngredient(state, "source", ingredient("material", "rot")).state;
    state = swapCharacters(state, "card_free").state;
    state = playIngredient(state, "shaper", ingredient("form", "loop")).state;

    expect(state.combat?.scheduledPackets).toHaveLength(2);
    expect(state.combat?.scheduledPackets[0]?.effects).toStrictEqual([
      {
        op: "apply_status",
        status: "poison",
        amount: 2,
        targetActorId: "enemy-1",
      },
    ]);
    expect(state.combat?.scheduledPackets[1]?.effects).toStrictEqual([
      {
        op: "apply_status",
        status: "poison",
        amount: 1,
        targetActorId: "enemy-1",
      },
    ]);
  });

  it("Blank Badge raises the generic card-reward option count from 3 to 4", () => {
    expect(resolveCardRewardOptionCount([], BASE_CARD_REWARD_OPTION_COUNT)).toBe(3);
    const compiled = compileRelicContent([relic("blank_badge")]);
    expect(resolveCardRewardOptionCount(compiled.modifierBindings)).toBe(4);
  });
});
