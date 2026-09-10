import type { CombatState } from "./combat";
import { drawCards } from "./deck";
import { gainBlock } from "./damage";
import type { CardPositionClassification } from "./duo";
import type { Ingredient } from "./imprint";
import type { AuthoritativeState } from "./state";
import type { CombatStatusId } from "./status";

export const TRIGGER_BINDING_VERSION = 1 as const;
export const TRIGGER_COUNTERS_VERSION = 1 as const;
export const TRIGGER_EVENT_VERSION = 1 as const;
export const MODIFIER_BINDING_VERSION = 1 as const;
export const MAX_GENERATED_EVENTS_PER_DISPATCH = 256 as const;
export const MAX_MODIFIERS_PER_CHANNEL = 256 as const;

export type TriggerEventKind = "card_played" | "after_swap";
export type TriggerLimitScope = "turn" | "combat";
export type TriggerSwapMode = "manual" | "card_free";

export type TriggerCondition =
  | { readonly kind: "card_owner"; readonly actorId: string }
  | {
      readonly kind: "classification";
      readonly value: CardPositionClassification;
    }
  | { readonly kind: "has_ingredient" }
  | {
      readonly kind: "ingredient";
      readonly ingredient: Ingredient;
    }
  | { readonly kind: "swap_mode"; readonly mode: TriggerSwapMode };

export type TriggerEffectTarget =
  | "source_actor"
  | "card_owner"
  | "incoming_front";

export type TriggerEffect =
  | {
      readonly op: "gain_block";
      readonly target: TriggerEffectTarget;
      readonly amount: number;
    }
  | {
      readonly op: "draw";
      readonly amount: number;
    };

export interface TriggerLimit {
  readonly scope: TriggerLimitScope;
  readonly count: number;
}

export interface TriggerBinding {
  readonly bindingVersion: typeof TRIGGER_BINDING_VERSION;
  readonly sourceId: string;
  readonly triggerId: string;
  readonly sourceActorId: string | null;
  readonly event: TriggerEventKind;
  readonly conditions: readonly TriggerCondition[];
  readonly effects: readonly TriggerEffect[];
  readonly limit: TriggerLimit;
  readonly priority: number;
}

export interface TriggerCounters {
  readonly countersVersion: typeof TRIGGER_COUNTERS_VERSION;
  readonly turn: Readonly<Record<string, number>>;
  readonly combat: Readonly<Record<string, number>>;
}

export interface CardPlayedTriggerEvent {
  readonly eventVersion: typeof TRIGGER_EVENT_VERSION;
  readonly kind: "card_played";
  readonly cardOwnerActorId: string | null;
  readonly classification: CardPositionClassification;
  readonly ingredient: Ingredient | null;
}

export interface AfterSwapTriggerEvent {
  readonly eventVersion: typeof TRIGGER_EVENT_VERSION;
  readonly kind: "after_swap";
  readonly incomingFrontActorId: string;
  readonly mode: TriggerSwapMode;
}

export type TriggerEvent = CardPlayedTriggerEvent | AfterSwapTriggerEvent;

export interface TriggerActivationProjection {
  readonly sourceId: string;
  readonly triggerId: string;
  readonly priority: number;
  readonly counterBefore: number;
  readonly counterAfter: number;
  readonly effects: readonly TriggerEffect[];
}

export interface TriggerActivationResult extends TriggerActivationProjection {
  readonly effectsResolved: number;
}

export interface TriggerDispatchResult {
  readonly state: AuthoritativeState;
  readonly activations: readonly TriggerActivationResult[];
  readonly generatedEvents: number;
}

export type ModifierOperation = "multiply" | "add" | "set" | "cap";

export interface ModifierCondition {
  readonly targetHasStatus?: CombatStatusId;
  readonly sourceOwner?: "source" | "shaper" | "crew";
  readonly ingredient?: Ingredient;
  readonly event?: string;
  readonly hasCardTag?: string;
}

export interface ModifierBinding {
  readonly bindingVersion: typeof MODIFIER_BINDING_VERSION;
  readonly sourceId: string;
  readonly modifierId: string;
  readonly channel: string;
  readonly condition: ModifierCondition | null;
  readonly operation: ModifierOperation;
  readonly value: number;
  readonly priority: number;
}

