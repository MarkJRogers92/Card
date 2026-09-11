import type { EnemyBehaviorRegistry } from "./enemies";

export interface InitialEncounterFormation {
  readonly id: string;
  readonly enemyDefinitionIds: readonly string[];
}

/** M17 authored combat definitions. Encounter selection belongs to M19 run assembly. */
export const INITIAL_ENEMY_REGISTRY: EnemyBehaviorRegistry = {
  "enemy.claims_adjuster": { id: "enemy.claims_adjuster", moves: [
    { id: "stamp", label: "Stamp", target: { kind: "front" }, effects: [{ op: "damage", amount: 7, hits: 1 }] },
    { id: "paperwork", label: "Paperwork", target: { kind: "self" }, effects: [{ op: "block", amount: 6 }, { op: "add_card_to_discard", cardId: "junk.invoice", count: 1 }] },
    { id: "stamp_harder", label: "Stamp Harder", target: { kind: "front" }, effects: [{ op: "damage", amount: 10, hits: 1 }] },
  ], ai: { kind: "cycle", moveIds: ["stamp", "paperwork", "stamp_harder"], startIndex: 0 } },
  "enemy.taxidermy_drone": { id: "enemy.taxidermy_drone", moves: [
    { id: "rotor_barrage", label: "Rotor Barrage", target: { kind: "front" }, effects: [{ op: "damage", amount: 3, hits: 3 }] },
    { id: "reserve_scan", label: "Reserve Scan", target: { kind: "reserve" }, effects: [{ op: "damage", amount: 6, hits: 1 }] },
  ], ai: { kind: "cycle", moveIds: ["rotor_barrage", "reserve_scan"], startIndex: 0 } },
  "enemy.compliance_slug": { id: "enemy.compliance_slug", moves: [
    { id: "shelter", label: "Shelter", target: { kind: "self" }, effects: [{ op: "block", amount: 10 }] },
    { id: "citation", label: "Citation", target: { kind: "front" }, effects: [{ op: "damage", amount: 12, hits: 1 }] },
  ], ai: { kind: "cycle", moveIds: ["shelter", "citation"], startIndex: 0 } },
  "enemy.unpaid_intern": { id: "enemy.unpaid_intern", moves: [
    { id: "errand", label: "Errand", target: { kind: "front" }, effects: [{ op: "damage", amount: 5, hits: 1 }] },
    { id: "all_hands", label: "All Hands", target: { kind: "both" }, effects: [{ op: "damage", amount: 4, hits: 1 }] },
  ], ai: { kind: "cycle", moveIds: ["errand", "all_hands"], startIndex: 0 }, deathEffects: [{ op: "grant_living_enemy_strength", amount: 2 }] },
  "enemy.repo_foreman": { id: "enemy.repo_foreman", moves: [
    { id: "repossession", label: "Repossession", target: { kind: "front" }, effects: [{ op: "damage", amount: 12, hits: 1 }] },
    { id: "named_claim", label: "Named in the Claim", target: { kind: "locked", actorId: "source" }, effects: [{ op: "damage", amount: 14, hits: 1 }] },
    { id: "work_order", label: "Work Order", target: { kind: "both" }, effects: [{ op: "damage", amount: 7, hits: 1 }] },
  ], ai: { kind: "cycle", moveIds: ["repossession", "named_claim", "work_order"], startIndex: 0 } },
  "enemy.head_of_recovery": { id: "enemy.head_of_recovery", moves: [
    { id: "performance_review", label: "Performance Review", target: { kind: "front" }, effects: [{ op: "damage", amount: 12, hits: 1 }] },
    { id: "cross_departmental_issue", label: "Cross-Departmental Issue", target: { kind: "both" }, effects: [{ op: "damage", amount: 7, hits: 1 }] },
    { id: "named_in_claim", label: "Named in the Claim", target: { kind: "locked", actorId: "source" }, effects: [{ op: "damage", amount: 18, hits: 1 }] },
    { id: "budget_cuts", label: "Budget Cuts", target: { kind: "self" }, effects: [{ op: "block", amount: 14 }, { op: "add_card_to_discard", cardId: "junk.invoice", count: 2 }] },
  ], ai: { kind: "cycle", moveIds: ["performance_review", "cross_departmental_issue", "named_in_claim", "budget_cuts"], startIndex: 0 }, phaseThreshold: { hpAtOrBelow: 75, attackDamageBonus: 3 } },
};

export const ACT_1_ORDINARY_ENCOUNTERS: readonly InitialEncounterFormation[] = [
  { id: "claims_adjuster", enemyDefinitionIds: ["enemy.claims_adjuster"] },
  { id: "compliance_slug", enemyDefinitionIds: ["enemy.compliance_slug"] },
  { id: "two_taxidermy_drones", enemyDefinitionIds: ["enemy.taxidermy_drone", "enemy.taxidermy_drone"] },
  { id: "drone_and_intern", enemyDefinitionIds: ["enemy.taxidermy_drone", "enemy.unpaid_intern"] },
  { id: "adjuster_and_intern", enemyDefinitionIds: ["enemy.claims_adjuster", "enemy.unpaid_intern"] },
];

export const ACT_1_ELITE_ENCOUNTERS: readonly InitialEncounterFormation[] = [
  { id: "repo_foreman", enemyDefinitionIds: ["enemy.repo_foreman"] },
];

export const ACT_1_BOSS_ENCOUNTER: readonly InitialEncounterFormation[] = [
  { id: "head_of_recovery", enemyDefinitionIds: ["enemy.head_of_recovery"] },
];

export const ACT_1_FIRST_ENCOUNTERS = ACT_1_ORDINARY_ENCOUNTERS.filter(
  (formation) => formation.enemyDefinitionIds.length === 1,
);
