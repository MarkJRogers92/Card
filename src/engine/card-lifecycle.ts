import type { CardInstance, CardInstanceId } from "./cards";
import {
  endPlayerTurnWithSettledHand,
  payEnergyCost,
  type CombatState,
} from "./combat";
import { assertCardConservation, type DeckState } from "./deck";
import { paySelfHpCost } from "./damage";
import type { CardCombatOwner } from "./duo";
import { resolvePostCardIngredientWithTriggers } from "./passive-card";
import type {
  PostCardIngredientInput,
  PostCardIngredientResolution,
} from "./reactions";
import type { AuthoritativeState } from "./state";
import { getReserveCharacterId } from "./targeting";
import {
  TRIGGER_BINDING_VERSION,
  type TriggerBinding,
} from "./triggers";

export const CARD_LIFECYCLE_VERSION = 1 as const;
export const CARD_KEYWORDS = [
  "exhaust",
  "retain",
  "fleeting",
  "unplayable",
  "protocol",
] as const;

export type CardKeyword = (typeof CARD_KEYWORDS)[number];
export type CardCategory = "attack" | "skill" | "protocol" | "status";
export type HpCostResource = "owner_hp" | "front_hp" | "reserve_hp";
export type PlayedCardDestination = "discard" | "exhaust" | "deployed";

export interface AdditionalHpCost {
  readonly resource: HpCostResource;
  readonly amount: number;
  readonly minimumRemaining?: number;
}

export interface CardLifecycleSpec {
  readonly category: CardCategory;
  readonly keywords: readonly CardKeyword[];
  readonly additionalHpCosts: readonly AdditionalHpCost[];
}

export interface HandSettlement {
  readonly deck: DeckState;
  readonly retained: readonly CardInstanceId[];
  readonly exhausted: readonly CardInstanceId[];
  readonly discarded: readonly CardInstanceId[];
}

export interface FinishCardLifecycleInput {
  readonly instanceId: CardInstanceId;
  readonly lifecycle: CardLifecycleSpec;
  readonly postCard: PostCardIngredientInput;
  readonly protocolBindings?: readonly TriggerBinding[];
}