export interface ModifierContext {
  readonly targetStatuses?: readonly CombatStatusId[];
  readonly sourceOwner?: "source" | "shaper" | "crew";
  readonly ingredient?: Ingredient | null;
  readonly event?: string;
  readonly cardTags?: readonly string[];
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

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareBindings(left: TriggerBinding, right: TriggerBinding): number {
  return (
    left.priority - right.priority ||
    compareStrings(left.sourceId, right.sourceId) ||
    compareStrings(left.triggerId, right.triggerId)
  );
}

function compareModifiers(left: ModifierBinding, right: ModifierBinding): number {
  return (
    left.priority - right.priority ||
    compareStrings(left.sourceId, right.sourceId) ||
    compareStrings(left.modifierId, right.modifierId)
  );
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

function bindingKey(binding: TriggerBinding): string {
  return `${binding.sourceId}::${binding.triggerId}`;
}

function validateCondition(condition: TriggerCondition): void {
  if (condition.kind === "card_owner") {
    assertNonEmpty("Trigger card owner actorId", condition.actorId);
    return;
  }
  if (condition.kind === "ingredient") {
    assertPositiveInteger("Trigger ingredient Prime", condition.ingredient.prime);
  }
}

function validateEffect(effect: TriggerEffect): void {
  assertNonnegativeInteger(`Trigger ${effect.op} amount`, effect.amount);
}

function validateBinding(binding: TriggerBinding): void {
  if (binding.bindingVersion !== TRIGGER_BINDING_VERSION) {
    throw new Error(`Unsupported trigger binding version: ${binding.bindingVersion}.`);
  }
  assertNonEmpty("Trigger sourceId", binding.sourceId);
  assertNonEmpty("Trigger triggerId", binding.triggerId);
  if (binding.sourceActorId !== null) {
    assertNonEmpty("Trigger sourceActorId", binding.sourceActorId);
  }
  if (!Number.isSafeInteger(binding.priority)) {
    throw new RangeError("Trigger priority must be a safe integer.");
  }
  assertPositiveInteger("Trigger limit count", binding.limit.count);
  if (binding.effects.length === 0) {
    throw new Error(`Trigger ${bindingKey(binding)} must contain at least one effect.`);
  }
  for (const condition of binding.conditions) {
    validateCondition(condition);
  }
  for (const effect of binding.effects) {
    validateEffect(effect);
    if (effect.op === "gain_block" && effect.target === "source_actor" && binding.sourceActorId === null) {
      throw new Error(`Trigger ${bindingKey(binding)} requires sourceActorId for source_actor effects.`);
    }
  }
}

function cloneIngredient(value: Ingredient): Ingredient {
  return { kind: value.kind, id: value.id, prime: value.prime } as Ingredient;
}

function cloneCondition(condition: TriggerCondition): TriggerCondition {
  if (condition.kind === "ingredient") {
    return { kind: "ingredient", ingredient: cloneIngredient(condition.ingredient) };
  }
  return { ...condition };
}

function cloneEffect(effect: TriggerEffect): TriggerEffect {
  return { ...effect };
}

function cloneBinding(binding: TriggerBinding): TriggerBinding {
  return {
    ...binding,
    conditions: binding.conditions.map(cloneCondition),
    effects: binding.effects.map(cloneEffect),
    limit: { ...binding.limit },
  };
}

export function createTriggerCounters(): TriggerCounters {
  return {
    countersVersion: TRIGGER_COUNTERS_VERSION,
    turn: {},
    combat: {},
  };
}

export function resetTurnTriggerCounters(counters: TriggerCounters): TriggerCounters {
  if (counters.countersVersion !== TRIGGER_COUNTERS_VERSION) {
    throw new Error(`Unsupported trigger counters version: ${counters.countersVersion}.`);
  }
  return {
    ...counters,
    turn: {},
  };
}

export function installTriggerBindings(
  state: AuthoritativeState,
  bindings: readonly TriggerBinding[],
): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "setup") {
    throw new Error("Trigger bindings must be installed during combat setup.");
  }
  if (combat.triggerBindings.length !== 0) {
    throw new Error("Trigger bindings are already installed for this combat.");
  }

  const seen = new Set<string>();
  const cloned = bindings.map((binding) => {
    validateBinding(binding);
    const key = bindingKey(binding);
    if (seen.has(key)) {
      throw new Error(`Duplicate trigger binding: ${key}.`);
    }
    seen.add(key);
    return cloneBinding(binding);
  });

