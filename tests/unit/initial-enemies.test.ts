import { describe, expect, it } from "vitest";
import {
  ACT_1_FIRST_ENCOUNTERS,
  ACT_1_ORDINARY_ENCOUNTERS,
  INITIAL_ENEMY_REGISTRY,
  applyDirectDamage,
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  createDirectDamagePacket,
  endPlayerTurn,
  executeEnemyPhase,
  initializeCombatActors,
  initializeEnemyControllers,
  projectSelectedEnemyIntents,
  startCombat,
} from "../../src/engine";

function cards() {
  return Array.from({ length: 10 }, (_, index) => createCardInstance({
    instanceId: createCardInstanceId(index + 1), definitionId: `fixture.card.${index + 1}`,
    ownerCharacterId: index % 2 === 0 ? "source" : "shaper",
  }));
}

function setup(enemies: readonly { actorId: string; maxHp: number; block?: number; definitionId: string }[]) {
  let state = startCombat(createAuthoritativeState({ seed: 17, contentHash: "m17-fixture" }), cards());
  state = initializeCombatActors(state, {
    playerCharacters: [{ actorId: "source", maxHp: 100 }, { actorId: "shaper", maxHp: 100 }],
    enemies: enemies.map(({ actorId, maxHp, block }) => ({ actorId, maxHp, block })), frontCharacterId: "source",
  });
  return initializeEnemyControllers(state, INITIAL_ENEMY_REGISTRY, enemies.map(({ actorId, definitionId }) => ({ actorId, definitionId })));
}

function resolvePhase(state: ReturnType<typeof setup>) {
  return executeEnemyPhase(endPlayerTurn(beginPlayerTurn(state)), INITIAL_ENEMY_REGISTRY);
}

describe("M17 initial enemies and encounter formations", () => {
  it("authors every initial enemy and the Head of Recovery with its complete move trace", () => {
    expect(Object.keys(INITIAL_ENEMY_REGISTRY).sort()).toStrictEqual([
      "enemy.claims_adjuster", "enemy.compliance_slug", "enemy.head_of_recovery", "enemy.repo_foreman", "enemy.taxidermy_drone", "enemy.unpaid_intern",
    ]);
    expect(INITIAL_ENEMY_REGISTRY["enemy.head_of_recovery"].ai.moveIds).toStrictEqual([
      "performance_review", "cross_departmental_issue", "named_in_claim", "budget_cuts",
    ]);
  });

  it("adds the Claims Adjuster's Invoice directly to discard", () => {
    let state = setup([{ actorId: "adjuster", maxHp: 30, definitionId: "enemy.claims_adjuster" }]);
    state = resolvePhase(state).state;
    const phase = resolvePhase(state);
    const discard = phase.state.combat?.deck.zones.discard ?? [];
    expect(discard.some((instanceId) => phase.state.combat?.deck.instances[instanceId]?.definitionId === "junk.invoice")).toBe(true);
  });

  it("gives other living enemies Strength when an Unpaid Intern dies", () => {
    let state = setup([
      { actorId: "intern", maxHp: 20, definitionId: "enemy.unpaid_intern" },
      { actorId: "foreman", maxHp: 78, block: 8, definitionId: "enemy.repo_foreman" },
    ]);
    state = applyDirectDamage(state, "intern", createDirectDamagePacket(20)).state;
    expect(state.combat?.actors.foreman.statuses.strength).toBe(2);
  });

  it("keeps the Head's already revealed intent unchanged, then applies Personal Involvement to future attacks", () => {
    let state = setup([{ actorId: "head", maxHp: 150, definitionId: "enemy.head_of_recovery" }]);
    expect(projectSelectedEnemyIntents(state)[0]?.effects[0]).toMatchObject({ amount: 12 });
    state = applyDirectDamage(state, "head", createDirectDamagePacket(75)).state;
    expect(projectSelectedEnemyIntents(state)[0]?.effects[0]).toMatchObject({ projectedDamageByTarget: [{ amount: 12 }] });
    state = resolvePhase(state).state;
    expect(projectSelectedEnemyIntents(state)[0]?.effects[0]).toMatchObject({ projectedDamageByTarget: [{ amount: 10 }, { amount: 10 }] });
  });

  it("never permits a two-enemy formation as the first Act 1 encounter", () => {
    expect(ACT_1_ORDINARY_ENCOUNTERS).toHaveLength(5);
    expect(ACT_1_FIRST_ENCOUNTERS).not.toHaveLength(0);
    expect(ACT_1_FIRST_ENCOUNTERS.every((formation) => formation.enemyDefinitionIds.length === 1)).toBe(true);
  });
});
