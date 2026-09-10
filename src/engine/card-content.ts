import type { CardInstanceId } from "./cards";
import {
  assertCardPlayable,
  finishCardPlayLifecycle,
  movePlayedCardForLifecycle,
  payCardCosts,
  type AdditionalHpCost,
  type CardLifecycleSpec,
  type FinishCardLifecycleResolution,
} from "./card-lifecycle";
import { gainEnergy, type CombatState } from "./combat";
import {
  applyDirectDamage,
  calculateAttackDamage,
  createDirectDamagePacket,
  gainBlock,
  healActor,
} from "./damage";
import type { DeckState } from "./deck";
import { snapshotCardResolutionContext, type CardCombatOwner } from "./duo";
import type { Ingredient } from "./imprint";
import type { AuthoritativeState } from "./state";
import { applyCombatStatus } from "./status-runtime";
import { TRIGGER_BINDING_VERSION, type TriggerBinding } from "./triggers";
import type { CardDefinition } from "../content/generated";

// This module is the generic bridge between validated content-schema card
// definitions (schemas/card.schema.json) and the M11 card lifecycle plus the
// existing M03-M09 engine primitives. It dispatches purely on `effect.op` and
// the M11 keyword/category contract -- never on a card ID -- so any future
// content-defined card (Shaper, Crew, ...) can reuse it unchanged.

type CardEffect = CardDefinition["effects"][number];
type CardValueExpr = CardDefinition["energyCost"];
type ProtocolTrigger = Extract<CardEffect, { op: "install_protocol" }>["trigger"];
type EffectTargetToken =
  | "selected_enemy"
  | "all_enemies"
  | "front"
  | "reserve"
  | "both"
  | "locked_character"
  | "self"
  | "owner"
  | "intent_target"
  | "none";

export interface CardEffectContext {
  readonly instanceId: CardInstanceId;
  readonly ownerActorId: string | null;
  readonly selectedEnemyActorId: string | null;
  readonly parameters: ReadonlyMap<string, number>;
}

export interface CardBaseEffectsResult {
  readonly state: AuthoritativeState;
  readonly protocolBindings: readonly TriggerBinding[];
}

export interface PlayContentCardInput {
  readonly instanceId: CardInstanceId;
  readonly definition: CardDefinition;
  readonly upgraded: boolean;
  readonly ownerCharacterId: string;
  readonly selectedEnemyActorId: string | null;
}

function requireActiveCombat(state: AuthoritativeState): CombatState {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  if (state.combat.outcome !== "active") {
    throw new Error(`Combat is already ${state.combat.outcome}.`);
  }
  return state.combat;
}

function stateWithDeck(state: AuthoritativeState, deck: DeckState): AuthoritativeState {
  const combat = requireActiveCombat(state);
  return { ...state, combat: { ...combat, deck } };
}

export function resolveValueExpr(
  expr: CardValueExpr,
  parameters: ReadonlyMap<string, number>,
): number {
  if ("const" in expr) {
    return expr.const;
  }
  if ("param" in expr) {
    const value = parameters.get(expr.param);
    if (value === undefined) {
      throw new Error(`Unknown card parameter: ${expr.param}.`);
    }
    return value;
  }
  if ("add" in expr) {
    return (
      resolveValueExpr(expr.add[0] as CardValueExpr, parameters) +
      resolveValueExpr(expr.add[1] as CardValueExpr, parameters)
    );
  }
  if ("multiply" in expr) {
    return (
      resolveValueExpr(expr.multiply[0] as CardValueExpr, parameters) *
      resolveValueExpr(expr.multiply[1] as CardValueExpr, parameters)
    );
  }
  throw new Error(
    `Stat-based value expressions are not yet supported by the content card executor: ${String(expr.stat)}.`,
  );
}

export function resolveCardParameters(
  definition: CardDefinition,
  upgraded: boolean,
): Map<string, number> {
  const parameters = new Map<string, number>();
  for (const [name, value] of Object.entries(definition.parameters)) {
    parameters.set(name, upgraded ? value.upgraded : value.base);
  }
  return parameters;
}

