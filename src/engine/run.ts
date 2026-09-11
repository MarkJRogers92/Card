import { createAuthoritativeState, type AuthoritativeState } from "./state";
export const RUN_STATE_VERSION = 1 as const;
export const M19_NODE_IDS = ["ordinary_1", "rest_1", "ordinary_2", "elite", "rest_2", "ordinary_3", "boss"] as const;
export type M19NodeId = (typeof M19_NODE_IDS)[number];
export interface RunState { readonly runVersion: typeof RUN_STATE_VERSION; readonly currentNodeId: M19NodeId; readonly completedNodeIds: readonly M19NodeId[]; readonly outcome: "active" | "victory" | "defeat"; }
export function createM19Run(seed: number): AuthoritativeState { const state=createAuthoritativeState({seed,contentVersion:"m19.fixed-test-act",contentHash:"joint-liability-m19-fixed-test-act-v1"}); return {...state,run:{runVersion:RUN_STATE_VERSION,currentNodeId:M19_NODE_IDS[0],completedNodeIds:[],outcome:"active"}}; }
export function currentRunNode(state: AuthoritativeState): M19NodeId { if(state.run===null) throw new Error("No M19 run is active."); return state.run.currentNodeId; }
