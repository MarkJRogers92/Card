import { createAuthoritativeState, type AuthoritativeState } from "./state";
import type { CombatOutcome } from "./combat";
import {
  createAct1Combat,
  type Act1CombatInput,
  M10_MORROW_ID,
  M10_SWITCH_ID,
} from "./m10-fight";
import type { RewardEncounterKind } from "./rewards";
export const RUN_STATE_VERSION = 1 as const;
export const M19_NODE_IDS = ["ordinary_1", "rest_1", "ordinary_2", "elite", "rest_2", "ordinary_3", "boss"] as const;
export type M19NodeId = (typeof M19_NODE_IDS)[number];
export const M19_PARTY_MAX_HP: Readonly<
  Record<typeof M10_MORROW_ID | typeof M10_SWITCH_ID, number>
> = {
  [M10_MORROW_ID]: 44,
  [M10_SWITCH_ID]: 36,
};
export const M19_REST_HEAL = 18 as const;

type M19CombatNodeId = "ordinary_1" | "ordinary_2" | "ordinary_3" | "elite" | "boss";
type M19CombatNodeEncounter = Readonly<{
  readonly formationId: Act1CombatInput["formationId"];
  readonly encounterKind: RewardEncounterKind;
}>

const M19_ENCOUNTER_TABLE: Readonly<Record<M19CombatNodeId, M19CombatNodeEncounter>> = {
  ordinary_1: { formationId: "claims_adjuster", encounterKind: "ordinary" },
  ordinary_2: { formationId: "compliance_slug", encounterKind: "ordinary" },
  ordinary_3: { formationId: "adjuster_and_intern", encounterKind: "ordinary" },
  elite: { formationId: "repo_foreman", encounterKind: "elite" },
  boss: { formationId: "head_of_recovery", encounterKind: "act_1_boss" },
};

export interface RunState {
  readonly runVersion: typeof RUN_STATE_VERSION;
  readonly currentNodeId: M19NodeId;
  readonly completedNodeIds: readonly M19NodeId[];
  readonly outcome: "active" | "victory" | "defeat";
  readonly partyHp: Readonly<Record<typeof M10_MORROW_ID | typeof M10_SWITCH_ID, number>>;
}

export function createM19Run(seed: number): AuthoritativeState {
  const state = createAuthoritativeState({
    seed,
    contentVersion: "m19.fixed-test-act",
    contentHash: "joint-liability-m19-fixed-test-act-v1",
  });
  return {
    ...state,
    run: {
      runVersion: RUN_STATE_VERSION,
      currentNodeId: M19_NODE_IDS[0],
      completedNodeIds: [],
      outcome: "active",
      partyHp: M19_PARTY_MAX_HP,
    },
  };
}

export function currentRunNode(state: AuthoritativeState): M19NodeId {
  if (state.run === null) throw new Error("No M19 run is active.");
  return state.run.currentNodeId;
}

export function currentRunEncounter(state: AuthoritativeState): M19CombatNodeEncounter {
  const nodeId = currentRunNode(state);
  const encounter = M19_ENCOUNTER_TABLE[nodeId as M19CombatNodeId];
  if (encounter === undefined) {
    throw new Error(`M19 node ${nodeId} is not a combat node.`);
  }
  return encounter;
}

export function beginRunNode(state: AuthoritativeState): AuthoritativeState {
  const run = state.run;
  if (run === null) throw new Error("No M19 run is active.");
  if (run.outcome !== "active") throw new Error(`M19 run is already ${run.outcome}.`);
  const node = run.currentNodeId;
  if (state.combat !== null) throw new Error("A run combat is already active.");

  const encounter = M19_ENCOUNTER_TABLE[node as M19CombatNodeId];
  if (encounter === undefined) {
    throw new Error(`M19 node ${node} cannot begin combat; use the rest command instead.`);
  }

  const nodeIndex = M19_NODE_IDS.indexOf(node);
  if (nodeIndex < 0) {
    throw new Error(`M19 node ${node} is not part of the fixed test act.`);
  }

  // Derive a deterministic per-node combat seed from the run root seed and node order.
  const combatSeed = Number(state.rng.rootSeed) * 1000 + nodeIndex;
  const combatState = createAct1Combat({
    seed: combatSeed,
    formationId: encounter.formationId,
    playerHp: run.partyHp,
  });
  return { ...combatState, run: state.run, rewards: state.rewards };
}
/**
 * Resolves the current node once its combat has finished (M19's second seam).
 * A won node is appended to the route and the run advances to the next node;
 * clearing the final boss node ends the run in victory. A lost combat ends the
 * run in defeat without ever counting the node as completed. Either way the
 * finished combat is dropped so the next node can begin from a clean slate.
 */
export function completeRunNode(state: AuthoritativeState): AuthoritativeState {
  const run = state.run;
  if (run === null) throw new Error("No M19 run is active.");
  if (run.outcome !== "active") throw new Error(`M19 run is already ${run.outcome}.`);
  const combat = state.combat;
  if (combat === null) throw new Error("No M19 node combat is active.");
  const combatOutcome: CombatOutcome = combat.outcome;
  if (combatOutcome === "active") throw new Error(`M19 node ${run.currentNodeId} combat is still active.`);
  if (combatOutcome === "defeat") {
    return { ...state, combat: null, run: { ...run, outcome: "defeat" } };
  }
  if (combatOutcome !== "victory") {
    throw new Error(`M19 node ${run.currentNodeId} has unresolvable combat outcome ${combatOutcome}.`);
  }
  const nodeIndex = M19_NODE_IDS.indexOf(run.currentNodeId);
  if (nodeIndex < 0) throw new Error(`M19 node ${run.currentNodeId} is not part of the fixed test act.`);
  const completedNodeIds = [...run.completedNodeIds, run.currentNodeId];
  if (nodeIndex === M19_NODE_IDS.length - 1) {
    return { ...state, combat: null, run: { ...run, completedNodeIds, outcome: "victory" } };
  }
  return {
    ...state,
    combat: null,
    run: { ...run, currentNodeId: M19_NODE_IDS[nodeIndex + 1]!, completedNodeIds },
  };
}
