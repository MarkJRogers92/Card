import { describe, expect, it } from "vitest";
import {
  M10_MORROW_ID,
  M10_SWITCH_ID,
  M19_PARTY_MAX_HP,
  M19_NODE_IDS,
  M19_REWARD_CATALOG,
  advanceRunNode,
  beginRunNode,
  claimRewardOption,
  completeRunCombat,
  currentRunNode,
  createAct1Combat,
  createM10Fight,
  createM19Run,
  hashAuthoritativeState,
  restRunCharacter,
  skipCardReward,
  type AuthoritativeState,
} from "../../src/engine";

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

  it("records an ordinary combat victory without advancing, awards scrap, and creates a 3-card pending choice", () => {
    const begun = beginRunNode(createM19Run(23));
    const resolved = completeRunCombat(
      { ...begun, combat: { ...begun.combat!, outcome: "victory" } },
      M19_REWARD_CATALOG,
    );

    expect(resolved.combat).toBeNull();
    expect(resolved.run?.outcome).toBe("active");
    expect(resolved.run?.currentNodeId).toBe("ordinary_1");
    expect(resolved.run?.partyHp).toEqual(M19_PARTY_MAX_HP);
    expect(resolved.rewards.scrap).toBe(15);
    expect(resolved.run?.completedNodeIds).toEqual(["ordinary_1"]);
    expect(resolved.rewards.pending?.choices).toHaveLength(1);
    expect(resolved.rewards.pending?.choices[0]?.kind).toBe("card");
    expect(resolved.rewards.pending?.choices[0]?.options).toHaveLength(3);
  });

  it("records an elite combat victory, adds 35 scrap, and includes a relic choice of 2 options", () => {
    const state = createM19Run(23);
    const begun = beginRunNode({
      ...state,
      run: { ...state.run!, currentNodeId: "elite" as const },
    });
    const resolved = completeRunCombat(
      { ...begun, combat: { ...begun.combat!, outcome: "victory" } },
      M19_REWARD_CATALOG,
    );
    const choices = resolved.rewards.pending?.choices;
    const relicChoice = choices?.find((choice) => choice.kind === "relic");
    const cardChoice = choices?.find((choice) => choice.kind === "card");

    expect(resolved.rewards.scrap).toBe(35);
    expect(cardChoice?.options).toHaveLength(3);
    expect(relicChoice?.options).toHaveLength(2);
  });

  it("records a boss combat victory, adds 50 scrap, and only offers relic options", () => {
    const state = createM19Run(23);
    const begun = beginRunNode({
      ...state,
      run: {
        ...state.run!,
        currentNodeId: "boss" as const,
        completedNodeIds: M19_NODE_IDS.slice(0, M19_NODE_IDS.length - 1),
      },
    });
    const resolved = completeRunCombat(
      { ...begun, combat: { ...begun.combat!, outcome: "victory" } },
      M19_REWARD_CATALOG,
    );
    const choices = resolved.rewards.pending?.choices;

    expect(resolved.rewards.scrap).toBe(50);
    expect(choices).toHaveLength(1);
    expect(choices?.[0]?.kind).toBe("relic");
    expect(choices?.[0]?.options).toHaveLength(3);
  });

  it("ends the run in defeat on node loss with no reward, no node completion, and dropped combat", () => {
    const begun = beginRunNode(createM19Run(23));
    const defeated = completeRunCombat(
      {
        ...begun,
        combat: {
          ...begun.combat!,
          outcome: "defeat",
          actors: {
            ...begun.combat!.actors,
            [M10_MORROW_ID]: { ...begun.combat!.actors[M10_MORROW_ID], hp: -4 },
            [M10_SWITCH_ID]: { ...begun.combat!.actors[M10_SWITCH_ID], hp: 6 },
          },
        },
      },
      M19_REWARD_CATALOG,
    );

    expect(defeated.combat).toBeNull();
    expect(defeated.run?.outcome).toBe("defeat");
    expect(defeated.run?.partyHp).toEqual({ [M10_MORROW_ID]: 0, [M10_SWITCH_ID]: 6 });
    expect(defeated.run?.completedNodeIds).toEqual([]);
    expect(defeated.rewards.scrap).toBe(0);
    expect(defeated.rewards.pending).toBeNull();
  });

  it("rejects combat completion if combat is unresolved, missing, no run, or the run has ended", () => {
    expect(() => completeRunCombat(createM19Run(23), M19_REWARD_CATALOG)).toThrow(/No M19 node combat is active/);

    const begun = beginRunNode(createM19Run(23));
    expect(() => completeRunCombat(begun, M19_REWARD_CATALOG)).toThrow(/combat is still active/);

    const run = createM19Run(23).run!;
    expect(() => completeRunCombat({
      ...createM19Run(23),
      run: { ...run, outcome: "victory" },
    }, M19_REWARD_CATALOG)).toThrow(/already victory/);
    expect(() => completeRunCombat({
      ...createM19Run(23),
      run: { ...run, outcome: "defeat" },
    }, M19_REWARD_CATALOG)).toThrow(/already defeat/);
  });

  it("heals a rest node actor by 18, caps at max HP, and records the rest node completion", () => {
    const state = {
      ...createM19Run(23),
      run: {
        ...createM19Run(23).run!,
        currentNodeId: "rest_1" as const,
        partyHp: { ...M19_PARTY_MAX_HP, [M10_MORROW_ID]: 30, [M10_SWITCH_ID]: 18 },
      },
    };
    const exact = restRunCharacter(state, M10_SWITCH_ID);
    expect(exact.run?.partyHp).toEqual({ [M10_MORROW_ID]: 30, [M10_SWITCH_ID]: 36 });

    const cappedState = {
      ...state,
      run: { ...state.run!, currentNodeId: "rest_2" as const, partyHp: { ...M19_PARTY_MAX_HP, [M10_MORROW_ID]: 40, [M10_SWITCH_ID]: 10 } },
    };
    const capped = restRunCharacter(cappedState, M10_MORROW_ID);
    expect(capped.run?.partyHp).toEqual({ [M10_MORROW_ID]: 44, [M10_SWITCH_ID]: 10 });
    expect(capped.run?.completedNodeIds).toEqual(["rest_2"]);
  });

  it("rejects rest outside of a rest node and for an unknown actor", () => {
    expect(() => restRunCharacter(createM19Run(23), M10_MORROW_ID))
      .toThrow(/is not a rest node/);

    const state = {
      ...createM19Run(23),
      run: {
        ...createM19Run(23).run!,
        currentNodeId: "rest_1" as const,
      },
    };
    expect(() => restRunCharacter(state, "not_a_character" as any)).toThrow(/Unknown M19 party actor/);
  });

  it("treats repeated rest on the same completed node as no-op replay", () => {
    const state = {
      ...createM19Run(23),
      run: {
        ...createM19Run(23).run!,
        currentNodeId: "rest_1" as const,
        partyHp: { ...M19_PARTY_MAX_HP, [M10_MORROW_ID]: 20, [M10_SWITCH_ID]: 1 },
      },
    };
    const first = restRunCharacter(state, M10_MORROW_ID);
    const second = restRunCharacter(first, M10_MORROW_ID);

    expect(first.run?.completedNodeIds).toEqual(["rest_1"]);
    expect(second).toBe(first);
  });

  it("refuses to advance while combat is active, while reward is pending, or when node is incomplete", () => {
    const running = beginRunNode(createM19Run(23));
    expect(() => advanceRunNode(running)).toThrow(/combat is active/);

    const withPendingReward = completeRunCombat(
      { ...running, combat: { ...running.combat!, outcome: "victory" } },
      M19_REWARD_CATALOG,
    );
    expect(() => advanceRunNode(withPendingReward)).toThrow(/reward is pending/);

    const activeButFresh = createM19Run(23);
    expect(() => advanceRunNode(activeButFresh)).toThrow(/is not completed/);
  });

  it("advances to the next node only when node is completed", () => {
    const begun = beginRunNode(createM19Run(23));
    const resolved = completeRunCombat(
      { ...begun, combat: { ...begun.combat!, outcome: "victory" } },
      M19_REWARD_CATALOG,
    );
    const resolvedWithoutPending = skipCardReward(
      resolved,
      "m19:ordinary_1",
    );

    const next = advanceRunNode(resolvedWithoutPending);
    expect(next.run?.currentNodeId).toBe("rest_1");
    expect(next.run?.outcome).toBe("active");
  });

  it("finishes the run in victory after the boss reward is resolved", () => {
    const state = createM19Run(23);
    const bossState = {
      ...state,
      run: {
        ...state.run!,
        currentNodeId: M19_NODE_IDS[M19_NODE_IDS.length - 1]!,
        completedNodeIds: M19_NODE_IDS.slice(0, M19_NODE_IDS.length - 1),
      },
    };
    const begun = beginRunNode(bossState);
    const resolved = completeRunCombat({ ...begun, combat: { ...begun.combat!, outcome: "victory" } }, M19_REWARD_CATALOG);
    const pending = resolved.rewards.pending!;
    const relicChoice = pending.choices.find((choice) => choice.kind === "relic");
    if (relicChoice === undefined) throw new Error("Missing boss relic choice.");

    const claimed = claimRewardOption(
      resolved,
      `m19:${resolved.run?.currentNodeId}`,
      relicChoice.options[0]!.id,
    );
    const advanced = advanceRunNode(claimed);

    expect(advanced.run?.outcome).toBe("victory");
    expect(advanced.run?.currentNodeId).toBe("boss");
    expect(advanced.rewards.pending).toBeNull();
    expect(advanced.rewards.scrap).toBe(50);
  });

  it("runs a deterministic full seven-node script with ordered node progression and deterministic end state", () => {
    const execute = (seed: number): AuthoritativeState => {
      let state = createM19Run(seed);
      const progression: string[] = [];
      const scraps: number[] = [];
      progression.push(currentRunNode(state));

      const completeCombatAndKeepState = (): AuthoritativeState => {
        const begun = beginRunNode(state);
        return completeRunCombat(
          { ...begun, combat: { ...begun.combat!, outcome: "victory" } },
          M19_REWARD_CATALOG,
        );
      };

      state = completeCombatAndKeepState();
      scraps.push(state.rewards.scrap);
      state = skipCardReward(state, "m19:ordinary_1");
      state = advanceRunNode(state);
      progression.push(currentRunNode(state));

      state = restRunCharacter(
        { ...state, run: { ...state.run!, partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 20, [M10_SWITCH_ID]: 10 } } },
        M10_MORROW_ID,
      );
      state = advanceRunNode(state);
      progression.push(currentRunNode(state));

      state = completeCombatAndKeepState();
      scraps.push(state.rewards.scrap);
      state = skipCardReward(state, "m19:ordinary_2");
      state = advanceRunNode(state);
      progression.push(currentRunNode(state));

      state = completeCombatAndKeepState();
      scraps.push(state.rewards.scrap);
      state = skipCardReward(state, "m19:elite");
      const eliteRelic = state.rewards.pending?.choices.find((choice) => choice.kind === "relic");
      if (eliteRelic === undefined) throw new Error("Missing elite relic choice.");
      state = claimRewardOption(state, "m19:elite", eliteRelic.options[0]!.id);
      state = advanceRunNode(state);
      progression.push(currentRunNode(state));

      state = restRunCharacter(
        { ...state, run: { ...state.run!, partyHp: { ...state.run!.partyHp, [M10_MORROW_ID]: 10, [M10_SWITCH_ID]: 5 } } },
        M10_SWITCH_ID,
      );
      state = advanceRunNode(state);
      progression.push(currentRunNode(state));

      state = completeCombatAndKeepState();
      scraps.push(state.rewards.scrap);
      state = skipCardReward(state, "m19:ordinary_3");
      state = advanceRunNode(state);
      progression.push(currentRunNode(state));

      state = completeCombatAndKeepState();
      scraps.push(state.rewards.scrap);
      const bossRelic = state.rewards.pending?.choices.find((choice) => choice.kind === "relic");
      if (bossRelic === undefined) throw new Error("Missing boss relic choice.");
      state = claimRewardOption(state, "m19:boss", bossRelic.options[0]!.id);
      state = advanceRunNode(state);

      expect(progression).toEqual(M19_NODE_IDS);
      expect(scraps).toEqual([15, 30, 65, 80, 130]);
      expect(state.run?.outcome).toBe("victory");
      return state;
    };

    const runOne = execute(23);
    const runTwo = execute(23);

    expect(hashAuthoritativeState(runOne)).toBe(hashAuthoritativeState(runTwo));
    expect(runOne.run).toEqual(runTwo.run);
    expect(runOne.rewards).toEqual(runTwo.rewards);
  });
});
