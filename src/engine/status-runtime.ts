import type { ActorSide, CombatActor } from "./actors";
import { applyHpLossBypassingBlock } from "./damage";
import type { AuthoritativeState } from "./state";
import {
  addStatusAmount,
  decayTurnDurationStatuses,
  decrementStatusAmount,
  getStatusAmount,
  setStatusAmount,
  type CombatStatusId,
} from "./status";

export const ENEMY_PHASE_ESCALATION_START = 7 as const;
export const ENEMY_PHASE_ESCALATION_STRENGTH = 2 as const;

export interface StatusTick {
  readonly actorId: string;
  readonly status: "poison" | "bleed";
  readonly amount: number;
  readonly hpLost: number;
  readonly remainingHp: number;
  readonly statusAfter: number;
}

export interface StatusTickResolution {
  readonly state: AuthoritativeState;
  readonly ticks: readonly StatusTick[];
}

export interface EscalationResolution {
  readonly state: AuthoritativeState;
  readonly affectedActorIds: readonly string[];
}

function requireCombatSnapshot(state: AuthoritativeState) {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  return state.combat;
}

function requireActiveCombat(state: AuthoritativeState) {
  const combat = requireCombatSnapshot(state);
  if (combat.outcome !== "active") {
    throw new Error(`Combat is already ${combat.outcome}.`);
  }
  return combat;
}

function requireActor(state: AuthoritativeState, actorId: string): CombatActor {
  const combat = requireCombatSnapshot(state);
  const actor = combat.actors[actorId];
  if (actor === undefined) {
    throw new Error(`Unknown combat actor: ${actorId}.`);
  }
  return actor;
}

function replaceActorStatuses(
  state: AuthoritativeState,
  actorId: string,
  statuses: CombatActor["statuses"],
): AuthoritativeState {
  const combat = requireCombatSnapshot(state);
  const actor = requireActor(state, actorId);
  return {
    ...state,
    combat: {
      ...combat,
      actors: {
        ...combat.actors,
        [actorId]: { ...actor, statuses },
      },
    },
  };
}

export function applyCombatStatus(
  state: AuthoritativeState,
  actorId: string,
  status: CombatStatusId,
  amount: number,
): AuthoritativeState {
  requireActiveCombat(state);
  const actor = requireActor(state, actorId);
  return replaceActorStatuses(
    state,
    actorId,
    addStatusAmount(actor.statuses, status, amount),
  );
}

export function decayDurationStatusesForSide(
  actors: Readonly<Record<string, CombatActor>>,
  side: ActorSide,
): Readonly<Record<string, CombatActor>> {
  let changed = false;
  const next: Record<string, CombatActor> = { ...actors };
  for (const actor of Object.values(actors)) {
    if (actor.side !== side) {
      continue;
    }
    const statuses = decayTurnDurationStatuses(actor.statuses);
    if (statuses !== actor.statuses) {
      next[actor.actorId] = { ...actor, statuses };
      changed = true;
    }
  }
  return changed ? next : actors;
}

function decrementTickingStatusAfterLoss(
  state: AuthoritativeState,
  actorId: string,
  status: "poison" | "bleed",
): AuthoritativeState {
  const actor = requireActor(state, actorId);
  return replaceActorStatuses(
    state,
    actorId,
    decrementStatusAmount(actor.statuses, status),
  );
}

export function tickPoisonAtEnemyPhaseStart(
  state: AuthoritativeState,
): StatusTickResolution {
  const combat = requireActiveCombat(state);
  let current = state;
  const ticks: StatusTick[] = [];

  for (const actorId of combat.enemyOrder) {
    const actor = requireActor(current, actorId);
    if (actor.side !== "enemy" || actor.hp === 0) {
      continue;
    }
    const amount = getStatusAmount(actor.statuses, "poison");
    if (amount === 0) {
      continue;
    }

    const loss = applyHpLossBypassingBlock(current, actorId, amount);
    current = decrementTickingStatusAfterLoss(loss.state, actorId, "poison");
    const result = loss.results[0];
    if (result === undefined) {
      throw new Error("Poison HP-loss resolution returned no result.");
    }
    const after = requireActor(current, actorId);
    ticks.push({
      actorId,
      status: "poison",
      amount,
      hpLost: result.hpLost,
      remainingHp: after.hp,
      statusAfter: getStatusAmount(after.statuses, "poison"),
    });

    if (current.combat?.outcome !== "active") {
      break;
    }
  }

  return { state: current, ticks };
}

export function tickBleedAfterEnemyAttackMove(
  state: AuthoritativeState,
  enemyActorId: string,
): StatusTickResolution {
  const combat = requireActiveCombat(state);
  const actor = combat.actors[enemyActorId];
  if (actor === undefined || actor.side !== "enemy") {
    throw new Error(`Actor ${enemyActorId} is not a living enemy.`);
  }
  if (actor.hp === 0) {
    return { state, ticks: [] };
  }
  const amount = getStatusAmount(actor.statuses, "bleed");
  if (amount === 0) {
    return { state, ticks: [] };
  }

  const loss = applyHpLossBypassingBlock(state, enemyActorId, amount);
  const current = decrementTickingStatusAfterLoss(
    loss.state,
    enemyActorId,
    "bleed",
  );
  const result = loss.results[0];
  if (result === undefined) {
    throw new Error("Bleed HP-loss resolution returned no result.");
  }
  const after = requireActor(current, enemyActorId);
  return {
    state: current,
    ticks: [
      {
        actorId: enemyActorId,
        status: "bleed",
        amount,
        hpLost: result.hpLost,
        remainingHp: after.hp,
        statusAfter: getStatusAmount(after.statuses, "bleed"),
      },
    ],
  };
}

export function applyEnemyPhaseEscalation(
  state: AuthoritativeState,
): EscalationResolution {
  const combat = requireActiveCombat(state);
  if (combat.enemyPhaseNumber < ENEMY_PHASE_ESCALATION_START) {
    return { state, affectedActorIds: [] };
  }

  let actors: Readonly<Record<string, CombatActor>> = combat.actors;
  const affectedActorIds: string[] = [];
  for (const actorId of combat.enemyOrder) {
    const actor = actors[actorId];
    if (actor === undefined || actor.side !== "enemy" || actor.hp === 0) {
      continue;
    }
    actors = {
      ...actors,
      [actorId]: {
        ...actor,
        statuses: addStatusAmount(
          actor.statuses,
          "strength",
          ENEMY_PHASE_ESCALATION_STRENGTH,
        ),
      },
    };
    affectedActorIds.push(actorId);
  }

  return {
    state: {
      ...state,
      combat: { ...combat, actors },
    },
    affectedActorIds,
  };
}

export function setCombatStatusForTesting(
  state: AuthoritativeState,
  actorId: string,
  status: CombatStatusId,
  amount: number,
): AuthoritativeState {
  requireActiveCombat(state);
  const actor = requireActor(state, actorId);
  return replaceActorStatuses(
    state,
    actorId,
    setStatusAmount(actor.statuses, status, amount),
  );
}