export function resolveAdditionalHpCosts(
  definition: CardDefinition,
  parameters: ReadonlyMap<string, number>,
): AdditionalHpCost[] {
  return definition.additionalCosts.map((cost) => {
    if (
      cost.resource !== "owner_hp" &&
      cost.resource !== "front_hp" &&
      cost.resource !== "reserve_hp"
    ) {
      throw new Error(
        `Unsupported additional cost resource for the content card executor: ${cost.resource}.`,
      );
    }
    return {
      resource: cost.resource,
      amount: resolveValueExpr(cost.amount, parameters),
      minimumRemaining: cost.minimumRemaining,
    };
  });
}

export function cardLifecycleSpecFor(
  definition: CardDefinition,
  additionalHpCosts: readonly AdditionalHpCost[],
): CardLifecycleSpec {
  return {
    category: definition.category,
    keywords: definition.keywords,
    additionalHpCosts,
  };
}

function resolveIngredient(
  definition: CardDefinition,
  parameters: ReadonlyMap<string, number>,
): Ingredient | null {
  if (definition.ingredient === null) {
    return null;
  }
  const prime = resolveValueExpr(definition.ingredient.prime, parameters);
  return { kind: definition.ingredient.kind, id: definition.ingredient.id, prime } as Ingredient;
}

function requireOwnerActorId(context: CardEffectContext): string {
  if (context.ownerActorId === null) {
    throw new Error("This card effect requires a character-owned card.");
  }
  return context.ownerActorId;
}

function resolveEffectTargetActorId(
  target: EffectTargetToken,
  context: CardEffectContext,
): string {
  if (target === "selected_enemy") {
    if (context.selectedEnemyActorId === null) {
      throw new Error("This card effect requires a selected enemy target.");
    }
    return context.selectedEnemyActorId;
  }
  if (target === "owner") {
    return requireOwnerActorId(context);
  }
  throw new Error(`Unsupported effect target for the content card executor: ${target}.`);
}

function compileProtocolTrigger(
  trigger: ProtocolTrigger,
  context: { readonly instanceId: CardInstanceId; readonly ownerActorId: string; readonly parameters: ReadonlyMap<string, number> },
): TriggerBinding {
  if (trigger.event !== "after_source_lead") {
    throw new Error(
      `Unsupported Protocol trigger event for the content card executor: ${trigger.event}.`,
    );
  }
  const filterKeys = Object.keys(trigger.filter);
  if (filterKeys.length !== 1 || trigger.filter.source_owner !== "source") {
    throw new Error(
      'The content card executor only supports an after_source_lead Protocol filtered by { "source_owner": "source" }.',
    );
  }
  if (trigger.effects.length !== 1) {
    throw new Error("The content card executor only supports a single-effect Protocol trigger.");
  }
  const [effect] = trigger.effects;
  if (effect.op !== "block") {
    throw new Error(
      `Unsupported Protocol trigger effect for the content card executor: ${effect.op}.`,
    );
  }
  if (effect.target !== "owner") {
    throw new Error(
      `Unsupported Protocol trigger effect target for the content card executor: ${effect.target}.`,
    );
  }
  if (trigger.limit.scope !== "turn") {
    throw new Error(
      `Unsupported Protocol trigger limit scope for the content card executor: ${trigger.limit.scope}.`,
    );
  }

  const amount = resolveValueExpr(effect.amount, context.parameters);

  return {
    bindingVersion: TRIGGER_BINDING_VERSION,
    sourceId: `card.${context.instanceId}`,
    triggerId: "lead_block",
    sourceActorId: context.ownerActorId,
    event: "card_played",
    conditions: [
      { kind: "card_owner", actorId: context.ownerActorId },
      { kind: "classification", value: "lead" },
    ],
    effects: [{ op: "gain_block", target: "source_actor", amount }],
    limit: { scope: "turn", count: trigger.limit.count },
    priority: trigger.priority,
  };
}

