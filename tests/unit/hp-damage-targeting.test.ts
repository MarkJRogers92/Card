import { describe, expect, it } from "vitest";
import {
  applyDirectDamage,
  applyDirectDamageToRule,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createDirectDamagePacket,
  endPlayerTurn,
  gainBlock,
  hashAuthoritativeState,
  initializeCombatActors,
  paySelfHpCost,
  setFrontCharacter,
  startCombat,
  type AuthoritativeState,
  type CardInstance,
} from "../../src/engine";

function makeCards(count = 10): CardInstance[] {
  return Array.from({ length: count }, (_, index) =>
    createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId: `fixture.card.${index + 1}`,
      ownerCharacterId: index % 2 === 0 ? "source" : "shaper",
    }),
  );
}

function setupCombat(): AuthoritativeState {
  const state = startCombat(
    createAuthoritativeState({
      seed: 404,
      contentVersion: "m04.fixture",
      contentHash: "fixture-content-v1",
    }),
    makeCards(),
  );
  return initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 44 },
      { actorId: "shaper", maxHp: 36 },
    ],
    enemies: [{ actorId: "claims-adjuster", maxHp: 30 }],
    frontCharacterId: "source",
  });
}

function actor(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) {
    throw new Error(`Missing actor ${actorId}.`);
  }
  return found;
}

describe("M04 HP, Block, damage, and targeting", () => {
  it("resolves Front at hit time so formation changes redirect damage", () => {
    let state = setupCombat();
    const packet = createDirectDamagePacket(7);
    state = applyDirectDamageToRule(state, { kind: "front" }, packet).state;
    expect(actor(state, "source").hp).toBe(37);
    expect(actor(state, "shaper").hp).toBe(36);

    state = setFrontCharacter(state, "shaper");
    state = applyDirectDamageToRule(state, { kind: "front" }, packet).state;
    expect(actor(state, "source").hp).toBe(37);
    expect(actor(state, "shaper").hp).toBe(29);
  });

  it("targets Reserve independently of Front", () => {
    const result = applyDirectDamageToRule(
      setupCombat(),
      { kind: "reserve" },
      createDirectDamagePacket(5),
    );
    expect(result.targets).toStrictEqual(["shaper"]);
    expect(actor(result.state, "source").hp).toBe(44);
    expect(actor(result.state, "shaper").hp).toBe(31);
  });

  it("keeps a Locked target after formation changes", () => {
    let state = setFrontCharacter(setupCombat(), "shaper");
    const result = applyDirectDamageToRule(
      state,
      { kind: "locked", actorId: "source" },
      createDirectDamagePacket(6),
    );
    state = result.state;
    expect(result.targets).toStrictEqual(["source"]);
    expect(actor(state, "source").hp).toBe(38);
    expect(actor(state, "shaper").hp).toBe(36);
  });

  it("resolves Both as separate hits with each character's own Block", () => {
    let state = gainBlock(setupCombat(), "source", 3);
    state = gainBlock(state, "shaper", 1);
    const result = applyDirectDamageToRule(
      state,
      { kind: "both" },
      createDirectDamagePacket(5),
    );

    expect(result.targets).toStrictEqual(["source", "shaper"]);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toMatchObject({ blockedDamage: 3, hpLost: 2 });
    expect(result.results[1]).toMatchObject({ blockedDamage: 1, hpLost: 4 });
    expect(actor(result.state, "source")).toMatchObject({ hp: 42, block: 0 });
    expect(actor(result.state, "shaper")).toMatchObject({ hp: 32, block: 0 });
  });

  it("ends combat immediately when either player character reaches zero HP", () => {
    const result = applyDirectDamageToRule(
      setupCombat(),
      { kind: "front" },
      createDirectDamagePacket(100),
    );
    expect(actor(result.state, "source").hp).toBe(0);
    expect(result.state.combat?.outcome).toBe("defeat");
    expect(result.state.combat?.phase).toBe("ended");
    expect(() => beginPlayerTurn(result.state)).toThrow(/already defeat/);
  });

  it("tracks enemy death and victory without changing target-rule semantics", () => {
    const result = applyDirectDamage(
      setupCombat(),
      "claims-adjuster",
      createDirectDamagePacket(30),
    );
    expect(actor(result.state, "claims-adjuster").hp).toBe(0);
    expect(result.state.combat?.outcome).toBe("victory");
    expect(result.state.combat?.phase).toBe("ended");
  });

  it("requires self-HP costs to leave at least one HP and bypasses Block", () => {
    let state = gainBlock(setupCombat(), "source", 12);
    state = paySelfHpCost(state, "source", 43);
    expect(actor(state, "source")).toMatchObject({ hp: 1, block: 12 });

    const hashBefore = hashAuthoritativeState(state);
    expect(() => paySelfHpCost(state, "source", 1)).toThrow(/at least 1 HP must remain/);
    expect(hashAuthoritativeState(state)).toBe(hashBefore);
  });

  it("expires player Block at player-turn start and enemy Block at enemy-phase start", () => {
    let state = gainBlock(setupCombat(), "source", 8);
    state = gainBlock(state, "shaper", 4);
    state = gainBlock(state, "claims-adjuster", 9);
    state = beginPlayerTurn(state);
    expect(actor(state, "source").block).toBe(0);
    expect(actor(state, "shaper").block).toBe(0);
    expect(actor(state, "claims-adjuster").block).toBe(9);

    state = endPlayerTurn(state);
    expect(actor(state, "claims-adjuster").block).toBe(0);
  });

  it("rejects invalid locked targets and damage amounts without mutation", () => {
    const state = setupCombat();
    const before = hashAuthoritativeState(state);
    expect(() =>
      applyDirectDamageToRule(
        state,
        { kind: "locked", actorId: "claims-adjuster" },
        createDirectDamagePacket(1),
      ),
    ).toThrow(/not a player character/);
    expect(() => createDirectDamagePacket(-1)).toThrow(/nonnegative safe integer/);
    expect(hashAuthoritativeState(state)).toBe(before);
  });
});
