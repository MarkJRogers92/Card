import { createAuthoritativeState, type AuthoritativeState } from "./state";
import { createAct1Combat } from "./m10-fight";
export const RUN_STATE_VERSION = 1 as const;
export const M19_NODE_IDS = ["ordinary_1", "rest_1", "ordinary_2", "elite", "rest_2", "ordinary_3", "boss"] as const;
export type M19NodeId = (typeof M19_NODE_IDS)[number];
export interface RunState { readonly runVersion: typeof RUN_STATE_VERSION; readonly currentNodeId: M19NodeId; readonly completedNodeIds: readonly M19NodeId[]; readonly outcome: "active" | "victory" | "defeat"; }
export function createM19Run(seed: number): AuthoritativeState { const state=createAuthoritativeState({seed,contentVersion:"m19.fixed-test-act",contentHash:"joint-liability-m19-fixed-test-act-v1"}); return {...state,run:{runVersion:RUN_STATE_VERSION,currentNodeId:M19_NODE_IDS[0],completedNodeIds:[],outcome:"active"}}; }
export function currentRunNode(state: AuthoritativeState): M19NodeId { if(state.run===null) throw new Error("No M19 run is active."); return state.run.currentNodeId; }
export function beginRunNode(state: AuthoritativeState): AuthoritativeState {
  const node = currentRunNode(state);
  if (state.combat !== null) throw new Error("A run combat is already active.");
  if (node !== "ordinary_1") throw new Error(`M19 node ${node} is not implemented yet.`);
  const combatState = createAct1Combat({
    seed: Number(state.rng.rootSeed), formationId: "claims_adjuster",
    playerHp: { morrow: 44, switch: 36 },
  });
  return { ...combatState, run: state.run, rewards: state.rewards };
}
