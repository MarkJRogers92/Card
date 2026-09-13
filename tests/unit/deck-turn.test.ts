import { describe, expect, it } from "vitest";
import {
  assertCardConservation,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createDeckState,
  createGameplayRngState,
  drawCards,
  endPlayerTurn,
  hashAuthoritativeState,
  payEnergyCost,
  startCombat,
  type CardInstance,
  type DeckState,
} from "../../src/engine";

function makeCards(count: number): CardInstance[] {
  return Array.from({ length: count }, (_, index) =>
    createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId: `fixture.card.${index + 1}`,
      ownerCharacterId: index % 2 === 0 ? "source" : "shaper",
    }),
  );
}

function createState(seed = 1234) {
  return createAuthoritativeState({
    seed,
    contentVersion: "m03.fixture",
    contentHash: "fixture-content-v1",
  });
}

function zoneCount(deck: DeckState): number {
  return (
    deck.zones.draw.length +
    deck.zones.hand.length +
    deck.zones.discard.length +
    deck.zones.exhaust.length +
    deck.zones.deployed.length
  );
}

describe("M03 deck and turn foundation", () => {
  it("starts combat deterministically and draws five cards with three Energy", () => {
    const cards = makeCards(10);
    const first = beginPlayerTurn(startCombat(createState(77), cards));
    const replay = beginPlayerTurn(startCombat(createState(77), cards));

    expect(first.combat?.phase).toBe("player");
    expect(first.combat?.turnNumber).toBe(1);
    expect(first.combat?.energy).toBe(3);
    expect(first.combat?.deck.zones.hand).toHaveLength(5);
    expect(first.combat?.deck.zones.draw).toHaveLength(5);
    expect(hashAuthoritativeState(replay)).toBe(hashAuthoritativeState(first));
    if (first.combat === null) {
      throw new Error("Expected active combat.");
    }
    assertCardConservation(first.combat.deck);
    expect(zoneCount(first.combat.deck)).toBe(10);
  });

  it("reshuffles discard into draw and continues the next turn draw", () => {
    let state = beginPlayerTurn(startCombat(createState(5), makeCards(6)));
    state = endPlayerTurn(state);

    expect(state.combat?.deck.zones.draw).toHaveLength(1);
    expect(state.combat?.deck.zones.discard).toHaveLength(5);

    state = beginPlayerTurn(state);

    expect(state.combat?.turnNumber).toBe(2);
    expect(state.combat?.deck.zones.hand).toHaveLength(5);
    expect(state.combat?.deck.zones.draw).toHaveLength(1);
    expect(state.combat?.deck.zones.discard).toHaveLength(0);
    if (state.combat === null) {
      throw new Error("Expected active combat.");
    }
    assertCardConservation(state.combat.deck);
    expect(zoneCount(state.combat.deck)).toBe(6);
  });

  it("stops cleanly when both draw and discard are empty", () => {
    const deck = createDeckState([]);
    const rng = createGameplayRngState(1);
    const result = drawCards(deck, rng, 5, 10);

    expect(result.drawn).toBe(0);
    expect(result.toHand).toStrictEqual([]);
    expect(result.overflowToDiscard).toStrictEqual([]);
    expect(result.reshuffles).toBe(0);
    assertCardConservation(result.deck);
  });

  it("sends hand-cap overflow directly to discard", () => {
    const cards = makeCards(12);
    const deck = createDeckState(cards);
    const rng = createGameplayRngState(12);
    const first = drawCards(deck, rng, 9, 10);
    const second = drawCards(first.deck, first.rng, 3, 10);

    expect(second.deck.zones.hand).toHaveLength(10);
    expect(second.overflowToDiscard).toHaveLength(2);
    expect(second.deck.zones.discard).toStrictEqual(second.overflowToDiscard);
    expect(second.deck.zones.draw).toHaveLength(0);
    assertCardConservation(second.deck);
    expect(zoneCount(second.deck)).toBe(12);
  });

  it("rejects illegal Energy costs without mutating state", () => {
    let state = beginPlayerTurn(startCombat(createState(), makeCards(10)));
    state = payEnergyCost(state, 2);
    expect(state.combat?.energy).toBe(1);

    const hashBeforeRejectedCost = hashAuthoritativeState(state);
    expect(() => payEnergyCost(state, 2)).toThrow(/Insufficient Energy/);
    expect(() => payEnergyCost(state, -1)).toThrow(/nonnegative safe integer/);
    expect(() => payEnergyCost(state, 1.5)).toThrow(/nonnegative safe integer/);
    expect(hashAuthoritativeState(state)).toBe(hashBeforeRejectedCost);
  });

  it("moves the entire ordinary hand to discard at M03 turn end", () => {
    let state = beginPlayerTurn(startCombat(createState(), makeCards(10)));
    const hand = state.combat?.deck.zones.hand ?? [];
    state = endPlayerTurn(state);

    expect(state.combat?.phase).toBe("enemy");
    expect(state.combat?.energy).toBe(0);
    expect(state.combat?.deck.zones.hand).toStrictEqual([]);
    expect(state.combat?.deck.zones.discard).toStrictEqual(hand);
    if (state.combat === null) {
      throw new Error("Expected active combat.");
    }
    assertCardConservation(state.combat.deck);
  });

  it("rejects duplicate card instance IDs before a combat can start", () => {
    const card = makeCards(1)[0];
    expect(() => createDeckState([card, card])).toThrow(/Duplicate card instance ID/);
  });
});
