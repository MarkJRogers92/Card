import { describe, expect, it } from "vitest";
import {
  TRIGGER_BINDING_VERSION,
  TRIGGER_EVENT_VERSION,
  appendProtocolTriggerBindings,
  applyDirectDamage,
  assertCardPlayable,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createDirectDamagePacket,
  dispatchTriggerEvent,
  drawCards,
  finishCardPlayLifecycle,
  gainBlock,
  initializeCombatActors,
  movePlayedCardForLifecycle,
  payCardCosts,
  settlePlayerHandAtTurnEnd,
  snapshotCardResolutionContext,
  startCombat,
  type AuthoritativeState,
  type CardInstance,
  type CardLifecycleSpec,
  type DeckState,
  type TriggerBinding,
} from "../../src/engine";

const NORMAL: CardLifecycleSpec = {
  category: "skill",
  keywords: [],
  additionalHpCosts: [],
};
const EXHAUST: CardLifecycleSpec = {
  category: "skill",
  keywords: ["exhaust"],
  additionalHpCosts: [],
};
const RETAIN: CardLifecycleSpec = {
  category: "skill",
  keywords: ["retain"],
  additionalHpCosts: [],
};
const FLEETING: CardLifecycleSpec = {
  category: "status",
  keywords: ["fleeting", "unplayable"],
  additionalHpCosts: [],
};
const UNPLAYABLE: CardLifecycleSpec = {
  category: "status",
  keywords: ["unplayable"],
  additionalHpCosts: [],
};
const PROTOCOL: CardLifecycleSpec = {
  category: "protocol",
  keywords: ["protocol"],
  additionalHpCosts: [],
};

function card(ordinal: number, definitionId: string, owner = "morrow"): CardInstance {
  return createCardInstance({
    instanceId: createCardInstanceId(ordinal),
    definitionId,
    ownerCharacterId: owner,
  });
}

function createCombat(
  cards: readonly CardInstance[],
  morrowHp = 44,
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 1111,
      contentVersion: "m11.test",
      contentHash: "m11-card-lifecycle-test",
    }),
    cards,
    { cardsPerTurn: cards.length, maxHandSize: 10 },
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "morrow", maxHp: morrowHp },
      { actorId: "switch", maxHp: 36 },
    ],
    enemies: [{ actorId: "enemy", maxHp: 20 }],
    frontCharacterId: "morrow",
  });
  return beginPlayerTurn(state);
}

function withDeck(state: AuthoritativeState, deck: DeckState): AuthoritativeState {
  if (state.combat === null) throw new Error("Expected combat.");
  return { ...state, combat: { ...state.combat, deck } };
}

function actor(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) throw new Error(`Missing actor ${actorId}.`);
  return found;
}

function protocolBinding(sourceId: string): TriggerBinding {
  return {
    bindingVersion: TRIGGER_BINDING_VERSION,
    sourceId,
    triggerId: "lead_block",
    sourceActorId: "morrow",
    event: "card_played",
    conditions: [{ kind: "classification", value: "lead" }],
    effects: [{ op: "gain_block", target: "source_actor", amount: 3 }],
    limit: { scope: "turn", count: 1 },
    priority: 200,
  };
}

