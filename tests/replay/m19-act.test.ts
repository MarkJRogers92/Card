import { describe, expect, it } from "vitest";
import {
  M10_MORROW_ID,
  M10_SWITCH_ID,
  M19_NODE_IDS,
  M19_PARTY_MAX_HP,
  M19_REWARD_CATALOG,
  advanceRunNode,
  beginRunNode,
  claimRewardOption,
  completeRunCombat,
  currentRunNode,
  createM19Run,
  hashAuthoritativeState,
  restRunCharacter,
  type AuthoritativeState,
} from "../../src/engine";

interface TraceStep {
  readonly node: string;
  readonly scrap: number;
  readonly morrowHp: number;
  readonly switchHp: number;
}

interface CombatHpPlan {
  readonly [M10_MORROW_ID]: number;
  readonly [M10_SWITCH_ID]?: number;
}

const COMBAT_HP_PLAN: Partial<Record<(typeof M19_NODE_IDS)[number], CombatHpPlan>> = {
  ordinary_1: { [M10_MORROW_ID]: 10, [M10_SWITCH_ID]: 30 },
};

function claimAllPendingRewards(state: AuthoritativeState): AuthoritativeState {
  let current = state;
  while (current.rewards.pending !== null) {
    const transactionId = current.rewards.pending.transactionId;
    const choices = current.rewards.pending.choices;
    for (const choice of choices) {
      const firstOption = choice.options[0];
      if (firstOption === undefined) {
        throw new Error(`Pending choice ${choice.choiceId} for ${transactionId} had no options.`);
      }
      current = claimRewardOption(current, transactionId, firstOption.id);
    }
  }
  return current;
}

function forceCombatVictoryWithPlan(
  state: AuthoritativeState,
): AuthoritativeState {
  const node = currentRunNode(state);
  const combat = state.combat;
  if (combat === null) return state;
  const plan = COMBAT_HP_PLAN[node];
  return {
    ...state,
    combat: {
      ...combat,
      outcome: "victory",
      actors: {
        ...combat.actors,
        ...(plan === undefined ? {} : {
          [M10_MORROW_ID]: { ...combat.actors[M10_MORROW_ID], hp: plan[M10_MORROW_ID] },
        ...(plan[M10_SWITCH_ID] === undefined ? {} : {
            [M10_SWITCH_ID]: {
              ...combat.actors[M10_SWITCH_ID],
              hp: plan[M10_SWITCH_ID],
            },
          }),
        }),
      },
    },
  };
}

function recordTraceStep(state: AuthoritativeState): TraceStep {
  const run = state.run;
  if (run === null) throw new Error("No M19 run is active.");
  return {
    node: run.currentNodeId,
    scrap: state.rewards.scrap,
    morrowHp: run.partyHp[M10_MORROW_ID],
    switchHp: run.partyHp[M10_SWITCH_ID],
  };
}

function runDeterministicM19Act(seed: number): {
  readonly state: AuthoritativeState;
  readonly trace: readonly TraceStep[];
} {
  let state = createM19Run(seed);
  const trace: TraceStep[] = [];

  for (const expectedNode of M19_NODE_IDS) {
    const currentNode = currentRunNode(state);
    expect(currentNode).toBe(expectedNode);

    if (currentNode === "rest_1") {
      state = restRunCharacter(state, M10_MORROW_ID);
    } else if (currentNode === "rest_2") {
      state = restRunCharacter(state, M10_SWITCH_ID);
    } else {
      const begun = beginRunNode(state);
      const victorious = forceCombatVictoryWithPlan({
        ...begun,
        combat: begun.combat,
      });
      state = completeRunCombat(victorious, M19_REWARD_CATALOG);
      state = claimAllPendingRewards(state);
    }

    trace.push(recordTraceStep(state));
    state = advanceRunNode(state);
  }

  return { state, trace };
}

describe("M19 fixed act deterministic replay", () => {
  it("walks every node in deterministic order with the expected scrap curve and visible rest heals", () => {
    const { trace } = runDeterministicM19Act(23);

    expect(trace.map((step) => step.node)).toEqual(M19_NODE_IDS);
    expect(trace.map((step) => step.scrap)).toEqual([15, 15, 30, 65, 65, 80, 130]);
    expect(trace).toEqual([
      { node: "ordinary_1", scrap: 15, morrowHp: 10, switchHp: 30 },
      { node: "rest_1", scrap: 15, morrowHp: 28, switchHp: 30 },
      { node: "ordinary_2", scrap: 30, morrowHp: 28, switchHp: 30 },
      { node: "elite", scrap: 65, morrowHp: 28, switchHp: 30 },
      { node: "rest_2", scrap: 65, morrowHp: 28, switchHp: 36 },
      { node: "ordinary_3", scrap: 80, morrowHp: 28, switchHp: 36 },
      { node: "boss", scrap: 130, morrowHp: 28, switchHp: 36 },
    ]);

    for (let index = 1; index < trace.length; index += 1) {
      const current = trace[index];
      const previous = trace[index - 1];
      if (current.node === "rest_1" || current.node === "rest_2") continue;
      expect(current.morrowHp).toBe(previous.morrowHp);
      expect(current.switchHp).toBe(previous.switchHp);
    }

    expect(trace[1].morrowHp - trace[0].morrowHp).toBe(18);
    expect(trace[4].switchHp).toBe(M19_PARTY_MAX_HP[M10_SWITCH_ID]);
    expect(trace[3].switchHp + 18).toBeGreaterThan(M19_PARTY_MAX_HP[M10_SWITCH_ID]);
  });

  it("finishes with victory and no unresolved combat or pending reward", () => {
    const { state } = runDeterministicM19Act(23);

    expect(state.run?.outcome).toBe("victory");
    expect(state.run?.completedNodeIds).toEqual(M19_NODE_IDS);
    expect(state.rewards.scrap).toBe(130);
    expect(state.combat).toBeNull();
    expect(state.rewards.pending).toBeNull();
  });

  it("replays identically from a seed and diverges from a different seed", () => {
    const first = runDeterministicM19Act(42);
    const replay = runDeterministicM19Act(42);
    const alternate = runDeterministicM19Act(43);

    expect(replay.trace).toEqual(first.trace);
    expect(hashAuthoritativeState(replay.state)).toBe(hashAuthoritativeState(first.state));
    expect(hashAuthoritativeState(alternate.state)).not.toBe(hashAuthoritativeState(first.state));
  });
});
