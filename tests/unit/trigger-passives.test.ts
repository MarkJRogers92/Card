import { describe, expect, it } from "vitest";
import {
  MODIFIER_BINDING_VERSION,
  TRIGGER_BINDING_VERSION,
  TRIGGER_EVENT_VERSION,
  beginPlayerTurn,
  collectApplicableModifiers,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  dispatchTriggerEvent,
  endPlayerTurn,
  hashAuthoritativeState,
  initializeCombatActors,
  installInitialPassives,
  installTriggerBindings,
  previewTriggerEvent,
  resolvePostCardIngredientWithTriggers,
  snapshotCardResolutionContext,
  startCombat,
  swapCharacters,
  type AuthoritativeState,
  type CardInstance,
  type Ingredient,
  type ModifierBinding,
  type TriggerBinding,
} from "../../src/engine";

function cards(count = 14): CardInstance[] {
  return Array.from({ length: count }, (_, index) =>
    createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId: `fixture.card.${index + 1}`,
      ownerCharacterId: index % 2 === 0 ? "morrow" : "switch",
    }),
  );
}

function setupBase(
  frontCharacterId: "morrow" | "switch" = "morrow",
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 909,
      contentVersion: "m09.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "morrow", maxHp: 44 },
      { actorId: "switch", maxHp: 36 },
    ],
    enemies: [{ actorId: "enemy-1", maxHp: 1000 }],
    frontCharacterId,
  });
  return state;
}

