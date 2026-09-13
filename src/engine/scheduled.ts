import type { CombatActor } from "./actors";
import {
  applyDirectDamage,
  calculateReactionDamageFromBase,
  createDirectDamagePacket,
  type DamageResult,
} from "./damage";
import type { AuthoritativeState } from "./state";
import { applyCombatStatus } from "./status-runtime";

export const SCHEDULED_PACKET_VERSION = 1 as const;
export const SCHEDULED_PACKET_TIMING = "next_player_turn_start" as const;
const SCHEDULED_PACKET_ID_WIDTH = 12;

export type ScheduledReactionEffect =
  | {
      readonly op: "reaction_damage";
      readonly amountBeforeTargetModifiers: number;
      readonly hits: number;
      readonly targetActorId: string;
    }
  | {
      readonly op: "apply_status";
      readonly status: "bleed" | "poison";
      readonly amount: number;
      readonly targetActorId: string;
    };

export interface ScheduledReactionPacket {
  readonly packetVersion: typeof SCHEDULED_PACKET_VERSION;
  readonly packetId: string;
  readonly timing: typeof SCHEDULED_PACKET_TIMING;
  readonly sourceRecipeId: string;
  readonly targetActorId: string;
  readonly effects: readonly ScheduledReactionEffect[];
}

export interface ScheduledPacketExecution {
  readonly packetId: string;
  readonly sourceRecipeId: string;
  readonly targetActorId: string;
  readonly fizzled: boolean;
  readonly damageResults: readonly DamageResult[];
  readonly statusesApplied: readonly {
    actorId: string;
    status: "bleed" | "poison";
    amount: number;
  }[];
}

export interface ScheduledPacketResolution {
  readonly state: AuthoritativeState;
  readonly executions: readonly ScheduledPacketExecution[];
}

function assertNonEmpty(label: string, value: string): void {
  if (value.length === 0) {
    throw new RangeError(`${label} cannot be empty.`);
  }
}

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

function assertPositiveInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive safe integer.`);
  }
}

function requireCombat(state: AuthoritativeState) {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  return state.combat;
}

function requireActiveCombat(state: AuthoritativeState) {
  const combat = requireCombat(state);
  if (combat.outcome !== "active") {
    throw new Error(`Combat is already ${combat.outcome}.`);
  }
  return combat;
}

function requireEnemy(state: AuthoritativeState, actorId: string): CombatActor {
  const actor = requireCombat(state).actors[actorId];
  if (actor === undefined || actor.side !== "enemy") {
    throw new Error(`Scheduled Reaction target ${actorId} is not an enemy.`);
  }
  return actor;
}

function createScheduledPacketId(ordinal: number): string {
  assertPositiveInteger("Scheduled packet ordinal", ordinal);
  return `scheduled-v${SCHEDULED_PACKET_VERSION}-${ordinal
    .toString(10)
    .padStart(SCHEDULED_PACKET_ID_WIDTH, "0")}`;
}

function validateEffect(effect: ScheduledReactionEffect): void {
  assertNonEmpty("Scheduled target actorId", effect.targetActorId);
  if (effect.op === "reaction_damage") {
    assertNonnegativeInteger(
      "Scheduled Reaction damage",
      effect.amountBeforeTargetModifiers,
    );
    assertPositiveInteger("Scheduled Reaction hits", effect.hits);
    return;
  }
  assertNonnegativeInteger(`Scheduled ${effect.status}`, effect.amount);
}

export function scheduleReactionPacket(
  state: AuthoritativeState,
  sourceRecipeId: string,
  targetActorId: string,
  effects: readonly ScheduledReactionEffect[],
): { readonly state: AuthoritativeState; readonly packet: ScheduledReactionPacket } {
  const combat = requireActiveCombat(state);
  assertNonEmpty("sourceRecipeId", sourceRecipeId);
  requireEnemy(state, targetActorId);
  if (effects.length === 0) {
    throw new Error("A scheduled Reaction packet must contain at least one effect.");
  }
  for (const effect of effects) {
    validateEffect(effect);
    if (effect.targetActorId !== targetActorId) {
      throw new Error("All effects in a scheduled Reaction packet must keep the packet target.");
    }
  }

  const ordinal = combat.nextScheduledPacketOrdinal;
  assertPositiveInteger("nextScheduledPacketOrdinal", ordinal);
  const packet: ScheduledReactionPacket = {
    packetVersion: SCHEDULED_PACKET_VERSION,
    packetId: createScheduledPacketId(ordinal),
    timing: SCHEDULED_PACKET_TIMING,
    sourceRecipeId,
    targetActorId,
    effects: effects.map((effect) => ({ ...effect })),
  };

  return {
    state: {
      ...state,
      combat: {
        ...combat,
        scheduledPackets: [...combat.scheduledPackets, packet],
        nextScheduledPacketOrdinal: ordinal + 1,
      },
    },
    packet,
  };
}

function executePacket(
  state: AuthoritativeState,
  packet: ScheduledReactionPacket,
): { readonly state: AuthoritativeState; readonly execution: ScheduledPacketExecution } {
  const targetAtStart = requireEnemy(state, packet.targetActorId);
  let current = state;
  const damageResults: DamageResult[] = [];
  const statusesApplied: Array<{
    actorId: string;
    status: "bleed" | "poison";
    amount: number;
  }> = [];

  if (targetAtStart.hp === 0) {
    return {
      state,
      execution: {
        packetId: packet.packetId,
        sourceRecipeId: packet.sourceRecipeId,
        targetActorId: packet.targetActorId,
        fizzled: true,
        damageResults,
        statusesApplied,
      },
    };
  }

  for (const effect of packet.effects) {
    if (current.combat?.outcome !== "active") {
      break;
    }
    const target = current.combat?.actors[effect.targetActorId];
    if (target === undefined || target.side !== "enemy" || target.hp === 0) {
      break;
    }

    if (effect.op === "reaction_damage") {
      for (let hit = 0; hit < effect.hits; hit += 1) {
        const hitTarget = current.combat?.actors[effect.targetActorId];
        if (
          current.combat?.outcome !== "active" ||
          hitTarget === undefined ||
          hitTarget.hp === 0
        ) {
          break;
        }
        const calculated = calculateReactionDamageFromBase(
          current.combat,
          effect.targetActorId,
          effect.amountBeforeTargetModifiers,
        );
        const resolution = applyDirectDamage(
          current,
          effect.targetActorId,
          createDirectDamagePacket(calculated.amount),
        );
        current = resolution.state;
        damageResults.push(...resolution.results);
      }
      continue;
    }

    current = applyCombatStatus(
      current,
      effect.targetActorId,
      effect.status,
      effect.amount,
    );
    statusesApplied.push({
      actorId: effect.targetActorId,
      status: effect.status,
      amount: effect.amount,
    });
  }

  return {
    state: current,
    execution: {
      packetId: packet.packetId,
      sourceRecipeId: packet.sourceRecipeId,
      targetActorId: packet.targetActorId,
      fizzled: false,
      damageResults,
      statusesApplied,
    },
  };
}

export function resolveScheduledPacketsAtPlayerTurnStart(
  state: AuthoritativeState,
): ScheduledPacketResolution {
  const combat = requireActiveCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Scheduled player-turn-start packets require the player phase.");
  }

  const due = combat.scheduledPackets.filter(
    (packet) => packet.timing === SCHEDULED_PACKET_TIMING,
  );
  let current: AuthoritativeState = {
    ...state,
    combat: {
      ...combat,
      scheduledPackets: combat.scheduledPackets.filter(
        (packet) => packet.timing !== SCHEDULED_PACKET_TIMING,
      ),
    },
  };
  const executions: ScheduledPacketExecution[] = [];

  for (const packet of due) {
    if (current.combat?.outcome !== "active") {
      break;
    }
    const resolved = executePacket(current, packet);
    current = resolved.state;
    executions.push(resolved.execution);
  }

  return { state: current, executions };
}
