import type { CombatActor } from "./actors";
import { createCardInstance, createCardInstanceId } from "./cards";
import type { CombatState } from "./combat";
import {
  applyDirectDamage,
  calculateAttackDamage,
  createDirectDamagePacket,
  gainBlock,
} from "./damage";
import type { AuthoritativeState } from "./state";
import {
  ENEMY_PHASE_ESCALATION_START,
  ENEMY_PHASE_ESCALATION_STRENGTH,
  applyEnemyPhaseEscalation,
  decayDurationStatusesForSide,
  tickBleedAfterEnemyAttackMove,
  tickPoisonAtEnemyPhaseStart,
  type StatusTick,
} from "./status-runtime";
import { assertCardConservation } from "./deck";
import { resolveTargetRule, type TargetRule } from "./targeting";

export const ENEMY_CONTROLLER_VERSION = 2 as const;
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
    }
  | {
      readonly op: "add_card_to_discard";
      readonly cardId: string;
      readonly count: number;
    };

export interface EnemyPhaseThreshold {
  readonly hpAtOrBelow: number;
  readonly attackDamageBonus: number;
}

export type EnemyDeathEffect = {
  readonly op: "grant_living_enemy_strength";
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
  /** Applied when selecting a new intent, never retroactively to a revealed one. */
  readonly phaseThreshold?: EnemyPhaseThreshold;
  readonly deathEffects?: readonly EnemyDeathEffect[];
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
  readonly nextGeneratedCardOrdinal: number;
  readonly deathEffects: readonly EnemyDeathEffect[];
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
  readonly attackDamageBonus: number;
}

export interface ProjectedTargetDamage {
  readonly targetActorId: string;
  readonly amount: number;
}

