import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CardDefinition, RelicDefinition } from "../../src/content/generated";
import {
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  dispatchTriggerEvent,
  endPlayerTurn,
  initializeCombatActors,
  installRelicContent,
  playContentCard,
  resolvePostCardIngredientWithTriggers,
  snapshotCardResolutionContext,
  startCombat,
  swapCharacters,
  TRIGGER_EVENT_VERSION,
  type AuthoritativeState,
  type CardInstance,
  type Ingredient,
} from "../../src/engine";

const RELIC_IDS = [
  "wetware_die",
  "clot_filter",
  "organ_bag",
  "refund_capacitor",
  "arc_welder",
  "parallel_port",
  "counterfeit_seal",
  "carbon_copy",
  "blank_badge",
] as const;
const ANATOMY_RELIC_IDS = [
  "wetware_die",
  "clot_filter",
  "organ_bag",
] as const;
const CIRCUIT_RELIC_IDS = [
  "refund_capacitor",
  "arc_welder",
  "parallel_port",
] as const;
const FORGERY_RELIC_IDS = ["counterfeit_seal", "carbon_copy", "blank_badge"] as const;

function relic(id: (typeof RELIC_IDS)[number]): RelicDefinition {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "content", "relics", `${id}.json`), "utf8"),
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

function setupState() {
  let state = startCombat(
    createAuthoritativeState({
      seed: 1616,
      contentVersion: "m16.fixture",
      contentHash: "m16-fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 60 },
      { actorId: "shaper", maxHp: 40 },
    ],
    enemies: [
      { actorId: "enemy-1", maxHp: 100 },
      { actorId: "enemy-2", maxHp: 100 },
    ],
    frontCharacterId: "source",
  });
  return state;
}

function graftedBoneSaw(): CardDefinition {
  const definition = JSON.parse(
    readFileSync(path.join(process.cwd(), "content", "cards", "source", "bone_saw.json"), "utf8"),
  ) as CardDefinition;
  return { ...definition, tags: ["grafted"] };
}

function setupGraftedCardState(relicIds: readonly (typeof FORGERY_RELIC_IDS)[number][] = []) {
  const instance = createCardInstance({
    instanceId: createCardInstanceId(99), definitionId: "source.bone_saw", ownerCharacterId: "source",
  });
  let state = startCombat(createAuthoritativeState({ seed: 1617, contentVersion: "m16.fixture", contentHash: "m16-fixture-content-v1" }), [instance]);
  state = initializeCombatActors(state, { playerCharacters: [{ actorId: "source", maxHp: 60 }, { actorId: "shaper", maxHp: 40 }], enemies: [{ actorId: "enemy-1", maxHp: 100 }], frontCharacterId: "source" });
  for (const id of relicIds) state = installRelicContent(state, [relic(id)]);
  return { state: beginPlayerTurn(state), instance };
}

function requireCombat(state: AuthoritativeState) {
  if (state.combat === null) throw new Error("Expected combat.");
  return state.combat;
}

function actor(state: AuthoritativeState, actorId: string) {
  const found = requireCombat(state).actors[actorId];
  if (found === undefined) throw new Error(`Missing actor ${actorId}.`);
  return found;
}

function ingredient(id: "gore" | "needle"): Ingredient {
  return id === "gore"
    ? { kind: "material", id, prime: 1 }
    : { kind: "form", id, prime: 1 };
}

function playIngredient(
  state: AuthoritativeState,
  ownerActorId: "source" | "shaper",
  value: Ingredient,
) {
  return resolvePostCardIngredientWithTriggers(state, {
    cardContext: snapshotCardResolutionContext(state, {
      kind: "character",
      actorId: ownerActorId,
    }),
    ingredient: value,
    selectedEnemyActorId: "enemy-1",
  });
}

function playGoreNeedleReaction(state: AuthoritativeState) {
  let current = playIngredient(state, "source", ingredient("gore")).state;
  current = swapCharacters(current, "manual").state;
  return playIngredient(current, "shaper", ingredient("needle"));
}

function withDefeatedSecondEnemy(state: AuthoritativeState): AuthoritativeState {
  const combat = requireCombat(state);
  return {
    ...state,
    combat: {
      ...combat,
      actors: {
        ...combat.actors,
        "enemy-2": { ...actor(state, "enemy-2"), hp: 0 },
      },
    },
  };
}

