import type { CombatActor } from "./actors";
import type { CombatOutcome, CombatState } from "./combat";
import type { AuthoritativeState } from "./state";
import { getStatusAmount } from "./status";
import { resolveTargetRule, type TargetRule } from "./targeting";

export const DAMAGE_PACKET_VERSION = 1 as const;
export const DAMAGE_MULTIPLIER_BASIS = 10_000 as const;
export const WEAK_MULTIPLIER_BPS = 7_500 as const;
export const EXPOSED_MULTIPLIER_BPS = 15_000 as const;

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

export interface HealingResult {
  readonly targetActorId: string;
  readonly requestedHealing: number;
  readonly hpGained: number;
  readonly remainingHp: number;
}

export interface HealingResolution {
  readonly state: AuthoritativeState;
  readonly result: HealingResult;
}

export interface AttackDamageCalculation {
  readonly attackerActorId: string;
  readonly targetActorId: string;
  readonly printedDamage: number;
  readonly strength: number;
  readonly weakApplied: boolean;
  readonly exposedApplied: boolean;
  readonly outgoingMultiplierBps: number;
  readonly targetMultiplierBps: number;
  readonly amount: number;
}

export interface ReactionBaseDamageCalculation {
  readonly targetActorId: string;
  readonly amountBeforeTargetModifiers: number;
  readonly exposedApplied: boolean;
  readonly targetMultiplierBps: number;
  readonly amount: number;
}

export interface ReactionDamageCalculation extends ReactionBaseDamageCalculation {
  readonly coefficient: number;
  readonly potency: number;
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
    imprint: outcome === "active" ? combat.imprint : null,
    scheduledPackets: outcome === "active" ? combat.scheduledPackets : [],
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

function loseHpBypassingBlock(
  actor: CombatActor,
  amount: number,
): { readonly actor: CombatActor; readonly result: DamageResult } {
  const hpLost = Math.min(actor.hp, amount);
  const nextActor: CombatActor = { ...actor, hp: actor.hp - hpLost };
  return {
    actor: nextActor,
    result: {
      targetActorId: actor.actorId,
      requestedDamage: amount,
      blockedDamage: 0,
      hpLost,
      remainingHp: nextActor.hp,
      remainingBlock: nextActor.block,
    },
  };
}

export function calculateAttackDamage(
  combat: CombatState,
  attackerActorId: string,
  targetActorId: string,
  printedDamage: number,
  pendingStrengthBonus = 0,
): AttackDamageCalculation {
  assertNonnegativeInteger("Printed attack damage", printedDamage);
  assertNonnegativeInteger("Pending Strength bonus", pendingStrengthBonus);
  const attacker = requireActor(combat, attackerActorId);
  const target = requireActor(combat, targetActorId);

  const storedStrength = getStatusAmount(attacker.statuses, "strength");
  const strength = storedStrength + pendingStrengthBonus;
  if (!Number.isSafeInteger(strength)) {
    throw new RangeError("Strength total exceeds the safe integer range.");
  }
  const baseDamage = printedDamage + strength;
  if (!Number.isSafeInteger(baseDamage)) {
    throw new RangeError("Attack base damage exceeds the safe integer range.");
  }

  const weakApplied = getStatusAmount(attacker.statuses, "weak") > 0;
  const exposedApplied = getStatusAmount(target.statuses, "exposed") > 0;
  const outgoingMultiplierBps = weakApplied
    ? WEAK_MULTIPLIER_BPS
    : DAMAGE_MULTIPLIER_BASIS;
  const targetMultiplierBps = exposedApplied
    ? EXPOSED_MULTIPLIER_BPS
    : DAMAGE_MULTIPLIER_BASIS;

  const numerator =
    BigInt(baseDamage) *
    BigInt(outgoingMultiplierBps) *
    BigInt(targetMultiplierBps);
  const denominator =
    BigInt(DAMAGE_MULTIPLIER_BASIS) * BigInt(DAMAGE_MULTIPLIER_BASIS);
  const resolved = numerator / denominator;
  if (resolved > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Resolved attack damage exceeds the safe integer range.");
  }

  return {
    attackerActorId,
    targetActorId,
    printedDamage,
    strength,
    weakApplied,
    exposedApplied,
    outgoingMultiplierBps,
    targetMultiplierBps,
    amount: Number(resolved),
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

export function calculateReactionDamageFromBase(
  combat: CombatState,
  targetActorId: string,
  amountBeforeTargetModifiers: number,
): ReactionBaseDamageCalculation {
  assertNonnegativeInteger(
    "Reaction damage before target modifiers",
    amountBeforeTargetModifiers,
  );
  const target = requireActor(combat, targetActorId);
  const exposedApplied = getStatusAmount(target.statuses, "exposed") > 0;
  const targetMultiplierBps = exposedApplied
    ? EXPOSED_MULTIPLIER_BPS
    : DAMAGE_MULTIPLIER_BASIS;
  const resolved =
    (BigInt(amountBeforeTargetModifiers) * BigInt(targetMultiplierBps)) /
    BigInt(DAMAGE_MULTIPLIER_BASIS);
  if (resolved > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Resolved Reaction damage exceeds the safe integer range.");
  }
  return {
    targetActorId,
    amountBeforeTargetModifiers,
    exposedApplied,
    targetMultiplierBps,
    amount: Number(resolved),
  };
}

export function calculateReactionDamage(
  combat: CombatState,
  targetActorId: string,
  coefficient: number,
  potency: number,
  outgoingMultiplierBps: number = DAMAGE_MULTIPLIER_BASIS,
): ReactionDamageCalculation {
  assertNonnegativeInteger("Reaction damage coefficient", coefficient);
  if (!Number.isSafeInteger(potency) || potency < 1 || potency > 3) {
    throw new RangeError("Reaction Potency must be an integer from 1 to 3.");
  }
  assertNonnegativeInteger("Reaction outgoing damage multiplier", outgoingMultiplierBps);
  const base = BigInt(coefficient) * BigInt(potency);
  if (base > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Reaction base damage exceeds the safe integer range.");
  }
  // Folded here (not inside calculateReactionDamageFromBase) so the result becomes
  // exactly the pre-target-mitigation snapshot Parallel Port repeats from.
  const foldedBase = (base * BigInt(outgoingMultiplierBps)) / BigInt(DAMAGE_MULTIPLIER_BASIS);
  if (foldedBase > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Reaction base damage exceeds the safe integer range.");
  }
  const calculation = calculateReactionDamageFromBase(
    combat,
    targetActorId,
    Number(foldedBase),
  );
  return {
    ...calculation,
    coefficient,
    potency,
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

export function applyHpLossBypassingBlock(
  state: AuthoritativeState,
  targetActorId: string,
  amount: number,
): DamageResolution {
  assertNonnegativeInteger("Unblocked HP loss", amount);
  const combat = requireCombat(state);
  const actor = requireActor(combat, targetActorId);
  const applied = loseHpBypassingBlock(actor, amount);
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

export function healActor(
  state: AuthoritativeState,
  actorId: string,
  amount: number,
): HealingResolution {
  assertNonnegativeInteger("Healing", amount);
  const combat = requireCombat(state);
  const actor = requireActor(combat, actorId);
  const hpGained = Math.min(amount, actor.maxHp - actor.hp);
  const nextActor: CombatActor = { ...actor, hp: actor.hp + hpGained };
  return {
    state: {
      ...state,
      combat: {
        ...combat,
        actors: { ...combat.actors, [actorId]: nextActor },
      },
    },
    result: {
      targetActorId: actorId,
      requestedHealing: amount,
      hpGained,
      remainingHp: nextActor.hp,
    },
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
