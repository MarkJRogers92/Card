import { createAuthoritativeState, type AuthoritativeState } from "./state";
import type { CombatOutcome } from "./combat";
import {
  createAct1Combat,
  type Act1CombatInput,
  M10_MORROW_ID,
  M10_SWITCH_ID,
} from "./m10-fight";
import {
  createEncounterReward,
  type RewardCatalog,
  type RewardEncounterKind,
} from "./rewards";
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

// Fixed-act fixture catalog used by the M19 test act implementation.
export const M19_REWARD_CATALOG: RewardCatalog = {
  cards: [
    { id: "source.open_wound", role: "source", rarity: "common", unlocked: true },
    { id: "source.patch", role: "source", rarity: "uncommon", unlocked: true },
    { id: "source.renovation", role: "source", rarity: "rare", unlocked: true },
    { id: "shaper.safety_scan", role: "shaper", rarity: "common", unlocked: true },
    { id: "shaper.cut_corners", role: "shaper", rarity: "uncommon", unlocked: true },
    { id: "shaper.precision", role: "shaper", rarity: "rare", unlocked: true },
    { id: "crew.toolbox_talk", role: "crew", rarity: "common", unlocked: true },
    { id: "crew.protocol", role: "crew", rarity: "uncommon", unlocked: true },
    { id: "crew.checklist", role: "crew", rarity: "rare", unlocked: true },
  ],
  relics: [
    { id: "relic.audit_trail", unlocked: true },
    { id: "relic.ledger_lock", unlocked: true },
    { id: "relic.repair_drones", unlocked: true },
    { id: "relic.desk_aid", unlocked: true },
    { id: "relic.urgency_kit", unlocked: true },
  ],
};

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
  return {
    ...combatState,
    run: state.run,
    rewards: state.rewards,
    rng: state.rng,
  };
}
export function completeRunCombat(
  state: AuthoritativeState,
  catalog: RewardCatalog,
): AuthoritativeState {
  const run = state.run;
  if (run === null) throw new Error("No M19 run is active.");
  if (run.outcome !== "active") throw new Error(`M19 run is already ${run.outcome}.`);
  const combat = state.combat;
  if (combat === null) throw new Error("No M19 node combat is active.");
  const combatOutcome: CombatOutcome = combat.outcome;
  if (combatOutcome === "active") throw new Error(`M19 node ${run.currentNodeId} combat is still active.`);
  if (combatOutcome === "defeat") {
    return {
      ...state,
      combat: null,
      run: {
        ...run,
        outcome: "defeat",
        partyHp: {
          [M10_MORROW_ID]: Math.max(0, combat.actors[M10_MORROW_ID]?.hp ?? 0),
          [M10_SWITCH_ID]: Math.max(0, combat.actors[M10_SWITCH_ID]?.hp ?? 0),
        },
      },
    };
  }
  if (combatOutcome !== "victory") {
    throw new Error(`M19 node ${run.currentNodeId} has unresolvable combat outcome ${combatOutcome}.`);
  }
  const encounter = currentRunEncounter(state);
  const withReward = createEncounterReward(state, catalog, {
    transactionId: `m19:${run.currentNodeId}`,
    encounter: encounter.encounterKind,
    selectedRoles: ["source", "shaper", "crew"],
    ownedRelicIds: state.rewards.claimedRelicIds,
  });
  return {
    ...withReward,
    combat: null,
    run: {
      ...(withReward.run ?? run),
      partyHp: {
        [M10_MORROW_ID]: Math.max(0, combat.actors[M10_MORROW_ID]?.hp ?? 0),
        [M10_SWITCH_ID]: Math.max(0, combat.actors[M10_SWITCH_ID]?.hp ?? 0),
      },
      completedNodeIds: [...run.completedNodeIds, run.currentNodeId],
    },
  };
}

export function advanceRunNode(state: AuthoritativeState): AuthoritativeState {
  const run = state.run;
  if (run === null) throw new Error("No M19 run is active.");
  if (run.outcome !== "active") throw new Error(`M19 run is already ${run.outcome}.`);
  if (state.combat !== null) throw new Error("Cannot advance while a node combat is active.");
  if (state.rewards.pending !== null) throw new Error("Cannot advance while a reward is pending.");
  if (!run.completedNodeIds.includes(run.currentNodeId)) {
    throw new Error(`M19 node ${run.currentNodeId} is not completed.`);
  }

  const nodeIndex = M19_NODE_IDS.indexOf(run.currentNodeId);
  if (nodeIndex < 0) throw new Error(`M19 node ${run.currentNodeId} is not part of the fixed test act.`);
  if (nodeIndex === M19_NODE_IDS.length - 1) {
    return { ...state, run: { ...run, outcome: "victory" } };
  }
  return { ...state, run: { ...run, currentNodeId: M19_NODE_IDS[nodeIndex + 1]! } };
}

export function restRunCharacter(
  state: AuthoritativeState,
  actorId: typeof M10_MORROW_ID | typeof M10_SWITCH_ID,
): AuthoritativeState {
  const run = state.run;
  if (run === null) throw new Error("No M19 run is active.");
  if (run.outcome !== "active") throw new Error(`M19 run is already ${run.outcome}.`);
  if (state.combat !== null) throw new Error("Cannot rest while a node combat is active.");
  if (run.currentNodeId !== "rest_1" && run.currentNodeId !== "rest_2") {
    throw new Error(`M19 node ${run.currentNodeId} is not a rest node.`);
  }
  if (actorId !== M10_MORROW_ID && actorId !== M10_SWITCH_ID) {
    throw new Error(`Unknown M19 party actor ${actorId}.`);
  }
  if (run.completedNodeIds.includes(run.currentNodeId)) {
    return state;
  }
  return {
    ...state,
    run: {
      ...run,
      partyHp: { ...run.partyHp, [actorId]: Math.min(M19_PARTY_MAX_HP[actorId], run.partyHp[actorId] + M19_REST_HEAL) },
      completedNodeIds: [...run.completedNodeIds, run.currentNodeId],
    },
  };
}