describe("M16 family transformations", () => {
  it("activates Spare Parts once when three distinct Anatomy relics arrive incrementally", () => {
    let state = setupState();
    state = installRelicContent(state, [relic("wetware_die")]);
    state = installRelicContent(state, [relic("clot_filter")]);
    state = installRelicContent(state, [relic("organ_bag")]);

    expect(
      state.combat?.triggerBindings.filter(
        (binding) => binding.sourceId === "transformation.anatomy",
      ),
    ).toHaveLength(1);
  });

  it("does not count duplicate family relic copies toward a transformation", () => {
    let state = setupState();
    state = installRelicContent(state, [relic("wetware_die")]);
    expect(() => installRelicContent(state, [relic("wetware_die")])).toThrow(/already installed/);
    state = installRelicContent(state, [relic("clot_filter")]);
    expect(state.combat?.triggerBindings.some((binding) => binding.sourceId === "transformation.anatomy")).toBe(false);
  });

  it("Spare Parts Bleeds each living enemy once for the first primary Gore Reaction each turn", () => {
    let plain = withDefeatedSecondEnemy(beginPlayerTurn(setupState()));
    plain = playGoreNeedleReaction(plain).state;

    let state = setupState();
    for (const id of ANATOMY_RELIC_IDS) state = installRelicContent(state, [relic(id)]);
    state = withDefeatedSecondEnemy(beginPlayerTurn(state));

    state = playGoreNeedleReaction(state).state;
    expect(actor(state, "enemy-1").statuses.bleed - actor(plain, "enemy-1").statuses.bleed).toBe(1);
    expect(actor(state, "enemy-2").statuses.bleed).toBe(0);

    plain = swapCharacters(plain, "manual").state;
    plain = playIngredient(plain, "source", ingredient("gore")).state;
    state = swapCharacters(state, "manual").state;
    state = playIngredient(state, "source", ingredient("gore")).state;
    expect(actor(state, "enemy-1").statuses.bleed - actor(plain, "enemy-1").statuses.bleed).toBe(1);

    plain = beginPlayerTurn(endPlayerTurn(plain));
    state = beginPlayerTurn(endPlayerTurn(state));
    plain = swapCharacters(plain, "manual").state;
    plain = playIngredient(plain, "shaper", ingredient("needle")).state;
    state = swapCharacters(state, "manual").state;
    state = playIngredient(state, "shaper", ingredient("needle")).state;
    expect(actor(state, "enemy-1").statuses.bleed - actor(plain, "enemy-1").statuses.bleed).toBe(2);
  });

  it("Live Wire refunds the first paid manual swap each turn without consuming the free swap", () => {
    let state = setupState();
    for (const id of CIRCUIT_RELIC_IDS) state = installRelicContent(state, [relic(id)]);
    state = beginPlayerTurn(state);
    const start = requireCombat(state).energy;

    state = swapCharacters(state, "manual").state;
    expect(requireCombat(state).energy).toBe(start);
    state = swapCharacters(state, "manual").state;
    expect(requireCombat(state).energy).toBe(start);
    state = swapCharacters(state, "manual").state;
    expect(requireCombat(state).energy).toBe(start - 1);

    state = beginPlayerTurn(endPlayerTurn(state));
    const nextTurnStart = requireCombat(state).energy;
    state = swapCharacters(state, "manual").state;
    state = swapCharacters(state, "manual").state;
    expect(requireCombat(state).energy).toBe(nextTurnStart);
  });

  it("activates Double Booked once for three distinct Forgery relics", () => {
    let state = setupState();
    for (const id of FORGERY_RELIC_IDS) state = installRelicContent(state, [relic(id)]);
    expect(
      state.combat?.triggerBindings.filter((binding) => binding.sourceId === "transformation.forgery"),
    ).toHaveLength(1);
  });

  it("Double Booked grants one 50% Grafted base-effect repeat per combat", () => {
    let state = setupState();
    for (const id of FORGERY_RELIC_IDS) state = installRelicContent(state, [relic(id)]);
    state = beginPlayerTurn(state);
    const event = {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "card_base_effects" as const,
      cardTags: ["grafted"],
    };
    const first = dispatchTriggerEvent(state, event);
    expect(first.baseEffectRepeatMultiplierBps).toBe(5000);
    expect(dispatchTriggerEvent(first.state, event).baseEffectRepeatMultiplierBps).toBe(0);
  });

  it("Double Booked repeats only Grafted base effects at floor(50%) without a second lifecycle", () => {
    const plainSetup = setupGraftedCardState();
    const forgedSetup = setupGraftedCardState(FORGERY_RELIC_IDS);
    const forged = forgedSetup.state;
    const definition = graftedBoneSaw();
    const plain = playContentCard(plainSetup.state, { instanceId: plainSetup.instance.instanceId, definition, upgraded: false, ownerCharacterId: "source", selectedEnemyActorId: "enemy-1" }).state;
    const result = playContentCard(forged, { instanceId: forgedSetup.instance.instanceId, definition, upgraded: false, ownerCharacterId: "source", selectedEnemyActorId: "enemy-1" }).state;
    expect(actor(plain, "enemy-1").hp - actor(result, "enemy-1").hp).toBe(6);
    expect(requireCombat(result).imprint?.potency).toBe(1);
  });
});
