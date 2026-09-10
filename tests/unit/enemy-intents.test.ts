import { describe, expect, it } from "vitest";
import {
  beginPlayerTurn,
  createAuthoritativeState,
  createCardInstance,
  createCardInstanceId,
  endPlayerTurn,
  executeEnemyPhase,
  initializeCombatActors,
  initializeEnemyControllers,
  projectSelectedEnemyIntents,
  setFrontCharacter,
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

const claimsRegistry: EnemyBehaviorRegistry = {
  "fixture.claims_adjuster": {
    id: "fixture.claims_adjuster",
    moves: [
      {
        id: "stamp",
        label: "Stamp",
        target: { kind: "front" },
        effects: [{ op: "damage", amount: 7, hits: 1 }],
      },
      {
        id: "paperwork",
        label: "Paperwork",
        target: { kind: "self" },
        effects: [{ op: "block", amount: 6 }],
      },
      {
        id: "stamp_harder",
        label: "Stamp Harder",
        target: { kind: "front" },
        effects: [{ op: "damage", amount: 10, hits: 1 }],
      },
    ],
    ai: {
      kind: "cycle",
      moveIds: ["stamp", "paperwork", "stamp_harder"],
      startIndex: 0,
    },
  },
};

function setupSingleEnemy(
  registry: EnemyBehaviorRegistry,
  definitionId: string,
  enemyActorId = "enemy",
): AuthoritativeState {
  let state = startCombat(
    createAuthoritativeState({
      seed: 505,
      contentVersion: "m05.fixture",
      contentHash: "fixture-content-v1",
    }),
    cards(),
  );
  state = initializeCombatActors(state, {
    playerCharacters: [
      { actorId: "source", maxHp: 44 },
      { actorId: "shaper", maxHp: 36 },
    ],
    enemies: [{ actorId: enemyActorId, maxHp: 100 }],
    frontCharacterId: "source",
  });
  return initializeEnemyControllers(state, registry, [
    { actorId: enemyActorId, definitionId },
  ]);
}

function runEnemyPhase(
  state: AuthoritativeState,
  registry: EnemyBehaviorRegistry,
) {
  state = beginPlayerTurn(state);
  state = endPlayerTurn(state);
  return executeEnemyPhase(state, registry);
}

describe("M05 enemy move cycles and fixed intents", () => {
  it("reveals the first intent before the player acts", () => {
    const state = setupSingleEnemy(
      claimsRegistry,
      "fixture.claims_adjuster",
      "claims-adjuster",
    );
    expect(state.combat?.phase).toBe("setup");
    expect(projectSelectedEnemyIntents(state).map((intent) => intent.moveId)).toStrictEqual([
      "stamp",
    ]);
  });

  it("executes the Claims Adjuster three-move cycle in authored order and repeats", () => {
    let state = setupSingleEnemy(
      claimsRegistry,
      "fixture.claims_adjuster",
      "claims-adjuster",
    );

    let phase = runEnemyPhase(state, claimsRegistry);
    state = phase.state;
    expect(phase.executions.map((entry) => entry.moveId)).toStrictEqual(["stamp"]);
    expect(actor(state, "source").hp).toBe(37);
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("paperwork");

    phase = runEnemyPhase(state, claimsRegistry);
    state = phase.state;
    expect(phase.executions.map((entry) => entry.moveId)).toStrictEqual(["paperwork"]);
    expect(actor(state, "claims-adjuster").block).toBe(6);
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("stamp_harder");

    state = beginPlayerTurn(state);
    expect(actor(state, "claims-adjuster").block).toBe(6);
    state = endPlayerTurn(state);
    expect(actor(state, "claims-adjuster").block).toBe(0);
    phase = executeEnemyPhase(state, claimsRegistry);
    state = phase.state;
    expect(phase.executions.map((entry) => entry.moveId)).toStrictEqual(["stamp_harder"]);
    expect(actor(state, "source").hp).toBe(27);
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("stamp");
  });

  it("keeps a Locked target fixed after formation changes", () => {
    const registry: EnemyBehaviorRegistry = {
      "fixture.foreman": {
        id: "fixture.foreman",
        moves: [
          {
            id: "named_claim",
            label: "Named in the Claim",
            target: { kind: "locked", actorId: "source" },
            effects: [{ op: "damage", amount: 14, hits: 1 }],
          },
        ],
        ai: { kind: "cycle", moveIds: ["named_claim"], startIndex: 0 },
      },
    };
    let state = setupSingleEnemy(registry, "fixture.foreman", "foreman");
    expect(projectSelectedEnemyIntents(state)[0]?.targetActorIds).toStrictEqual(["source"]);

    state = beginPlayerTurn(state);
    state = setFrontCharacter(state, "shaper");
    expect(projectSelectedEnemyIntents(state)[0]?.targetActorIds).toStrictEqual(["source"]);
    state = endPlayerTurn(state);
    const phase = executeEnemyPhase(state, registry);

    expect(actor(phase.state, "source").hp).toBe(30);
    expect(actor(phase.state, "shaper").hp).toBe(36);
  });

  it("keeps Front dynamic while keeping the selected move itself fixed", () => {
    const registry: EnemyBehaviorRegistry = {
      "fixture.front": {
        id: "fixture.front",
        moves: [
          {
            id: "hit_front",
            label: "Hit Front",
            target: { kind: "front" },
            effects: [{ op: "damage", amount: 8, hits: 1 }],
          },
        ],
        ai: { kind: "cycle", moveIds: ["hit_front"], startIndex: 0 },
      },
    };
    let state = setupSingleEnemy(registry, "fixture.front");
    expect(projectSelectedEnemyIntents(state)[0]?.targetActorIds).toStrictEqual(["source"]);
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("hit_front");

    state = beginPlayerTurn(state);
    state = setFrontCharacter(state, "shaper");
    expect(projectSelectedEnemyIntents(state)[0]?.targetActorIds).toStrictEqual(["shaper"]);
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("hit_front");
    state = endPlayerTurn(state);
    const phase = executeEnemyPhase(state, registry);
    expect(actor(phase.state, "source").hp).toBe(44);
    expect(actor(phase.state, "shaper").hp).toBe(28);
  });

  it("does not let a definition or phase change rewrite an already revealed move", () => {
    const revealedRegistry: EnemyBehaviorRegistry = {
      "fixture.phase": {
        id: "fixture.phase",
        moves: [
          {
            id: "same_move",
            label: "Before Phase Change",
            target: { kind: "front" },
            effects: [{ op: "damage", amount: 5, hits: 1 }],
          },
        ],
        ai: { kind: "cycle", moveIds: ["same_move"], startIndex: 0 },
      },
    };
    const changedRegistry: EnemyBehaviorRegistry = {
      "fixture.phase": {
        id: "fixture.phase",
        moves: [
          {
            id: "same_move",
            label: "After Phase Change",
            target: { kind: "front" },
            effects: [{ op: "damage", amount: 19, hits: 1 }],
          },
        ],
        ai: { kind: "cycle", moveIds: ["same_move"], startIndex: 0 },
      },
    };

    let state = setupSingleEnemy(revealedRegistry, "fixture.phase");
    expect(projectSelectedEnemyIntents(state)[0]?.effects[0]).toMatchObject({ amount: 5 });
    state = beginPlayerTurn(state);
    state = endPlayerTurn(state);
    const phase = executeEnemyPhase(state, changedRegistry);

    expect(actor(phase.state, "source").hp).toBe(39);
    expect(projectSelectedEnemyIntents(phase.state)[0]?.effects[0]).toMatchObject({ amount: 19 });
  });

  it("executes living enemies in explicit displayed order", () => {
    const registry: EnemyBehaviorRegistry = {
      "fixture.a": {
        id: "fixture.a",
        moves: [
          { id: "guard_a", label: "Guard A", target: { kind: "self" }, effects: [{ op: "block", amount: 1 }] },
        ],
        ai: { kind: "cycle", moveIds: ["guard_a"], startIndex: 0 },
      },
      "fixture.b": {
        id: "fixture.b",
        moves: [
          { id: "guard_b", label: "Guard B", target: { kind: "self" }, effects: [{ op: "block", amount: 2 }] },
        ],
        ai: { kind: "cycle", moveIds: ["guard_b"], startIndex: 0 },
      },
    };
    let state = startCombat(
      createAuthoritativeState({ seed: 6, contentVersion: "m05.fixture", contentHash: "fixture" }),
      cards(),
    );
    state = initializeCombatActors(state, {
      playerCharacters: [
        { actorId: "source", maxHp: 44 },
        { actorId: "shaper", maxHp: 36 },
      ],
      enemies: [
        { actorId: "enemy-a", maxHp: 10 },
        { actorId: "enemy-b", maxHp: 10 },
      ],
      frontCharacterId: "source",
    });
    state = initializeEnemyControllers(state, registry, [
      { actorId: "enemy-b", definitionId: "fixture.b" },
      { actorId: "enemy-a", definitionId: "fixture.a" },
    ]);
    state = beginPlayerTurn(state);
    state = endPlayerTurn(state);
    const phase = executeEnemyPhase(state, registry);

    expect(phase.executions.map((entry) => entry.enemyActorId)).toStrictEqual([
      "enemy-b",
      "enemy-a",
    ]);
    expect(actor(phase.state, "enemy-b").block).toBe(2);
    expect(actor(phase.state, "enemy-a").block).toBe(1);
  });

  it("supports an authored opening move before a repeating cycle", () => {
    const registry: EnemyBehaviorRegistry = {
      "fixture.opening": {
        id: "fixture.opening",
        moves: [
          { id: "open", label: "Opening", target: { kind: "self" }, effects: [{ op: "block", amount: 1 }] },
          { id: "a", label: "A", target: { kind: "self" }, effects: [{ op: "block", amount: 1 }] },
          { id: "b", label: "B", target: { kind: "self" }, effects: [{ op: "block", amount: 1 }] },
        ],
        ai: {
          kind: "opening_cycle",
          openingMoveId: "open",
          moveIds: ["a", "b"],
          startIndex: 1,
        },
      },
    };
    let state = setupSingleEnemy(registry, "fixture.opening");
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("open");
    state = runEnemyPhase(state, registry).state;
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("b");
    state = runEnemyPhase(state, registry).state;
    expect(projectSelectedEnemyIntents(state)[0]?.moveId).toBe("a");
  });

  it("requires the enemy phase to execute before the next player turn", () => {
    let state = setupSingleEnemy(claimsRegistry, "fixture.claims_adjuster", "claims-adjuster");
    state = beginPlayerTurn(state);
    state = endPlayerTurn(state);
    expect(() => beginPlayerTurn(state)).toThrow(/before the enemy phase resolves/);
    state = executeEnemyPhase(state, claimsRegistry).state;
    expect(() => beginPlayerTurn(state)).not.toThrow();
  });
});
