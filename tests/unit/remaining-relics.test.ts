import { beforeAll, describe, expect, it } from "vitest";
import type { CardDefinition, RelicDefinition } from "../../src/content/generated";
import {
  BASE_CARD_REWARD_OPTIONS,
  MODIFIER_BINDING_VERSION,
  beginPlayerTurn,
  cardRewardOptionCount,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createImprint,
  endPlayerTurn,
  initializeCombatActors,
  installModifierBindings,
  installRelicContent,
  playContentCard,
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
import { loadRegistry } from "../../src/content/registry.mjs";

const SOURCE_ACTOR = "duo.source";
const SHAPER_ACTOR = "duo.shaper";
const ENEMY_ACTOR = "enemy.target";

const RELIC_IDS = [
  "refund_capacitor",
  "arc_welder",
  "counterfeit_seal",
  "carbon_copy",
  "blank_badge",
] as const;

type RelicName = (typeof RELIC_IDS)[number];

let relicDefinitions: Map<string, RelicDefinition>;
let cardDefinitions: Map<string, CardDefinition>;

beforeAll(async () => {
  const registry = await loadRegistry([], { rootDir: process.cwd() });
  relicDefinitions = new Map();
  cardDefinitions = new Map();
  for (const file of registry.definitions) {
    if (file.kind === "relic") {
      const data = file.data as RelicDefinition;
      relicDefinitions.set(data.id.replace(/^relic\./, ""), data);
    } else if (file.kind === "card") {
      const data = file.data as CardDefinition;
      cardDefinitions.set(data.id, data);
    }
  }
});

function relic(name: RelicName): RelicDefinition {
  const found = relicDefinitions.get(name);
  if (found === undefined) throw new Error(`Missing loaded relic definition: ${name}.`);
  return found;
}

function cardDefinition(id: string): CardDefinition {
  const found = cardDefinitions.get(id);
  if (found === undefined) throw new Error(`Missing loaded card definition: ${id}.`);
  return found;
}

let nextOrdinal = 1;
function card(id: string, owner: string = SOURCE_ACTOR): CardInstance {
  const instance = createCardInstance({
    instanceId: createCardInstanceId(nextOrdinal),
    definitionId: id,
    ownerCharacterId: owner,
  });
  nextOrdinal += 1;
  return instance;
}

function requireCombat(state: AuthoritativeState) {
  const combat = state.combat;
  if (combat === null) throw new Error("Expected combat.");
  return combat;
}

interface SetupOptions {
  readonly cards?: readonly CardInstance[];
  readonly energyPerTurn?: number;
}

function startSetupState(options: SetupOptions = {}): AuthoritativeState {
  const cards =
    options.cards ??
    Array.from({ length: 4 }, (_, index) => card(`fixture.card.${index + 1}`));
  const state = startCombat(
    createAuthoritativeState({
      seed: 1515,
      contentVersion: "m15.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards,
    {
      cardsPerTurn: cards.length,
      maxHandSize: Math.max(10, cards.length),
      energyPerTurn: options.energyPerTurn ?? 20,
    },
  );
  return initializeCombatActors(state, {
    playerCharacters: [
      { actorId: SOURCE_ACTOR, maxHp: 60 },
      { actorId: SHAPER_ACTOR, maxHp: 40 },
    ],
    enemies: [{ actorId: ENEMY_ACTOR, maxHp: 1000 }],
    frontCharacterId: SOURCE_ACTOR,
  });
}

function setup(relicIds: readonly RelicName[], options: SetupOptions = {}): AuthoritativeState {
  const state = installRelicContent(startSetupState(options), relicIds.map(relic));
  return beginPlayerTurn(state);
}

function actor(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) throw new Error(`Missing actor ${actorId}.`);
  return found;
}

function energy(state: AuthoritativeState): number {
  return requireCombat(state).energy;
}

function scheduledPackets(state: AuthoritativeState) {
  return requireCombat(state).scheduledPackets;
}

function ingredient(
  kind: Ingredient["kind"],
  id: MaterialIngredientId | FormIngredientId,
  prime = 1,
): Ingredient {
  return { kind, id, prime } as Ingredient;
}

function withImprint(
  state: AuthoritativeState,
  ownerCharacterId: string,
  value: Ingredient,
): AuthoritativeState {
  return {
    ...state,
    combat: { ...requireCombat(state), imprint: createImprint(ownerCharacterId, value) },
  };
}

function playIngredient(
  state: AuthoritativeState,
  ownerActorId: string,
  value: Ingredient,
) {
  return resolvePostCardIngredientWithTriggers(state, {
    cardContext: snapshotCardResolutionContext(state, {
      kind: "character",
      actorId: ownerActorId,
    }),
    ingredient: value,
    selectedEnemyActorId: ENEMY_ACTOR,
  });
}

/**
 * Imprints a Material on the current Front at the requested Potency, hands the
 * turn to the Reserve partner, and plays the Form that resolves the Reaction.
 */
function playReaction(
  state: AuthoritativeState,
  material: MaterialIngredientId,
  form: FormIngredientId,
  potency: number,
) {
  const front = requireCombat(state).frontCharacterId;
  if (front === null) throw new Error("Expected a Front character.");
  let current = withImprint(state, front, ingredient("material", material, potency));
  current = swapCharacters(current, "manual").state;
  const nextFront = requireCombat(current).frontCharacterId;
  if (nextFront === null) throw new Error("Expected a Front character after the swap.");
  return playIngredient(current, nextFront, ingredient("form", form));
}

function playCard(
  state: AuthoritativeState,
  definition: CardDefinition,
  instance: CardInstance,
) {
  return playContentCard(state, {
    instanceId: instance.instanceId,
    definition,
    upgraded: false,
    ownerCharacterId: instance.ownerCharacterId,
    selectedEnemyActorId: ENEMY_ACTOR,
  });
}

describe("M15 remaining relics", () => {
  it("compiles all five definitions into modifier and trigger bindings", () => {
    const state = installRelicContent(startSetupState(), RELIC_IDS.map(relic));
    expect(requireCombat(state).modifierBindings.map((binding) => binding.sourceId)).toStrictEqual([
      "relic.arc_welder",
      "relic.blank_badge",
    ]);
    expect(requireCombat(state).triggerBindings.map((binding) => binding.sourceId)).toStrictEqual([
      "relic.refund_capacitor",
      "relic.counterfeit_seal",
      "relic.carbon_copy",
    ]);
  });

  it("Refund Capacitor grants 1 Energy only for a Potency-3 primary Reaction", () => {
    function run(relicIds: readonly RelicName[], potency: number) {
      const state = setup(relicIds);
      const before = energy(state);
      const result = playReaction(state, "volt", "needle", potency);
      return {
        gain: energy(result.state) - before,
        potency: result.reaction?.potency ?? null,
      };
    }

    expect(run([], 2).potency).toBe(2);
    expect(run(["refund_capacitor"], 2).potency).toBe(2);
    expect(run(["refund_capacitor"], 2).gain).toBe(run([], 2).gain);

    expect(run([], 3).potency).toBe(3);
    expect(run(["refund_capacitor"], 3).potency).toBe(3);
    expect(run(["refund_capacitor"], 3).gain - run([], 3).gain).toBe(1);
  });

  it("Refund Capacitor pays once per player turn and refreshes on the next turn", () => {
    function run(relicIds: readonly RelicName[]) {
      let state = setup(relicIds);
      const start = energy(state);
      state = playReaction(state, "volt", "needle", 3).state;
      const afterFirst = energy(state) - start;
      state = playReaction(state, "gore", "needle", 3).state;
      const afterSecond = energy(state) - start;
      state = beginPlayerTurn(endPlayerTurn(state));
      const turnStart = energy(state);
      state = playReaction(state, "volt", "needle", 3).state;
      return { afterFirst, afterSecond, refreshed: energy(state) - turnStart };
    }

    const plain = run([]);
    const relicState = run(["refund_capacitor"]);
    expect(relicState.afterFirst - plain.afterFirst).toBe(1);
    expect(relicState.afterSecond - plain.afterSecond).toBe(1);
    expect(relicState.refreshed - plain.refreshed).toBe(1);
  });

  it("Arc Welder adds 1 Potency only when reinforcing an existing Volt Imprint", () => {
    function reinforce(
      relicIds: readonly RelicName[],
      material: MaterialIngredientId,
      copies: number,
    ) {
      let state = setup(relicIds);
      for (let index = 0; index < copies; index += 1) {
        state = playIngredient(state, SOURCE_ACTOR, ingredient("material", material, 1)).state;
      }
      return state;
    }

    expect(requireCombat(reinforce([], "volt", 2)).imprint?.potency).toBe(2);
    expect(requireCombat(reinforce(["arc_welder"], "volt", 2)).imprint?.potency).toBe(3);
    expect(requireCombat(reinforce([], "gore", 2)).imprint?.potency).toBe(2);
    expect(requireCombat(reinforce(["arc_welder"], "gore", 2)).imprint?.potency).toBe(2);

    // The bonus never lifts Potency past the cap, and a fresh Imprint keeps its own Prime.
    expect(requireCombat(reinforce(["arc_welder"], "volt", 4)).imprint?.potency).toBe(3);
    const replaced = playIngredient(
      reinforce(["arc_welder"], "volt", 2),
      SOURCE_ACTOR,
      ingredient("material", "rot", 1),
    ).state;
    expect(requireCombat(replaced).imprint).toMatchObject({
      ingredient: { kind: "material", id: "rot" },
      potency: 1,
    });
  });

  it("Counterfeit Seal discounts the first Grafted card played each player turn", () => {
    const grafted: CardDefinition = {
      ...cardDefinition("source.bone_saw"),
      tags: ["grafted"],
    };
    const plain = cardDefinition("source.bone_saw");
    expect(grafted.energyCost).toStrictEqual({ const: 2 });

    const first = card(grafted.id);
    const second = card(grafted.id);
    const plainCard = card(plain.id);
    const nextTurnGrafted = card(grafted.id);
    let state = setup(["counterfeit_seal"], {
      cards: [first, second, plainCard, nextTurnGrafted],
    });
    const start = energy(state);

    state = playCard(state, grafted, first).state;
    expect(start - energy(state)).toBe(1);

    state = playCard(state, grafted, second).state;
    expect(start - energy(state)).toBe(3);

    state = playCard(state, plain, plainCard).state;
    expect(start - energy(state)).toBe(5);

    // Manual swaps also cost Energy, so only the discounted play is measured here.
    state = beginPlayerTurn(endPlayerTurn(state));
    const turnStart = energy(state);
    state = playCard(state, grafted, nextTurnGrafted).state;
    expect(turnStart - energy(state)).toBe(1);
  });

  it("Counterfeit Seal ignores non-Grafted cards and never discounts below zero", () => {
    const plain = cardDefinition("source.bone_saw");
    const graftedFree: CardDefinition = {
      ...cardDefinition("source.bone_saw"),
      tags: ["grafted"],
      energyCost: { const: 1 },
    };

    const plainCard = card(plain.id);
    const freeCard = card(graftedFree.id);
    let state = setup(["counterfeit_seal"], {
      cards: [plainCard, freeCard, card(plain.id), card(plain.id)],
    });
    const start = energy(state);
    state = playCard(state, plain, plainCard).state;
    expect(start - energy(state)).toBe(2);

    state = playCard(state, graftedFree, freeCard).state;
    expect(start - energy(state)).toBe(2);
  });

  it("Carbon Copy schedules one extra 50% repeat for the first Loop Reaction each turn", () => {
    let state = setup(["carbon_copy"]);
    let result = playReaction(state, "gore", "loop", 1);
    state = result.state;
    expect(result.reaction?.scheduledPacketIds).toHaveLength(1);
    expect(scheduledPackets(state)).toHaveLength(2);

    // Second Incision deals 4P damage and P Bleed; at 50% the Bleed floors to 0
    // and is dropped instead of being scheduled as an empty effect.
    const extra = scheduledPackets(state)[1];
    expect(extra?.sourceRecipeId).toBe(result.reaction?.recipeId);
    expect(extra?.targetActorId).toBe(ENEMY_ACTOR);
    expect(extra?.effects).toStrictEqual([
      {
        op: "reaction_damage",
        amountBeforeTargetModifiers: 2,
        hits: 1,
        targetActorId: ENEMY_ACTOR,
      },
    ]);

    // The second Loop Reaction in the same turn gets no extra repeat.
    result = playReaction(state, "gore", "loop", 1);
    state = result.state;
    expect(result.reaction).not.toBeNull();
    expect(scheduledPackets(state)).toHaveLength(3);

    // Scheduled packets resolve at the next player-turn start, so the next turn
    // starts empty. A non-Loop Reaction neither adds a packet nor consumes the
    // once-per-turn allowance.
    state = beginPlayerTurn(endPlayerTurn(state));
    expect(scheduledPackets(state)).toHaveLength(0);
    result = playReaction(state, "volt", "needle", 1);
    state = result.state;
    expect(result.reaction).not.toBeNull();
    expect(scheduledPackets(state)).toHaveLength(0);

    result = playReaction(state, "volt", "loop", 1);
    state = result.state;
    expect(result.reaction).not.toBeNull();
    expect(scheduledPackets(state)).toHaveLength(2);
  });

  it("Carbon Copy resolves the reduced repeat at the next player-turn start", () => {
    function hpAcrossTurn(relicIds: readonly RelicName[]) {
      let state = setup(relicIds);
      state = playReaction(state, "gore", "loop", 1).state;
      const afterReaction = actor(state, ENEMY_ACTOR).hp;
      state = beginPlayerTurn(endPlayerTurn(state));
      return afterReaction - actor(state, ENEMY_ACTOR).hp;
    }

    const baseline = hpAcrossTurn([]);
    const withRelic = hpAcrossTurn(["carbon_copy"]);
    expect(baseline).toBe(4);
    expect(withRelic - baseline).toBe(2);
  });

  it("Carbon Copy scales status repeats as well as damage", () => {
    const result = playReaction(setup(["carbon_copy"]), "rot", "loop", 2);
    // Recurring Infection applies 2P Poison; at Potency 2 the 50% repeat is 2.
    expect(scheduledPackets(result.state)[1]?.effects).toStrictEqual([
      { op: "apply_status", status: "poison", amount: 2, targetActorId: ENEMY_ACTOR },
    ]);
  });

  it("Blank Badge raises card reward options from 3 to 4", () => {
    expect(cardRewardOptionCount(setup([]))).toBe(BASE_CARD_REWARD_OPTIONS);
    expect(cardRewardOptionCount(setup(["blank_badge"]))).toBe(4);
    expect(cardRewardOptionCount(setup(["blank_badge", "arc_welder"]))).toBe(4);
  });

  it("rejects an unsupported reward-option modifier instead of ignoring it", () => {
    const state = installModifierBindings(startSetupState(), [
      {
        bindingVersion: MODIFIER_BINDING_VERSION,
        sourceId: "relic.test",
        modifierId: "modifier.1",
        channel: "reward.card_options",
        condition: null,
        operation: "multiply",
        value: 20000,
        priority: 100,
      },
    ]);
    expect(() => cardRewardOptionCount(state)).toThrow(
      "Unsupported reward.card_options modifier operation",
    );
  });
});