export interface FinishCardLifecycleResolution
  extends PostCardIngredientResolution {
  readonly protocolBindingsInstalled: number;
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

function requirePlayerCombat(state: AuthoritativeState): CombatState {
  const combat = state.combat;
  if (combat === null) {
    throw new Error("No combat is active.");
  }
  if (combat.outcome !== "active") {
    throw new Error(`Combat is already ${combat.outcome}.`);
  }
  if (combat.phase !== "player") {
    throw new Error("Card lifecycle operations require the player phase.");
  }
  return combat;
}

function isKnownKeyword(value: string): value is CardKeyword {
  return (CARD_KEYWORDS as readonly string[]).includes(value);
}

export function validateCardLifecycle(spec: CardLifecycleSpec): void {
  const seen = new Set<CardKeyword>();
  for (const keyword of spec.keywords) {
    if (!isKnownKeyword(keyword)) {
      throw new Error(`Unknown card keyword: ${String(keyword)}.`);
    }
    if (seen.has(keyword)) {
      throw new Error(`Duplicate card keyword: ${keyword}.`);
    }
    seen.add(keyword);
  }

  const protocolKeyword = seen.has("protocol");
  if ((spec.category === "protocol") !== protocolKeyword) {
    throw new Error(
      "Protocol cards must use category protocol and the protocol keyword together.",
    );
  }

  for (const cost of spec.additionalHpCosts) {
    assertNonnegativeInteger(`Additional ${cost.resource} cost`, cost.amount);
    const minimumRemaining = cost.minimumRemaining ?? 1;
    assertPositiveInteger(
      `Additional ${cost.resource} minimumRemaining`,
      minimumRemaining,
    );
  }
}

export function cardHasKeyword(
  spec: CardLifecycleSpec,
  keyword: CardKeyword,
): boolean {
  validateCardLifecycle(spec);
  return spec.keywords.includes(keyword);
}

export function assertCardPlayable(
  state: AuthoritativeState,
  instanceId: CardInstanceId,
  spec: CardLifecycleSpec,
): void {
  validateCardLifecycle(spec);
  const combat = requirePlayerCombat(state);
  if (combat.deck.instances[instanceId] === undefined) {
    throw new Error(`Unknown card instance: ${instanceId}.`);
  }
  if (!combat.deck.zones.hand.includes(instanceId)) {
    throw new Error(`Card ${instanceId} is not in hand.`);
  }
  if (spec.keywords.includes("unplayable")) {
    throw new Error(`Card ${instanceId} is Unplayable.`);
  }
}

function requirePlayerActor(
  combat: CombatState,
  actorId: string,
  resource: HpCostResource,
): string {
  const actor = combat.actors[actorId];
  if (actor === undefined || actor.side !== "player") {
    throw new Error(`${resource} does not resolve to a player character.`);
  }
  return actorId;
}

function resolveHpCostActorId(
  combat: CombatState,
  owner: CardCombatOwner,
  resource: HpCostResource,
): string {
  if (resource === "owner_hp") {
    if (owner.kind !== "character") {
      throw new Error("Crew cards cannot pay an owner_hp cost.");
    }
    return requirePlayerActor(combat, owner.actorId, resource);
  }
  if (combat.playerCharacterIds === null || combat.frontCharacterId === null) {
    throw new Error("Player formation has not been initialized.");
  }
  if (resource === "front_hp") {
    return requirePlayerActor(combat, combat.frontCharacterId, resource);
  }
  return requirePlayerActor(combat, getReserveCharacterId(combat), resource);
}

export function payCardCosts(
  state: AuthoritativeState,
  owner: CardCombatOwner,
  energyCost: number,
  additionalHpCosts: readonly AdditionalHpCost[],
): AuthoritativeState {
  assertNonnegativeInteger("Card Energy cost", energyCost);
  const combat = requirePlayerCombat(state);
  if (energyCost > combat.energy) {
    throw new Error(
      `Insufficient Energy: cost ${energyCost}, available ${combat.energy}.`,
    );
  }

  const totals = new Map<
    string,
    { amount: number; minimumRemaining: number }
  >();
  for (const cost of additionalHpCosts) {
    assertNonnegativeInteger(`Additional ${cost.resource} cost`, cost.amount);
    const minimumRemaining = cost.minimumRemaining ?? 1;
    assertPositiveInteger(
      `Additional ${cost.resource} minimumRemaining`,
      minimumRemaining,
    );
    const actorId = resolveHpCostActorId(combat, owner, cost.resource);
    const previous = totals.get(actorId) ?? { amount: 0, minimumRemaining: 1 };
    const amount = previous.amount + cost.amount;
    if (!Number.isSafeInteger(amount)) {
      throw new RangeError("Combined HP cost exceeds the safe integer range.");
    }
    totals.set(actorId, {
      amount,
      minimumRemaining: Math.max(previous.minimumRemaining, minimumRemaining),
    });
  }

  for (const [actorId, cost] of totals) {
    const actor = combat.actors[actorId];
    if (actor === undefined || actor.side !== "player") {
      throw new Error(`HP cost actor ${actorId} is unavailable.`);
    }
    if (actor.hp - cost.amount < cost.minimumRemaining) {
      throw new Error(
        `Insufficient HP for card cost on ${actorId}: cost ${cost.amount}, available ${actor.hp}; at least ${cost.minimumRemaining} HP must remain.`,
      );
    }
  }

  let current = payEnergyCost(state, energyCost);
  for (const [actorId, cost] of totals) {
    if (cost.amount > 0) {
      current = paySelfHpCost(current, actorId, cost.amount);
    }
  }
  return current;
}

export function playedCardDestination(
  spec: CardLifecycleSpec,
): PlayedCardDestination {
  validateCardLifecycle(spec);
  if (spec.category === "protocol") return "deployed";
  if (spec.keywords.includes("exhaust")) return "exhaust";
  return "discard";
}

export function movePlayedCardForLifecycle(
  deck: DeckState,
  instanceId: CardInstanceId,
  spec: CardLifecycleSpec,
): DeckState {
  const destination = playedCardDestination(spec);
  if (!deck.zones.hand.includes(instanceId)) {
    throw new Error(`Card ${instanceId} is not in hand.`);
  }
  const hand = deck.zones.hand.filter((candidate) => candidate !== instanceId);
  const zones = {
    ...deck.zones,
    hand,
    [destination]: [...deck.zones[destination], instanceId],
  };
  const next: DeckState = { ...deck, zones };
  assertCardConservation(next);
  return next;
}

function bindingKey(binding: TriggerBinding): string {
  return `${binding.sourceId}::${binding.triggerId}`;
}

function cloneProtocolBinding(binding: TriggerBinding): TriggerBinding {
  if (binding.bindingVersion !== TRIGGER_BINDING_VERSION) {
    throw new Error(
      `Unsupported Protocol trigger binding version: ${binding.bindingVersion}.`,
    );
  }
  if (binding.sourceId.length === 0 || binding.triggerId.length === 0) {
    throw new Error("Protocol trigger sourceId and triggerId cannot be empty.");
  }
  if (!Number.isSafeInteger(binding.priority)) {
    throw new RangeError("Protocol trigger priority must be a safe integer.");
  }
  if (!Number.isSafeInteger(binding.limit.count) || binding.limit.count <= 0) {
    throw new RangeError("Protocol trigger limit must be a positive safe integer.");
  }
  return {
    ...binding,
    conditions: binding.conditions.map((condition) =>
      condition.kind === "ingredient"
        ? { ...condition, ingredient: { ...condition.ingredient } as typeof condition.ingredient }
        : { ...condition },
    ),
    effects: binding.effects.map((effect) => ({ ...effect })),
    limit: { ...binding.limit },
  };
}

export function appendProtocolTriggerBindings(
  state: AuthoritativeState,
  bindings: readonly TriggerBinding[],
): AuthoritativeState {
  const combat = requirePlayerCombat(state);
  if (bindings.length === 0) {
    throw new Error("A Protocol must install at least one trigger binding.");
  }

  const seen = new Set(combat.triggerBindings.map(bindingKey));
  const appended = bindings.map((binding) => {
    const cloned = cloneProtocolBinding(binding);
    const key = bindingKey(cloned);
    if (seen.has(key)) {
      throw new Error(`Duplicate Protocol trigger binding: ${key}.`);
    }
    seen.add(key);
    return cloned;
  });

  return {
    ...state,
    combat: {
      ...combat,
      triggerBindings: [...combat.triggerBindings, ...appended],
    },
  };
}

export function finishCardPlayLifecycle(
  state: AuthoritativeState,
  input: FinishCardLifecycleInput,
): FinishCardLifecycleResolution {
  validateCardLifecycle(input.lifecycle);
  const combat = requirePlayerCombat(state);
  const protocol = input.lifecycle.category === "protocol";
  const bindings = input.protocolBindings ?? [];

  if (protocol) {
    if (!combat.deck.zones.deployed.includes(input.instanceId)) {
      throw new Error("Protocol card must be in the deployed zone before installation.");
    }
    if (bindings.length === 0) {
      throw new Error("A Protocol card must install at least one trigger binding.");
    }
  } else if (bindings.length > 0) {
    throw new Error("Non-Protocol cards cannot install Protocol trigger bindings.");
  }

  // Existing triggers observe the completed card play before a newly deployed
  // Protocol is appended, so the Protocol cannot retroactively trigger itself.
  const post = resolvePostCardIngredientWithTriggers(state, input.postCard);
  if (!protocol || post.state.combat?.outcome !== "active") {
    return { ...post, protocolBindingsInstalled: 0 };
  }

  const installed = appendProtocolTriggerBindings(post.state, bindings);
  return {
    ...post,
    state: installed,
    resultingImprint: installed.combat?.imprint ?? null,
    protocolBindingsInstalled: bindings.length,
  };
}

export function settlePlayerHandAtTurnEnd(
  deck: DeckState,
  lifecycleForInstance: (instance: CardInstance) => CardLifecycleSpec,
): HandSettlement {
  const retained: CardInstanceId[] = [];
  const exhausted: CardInstanceId[] = [];
  const discarded: CardInstanceId[] = [];

  for (const instanceId of deck.zones.hand) {
    const instance = deck.instances[instanceId];
    if (instance === undefined) {
      throw new Error(`Unknown card instance ${instanceId} in hand.`);
    }
    const lifecycle = lifecycleForInstance(instance);
    validateCardLifecycle(lifecycle);
    if (lifecycle.keywords.includes("fleeting")) {
      exhausted.push(instanceId);
    } else if (lifecycle.keywords.includes("retain")) {
      retained.push(instanceId);
    } else {
      discarded.push(instanceId);
    }
  }

  const next: DeckState = {
    ...deck,
    zones: {
      ...deck.zones,
      hand: retained,
      discard: [...deck.zones.discard, ...discarded],
      exhaust: [...deck.zones.exhaust, ...exhausted],
    },
  };
  assertCardConservation(next);
  return { deck: next, retained, exhausted, discarded };
}

export function endPlayerTurnWithCardLifecycle(
  state: AuthoritativeState,
  lifecycleForInstance: (instance: CardInstance) => CardLifecycleSpec,
): AuthoritativeState {
  const combat = requirePlayerCombat(state);
  const settled = settlePlayerHandAtTurnEnd(
    combat.deck,
    lifecycleForInstance,
  );
  return endPlayerTurnWithSettledHand(state, settled.deck);
}