export function applyCardBaseEffects(
  state: AuthoritativeState,
  effects: readonly CardEffect[],
  context: CardEffectContext,
): CardBaseEffectsResult {
  let current = state;
  const protocolBindings: TriggerBinding[] = [];

  for (const effect of effects) {
    if (current.combat?.outcome !== "active") {
      break;
    }

    switch (effect.op) {
      case "damage": {
        if (effect.category !== "attack") {
          throw new Error(
            `Unsupported damage category for the content card executor: ${effect.category}.`,
          );
        }
        const attackerActorId = requireOwnerActorId(context);
        const targetActorId = resolveEffectTargetActorId(effect.target, context);
        const amount = resolveValueExpr(effect.amount, context.parameters);
        for (let hit = 0; hit < effect.hits; hit += 1) {
          if (current.combat?.outcome !== "active") {
            break;
          }
          const combat = requireActiveCombat(current);
          const calculated = calculateAttackDamage(combat, attackerActorId, targetActorId, amount);
          current = applyDirectDamage(
            current,
            targetActorId,
            createDirectDamagePacket(calculated.amount),
          ).state;
        }
        break;
      }
      case "apply_status": {
        const targetActorId = resolveEffectTargetActorId(effect.target, context);
        const amount = resolveValueExpr(effect.amount, context.parameters);
        current = applyCombatStatus(current, targetActorId, effect.status, amount);
        break;
      }
      case "block": {
        const targetActorId = resolveEffectTargetActorId(effect.target, context);
        const amount = resolveValueExpr(effect.amount, context.parameters);
        current = gainBlock(current, targetActorId, amount);
        break;
      }
      case "heal": {
        const targetActorId = resolveEffectTargetActorId(effect.target, context);
        const amount = resolveValueExpr(effect.amount, context.parameters);
        current = healActor(current, targetActorId, amount).state;
        break;
      }
      case "gain_energy": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        current = gainEnergy(current, amount);
        break;
      }
      case "install_protocol": {
        protocolBindings.push(
          compileProtocolTrigger(effect.trigger, {
            instanceId: context.instanceId,
            ownerActorId: requireOwnerActorId(context),
            parameters: context.parameters,
          }),
        );
        break;
      }
      default:
        throw new Error(
          `Unsupported card effect operation for the content card executor: ${effect.op}.`,
        );
    }
  }

  return { state: current, protocolBindings };
}

export function playContentCard(
  state: AuthoritativeState,
  input: PlayContentCardInput,
): FinishCardLifecycleResolution {
  const { definition } = input;
  const owner: CardCombatOwner =
    definition.owner === "crew"
      ? { kind: "crew" }
      : { kind: "character", actorId: input.ownerCharacterId };

  const cardContext = snapshotCardResolutionContext(state, owner);
  const parameters = resolveCardParameters(definition, input.upgraded);
  const additionalHpCosts = resolveAdditionalHpCosts(definition, parameters);
  const lifecycle = cardLifecycleSpecFor(definition, additionalHpCosts);
  const energyCost = resolveValueExpr(definition.energyCost, parameters);

  assertCardPlayable(state, input.instanceId, lifecycle);
  let current = payCardCosts(state, owner, energyCost, additionalHpCosts);
  current = stateWithDeck(
    current,
    movePlayedCardForLifecycle(requireActiveCombat(current).deck, input.instanceId, lifecycle),
  );

  const effectContext: CardEffectContext = {
    instanceId: input.instanceId,
    ownerActorId: owner.kind === "character" ? owner.actorId : null,
    selectedEnemyActorId: input.selectedEnemyActorId,
    parameters,
  };
  const base = applyCardBaseEffects(current, definition.effects, effectContext);
  current = base.state;

  const ingredient = resolveIngredient(definition, parameters);

  return finishCardPlayLifecycle(current, {
    instanceId: input.instanceId,
    lifecycle,
    postCard: {
      cardContext,
      ingredient,
      selectedEnemyActorId: input.selectedEnemyActorId,
    },
    protocolBindings: base.protocolBindings,
  });
}