export type EnemyIntentEffectProjection =
  | {
      readonly op: "damage";
      readonly amount: number;
      readonly hits: number;
      readonly targetActorIds: readonly string[];
      readonly projectedDamageByTarget: readonly ProjectedTargetDamage[];
    }
  | {
      readonly op: "block";
      readonly amount: number;
      readonly targetActorIds: readonly string[];
    }
  | {
      readonly op: "add_card_to_discard";
      readonly cardId: string;
      readonly count: number;
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
  readonly poisonTicks: readonly StatusTick[];
  readonly bleedTicks: readonly StatusTick[];
  readonly escalationActorIds: readonly string[];
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
  if (effect.op === "block") return { op: "block", amount: effect.amount };
  return { op: "add_card_to_discard", cardId: effect.cardId, count: effect.count };
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
      if (effect.op === "add_card_to_discard") {
        assertNonEmpty(`${move.id} cardId`, effect.cardId);
        assertPositiveInteger(`${move.id} card count`, effect.count);
        continue;
      }
      assertNonnegativeInteger(`${move.id} ${effect.op} amount`, effect.amount);
      if (effect.op === "damage") {
        assertPositiveInteger(`${move.id} damage hits`, effect.hits);
      }
    }
    moves.set(move.id, move);
  }
  if (definition.phaseThreshold !== undefined) {
    assertNonnegativeInteger("Enemy phase threshold HP", definition.phaseThreshold.hpAtOrBelow);
    assertNonnegativeInteger("Enemy phase threshold attack bonus", definition.phaseThreshold.attackDamageBonus);
  }
  for (const effect of definition.deathEffects ?? []) {
    assertNonnegativeInteger(`${definition.id} death effect amount`, effect.amount);
  }

  if (definition.ai.moveIds.length === 0) {
    throw new Error(`Enemy definition ${definition.id} has an empty AI cycle.`);
  }
  if (
    !Number.isSafeInteger(definition.ai.startIndex) ||
    definition.ai.startIndex < 0 ||
    definition.ai.startIndex >= definition.ai.moveIds.length
  ) {
    throw new RangeError(
      `Enemy definition ${definition.id} has invalid AI startIndex ${definition.ai.startIndex}.`,
    );
  }
  for (const moveId of definition.ai.moveIds) {
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
    nextGeneratedCardOrdinal: 1_000_000,
    deathEffects: (definition.deathEffects ?? []).map((effect) => ({ ...effect })),
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
  const enemy = requireEnemyActor(combat, controller.actorId);
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
      nextGeneratedCardOrdinal: controller.nextGeneratedCardOrdinal,
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
      attackDamageBonus:
        definition.phaseThreshold !== undefined && enemy.hp <= definition.phaseThreshold.hpAtOrBelow
          ? definition.phaseThreshold.attackDamageBonus
          : 0,
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

function upcomingEnemyPhaseNumber(combat: CombatState): number {
  if (combat.phase === "enemy" && !combat.enemyPhaseResolved) {
    return combat.enemyPhaseNumber;
  }
  return combat.enemyPhaseNumber + 1;
}

function pendingEscalationBonus(
  combat: CombatState,
  enemyActorId: string,
): number {
  const actor = combat.actors[enemyActorId];
  if (
    combat.outcome !== "active" ||
    actor === undefined ||
    actor.side !== "enemy" ||
    actor.hp === 0
  ) {
    return 0;
  }
  return upcomingEnemyPhaseNumber(combat) >= ENEMY_PHASE_ESCALATION_START
    ? ENEMY_PHASE_ESCALATION_STRENGTH
    : 0;
}

export function projectEnemyIntent(
  combat: CombatState,
  intent: SelectedEnemyIntent,
): EnemyIntentProjection {
  const targetActorIds = intentTargets(combat, intent);
  const escalationBonus = pendingEscalationBonus(combat, intent.enemyActorId);
  const effects: EnemyIntentEffectProjection[] = intent.effects.map((effect) => {
    if (effect.op === "damage") {
      return {
        op: "damage",
        amount: effect.amount,
        hits: effect.hits,
        targetActorIds,
        projectedDamageByTarget: targetActorIds.map((targetActorId) => ({
          targetActorId,
          amount: calculateAttackDamage(
            combat,
            intent.enemyActorId,
            targetActorId,
          effect.amount,
            escalationBonus + intent.attackDamageBonus,
          ).amount,
        })),
      };
    }
    if (effect.op === "block") return {
      op: "block",
      amount: effect.amount,
      targetActorIds: [intent.enemyActorId],
    };
    return {
      op: "add_card_to_discard",
      cardId: effect.cardId,
      count: effect.count,
      targetActorIds: [],
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

    if (effect.op === "add_card_to_discard") {
      const combat = requireActiveCombat(current);
      const controller = combat.enemyControllers[intent.enemyActorId];
      if (controller === undefined) throw new Error(`Missing enemy controller for ${intent.enemyActorId}.`);
      const instances = { ...combat.deck.instances };
      const discard = [...combat.deck.zones.discard];
      for (let index = 0; index < effect.count; index += 1) {
        const instanceId = createCardInstanceId(controller.nextGeneratedCardOrdinal + index);
        instances[instanceId] = createCardInstance({ instanceId, definitionId: effect.cardId, ownerCharacterId: "crew", origin: "temporary" });
        discard.push(instanceId);
      }
      const nextCombat: CombatState = {
        ...combat,
        deck: { ...combat.deck, instances, zones: { ...combat.deck.zones, discard } },
        enemyControllers: { ...combat.enemyControllers, [intent.enemyActorId]: { ...controller, nextGeneratedCardOrdinal: controller.nextGeneratedCardOrdinal + effect.count } },
      };
      assertCardConservation(nextCombat.deck);
      current = { ...current, combat: nextCombat };
      effectsResolved += 1;
      continue;
    }

    for (let hit = 0; hit < effect.hits; hit += 1) {
      if (current.combat?.outcome !== "active") {
        break;
      }
      const combat = requireActiveCombat(current);
      const targets = intentTargets(combat, intent);
      for (const targetActorId of targets) {
        if (current.combat?.outcome !== "active") {
          break;
        }
        const liveCombat = requireActiveCombat(current);
        const damage = calculateAttackDamage(
          liveCombat,
          intent.enemyActorId,
          targetActorId,
          effect.amount,
          intent.attackDamageBonus,
        ).amount;
        current = applyDirectDamage(
          current,
          targetActorId,
          createDirectDamagePacket(damage),
        ).state;
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
  const poison = tickPoisonAtEnemyPhaseStart(state);
  let current = poison.state;
  const bleedTicks: StatusTick[] = [];
  let escalationActorIds: readonly string[] = [];

  if (current.combat?.outcome === "active") {
    const escalation = applyEnemyPhaseEscalation(current);
    current = escalation.state;
    escalationActorIds = escalation.affectedActorIds;
  }

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

    if (
      execution.damageHitsResolved > 0 &&
      current.combat?.outcome === "active"
    ) {
      const bleed = tickBleedAfterEnemyAttackMove(current, actorId);
      current = bleed.state;
      bleedTicks.push(...bleed.ticks);
    }
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
      poisonTicks: poison.ticks,
      bleedTicks,
      escalationActorIds,
    };
  }

  const afterDurations: CombatState = {
    ...afterExecution,
    actors: decayDurationStatusesForSide(afterExecution.actors, "enemy"),
  };
  const withNextIntents = selectNextIntentsForCombat(afterDurations, registry);
  return {
    state: {
      ...current,
      combat: {
        ...withNextIntents,
        enemyPhaseResolved: true,
      },
    },
    executions,
    poisonTicks: poison.ticks,
    bleedTicks,
    escalationActorIds,
  };
}
