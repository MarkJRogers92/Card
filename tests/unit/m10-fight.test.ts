import { describe, expect, it } from "vitest";
import {
  M10_CLAIMS_ADJUSTER_ID,
  M10_MORROW_ID,
  M10_SWITCH_ID,
  applyM10Command,
  createM10Fight,
  getM10Hand,
  hashM10Fight,
  replayM10Commands,
  type AuthoritativeState,
  type M10CardView,
  type M10Command,
} from "../../src/engine";

function findSeedWithCard(definitionId: string): {
  readonly state: AuthoritativeState;
  readonly card: M10CardView;
} {
  for (let seed = 0; seed < 500; seed += 1) {
    const state = createM10Fight(seed);
    const card = getM10Hand(state).find(
      (candidate) => candidate.definitionId === definitionId,
    );
    if (card !== undefined) return { state, card };
  }
  throw new Error(`Could not find ${definitionId} in a seeded opening hand.`);
}

function actor(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) throw new Error(`Missing actor ${actorId}.`);
  return found;
}

describe("M10 playable Claims Adjuster checkpoint", () => {
  it("starts a real player turn with the starter deck and visible enemy intent", () => {
    const state = createM10Fight();
    expect(state.combat).toMatchObject({
      phase: "player",
      outcome: "active",
      turnNumber: 1,
      energy: 3,
      frontCharacterId: M10_MORROW_ID,
    });
    expect(state.combat?.deck.zones.hand).toHaveLength(5);
    expect(Object.keys(state.combat?.deck.instances ?? {})).toHaveLength(10);
    expect(actor(state, M10_MORROW_ID)).toMatchObject({ hp: 44, maxHp: 44 });
    expect(actor(state, M10_SWITCH_ID)).toMatchObject({ hp: 36, maxHp: 36 });
    expect(actor(state, M10_CLAIMS_ADJUSTER_ID)).toMatchObject({ hp: 30, maxHp: 30 });
    expect(state.combat?.selectedEnemyIntents[0]?.moveId).toBe("stamp");
  });

  it("plays a starter Lead card through damage, Imprint, passive, and card-zone rules", () => {
    const seeded = findSeedWithCard("starter.repossess");
    const beforeHand = seeded.state.combat?.deck.zones.hand.length ?? 0;
    const result = applyM10Command(seeded.state, {
      kind: "play_card",
      instanceId: seeded.card.instanceId,
      targetActorId: M10_CLAIMS_ADJUSTER_ID,
    });

    expect(actor(result.state, M10_CLAIMS_ADJUSTER_ID).hp).toBe(24);
    expect(actor(result.state, M10_MORROW_ID).block).toBe(2);
    expect(result.state.combat).toMatchObject({
      energy: 2,
      imprint: {
        ownerCharacterId: M10_MORROW_ID,
        ingredient: { kind: "material", id: "gore" },
        potency: 1,
      },
    });
    expect(result.state.combat?.deck.zones.hand).toHaveLength(beforeHand - 1);
    expect(result.state.combat?.deck.zones.discard).toContain(seeded.card.instanceId);
  });

  it("runs Change of Shift through the real free-swap and Shared Warranty hooks", () => {
    const seeded = findSeedWithCard("starter.change_of_shift");
    const result = applyM10Command(seeded.state, {
      kind: "play_card",
      instanceId: seeded.card.instanceId,
      targetActorId: M10_CLAIMS_ADJUSTER_ID,
    });

    expect(result.state.combat).toMatchObject({
      frontCharacterId: M10_SWITCH_ID,
      energy: 3,
      manualSwapsUsedThisTurn: 0,
    });
    expect(actor(result.state, M10_SWITCH_ID).block).toBe(3);
    expect(result.state.combat?.deck.zones.exhaust).toContain(seeded.card.instanceId);
  });

  it("can win headlessly and replay the exact UI command surface to the same hash", () => {
    let state = createM10Fight();
    const commands: M10Command[] = [];
    let safety = 0;

    while (state.combat?.outcome === "active" && safety < 40) {
      safety += 1;
      const energy = state.combat.energy;
      const damageCard = getM10Hand(state).find(
        (card) => card.isDamageCard && card.energyCost <= energy,
      );
      const command: M10Command =
        damageCard === undefined
          ? { kind: "end_turn" }
          : {
              kind: "play_card",
              instanceId: damageCard.instanceId,
              targetActorId: M10_CLAIMS_ADJUSTER_ID,
            };
      commands.push(command);
      state = applyM10Command(state, command).state;
    }

    expect(safety).toBeLessThan(40);
    expect(state.combat?.outcome).toBe("victory");
    const replayed = replayM10Commands(commands);
    expect(replayed.combat?.outcome).toBe("victory");
    expect(hashM10Fight(replayed)).toBe(hashM10Fight(state));
  });
});
