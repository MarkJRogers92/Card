import type { CombatActor } from "./actors";
import type { CombatOutcome, CombatState } from "./combat";
import type { AuthoritativeState } from "./state";
import { resolveTargetRule, type TargetRule } from "./targeting";

export const DAMAGE_PACKET_VERSION = 1 as const;

export interface DirectDamagePacket {
  readonly packetVersion: typeof DAMAGE_PACKET_VERSION;
  readonly kind: "direct";
  readonly amount: number;
}

export interface DamageResult {
  readonly targetActorId: string;
  readonly requestedDamage: number;
  readonly blockedDamage: number;
  readonly hpLost: number;
  readonly remainingHp: number;
  readonly remainingBlock: number;
}

export interface DamageResolution {
  readonly state: AuthoritativeState;
  readonly targets: readonly string[];
  readonly results: readonly DamageResult[];
}

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

function requireCombat(state: AuthoritativeState): CombatState {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  if (state.combat.outcome !== "active") {
    throw new Error(`Combat is already ${state.combat.outcome}.`);
  }
  return state.combat;
}

function requireActor(combat: CombatState, actorId: string): CombatActor {
  const actor = combat.actors[actorId];
  if (actor === undefined) {
    throw new Error(`Unknown combat actor: ${actorId}.`);
  }
  return actor;
}

function evaluateOutcome(
  combat: CombatState,
  actors: Readonly<Record<string, CombatActor>>,
): CombatOutcome {
  const players = combat.playerCharacterIds;
  if (players !== null && players.some((actorId) => actors[actorId]?.hp === 0)) {
    return "defeat";
  }

  const enemies = Object.values(actors).filter((actor) => actor.side === "enemy");
  if (enemies.length > 0 && enemies.every((actor) => actor.hp === 0)) {
    return "victory";
  }
  return "active";
}

function finalizeCombat(
  combat: CombatState,
  actors: Readonly<Record<string, CombatActor>>,
): CombatState {
  const outcome = evaluateOutcome(combat, actors);
  return {
    ...combat,
    actors,
    outcome,
    phase: outcome === "active" ? combat.phase : "ended",
  };
}

function damageActor(
  actor: CombatActor,
  amount: number,
): { readonly actor: CombatActor; readonly result: DamageResult } {
  const blockedDamage = Math.min(actor.block, amount);
  const hpDamage = amount - blockedDamage;
  const hpLost = Math.min(actor.hp, hpDamage);
  const nextActor: CombatActor = {
    ...actor,
    block: actor.block - blockedDamage,
    hp: actor.hp - hpLost,
  };
  return {
    actor: nextActor,
    result: {
      targetActorId: actor.actorId,
      requestedDamage: amount,
      blockedDamage,
      hpLost,
      remainingHp: nextActor.hp,
      remainingBlock: nextActor.block,
    },
  };
}

export function createDirectDamagePacket(amount: number): DirectDamagePacket {
  assertNonnegativeInteger("Direct damage", amount);
  return {
    packetVersion: DAMAGE_PACKET_VERSION,
    kind: "direct",
    amount,
  };
}

export function applyDirectDamage(
  state: AuthoritativeState,
  targetActorId: string,
  packet: DirectDamagePacket,
): DamageResolution {
  assertNonnegativeInteger("Direct damage", packet.amount);
  const combat = requireCombat(state);
  const actor = requireActor(combat, targetActorId);
  const applied = damageActor(actor, packet.amount);
  const actors = {
    ...combat.actors,
    [targetActorId]: applied.actor,
  };
  const nextCombat = finalizeCombat(combat, actors);
  return {
    state: { ...state, combat: nextCombat },
    targets: [targetActorId],
    results: [applied.result],
  };
}

export function applyDirectDamageToRule(
  state: AuthoritativeState,
  rule: TargetRule,
  packet: DirectDamagePacket,
): DamageResolution {
  assertNonnegativeInteger("Direct damage", packet.amount);
  const combat = requireCombat(state);
  const targets = resolveTargetRule(combat, rule);
  let actors: Readonly<Record<string, CombatActor>> = combat.actors;
  const results: DamageResult[] = [];

  for (const actorId of targets) {
    const actor = requireActor({ ...combat, actors }, actorId);
    const applied = damageActor(actor, packet.amount);
    actors = { ...actors, [actorId]: applied.actor };
    results.push(applied.result);
  }

  const nextCombat = finalizeCombat(combat, actors);
  return {
    state: { ...state, combat: nextCombat },
    targets,
    results,
  };
}

export function gainBlock(
  state: AuthoritativeState,
  actorId: string,
  amount: number,
): AuthoritativeState {
  assertNonnegativeInteger("Block gain", amount);
  const combat = requireCombat(state);
  const actor = requireActor(combat, actorId);
  const nextBlock = actor.block + amount;
  if (!Number.isSafeInteger(nextBlock)) {
    throw new RangeError("Block total exceeds the safe integer range.");
  }
  return {
    ...state,
    combat: {
      ...combat,
      actors: {
        ...combat.actors,
        [actorId]: { ...actor, block: nextBlock },
      },
    },
  };
}

export function paySelfHpCost(
  state: AuthoritativeState,
  actorId: string,
  amount: number,
): AuthoritativeState {
  assertNonnegativeInteger("Self-HP cost", amount);
  const combat = requireCombat(state);
  const actor = requireActor(combat, actorId);
  if (actor.side !== "player") {
    throw new Error("Self-HP costs can only be paid by player characters.");
  }
  if (actor.hp - amount < 1) {
    throw new Error(
      `Insufficient HP for self-cost: cost ${amount}, available ${actor.hp}; at least 1 HP must remain.`,
    );
  }

  return {
    ...state,
    combat: {
      ...combat,
      actors: {
        ...combat.actors,
        [actorId]: { ...actor, hp: actor.hp - amount },
      },
    },
  };
}