  return {
    ...state,
    combat: {
      ...combat,
      triggerBindings: cloned,
      triggerCounters: createTriggerCounters(),
    },
  };
}

function ingredientMatches(actual: Ingredient, expected: Ingredient): boolean {
  return actual.kind === expected.kind && actual.id === expected.id;
}

function conditionMatches(condition: TriggerCondition, event: TriggerEvent): boolean {
  switch (condition.kind) {
    case "card_owner":
      return event.kind === "card_played" && event.cardOwnerActorId === condition.actorId;
    case "classification":
      return event.kind === "card_played" && event.classification === condition.value;
    case "has_ingredient":
      return event.kind === "card_played" && event.ingredient !== null;
    case "ingredient":
      return (
        event.kind === "card_played" &&
        event.ingredient !== null &&
        ingredientMatches(event.ingredient, condition.ingredient)
      );
    case "swap_mode":
      return event.kind === "after_swap" && event.mode === condition.mode;
  }
}

function counterFor(combat: CombatState, binding: TriggerBinding): number {
  const key = bindingKey(binding);
  const counters =
    binding.limit.scope === "turn"
      ? combat.triggerCounters.turn
      : combat.triggerCounters.combat;
  return counters[key] ?? 0;
}

function applicableBindings(
  combat: CombatState,
  event: TriggerEvent,
): readonly TriggerActivationProjection[] {
  const sorted = combat.triggerBindings
    .filter((binding) => binding.event === event.kind)
    .sort(compareBindings);
  const result: TriggerActivationProjection[] = [];

  for (const binding of sorted) {
    validateBinding(binding);
    if (!binding.conditions.every((condition) => conditionMatches(condition, event))) {
      continue;
    }
    const counterBefore = counterFor(combat, binding);
    if (counterBefore >= binding.limit.count) {
      continue;
    }
    result.push({
      sourceId: binding.sourceId,
      triggerId: binding.triggerId,
      priority: binding.priority,
      counterBefore,
      counterAfter: counterBefore + 1,
      effects: binding.effects.map(cloneEffect),
    });
  }

  return result;
}

export function previewTriggerEvent(
  state: AuthoritativeState,
  event: TriggerEvent,
): readonly TriggerActivationProjection[] {
  const combat = requireCombat(state);
  return applicableBindings(combat, event);
}

function findBinding(
  combat: CombatState,
  projection: TriggerActivationProjection,
): TriggerBinding {
  const binding = combat.triggerBindings.find(
    (candidate) =>
      candidate.sourceId === projection.sourceId &&
      candidate.triggerId === projection.triggerId,
  );
  if (binding === undefined) {
    throw new Error(`Trigger binding disappeared during dispatch: ${projection.sourceId}::${projection.triggerId}.`);
  }
  return binding;
}

function consumeCounter(
  state: AuthoritativeState,
  binding: TriggerBinding,
): AuthoritativeState {
  const combat = requireCombat(state);
  const key = bindingKey(binding);
  const bucket =
    binding.limit.scope === "turn"
      ? combat.triggerCounters.turn
      : combat.triggerCounters.combat;
  const next = (bucket[key] ?? 0) + 1;
  const triggerCounters: TriggerCounters =
    binding.limit.scope === "turn"
      ? {
          ...combat.triggerCounters,
          turn: { ...combat.triggerCounters.turn, [key]: next },
        }
      : {
          ...combat.triggerCounters,
          combat: { ...combat.triggerCounters.combat, [key]: next },
        };
  return {
    ...state,
    combat: { ...combat, triggerCounters },
  };
}

function resolveEffectTarget(
  binding: TriggerBinding,
  event: TriggerEvent,
  target: TriggerEffectTarget,
): string {
  if (target === "source_actor") {
    if (binding.sourceActorId === null) {
      throw new Error(`Trigger ${bindingKey(binding)} has no source actor.`);
    }
    return binding.sourceActorId;
  }
  if (target === "card_owner") {
    if (event.kind !== "card_played" || event.cardOwnerActorId === null) {
      throw new Error("card_owner target requires a character-owned card event.");
    }
    return event.cardOwnerActorId;
  }
  if (event.kind !== "after_swap") {
    throw new Error("incoming_front target requires an after_swap event.");
  }
  return event.incomingFrontActorId;
}

