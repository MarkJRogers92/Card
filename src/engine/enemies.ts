import type { CombatActor } from "./actors";
import type { CombatState } from "./combat";
import {
  applyDirectDamage,
  applyDirectDamageToRule,
  createDirectDamagePacket,
  gainBlock,
} from "./damage";
import type { AuthoritativeState } from "./state";
import { resolveTargetRule, type TargetRule } from "./targeting";

export const ENEMY_CONTROLLER_VERSION = 1 as const;
export const ENEMY_INTENT_VERSION = 1 as const;

export type EnemyMoveTarget = TargetRule | { readonly kind: "self" };

export type EnemyMoveEffect =
  | {
      readonly op: "damage";
      readonly amount: number;
      readonly hits: number;
    }
  | {
      readonly op: "block";
      readonly amount: number;
    };

export interface EnemyMoveDefinition {
  readonly id: string;
  readonly label: string;
  readonly target: EnemyMoveTarget;
  readonly effects: readonly EnemyMoveEffect[];
}

export type EnemyAiDefinition =
  | {
      readonly kind: "cycle";
      readonly moveIds: readonly string[];
      readonly startIndex: number;
    }
  | {
      readonly kind: "opening_cycle";
      readonly openingMoveId: string;
      readonly moveIds: readonly string[];
      readonly startIndex: number;
    };

export interface EnemyBehaviorDefinition {
  readonly id: string;
  readonly moves: readonly EnemyMoveDefinition[];
  readonly ai: EnemyAiDefinition;
}

export type EnemyBehaviorRegistry = Readonly<
  Record<string, EnemyBehaviorDefinition>
>;

export interface EnemyControllerSetup {
  readonly actorId: string;
  readonly definitionId: string;
}

export interface EnemyControllerState {
  readonly controllerVersion: typeof ENEMY_CONTROLLER_VERSION;
  readonly actorId: string;
  readonly definitionId: string;
  readonly nextCycleIndex: number;
  readonly openingPending: boolean;
  readonly selections: number;
}

export interface SelectedEnemyIntent {
  readonly intentVersion: typeof ENEMY_INTENT_VERSION;
  readonly enemyActorId: string;
  readonly definitionId: string;
  readonly selectionNumber: number;
  readonly moveId: string;
  readonly label: string;
  readonly target: EnemyMoveTarget;
  readonly effects: readonly EnemyMoveEffect[];
}

export type EnemyIntentEffectProjection =
  | {
      readonly op: "damage";
      readonly amount: number;
      readonly hits: number;
      readonly targetActorIds: readonly string[];
    }
  | {
      readonly op: "block";
      readonly amount: number;
      readonly targetActorIds: readonly string[];
    };

export interface EnemyIntentProjection {
  readonly enemyActorId: string;
  readonly definitionId: string;
  readonly selectionNumber: number;
  readonly moveId: string;
  readonly label: string;
  readonly target: EnemyMoveTarget;
  readonly targetActorIds: readonly string[];
  readonly effects: readonly EnemyIntentEffectProjection[];
}

export interface EnemyMoveExecution {
  readonly enemyActorId: string;
  readonly definitionId: string;
  readonly moveId: string;
  readonly skipped: boolean;
  readonly effectsResolved: number;
  readonly damageHitsResolved: number;
}

