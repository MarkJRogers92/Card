import type { CombatState } from "./combat";

export const TARGET_RULE_KINDS = ["front", "reserve", "both", "locked"] as const;
export type TargetRuleKind = (typeof TARGET_RULE_KINDS)[number];

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