function applyTriggerEffect(
  state: AuthoritativeState,
  binding: TriggerBinding,
  event: TriggerEvent,
  effect: TriggerEffect,
): AuthoritativeState {
  if (effect.op === "gain_block") {
    return gainBlock(
      state,
      resolveEffectTarget(binding, event, effect.target),
      effect.amount,
    );
  }

  const combat = requireCombat(state);
  const draw = drawCards(
    combat.deck,
    state.rng,
    effect.amount,
    combat.rules.maxHandSize,
  );
  return {
    ...state,
    rng: draw.rng,
    combat: {
      ...combat,
      deck: draw.deck,
    },
  };
}

export function dispatchTriggerEvent(
  state: AuthoritativeState,
  event: TriggerEvent,
): TriggerDispatchResult {
  const startingCombat = requireCombat(state);
  const projections = applicableBindings(startingCombat, event);
  let generatedEvents = 0;
  let current = state;
  const activations: TriggerActivationResult[] = [];

  for (const projection of projections) {
    const currentCombat = requireCombat(current);
    const binding = findBinding(currentCombat, projection);
    const currentCount = counterFor(currentCombat, binding);
    if (currentCount >= binding.limit.count) {
      continue;
    }

    const generatedByActivation = 1 + binding.effects.length;
    if (generatedEvents + generatedByActivation > MAX_GENERATED_EVENTS_PER_DISPATCH) {
      throw new Error(
        `Trigger dispatch exceeded the development ceiling of ${MAX_GENERATED_EVENTS_PER_DISPATCH} generated events.`,
      );
    }
    generatedEvents += generatedByActivation;
    current = consumeCounter(current, binding);

    let effectsResolved = 0;
    for (const effect of binding.effects) {
      if (current.combat?.outcome !== "active") {
        break;
      }
      current = applyTriggerEffect(current, binding, event, effect);
      effectsResolved += 1;
    }
    activations.push({ ...projection, effectsResolved });
  }

  return { state: current, activations, generatedEvents };
}

function modifierConditionMatches(
  condition: ModifierCondition | null,
  context: ModifierContext,
): boolean {
  if (condition === null) {
    return true;
  }
  if (
    condition.targetHasStatus !== undefined &&
    !(context.targetStatuses ?? []).includes(condition.targetHasStatus)
  ) {
    return false;
  }
  if (
    condition.sourceOwner !== undefined &&
    context.sourceOwner !== condition.sourceOwner
  ) {
    return false;
  }
  if (condition.ingredient !== undefined) {
    if (
      context.ingredient === null ||
      context.ingredient === undefined ||
      !ingredientMatches(context.ingredient, condition.ingredient)
    ) {
      return false;
    }
  }
  if (condition.event !== undefined && context.event !== condition.event) {
    return false;
  }
  if (
    condition.hasCardTag !== undefined &&
    !(context.cardTags ?? []).includes(condition.hasCardTag)
  ) {
    return false;
  }
  return true;
}

function validateModifier(binding: ModifierBinding): void {
  if (binding.bindingVersion !== MODIFIER_BINDING_VERSION) {
    throw new Error(`Unsupported modifier binding version: ${binding.bindingVersion}.`);
  }
  assertNonEmpty("Modifier sourceId", binding.sourceId);
  assertNonEmpty("Modifier modifierId", binding.modifierId);
  assertNonEmpty("Modifier channel", binding.channel);
  if (!Number.isSafeInteger(binding.priority) || !Number.isSafeInteger(binding.value)) {
    throw new RangeError("Modifier priority and value must be safe integers.");
  }
}

export function collectApplicableModifiers(
  bindings: readonly ModifierBinding[],
  channel: string,
  context: ModifierContext = {},
): readonly ModifierBinding[] {
  assertNonEmpty("Modifier channel", channel);
  const matches = bindings.filter((binding) => {
    validateModifier(binding);
    return (
      binding.channel === channel &&
      modifierConditionMatches(binding.condition, context)
    );
  });
  if (matches.length > MAX_MODIFIERS_PER_CHANNEL) {
    throw new Error(
      `Modifier dispatch exceeded the development ceiling of ${MAX_MODIFIERS_PER_CHANNEL} modifiers for channel ${channel}.`,
    );
  }
  return matches.sort(compareModifiers).map((binding) => ({
    ...binding,
    condition:
      binding.condition === null
        ? null
        : {
            ...binding.condition,
            ingredient:
              binding.condition.ingredient === undefined
                ? undefined
                : cloneIngredient(binding.condition.ingredient),
          },
  }));
}
