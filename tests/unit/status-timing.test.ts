import { describe, expect, it } from "vitest";
import {
  applyCombatStatus,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  endPlayerTurn,
  executeEnemyPhase,
  gainBlock,
  initializeCombatActors,
  initializeEnemyControllers,
  projectSelectedEnemyIntents,
  startCombat,
  type AuthoritativeState,
  type CardInstance,
  type EnemyBehaviorRegistry,
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

function actor(state: AuthoritativeState, actorId: string) {
  const found = state.combat?.actors[actorId];
  if (found === undefined) {
    throw new Error(`Missing actor ${actorId}.`);
  }
  return found;
}

function registryWithMove(
  id: string,
  amount: number,
  hits = 1,
): EnemyBehaviorRegistry {
  return {
    [id]: {
      id,
      moves: [
        {
          id: "attack",
          label: "Attack",
          target: { kind: "front" },
          effects: [{ op: "damage", amount, hits }],
        },
      ],
      ai: { kind: "cycle", moveIds: ["attack"], startIndex: 0 },
    },
  };
}

function blockOnlyRegistry(id = "fixture.guard"): EnemyBehaviorRegistry {
  return {
    [id]: {
      id,
      moves: [
        {
          id: "guard",
          label: "Guard",
          target: { kind: "self" },
          effects: [{ op: "block", amount: 1 }],
        },
      ],
      ai: { kind: "cycle", moveIds: ["guard"], startIndex: 0 },
    },
  };
}

function setup(
  registry: EnemyBehaviorRegistry,
  definitionId: string,
  enemyHp = 100,
  playerHp = 200,
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 606,
      contentVersion: "m06.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: playerHp },
      { actorId: "shaper", maxHp: playerHp },
    ],
    enemies: [{ actorId: "enemy", maxHp: enemyHp }],
    frontCharacterId: "source",
  });
  return initializeEnemyControllers(state, registry, [
    { actorId: "enemy", definitionId },
  ]);
}

function enterEnemyPhase(state: AuthoritativeState): AuthoritativeState {
  return endPlayerTurn(beginPlayerTurn(state));
}

describe("M06 statuses and phase timing", () => {
  it("ticks Poison before enemy action, bypasses Block, and can end combat", () => {
    const registry = registryWithMove("fixture.poison", 99);
    let state = setup(registry, "fixture.poison", 5);
    state = applyCombatStatus(state, "enemy", "poison", 5);
    state = enterEnemyPhase(state);
    state = gainBlock(state, "enemy", 50);
    const phase = executeEnemyPhase(state, registry);

    expect(phase.poisonTicks).toHaveLength(1);
    expect(phase.poisonTicks[0]).toMatchObject({ amount: 5, hpLost: 5, statusAfter: 4 });
    expect(actor(phase.state, "enemy")).toMatchObject({ hp: 0, block: 50 });
    expect(actor(phase.state, "source").hp).toBe(200);
    expect(phase.state.combat?.outcome).toBe("victory");
    expect(phase.executions).toStrictEqual([]);
  });

  it("ticks Bleed once after a multi-hit attack move, not once per hit", () => {
    const registry = registryWithMove("fixture.bleed", 1, 3);
    let state = setup(registry, "fixture.bleed", 20);
    state = applyCombatStatus(state, "enemy", "bleed", 3);
    const phase = executeEnemyPhase(enterEnemyPhase(state), registry);

    expect(actor(phase.state, "source").hp).toBe(197);
    expect(actor(phase.state, "enemy").hp).toBe(17);
    expect(actor(phase.state, "enemy").statuses.bleed).toBe(2);
    expect(phase.executions[0]?.damageHitsResolved).toBe(3);
    expect(phase.bleedTicks).toHaveLength(1);
    expect(phase.bleedTicks[0]).toMatchObject({ amount: 3, hpLost: 3, statusAfter: 2 });
  });

  it("decrements Weak and Exposed at the afflicted side's turn end", () => {
    const registry = blockOnlyRegistry();
    let state = setup(registry, "fixture.guard");
    state = applyCombatStatus(state, "source", "weak", 2);
    state = applyCombatStatus(state, "source", "exposed", 2);
    state = applyCombatStatus(state, "enemy", "weak", 2);
    state = applyCombatStatus(state, "enemy", "exposed", 2);

    state = enterEnemyPhase(state);
    expect(actor(state, "source").statuses).toMatchObject({ weak: 1, exposed: 1 });
    expect(actor(state, "enemy").statuses).toMatchObject({ weak: 2, exposed: 2 });

    state = executeEnemyPhase(state, registry).state;
    expect(actor(state, "enemy").statuses).toMatchObject({ weak: 1, exposed: 1 });
    expect(actor(state, "source").statuses).toMatchObject({ weak: 1, exposed: 1 });
  });

  it("applies Strength, Weak, and Exposed in one calculation with one final floor", () => {
    const registry = registryWithMove("fixture.rounding", 7);
    let state = setup(registry, "fixture.rounding", 100, 44);
    state = applyCombatStatus(state, "enemy", "strength", 2);
    state = applyCombatStatus(state, "enemy", "weak", 1);
    state = applyCombatStatus(state, "source", "exposed", 2);
    state = enterEnemyPhase(state);

    const damageProjection = projectSelectedEnemyIntents(state)[0]?.effects[0];
    if (damageProjection?.op !== "damage") {
      throw new Error("Expected projected damage.");
    }
    expect(damageProjection.projectedDamageByTarget).toStrictEqual([
      { targetActorId: "source", amount: 10 },
    ]);

    state = executeEnemyPhase(state, registry).state;
    expect(actor(state, "source").hp).toBe(34);
    expect(actor(state, "enemy").statuses.strength).toBe(2);
    expect(actor(state, "enemy").statuses.weak).toBe(0);
  });

  it("forecasts the phase-7 escalation before execution and stacks it every later phase", () => {
    const registry = registryWithMove("fixture.escalation", 1);
    let state = setup(registry, "fixture.escalation", 100, 1_000);

    for (let phaseNumber = 1; phaseNumber <= 6; phaseNumber += 1) {
      state = enterEnemyPhase(state);
      state = executeEnemyPhase(state, registry).state;
    }

    expect(state.combat?.enemyPhaseNumber).toBe(6);
    expect(actor(state, "enemy").statuses.strength).toBe(0);
    let projection = projectSelectedEnemyIntents(state)[0]?.effects[0];
    if (projection?.op !== "damage") {
      throw new Error("Expected phase-7 damage projection.");
    }
    expect(projection.projectedDamageByTarget[0]?.amount).toBe(3);

    state = enterEnemyPhase(state);
    expect(state.combat?.enemyPhaseNumber).toBe(7);
    projection = projectSelectedEnemyIntents(state)[0]?.effects[0];
    if (projection?.op !== "damage") {
      throw new Error("Expected current phase-7 damage projection.");
    }
    expect(projection.projectedDamageByTarget[0]?.amount).toBe(3);

    const hpBeforeSeven = actor(state, "source").hp;
    const phaseSeven = executeEnemyPhase(state, registry);
    state = phaseSeven.state;
    expect(phaseSeven.escalationActorIds).toStrictEqual(["enemy"]);
    expect(actor(state, "source").hp).toBe(hpBeforeSeven - 3);
    expect(actor(state, "enemy").statuses.strength).toBe(2);

    projection = projectSelectedEnemyIntents(state)[0]?.effects[0];
    if (projection?.op !== "damage") {
      throw new Error("Expected phase-8 damage projection.");
    }
    expect(projection.projectedDamageByTarget[0]?.amount).toBe(5);
  });
});