describe("M11 keyword and cost lifecycle", () => {
  it("routes played normal, Exhaust, and Protocol cards to the correct zones", () => {
    const cards = [
      card(1, "test.normal"),
      card(2, "test.exhaust"),
      card(3, "test.protocol"),
    ];
    const state = createCombat(cards);
    let deck = state.combat?.deck;
    if (deck === undefined) throw new Error("Expected deck.");

    deck = movePlayedCardForLifecycle(deck, cards[0].instanceId, NORMAL);
    deck = movePlayedCardForLifecycle(deck, cards[1].instanceId, EXHAUST);
    deck = movePlayedCardForLifecycle(deck, cards[2].instanceId, PROTOCOL);

    expect(deck.zones.discard).toContain(cards[0].instanceId);
    expect(deck.zones.exhaust).toContain(cards[1].instanceId);
    expect(deck.zones.deployed).toContain(cards[2].instanceId);
    expect(deck.zones.hand).toHaveLength(0);
  });

  it("keeps Retain, exhausts unplayed Fleeting, and discards ordinary cards at turn end", () => {
    const cards = [
      card(1, "test.retain"),
      card(2, "test.fleeting"),
      card(3, "test.normal"),
    ];
    const state = createCombat(cards);
    const deck = state.combat?.deck;
    if (deck === undefined) throw new Error("Expected deck.");

    const settled = settlePlayerHandAtTurnEnd(deck, (instance) => {
      if (instance.definitionId === "test.retain") return RETAIN;
      if (instance.definitionId === "test.fleeting") return FLEETING;
      return NORMAL;
    });

    expect(settled.retained).toEqual([cards[0].instanceId]);
    expect(settled.exhausted).toEqual([cards[1].instanceId]);
    expect(settled.discarded).toEqual([cards[2].instanceId]);
    expect(settled.deck.zones.hand).toEqual([cards[0].instanceId]);
  });

  it("rejects Unplayable cards without moving or paying for them", () => {
    const unplayable = card(1, "test.unplayable");
    const state = createCombat([unplayable]);
    const beforeEnergy = state.combat?.energy;
    const beforeHand = state.combat?.deck.zones.hand;

    expect(() =>
      assertCardPlayable(state, unplayable.instanceId, UNPLAYABLE),
    ).toThrow(/Unplayable/);
    expect(state.combat?.energy).toBe(beforeEnergy);
    expect(state.combat?.deck.zones.hand).toEqual(beforeHand);
  });

  it("never reshuffles Exhausted or deployed Protocol cards", () => {
    const cards = [
      card(1, "test.exhaust"),
      card(2, "test.protocol"),
      card(3, "test.normal-a"),
      card(4, "test.normal-b"),
    ];
    const state = createCombat(cards);
    let deck = state.combat?.deck;
    if (deck === undefined) throw new Error("Expected deck.");

    deck = movePlayedCardForLifecycle(deck, cards[0].instanceId, EXHAUST);
    deck = movePlayedCardForLifecycle(deck, cards[1].instanceId, PROTOCOL);
    const settled = settlePlayerHandAtTurnEnd(deck, () => NORMAL);
    const draw = drawCards(settled.deck, state.rng, 10, 10);

    expect(draw.toHand).toEqual(expect.arrayContaining([cards[2].instanceId, cards[3].instanceId]));
    expect(draw.toHand).not.toContain(cards[0].instanceId);
    expect(draw.toHand).not.toContain(cards[1].instanceId);
    expect(draw.deck.zones.exhaust).toEqual([cards[0].instanceId]);
    expect(draw.deck.zones.deployed).toEqual([cards[1].instanceId]);
  });

  it("pays Energy and self-HP costs atomically, bypasses Block, and requires at least 1 HP remaining", () => {
    const costly = card(1, "test.costly");
    let state = createCombat([costly], 4);
    state = gainBlock(state, "morrow", 9);

    const paid = payCardCosts(
      state,
      { kind: "character", actorId: "morrow" },
      2,
      [{ resource: "owner_hp", amount: 3 }],
    );
    expect(paid.combat?.energy).toBe(1);
    expect(actor(paid, "morrow")).toMatchObject({ hp: 1, block: 9 });

    expect(() =>
      payCardCosts(
        state,
        { kind: "character", actorId: "morrow" },
        2,
        [{ resource: "owner_hp", amount: 4 }],
      ),
    ).toThrow(/at least 1 HP must remain/);
    expect(state.combat?.energy).toBe(3);
    expect(actor(state, "morrow")).toMatchObject({ hp: 4, block: 9 });
  });

  it("collects an HP cost before a lethal base effect, so killing the enemy cannot avoid payment", () => {
    const costly = card(1, "test.lethal-cost");
    let state = createCombat([costly], 4);
    const enemy = state.combat?.actors.enemy;
    if (state.combat === null || enemy === undefined) throw new Error("Expected enemy.");
    state = {
      ...state,
      combat: {
        ...state.combat,
        actors: { ...state.combat.actors, enemy: { ...enemy, hp: 1 } },
      },
    };

    state = payCardCosts(
      state,
      { kind: "character", actorId: "morrow" },
      1,
      [{ resource: "owner_hp", amount: 3 }],
    );
    state = applyDirectDamage(state, "enemy", createDirectDamagePacket(1)).state;

    expect(state.combat?.outcome).toBe("victory");
    expect(actor(state, "morrow").hp).toBe(1);
  });

  it("installs Protocol triggers after the installing card event, preventing retroactive activation", () => {
    const protocol = card(1, "test.protocol");
    let state = createCombat([protocol]);
    const context = snapshotCardResolutionContext(state, {
      kind: "character",
      actorId: "morrow",
    });
    const deck = state.combat?.deck;
    if (deck === undefined) throw new Error("Expected deck.");
    state = withDeck(
      state,
      movePlayedCardForLifecycle(deck, protocol.instanceId, PROTOCOL),
    );

    const installed = finishCardPlayLifecycle(state, {
      instanceId: protocol.instanceId,
      lifecycle: PROTOCOL,
      postCard: {
        cardContext: context,
        ingredient: null,
        selectedEnemyActorId: null,
      },
      protocolBindings: [protocolBinding(`protocol.${protocol.instanceId}`)],
    });

    expect(actor(installed.state, "morrow").block).toBe(0);
    expect(installed.protocolBindingsInstalled).toBe(1);

    const triggered = dispatchTriggerEvent(installed.state, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "card_played",
      cardOwnerActorId: "morrow",
      classification: "lead",
      ingredient: null,
    });
    expect(actor(triggered.state, "morrow").block).toBe(3);
  });

  it("allows multiple Protocol copies to stack while keeping independent per-instance limits", () => {
    const state = createCombat([card(1, "test.placeholder")]);
    const withProtocols = appendProtocolTriggerBindings(state, [
      protocolBinding("protocol.copy-a"),
      protocolBinding("protocol.copy-b"),
    ]);

    const first = dispatchTriggerEvent(withProtocols, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "card_played",
      cardOwnerActorId: "morrow",
      classification: "lead",
      ingredient: null,
    });
    expect(actor(first.state, "morrow").block).toBe(6);
    expect(first.activations.map((activation) => activation.sourceId)).toEqual([
      "protocol.copy-a",
      "protocol.copy-b",
    ]);

    const second = dispatchTriggerEvent(first.state, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "card_played",
      cardOwnerActorId: "morrow",
      classification: "lead",
      ingredient: null,
    });
    expect(actor(second.state, "morrow").block).toBe(6);
    expect(second.activations).toHaveLength(0);
  });
});