export interface EnemyPhaseResolution {
  readonly state: AuthoritativeState;
  readonly executions: readonly EnemyMoveExecution[];
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

function requireCombatSnapshot(state: AuthoritativeState): CombatState {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  return state.combat;
}

function requireActiveCombat(state: AuthoritativeState): CombatState {
  const combat = requireCombatSnapshot(state);
  if (combat.outcome !== "active") {
    throw new Error(`Combat is already ${combat.outcome}.`);
  }
  return combat;
}

function requireEnemyActor(combat: CombatState, actorId: string): CombatActor {
  const actor = combat.actors[actorId];
  if (actor === undefined) {
    throw new Error(`Unknown combat actor: ${actorId}.`);
  }
  if (actor.side !== "enemy") {
    throw new Error(`Actor ${actorId} is not an enemy.`);
  }
  return actor;
}

function cloneTarget(target: EnemyMoveTarget): EnemyMoveTarget {
  switch (target.kind) {
    case "front":
      return { kind: "front" };
    case "reserve":
      return { kind: "reserve" };
    case "both":
      return { kind: "both" };
    case "locked":
      return { kind: "locked", actorId: target.actorId };
    case "self":
      return { kind: "self" };
  }
}

function cloneEffect(effect: EnemyMoveEffect): EnemyMoveEffect {
  if (effect.op === "damage") {
    return { op: "damage", amount: effect.amount, hits: effect.hits };
  }
  return { op: "block", amount: effect.amount };
}

function validateDefinition(definition: EnemyBehaviorDefinition): void {
  assertNonEmpty("Enemy definition id", definition.id);
  if (definition.moves.length === 0) {
    throw new Error(`Enemy definition ${definition.id} has no moves.`);
  }

  const moves = new Map<string, EnemyMoveDefinition>();
  for (const move of definition.moves) {
    assertNonEmpty("Enemy move id", move.id);
    assertNonEmpty("Enemy move label", move.label);
    if (moves.has(move.id)) {
      throw new Error(`Enemy definition ${definition.id} has duplicate move ${move.id}.`);
    }
    if (move.effects.length === 0) {
      throw new Error(`Enemy move ${move.id} has no executable effects.`);
    }
    if (move.target.kind === "locked") {
      assertNonEmpty("Locked target actorId", move.target.actorId);
    }
    for (const effect of move.effects) {
      assertNonnegativeInteger(`${move.id} ${effect.op} amount`, effect.amount);
      if (effect.op === "damage") {
        assertPositiveInteger(`${move.id} damage hits`, effect.hits);
      }
    }
    moves.set(move.id, move);
  }

  const cycleIds = definition.ai.moveIds;
  if (cycleIds.length === 0) {
    throw new Error(`Enemy definition ${definition.id} has an empty AI cycle.`);
  }
  if (
    !Number.isSafeInteger(definition.ai.startIndex) ||
    definition.ai.startIndex < 0 ||
    definition.ai.startIndex >= cycleIds.length
  ) {
    throw new RangeError(
      `Enemy definition ${definition.id} has invalid AI startIndex ${definition.ai.startIndex}.`,
    );
  }
  for (const moveId of cycleIds) {
    if (!moves.has(moveId)) {
      throw new Error(
        `Enemy definition ${definition.id} AI references unknown move ${moveId}.`,
      );
    }
  }
  if (
    definition.ai.kind === "opening_cycle" &&
    !moves.has(definition.ai.openingMoveId)
  ) {
    throw new Error(
      `Enemy definition ${definition.id} opening AI references unknown move ${definition.ai.openingMoveId}.`,
    );
  }
}

function requireDefinition(
  registry: EnemyBehaviorRegistry,
  definitionId: string,
): EnemyBehaviorDefinition {
  const definition = registry[definitionId];
  if (definition === undefined) {
    throw new Error(`Unknown enemy behavior definition: ${definitionId}.`);
  }
  if (definition.id !== definitionId) {
    throw new Error(
      `Enemy behavior registry key ${definitionId} does not match definition id ${definition.id}.`,
    );
  }
  validateDefinition(definition);
  return definition;
}

function requireMove(
  definition: EnemyBehaviorDefinition,
  moveId: string,
): EnemyMoveDefinition {
  const move = definition.moves.find((candidate) => candidate.id === moveId);
  if (move === undefined) {
    throw new Error(`Enemy definition ${definition.id} has no move ${moveId}.`);
  }
  return move;
}

function createController(
  actorId: string,
  definition: EnemyBehaviorDefinition,
): EnemyControllerState {
  return {
    controllerVersion: ENEMY_CONTROLLER_VERSION,
    actorId,
    definitionId: definition.id,
    nextCycleIndex: definition.ai.startIndex,
    openingPending: definition.ai.kind === "opening_cycle",
    selections: 0,
  };
}

function validateMoveTarget(
  combat: CombatState,
  enemyActorId: string,
  target: EnemyMoveTarget,
): void {
  if (target.kind === "self") {
    requireEnemyActor(combat, enemyActorId);
    return;
  }
  resolveTargetRule(combat, target);
}

function selectIntent(
  combat: CombatState,
  controller: EnemyControllerState,
  registry: EnemyBehaviorRegistry,
): {
  readonly controller: EnemyControllerState;
  readonly intent: SelectedEnemyIntent;
} {
  const definition = requireDefinition(registry, controller.definitionId);
  let moveId: string;
  let nextCycleIndex = controller.nextCycleIndex;
  let openingPending = controller.openingPending;

  if (definition.ai.kind === "opening_cycle" && openingPending) {
    moveId = definition.ai.openingMoveId;
    openingPending = false;
  } else {
    const cycleIndex = controller.nextCycleIndex % definition.ai.moveIds.length;
    moveId = definition.ai.moveIds[cycleIndex];
    nextCycleIndex = (cycleIndex + 1) % definition.ai.moveIds.length;
  }

  const move = requireMove(definition, moveId);
  validateMoveTarget(combat, controller.actorId, move.target);
  const selectionNumber = controller.selections + 1;

  return {
    controller: {
      ...controller,
      nextCycleIndex,
      openingPending,
      selections: selectionNumber,
    },
    intent: {
      intentVersion: ENEMY_INTENT_VERSION,
      enemyActorId: controller.actorId,
      definitionId: controller.definitionId,
      selectionNumber,
      moveId: move.id,
      label: move.label,
      target: cloneTarget(move.target),
      effects: move.effects.map(cloneEffect),
    },
  };
}

function selectNextIntentsForCombat(
  combat: CombatState,
  registry: EnemyBehaviorRegistry,
): CombatState {
  const controllers: Record<string, EnemyControllerState> = {
    ...combat.enemyControllers,
  };
  const selectedEnemyIntents: SelectedEnemyIntent[] = [];

  for (const actorId of combat.enemyOrder) {
    const actor = requireEnemyActor(combat, actorId);
    if (actor.hp === 0) {
      continue;
    }
    const controller = controllers[actorId];
    if (controller === undefined) {
      throw new Error(`Missing enemy controller for ${actorId}.`);
    }
    const selected = selectIntent(combat, controller, registry);
    controllers[actorId] = selected.controller;
    selectedEnemyIntents.push(selected.intent);
  }

  return {
    ...combat,
    enemyControllers: controllers,
    selectedEnemyIntents,
  };
}

export function initializeEnemyControllers(
  state: AuthoritativeState,
  registry: EnemyBehaviorRegistry,
  setups: readonly EnemyControllerSetup[],
): AuthoritativeState {
  const combat = requireActiveCombat(state);
  if (combat.phase !== "setup") {
    throw new Error("Enemy controllers must be initialized during combat setup.");
  }
  if (
    combat.enemyOrder.length !== 0 ||
    Object.keys(combat.enemyControllers).length !== 0 ||
    combat.selectedEnemyIntents.length !== 0
  ) {
    throw new Error("Enemy controllers are already initialized.");
  }

  const enemyActorIds = Object.values(combat.actors)
    .filter((actor) => actor.side === "enemy")
    .map((actor) => actor.actorId);
  if (setups.length !== enemyActorIds.length) {
    throw new Error(
      `Enemy controller setup count ${setups.length} does not match enemy actor count ${enemyActorIds.length}.`,
    );
  }

  const controllers: Record<string, EnemyControllerState> = {};
  const enemyOrder: string[] = [];
  const seen = new Set<string>();
  for (const setup of setups) {
    if (seen.has(setup.actorId)) {
      throw new Error(`Duplicate enemy controller setup: ${setup.actorId}.`);
    }
    seen.add(setup.actorId);
    requireEnemyActor(combat, setup.actorId);
    const definition = requireDefinition(registry, setup.definitionId);
    controllers[setup.actorId] = createController(setup.actorId, definition);
    enemyOrder.push(setup.actorId);
  }
  for (const actorId of enemyActorIds) {
    if (!seen.has(actorId)) {
      throw new Error(`Enemy actor ${actorId} is missing a controller setup.`);
    }
  }

  const withControllers: CombatState = {
    ...combat,
    enemyOrder,
    enemyControllers: controllers,
    selectedEnemyIntents: [],
    enemyPhaseResolved: true,
  };
  const withInitialIntents = selectNextIntentsForCombat(withControllers, registry);

  return {
    ...state,
    combat: withInitialIntents,
  };
}

function intentTargets(
  combat: CombatState,
  intent: SelectedEnemyIntent,
): readonly string[] {
  if (intent.target.kind === "self") {
    return [intent.enemyActorId];
  }
  return resolveTargetRule(combat, intent.target);
}

export function projectEnemyIntent(
  combat: CombatState,
  intent: SelectedEnemyIntent,
): EnemyIntentProjection {
  const targetActorIds = intentTargets(combat, intent);
  const effects: EnemyIntentEffectProjection[] = intent.effects.map((effect) => {
    if (effect.op === "damage") {
      return {
        op: "damage",
        amount: effect.amount,
        hits: effect.hits,
        targetActorIds,
      };
    }
    return {
      op: "block",
      amount: effect.amount,
      targetActorIds: [intent.enemyActorId],
    };
  });

  return {
    enemyActorId: intent.enemyActorId,
    definitionId: intent.definitionId,
    selectionNumber: intent.selectionNumber,
    moveId: intent.moveId,
    label: intent.label,
    target: cloneTarget(intent.target),
    targetActorIds,
    effects,
  };
}

export function projectSelectedEnemyIntents(
  state: AuthoritativeState,
): readonly EnemyIntentProjection[] {
  const combat = requireCombatSnapshot(state);
  return combat.selectedEnemyIntents.map((intent) =>
    projectEnemyIntent(combat, intent),
  );
}

function requireSelectedIntent(
  combat: CombatState,
  enemyActorId: string,
): SelectedEnemyIntent {
  const intent = combat.selectedEnemyIntents.find(
    (candidate) => candidate.enemyActorId === enemyActorId,
  );
  if (intent === undefined) {
    throw new Error(`Living enemy ${enemyActorId} has no selected intent.`);
  }
  return intent;
}

function executeIntent(
  state: AuthoritativeState,
  intent: SelectedEnemyIntent,
): {
  readonly state: AuthoritativeState;
  readonly effectsResolved: number;
  readonly damageHitsResolved: number;
} {
  let current = state;
  let effectsResolved = 0;
  let damageHitsResolved = 0;

  for (const effect of intent.effects) {
    if (current.combat?.outcome !== "active") {
      break;
    }

    if (effect.op === "block") {
      current = gainBlock(current, intent.enemyActorId, effect.amount);
      effectsResolved += 1;
      continue;
    }

    const packet = createDirectDamagePacket(effect.amount);
    for (let hit = 0; hit < effect.hits; hit += 1) {
      if (current.combat?.outcome !== "active") {
        break;
      }
      if (intent.target.kind === "self") {
        current = applyDirectDamage(current, intent.enemyActorId, packet).state;
      } else {
        current = applyDirectDamageToRule(current, intent.target, packet).state;
      }
      damageHitsResolved += 1;
    }
    effectsResolved += 1;
  }

  return { state: current, effectsResolved, damageHitsResolved };
}

export function executeEnemyPhase(
  state: AuthoritativeState,
  registry: EnemyBehaviorRegistry,
): EnemyPhaseResolution {
  const combat = requireActiveCombat(state);
  if (combat.phase !== "enemy") {
    throw new Error("Enemy moves can only execute during the enemy phase.");
  }
  if (combat.enemyOrder.length === 0) {
    throw new Error("No enemy controllers are initialized.");
  }
  if (combat.enemyPhaseResolved) {
    throw new Error("The current enemy phase has already resolved.");
  }

  const selectedAtPhaseStart = combat.selectedEnemyIntents;
  let current = state;
  const executions: EnemyMoveExecution[] = [];

  for (const actorId of combat.enemyOrder) {
    const currentCombat = requireCombatSnapshot(current);
    if (currentCombat.outcome !== "active") {
      break;
    }
    const actor = requireEnemyActor(currentCombat, actorId);
    const intent = selectedAtPhaseStart.find(
      (candidate) => candidate.enemyActorId === actorId,
    );

    if (actor.hp === 0) {
      executions.push({
        enemyActorId: actorId,
        definitionId: currentCombat.enemyControllers[actorId]?.definitionId ?? "",
        moveId: intent?.moveId ?? "",
        skipped: true,
        effectsResolved: 0,
        damageHitsResolved: 0,
      });
      continue;
    }

    const selected = intent ?? requireSelectedIntent(currentCombat, actorId);
    const execution = executeIntent(current, selected);
    current = execution.state;
    executions.push({
      enemyActorId: actorId,
      definitionId: selected.definitionId,
      moveId: selected.moveId,
      skipped: false,
      effectsResolved: execution.effectsResolved,
      damageHitsResolved: execution.damageHitsResolved,
    });
  }

  const afterExecution = requireCombatSnapshot(current);
  if (afterExecution.outcome !== "active") {
    return {
      state: {
        ...current,
        combat: {
          ...afterExecution,
          selectedEnemyIntents: [],
          enemyPhaseResolved: true,
        },
      },
      executions,
    };
  }

  const withNextIntents = selectNextIntentsForCombat(afterExecution, registry);
  return {
    state: {
      ...current,
      combat: {
        ...withNextIntents,
        enemyPhaseResolved: true,
      },
    },
    executions,
  };
}
