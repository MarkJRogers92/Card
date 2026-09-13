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
  swapCharacters,
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

/**
 * The Act 1 run uses Morrow and Switch, so a Locked move authored with the
 * "source" marker has to name one of them. The M17 fixture above uses
 * characters literally named source/shaper, which is why it never exposed the
 * unresolved placeholder.
 */
function setupDuo(
  enemies: readonly { actorId: string; maxHp: number; block?: number; definitionId: string }[],
  frontCharacterId: "morrow" | "switch" = "morrow",
) {
  const deck = Array.from({ length: 10 }, (_, index) =>
    createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId: `fixture.card.${index + 1}`,
      ownerCharacterId: index % 2 === 0 ? "morrow" : "switch",
    }),
  );
  let state = startCombat(
    createAuthoritativeState({ seed: 17, contentHash: "m17-fixture" }),
    deck,
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "morrow", maxHp: 100 },
      { actorId: "switch", maxHp: 100 },
    ],
    enemies: enemies.map(({ actorId, maxHp, block }) => ({ actorId, maxHp, block })),
    frontCharacterId,
  });
  return initializeEnemyControllers(
    state,
    INITIAL_ENEMY_REGISTRY,
    enemies.map(({ actorId, definitionId }) => ({ actorId, definitionId })),
  );
}

function selectedIntent(state: ReturnType<typeof setup>, enemyActorId: string) {
  const intent = projectSelectedEnemyIntents(state).find(
    (candidate) => candidate.enemyActorId === enemyActorId,
  );
  if (intent === undefined) throw new Error(`No selected intent for ${enemyActorId}.`);
  return intent;
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

  it("locks the Repo Foreman's Named in the Claim to the Front character at reveal and never redirects it", () => {
    const elite = [{ actorId: "foreman", maxHp: 78, block: 8, definitionId: "enemy.repo_foreman" }];
    let state = setupDuo(elite, "morrow");
    expect(selectedIntent(state, "foreman").moveId).toBe("repossession");

    // The next intent is selected at the end of the first enemy phase.
    state = resolvePhase(state).state;
    const locked = selectedIntent(state, "foreman");
    expect(locked.moveId).toBe("named_claim");
    expect(locked.target).toStrictEqual({ kind: "locked", actorId: "morrow" });
    expect(locked.targetActorIds).toStrictEqual(["morrow"]);

    // Swapping during the player turn moves the named character to Reserve but
    // does not redirect the locked attack.
    const swapped = swapCharacters(beginPlayerTurn(state), "manual").state;
    expect(swapped.combat?.frontCharacterId).toBe("switch");
    expect(selectedIntent(swapped, "foreman").targetActorIds).toStrictEqual(["morrow"]);

    const before = swapped.combat?.actors;
    const resolved = executeEnemyPhase(endPlayerTurn(swapped), INITIAL_ENEMY_REGISTRY);
    const after = resolved.state.combat?.actors;
    expect(resolved.executions[0]?.moveId).toBe("named_claim");
    expect(after?.morrow?.hp).toBe((before?.morrow?.hp ?? 0) - 14);
    expect(after?.switch?.hp).toBe(before?.switch?.hp);
  });

  it("locks the Head of Recovery's Named in the Claim the same way", () => {
    const boss = [{ actorId: "head", maxHp: 150, definitionId: "enemy.head_of_recovery" }];
    let state = setupDuo(boss, "switch");

    state = resolvePhase(state).state;
    state = resolvePhase(state).state;
    const locked = selectedIntent(state, "head");
    expect(locked.moveId).toBe("named_in_claim");
    expect(locked.target).toStrictEqual({ kind: "locked", actorId: "switch" });

    const swapped = swapCharacters(beginPlayerTurn(state), "manual").state;
    expect(swapped.combat?.frontCharacterId).toBe("morrow");
    const before = swapped.combat?.actors;
    const resolved = executeEnemyPhase(endPlayerTurn(swapped), INITIAL_ENEMY_REGISTRY);
    const after = resolved.state.combat?.actors;
    expect(resolved.executions[0]?.moveId).toBe("named_in_claim");
    expect(after?.switch?.hp).toBe((before?.switch?.hp ?? 0) - 18);
    expect(after?.morrow?.hp).toBe(before?.morrow?.hp);
  });
});