function setupInitialPassives(
  frontCharacterId: "morrow" | "switch" = "morrow",
): AuthoritativeState {
  let state = setupBase(frontCharacterId);
  state = installInitialPassives(state, {
    morrowActorId: "morrow",
    switchActorId: "switch",
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

function playIngredient(
  state: AuthoritativeState,
  actorId: "morrow" | "switch",
  ingredient: Ingredient | null,
): AuthoritativeState {
  return resolvePostCardIngredientWithTriggers(state, {
    cardContext: snapshotCardResolutionContext(state, {
      kind: "character",
      actorId,
    }),
    ingredient,
    selectedEnemyActorId: "enemy-1",
  }).state;
}

describe("M09 initial passives", () => {
  it("Morrow gains 2 Block after only his first Gore Lead card each player turn", () => {
    let state = setupInitialPassives("morrow");
    state = playIngredient(state, "morrow", {
      kind: "material",
      id: "volt",
      prime: 1,
    });
    expect(actor(state, "morrow").block).toBe(0);

    state = playIngredient(state, "morrow", {
      kind: "material",
      id: "gore",
      prime: 1,
    });
    expect(actor(state, "morrow").block).toBe(2);

    state = playIngredient(state, "morrow", {
      kind: "material",
      id: "gore",
      prime: 1,
    });
    expect(actor(state, "morrow").block).toBe(2);

    state = endPlayerTurn(state);
    state = beginPlayerTurn(state);
    expect(actor(state, "morrow").block).toBe(0);
    state = playIngredient(state, "morrow", {
      kind: "material",
      id: "gore",
      prime: 1,
    });
    expect(actor(state, "morrow").block).toBe(2);
  });

  it("Switch draws one card after only her first ingredient-bearing Shaper Lead each turn", () => {
    let state = setupInitialPassives("switch");
    expect(state.combat?.deck.zones.hand).toHaveLength(5);

    state = playIngredient(state, "switch", {
      kind: "form",
      id: "needle",
      prime: 1,
    });
    expect(state.combat?.deck.zones.hand).toHaveLength(6);

    state = playIngredient(state, "switch", {
      kind: "form",
      id: "burst",
      prime: 1,
    });
    expect(state.combat?.deck.zones.hand).toHaveLength(6);
  });

  it("Shared Warranty grants 3 Block after the first swap, including a card-free swap", () => {
    let state = setupInitialPassives("morrow");
    const first = swapCharacters(state, "card_free");
    state = first.state;
    expect(actor(state, "switch").block).toBe(3);
    expect(state.combat).toMatchObject({
      manualSwapsUsedThisTurn: 0,
      energy: 3,
    });

    const second = swapCharacters(state, "manual");
    state = second.state;
    expect(second.energyPaid).toBe(0);
    expect(actor(state, "morrow").block).toBe(0);
    expect(state.combat?.manualSwapsUsedThisTurn).toBe(1);

    state = endPlayerTurn(state);
    state = beginPlayerTurn(state);
    state = swapCharacters(state, "manual").state;
    expect(actor(state, "switch").block).toBe(3);
  });

  it("does not let Support cards consume Morrow or Switch turn limits", () => {
    let state = setupInitialPassives("morrow");
    state = playIngredient(state, "switch", {
      kind: "form",
      id: "needle",
      prime: 1,
    });
    expect(state.combat?.deck.zones.hand).toHaveLength(5);
    state = playIngredient(state, "morrow", {
      kind: "material",
      id: "gore",
      prime: 1,
    });
    expect(actor(state, "morrow").block).toBe(2);
  });
});

describe("M09 trigger dispatcher", () => {
  it("orders trigger ties by priority, then source ID, then trigger ID", () => {
    const binding = (
      sourceId: string,
      triggerId: string,
      priority: number,
    ): TriggerBinding => ({
      bindingVersion: TRIGGER_BINDING_VERSION,
      sourceId,
      triggerId,
      sourceActorId: null,
      event: "after_swap",
      conditions: [],
      effects: [{ op: "draw", amount: 0 }],
      limit: { scope: "turn", count: 1 },
      priority,
    });
    let state = setupBase();
    state = installTriggerBindings(state, [
      binding("z.source", "b", 10),
      binding("a.source", "b", 10),
      binding("a.source", "a", 10),
      binding("late.source", "x", 20),
    ]);
    state = beginPlayerTurn(state);

    const preview = previewTriggerEvent(state, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "after_swap",
      incomingFrontActorId: "switch",
      mode: "manual",
    });
    expect(preview.map((entry) => `${entry.priority}:${entry.sourceId}:${entry.triggerId}`)).toStrictEqual([
      "10:a.source:a",
      "10:a.source:b",
      "10:z.source:b",
      "20:late.source:x",
    ]);
  });

  it("preview does not consume counters, mutate state, or consume RNG", () => {
    const state = setupInitialPassives();
    const before = hashAuthoritativeState(state);
    const event = {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "after_swap" as const,
      incomingFrontActorId: "switch",
      mode: "manual" as const,
    };

    expect(previewTriggerEvent(state, event)).toHaveLength(1);
    expect(previewTriggerEvent(state, event)).toHaveLength(1);
    expect(hashAuthoritativeState(state)).toBe(before);

    const after = swapCharacters(state, "manual").state;
    expect(previewTriggerEvent(after, event)).toHaveLength(0);
    expect(actor(after, "switch").block).toBe(3);
  });

  it("fails rather than silently dropping effects at the generated-event ceiling", () => {
    const bindings: TriggerBinding[] = Array.from({ length: 129 }, (_, index) => ({
      bindingVersion: TRIGGER_BINDING_VERSION,
      sourceId: `fixture.source.${String(index).padStart(3, "0")}`,
      triggerId: "bounded",
      sourceActorId: null,
      event: "after_swap",
      conditions: [],
      effects: [{ op: "draw", amount: 0 }],
      limit: { scope: "turn", count: 1 },
      priority: 100,
    }));
    let state = setupBase();
    state = installTriggerBindings(state, bindings);
    state = beginPlayerTurn(state);
    const before = hashAuthoritativeState(state);

    expect(() =>
      dispatchTriggerEvent(state, {
        eventVersion: TRIGGER_EVENT_VERSION,
        kind: "after_swap",
        incomingFrontActorId: "switch",
        mode: "manual",
      }),
    ).toThrow(/development ceiling of 256/);
    expect(hashAuthoritativeState(state)).toBe(before);
  });
});

describe("M09 modifier dispatcher", () => {
  it("filters by channel/condition and uses the same stable priority/source/id order", () => {
    const modifier = (
      sourceId: string,
      modifierId: string,
      priority: number,
      value: number,
    ): ModifierBinding => ({
      bindingVersion: MODIFIER_BINDING_VERSION,
      sourceId,
      modifierId,
      channel: "reaction.direct.multiplier",
      condition: { targetHasStatus: "bleed" },
      operation: "multiply",
      value,
      priority,
    });
    const bindings: ModifierBinding[] = [
      modifier("z.source", "b", 100, 15_000),
      modifier("a.source", "b", 100, 12_000),
      modifier("a.source", "a", 100, 11_000),
      modifier("early.source", "x", 50, 10_500),
      {
        ...modifier("wrong.channel", "x", 1, 99_999),
        channel: "attack.direct.multiplier",
      },
    ];

    const result = collectApplicableModifiers(
      bindings,
      "reaction.direct.multiplier",
      { targetStatuses: ["bleed"] },
    );
    expect(result.map((entry) => `${entry.priority}:${entry.sourceId}:${entry.modifierId}`)).toStrictEqual([
      "50:early.source:x",
      "100:a.source:a",
      "100:a.source:b",
      "100:z.source:b",
    ]);
    expect(
      collectApplicableModifiers(bindings, "reaction.direct.multiplier", {
        targetStatuses: [],
      }),
    ).toStrictEqual([]);
  });
});
