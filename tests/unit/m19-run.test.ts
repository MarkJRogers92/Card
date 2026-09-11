import { describe, expect, it } from "vitest";
import {
  M10_MORROW_ID,
  M10_SWITCH_ID,
  M19_PARTY_MAX_HP,
  M19_NODE_IDS,
  createAct1Combat,
  createM19Run,
  beginRunNode,
  currentRunNode,
  createM10Fight,
} from "../../src/engine";
import { completeRunNode } from "../../src/engine/run";

describe("M19 fixed test act", () => {
  it("creates the fixed seven-node route before any combat begins", () => {
    const state = createM19Run(19);

    expect(M19_NODE_IDS).toEqual([
      "ordinary_1", "rest_1", "ordinary_2", "elite", "rest_2", "ordinary_3", "boss",
    ]);
    expect(currentRunNode(state)).toBe("ordinary_1");
    expect(state.run?.completedNodeIds).toEqual([]);
    expect(state.combat).toBeNull();
  });

  it("starts an Act 1 formation from persistent player HP with fresh combat state", () => {
    const previousCombat = createM10Fight(19).combat;
    const state = createAct1Combat({
      seed: 19,
      formationId: "claims_adjuster",
      playerHp: {
        [M10_MORROW_ID]: 17,
        [M10_SWITCH_ID]: 9,
      },
    });

    expect(state.combat?.actors[M10_MORROW_ID]?.hp).toBe(17);
    expect(state.combat?.actors[M10_SWITCH_ID]?.hp).toBe(9);
    expect(state.combat?.turnNumber).toBe(1);
    expect(state.combat?.deck.zones.hand).toHaveLength(5);
    expect(state.combat?.deck.zones.hand).toEqual(previousCombat?.deck.zones.hand);
    expect(state.combat).not.toBe(previousCombat);
  });

  it("starts the elite Act 1 formation from supplied player HP and fresh encounter state", () => {
    const state = createAct1Combat({
      seed: 31,
      formationId: "repo_foreman",
      playerHp: {
        [M10_MORROW_ID]: 22,
        [M10_SWITCH_ID]: 14,
      },
    });

    expect(state.combat?.outcome).toBe("active");
    expect(state.combat?.actors[M10_MORROW_ID]?.hp).toBe(22);
    expect(state.combat?.actors[M10_SWITCH_ID]?.hp).toBe(14);
    expect(state.combat?.actors.repo_foreman_enemy_1?.hp).toBe(78);
    expect(state.combat?.actors.repo_foreman_enemy_1?.maxHp).toBe(78);
    expect(state.combat?.deck.zones.discard).toHaveLength(0);
    expect(state.combat?.deck.zones.exhaust).toHaveLength(0);
  });

  it("starts the boss Act 1 formation from supplied player HP and fresh encounter state", () => {
    const state = createAct1Combat({
      seed: 41,
      formationId: "head_of_recovery",
      playerHp: {
        [M10_MORROW_ID]: 33,
        [M10_SWITCH_ID]: 16,
      },
    });

    expect(state.combat?.outcome).toBe("active");
    expect(state.combat?.actors[M10_MORROW_ID]?.hp).toBe(33);
    expect(state.combat?.actors[M10_SWITCH_ID]?.hp).toBe(16);
    expect(state.combat?.actors.head_of_recovery_enemy_1?.hp).toBe(150);
    expect(state.combat?.actors.head_of_recovery_enemy_1?.maxHp).toBe(150);
    expect(state.combat?.deck.zones.discard).toHaveLength(0);
    expect(state.combat?.deck.zones.exhaust).toHaveLength(0);
  });

  it("starts the fixed act with maximum party HP", () => {
    const state = createM19Run(23);

    expect(state.run?.partyHp).toEqual(M19_PARTY_MAX_HP);
  });

  it("begins combat using carried party HP from run state", () => {
    const state = createM19Run(23);

    const begun = beginRunNode({
      ...state,
      run: {
        ...state.run!,
        partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 40, [M10_SWITCH_ID]: 25 },
      },
    });

    expect(begun.combat?.actors[M10_MORROW_ID]?.hp).toBe(40);
    expect(begun.combat?.actors[M10_SWITCH_ID]?.hp).toBe(25);
  });

  it("begins the first ordinary node as a fresh combat", () => {
    const state = beginRunNode(createM19Run(23));

    expect(state.run?.currentNodeId).toBe("ordinary_1");
    expect(state.combat?.outcome).toBe("active");
    expect(state.combat?.actors[M10_MORROW_ID]?.hp).toBe(44);
    expect(state.combat?.actors[M10_SWITCH_ID]?.hp).toBe(36);
  });

  it("begins ordinary_2 as compliance_slug combat", () => {
    const state = createM19Run(23);
    const begun = beginRunNode({
      ...state,
      run: {
        ...state.run!,
        currentNodeId: "ordinary_2" as const,
        partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 40, [M10_SWITCH_ID]: 25 },
      },
    });

    expect(begun.combat?.outcome).toBe("active");
    expect(begun.combat?.actors.compliance_slug_enemy_1).toBeDefined();
    expect(begun.combat?.actors[M10_MORROW_ID]?.hp).toBe(40);
    expect(begun.combat?.actors[M10_SWITCH_ID]?.hp).toBe(25);
  });

  it("begins ordinary_3 as adjuster_and_intern combat", () => {
    const state = createM19Run(23);
    const begun = beginRunNode({
      ...state,
      run: {
        ...state.run!,
        currentNodeId: "ordinary_3" as const,
        partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 41, [M10_SWITCH_ID]: 26 },
      },
    });

    expect(begun.combat?.outcome).toBe("active");
    expect(begun.combat?.actors.adjuster_and_intern_enemy_1).toBeDefined();
    expect(begun.combat?.actors[M10_MORROW_ID]?.hp).toBe(41);
    expect(begun.combat?.actors[M10_SWITCH_ID]?.hp).toBe(26);
  });

  it("begins elite as repo_foreman combat", () => {
    const state = createM19Run(23);
    const begun = beginRunNode({
      ...state,
      run: {
        ...state.run!,
        currentNodeId: "elite" as const,
        partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 42, [M10_SWITCH_ID]: 27 },
      },
    });

    expect(begun.combat?.outcome).toBe("active");
    expect(begun.combat?.actors.repo_foreman_enemy_1).toBeDefined();
    expect(begun.combat?.actors[M10_MORROW_ID]?.hp).toBe(42);
    expect(begun.combat?.actors[M10_SWITCH_ID]?.hp).toBe(27);
  });

  it("begins boss as head_of_recovery combat", () => {
    const state = createM19Run(23);
    const begun = beginRunNode({
      ...state,
      run: {
        ...state.run!,
        currentNodeId: "boss" as const,
        partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 43, [M10_SWITCH_ID]: 28 },
      },
    });

    expect(begun.combat?.outcome).toBe("active");
    expect(begun.combat?.actors.head_of_recovery_enemy_1).toBeDefined();
    expect(begun.combat?.actors[M10_MORROW_ID]?.hp).toBe(43);
    expect(begun.combat?.actors[M10_SWITCH_ID]?.hp).toBe(28);
  });

  it("refuses to begin a second combat while one is already active", () => {
    const begun = beginRunNode(createM19Run(23));

    expect(() => beginRunNode(begun)).toThrow(/already active/);
    expect(currentRunNode(begun)).toBe("ordinary_1");
  });

  it("refuses to begin combat once the run has already ended", () => {
    const run = createM19Run(23).run!;

    expect(() => beginRunNode({ ...createM19Run(23), run: { ...run, outcome: "victory" } }))
      .toThrow(/already victory/);
    expect(() => beginRunNode({ ...createM19Run(23), run: { ...run, outcome: "defeat" } }))
      .toThrow(/already defeat/);
  });

  it("refuses to begin a node whose encounter is not implemented yet", () => {
    const state = createM19Run(23);
    const advanced = { ...state, run: { ...state.run!, currentNodeId: "rest_1" as const } };

    expect(() => beginRunNode(advanced)).toThrow(/rest_1 cannot begin combat/);
  });

  it("uses different deterministic combat seeds per node and repeats the same node deterministically", () => {
    const baseRun = createM19Run(23);
    const firstNode = beginRunNode(baseRun);
    const ordinary2 = beginRunNode({
      ...baseRun,
      run: { ...baseRun.run!, currentNodeId: "ordinary_2" as const },
    });
    const ordinary2Again = beginRunNode({
      ...baseRun,
      run: { ...baseRun.run!, currentNodeId: "ordinary_2" as const },
    });

    expect(firstNode.combat).not.toEqual(ordinary2.combat);
    expect(ordinary2.combat).toEqual(ordinary2Again.combat);
  });

  it("clears a won node, records it, and advances to the next route node", () => {
    const begun = beginRunNode(createM19Run(23));
    const resolved = completeRunNode({
      ...begun,
      combat: { ...begun.combat!, outcome: "victory" },
    });

    expect(resolved.combat).toBeNull();
    expect(resolved.run?.outcome).toBe("active");
    expect(resolved.run?.currentNodeId).toBe("rest_1");
    expect(resolved.run?.completedNodeIds).toEqual(["ordinary_1"]);
  });

  it("ends the run in defeat without counting the lost node and drops its combat", () => {
    const begun = beginRunNode(createM19Run(23));
    const resolved = completeRunNode({
      ...begun,
      combat: { ...begun.combat!, outcome: "defeat" },
    });

    expect(resolved.combat).toBeNull();
    expect(resolved.run?.outcome).toBe("defeat");
    expect(resolved.run?.currentNodeId).toBe("ordinary_1");
    expect(resolved.run?.completedNodeIds).toEqual([]);
  });

  it("ends the run in victory once the final boss node is won", () => {
    const begun = beginRunNode(createM19Run(23));
    const bossRun = {
      ...begun.run!,
      currentNodeId: M19_NODE_IDS[M19_NODE_IDS.length - 1]!,
      completedNodeIds: M19_NODE_IDS.slice(0, M19_NODE_IDS.length - 1),
    };
    const resolved = completeRunNode({
      ...begun,
      run: bossRun,
      combat: { ...begun.combat!, outcome: "victory" },
    });

    expect(resolved.combat).toBeNull();
    expect(resolved.run?.outcome).toBe("victory");
    expect(resolved.run?.currentNodeId).toBe("boss");
    expect(resolved.run?.completedNodeIds).toEqual([...bossRun.completedNodeIds, "boss"]);
  });

  it("rejects resolving a node without a combat, an unresolved combat, or a finished run", () => {
    expect(() => completeRunNode(createM19Run(23))).toThrow(/No M19 node combat is active/);

    const begun = beginRunNode(createM19Run(23));
    expect(() => completeRunNode(begun)).toThrow(/still active/);

    const defeated = completeRunNode({
      ...begun,
      combat: { ...begun.combat!, outcome: "defeat" },
    });
    expect(() => completeRunNode(defeated)).toThrow(/already defeat/);
  });

  it("rejects run-scoped commands when no M19 run is active", () => {
    const bare = createAct1Combat({
      seed: 23,
      formationId: "claims_adjuster",
      playerHp: { [M10_MORROW_ID]: 44, [M10_SWITCH_ID]: 36 },
    });

    expect(bare.run).toBeNull();
    expect(() => currentRunNode(bare)).toThrow(/No M19 run is active/);
    expect(() => beginRunNode(bare)).toThrow(/No M19 run is active/);
    expect(() => completeRunNode(bare)).toThrow(/No M19 run is active/);
  });

  it("rejects a victory combat on a node that is not part of the fixed test act", () => {
    const begun = beginRunNode(createM19Run(23));
    const offRoute = {
      ...begun,
      run: { ...begun.run!, currentNodeId: "bonus_1" as unknown as typeof M19_NODE_IDS[number] },
      combat: { ...begun.combat!, outcome: "victory" as const },
    };

    expect(() => completeRunNode(offRoute)).toThrow(/not part of the fixed test act/);
  });
});
