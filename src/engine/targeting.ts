import type { CombatState } from "./combat";

export const TARGET_RULE_KINDS = ["front", "reserve", "both", "locked"] as const;
export type TargetRuleKind = (typeof TARGET_RULE_KINDS)[number];

/**
 * Authored marker for a Locked enemy move whose named character is decided when
 * the intent is revealed rather than written into the definition.
 *
 * Section 2.7 of the design says a Locked intent "names a specific character
 * when the intent is revealed" and that swapping does not redirect it. An enemy
 * that has no reason to prefer either character therefore authors this marker,
 * and the enemy controller substitutes the character occupying Front at
 * selection time. The substituted rule is what the selected intent stores, so
 * the lock survives later swaps exactly like an authored character ID.
 */
export const LOCKED_AT_REVEAL_ACTOR_ID = "source";

export type TargetRule =
  | { readonly kind: "front" }
  | { readonly kind: "reserve" }
  | { readonly kind: "both" }
  | { readonly kind: "locked"; readonly actorId: string };

function requirePlayerFormation(
  combat: CombatState,
): { readonly players: readonly [string, string]; readonly front: string } {
  if (combat.playerCharacterIds === null || combat.frontCharacterId === null) {
    throw new Error("Player formation has not been initialized.");
  }
  return {
    players: combat.playerCharacterIds,
    front: combat.frontCharacterId,
  };
}

export function getReserveCharacterId(combat: CombatState): string {
  const { players, front } = requirePlayerFormation(combat);
  if (front === players[0]) {
    return players[1];
  }
  if (front === players[1]) {
    return players[0];
  }
  throw new Error(`Front character ${front} is not part of the player duo.`);
}

export function getFrontCharacterId(combat: CombatState): string {
  return requirePlayerFormation(combat).front;
}

/**
 * Turn an authored enemy move target into the rule a selected intent stores.
 * A Locked rule authored with `LOCKED_AT_REVEAL_ACTOR_ID` names the character
 * occupying Front right now; every other rule is returned unchanged.
 */
export function resolveTargetRuleAtReveal(
  combat: CombatState,
  rule: TargetRule,
): TargetRule {
  if (rule.kind !== "locked" || rule.actorId !== LOCKED_AT_REVEAL_ACTOR_ID) {
    return rule;
  }
  return { kind: "locked", actorId: getFrontCharacterId(combat) };
}

export function resolveTargetRule(
  combat: CombatState,
  rule: TargetRule,
): readonly string[] {
  const { players, front } = requirePlayerFormation(combat);

  switch (rule.kind) {
    case "front":
      return [front];
    case "reserve":
      return [getReserveCharacterId(combat)];
    case "both":
      return [front, getReserveCharacterId(combat)];
    case "locked":
      if (!players.includes(rule.actorId)) {
        throw new Error(`Locked target ${rule.actorId} is not a player character.`);
      }
      return [rule.actorId];
  }
}
