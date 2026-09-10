import type { CardInstance, CardInstanceId } from "./cards";
import {
  CARD_KEYWORDS,
  assertCardPlayable,
  endPlayerTurnWithCardLifecycle,
  finishCardPlayLifecycle,
  movePlayedCardForLifecycle,
  payCardCosts,
  type AdditionalHpCost,
  type CardKeyword,
  type CardLifecycleSpec,
  type FinishCardLifecycleResolution,
} from "./card-lifecycle";
import { gainEnergy, type CombatState } from "./combat";
import {
  applyDirectDamage,
  applyHpLossBypassingBlock,
  calculateAttackDamage,
  createDirectDamagePacket,
  gainBlock,
  healActor,
} from "./damage";
import { drawCards, type DeckState } from "./deck";
import { snapshotCardResolutionContext, swapCharacters, type CardCombatOwner } from "./duo";
import { boostImprintPotency, type Ingredient } from "./imprint";
import type { AuthoritativeState } from "./state";
import { applyCombatStatus } from "./status-runtime";
import { resolveTargetRule } from "./targeting";
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

const CARD_LIFECYCLE_KEYWORD_SET = new Set<string>(CARD_KEYWORDS);

function isCardLifecycleKeyword(keyword: string): keyword is CardKeyword {
  return CARD_LIFECYCLE_KEYWORD_SET.has(keyword);
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

function ownerFor(definition: CardDefinition, ownerCharacterId: string): CardCombatOwner {
  return definition.owner === "crew"
    ? { kind: "crew" }
    : { kind: "character", actorId: ownerCharacterId };
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
  // "liability" (Fine Print) is a content-only keyword the M11 lifecycle
  // does not need to know about; it is resolved separately by
  // endPlayerTurnWithContentCards before the M11 hand settlement runs. Widen
  // to a plain array first: the schema's fixed-length keyword tuple union
  // (including its zero-length variant) otherwise defeats filter's
  // narrowing overload.
  const keywords: readonly string[] = definition.keywords;
  return {
    category: definition.category,
    keywords: keywords.filter(isCardLifecycleKeyword),
    additionalHpCosts,
  };
}

export function isLiabilityCard(definition: CardDefinition): boolean {
  return (definition.keywords as readonly string[]).includes("liability");
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

function livingEnemyActorIds(combat: CombatState): readonly string[] {
  return combat.enemySpawnOrder.filter((actorId) => {
    const actor = combat.actors[actorId];
    return actor !== undefined && actor.side === "enemy" && actor.hp > 0;
  });
}

function resolveEffectTargetActorId(
  combat: CombatState,
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
  if (target === "front") {
    return resolveTargetRule(combat, { kind: "front" })[0];
  }
  if (target === "reserve") {
    return resolveTargetRule(combat, { kind: "reserve" })[0];
  }
  throw new Error(
    `Unsupported single-actor effect target for the content card executor: ${target}.`,
  );
}

function resolveEffectTargetActorIds(
  combat: CombatState,
  target: EffectTargetToken,
  context: CardEffectContext,
): readonly string[] {
  if (target === "all_enemies") {
    return livingEnemyActorIds(combat);
  }
  if (target === "both") {
    return resolveTargetRule(combat, { kind: "both" });
  }
  return [resolveEffectTargetActorId(combat, target, context)];
}

function compileProtocolTrigger(
  trigger: ProtocolTrigger,
  context: {
    readonly instanceId: CardInstanceId;
    readonly ownerActorId: string;
    readonly parameters: ReadonlyMap<string, number>;
  },
): TriggerBinding {
  if (trigger.effects.length !== 1) {
    throw new Error("The content card executor only supports a single-effect Protocol trigger.");
  }
  const [effect] = trigger.effects;
  if (effect.op !== "block") {
    throw new Error(
      `Unsupported Protocol trigger effect for the content card executor: ${effect.op}.`,
    );
  }
  if (trigger.limit.scope !== "turn") {
    throw new Error(
      `Unsupported Protocol trigger limit scope for the content card executor: ${trigger.limit.scope}.`,
    );
  }
  const amount = resolveValueExpr(effect.amount, context.parameters);

  if (trigger.event === "after_source_lead") {
    const filterKeys = Object.keys(trigger.filter);
    if (filterKeys.length !== 1 || trigger.filter.source_owner !== "source") {
      throw new Error(
        'The content card executor only supports an after_source_lead Protocol filtered by { "source_owner": "source" }.',
      );
    }
    if (effect.target !== "owner") {
      throw new Error(
        `Unsupported after_source_lead Protocol trigger effect target for the content card executor: ${effect.target}.`,
      );
    }
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

  if (trigger.event === "after_primary_reaction") {
    const filterKeys = Object.keys(trigger.filter);
    if (filterKeys.length !== 1 || trigger.filter.event !== "after_primary_reaction") {
      throw new Error(
        'The content card executor only supports an after_primary_reaction Protocol filtered by { "event": "after_primary_reaction" }.',
      );
    }
    if (effect.target !== "front") {
      throw new Error(
        `Unsupported after_primary_reaction Protocol trigger effect target for the content card executor: ${effect.target}.`,
      );
    }
    return {
      bindingVersion: TRIGGER_BINDING_VERSION,
      sourceId: `card.${context.instanceId}`,
      triggerId: "reaction_block",
      sourceActorId: context.ownerActorId,
      event: "primary_reaction",
      conditions: [],
      effects: [{ op: "gain_block", target: "current_front", amount }],
      limit: { scope: "turn", count: trigger.limit.count },
      priority: trigger.priority,
    };
  }

  throw new Error(
    `Unsupported Protocol trigger event for the content card executor: ${trigger.event}.`,
  );
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
        if (effect.category !== "attack" && effect.category !== "direct") {
          throw new Error(
            `Unsupported damage category for the content card executor: ${effect.category}.`,
          );
        }
        const amount = resolveValueExpr(effect.amount, context.parameters);
        const targetActorIds = resolveEffectTargetActorIds(
          requireActiveCombat(current),
          effect.target,
          context,
        );
        for (const targetActorId of targetActorIds) {
          if (current.combat?.outcome !== "active") {
            break;
          }
          for (let hit = 0; hit < effect.hits; hit += 1) {
            if (current.combat?.outcome !== "active") {
              break;
            }
            if (effect.category === "direct") {
              current = applyHpLossBypassingBlock(current, targetActorId, amount).state;
            } else {
              const attackerActorId = requireOwnerActorId(context);
              const combat = requireActiveCombat(current);
              const calculated = calculateAttackDamage(combat, attackerActorId, targetActorId, amount);
              current = applyDirectDamage(
                current,
                targetActorId,
                createDirectDamagePacket(calculated.amount),
              ).state;
            }
          }
        }
        break;
      }
      case "apply_status": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        const targetActorIds = resolveEffectTargetActorIds(
          requireActiveCombat(current),
          effect.target,
          context,
        );
        for (const targetActorId of targetActorIds) {
          current = applyCombatStatus(current, targetActorId, effect.status, amount);
        }
        break;
      }
      case "block": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        const targetActorIds = resolveEffectTargetActorIds(
          requireActiveCombat(current),
          effect.target,
          context,
        );
        for (const targetActorId of targetActorIds) {
          current = gainBlock(current, targetActorId, amount);
        }
        break;
      }
      case "heal": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        const targetActorIds = resolveEffectTargetActorIds(
          requireActiveCombat(current),
          effect.target,
          context,
        );
        for (const targetActorId of targetActorIds) {
          current = healActor(current, targetActorId, amount).state;
        }
        break;
      }
      case "gain_energy": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        current = gainEnergy(current, amount);
        break;
      }
      case "draw": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        const combat = requireActiveCombat(current);
        const draw = drawCards(combat.deck, current.rng, amount, combat.rules.maxHandSize);
        current = { ...current, rng: draw.rng, combat: { ...combat, deck: draw.deck } };
        break;
      }
      case "swap": {
        if (effect.mode !== "free") {
          throw new Error(`Unsupported swap mode for the content card executor: ${effect.mode}.`);
        }
        current = swapCharacters(current, "card_free").state;
        break;
      }
      case "boost_imprint": {
        const amount = resolveValueExpr(effect.amount, context.parameters);
        current = boostImprintPotency(current, amount);
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
  const owner = ownerFor(definition, input.ownerCharacterId);

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

export function endPlayerTurnWithContentCards(
  state: AuthoritativeState,
  definitionForInstance: (instance: CardInstance) => CardDefinition,
): AuthoritativeState {
  const initialCombat = requireActiveCombat(state);
  let current: AuthoritativeState = state;

  // Liability cards (for example Fine Print) act purely by sitting unplayed
  // in hand; DESIGN.md Section 2.8 resolves them before the ordinary M11
  // Fleeting/Retain/discard hand settlement. A liability effect can end
  // combat (it is HP loss that bypasses Block, like Bleed or Poison), so
  // this loop re-checks the outcome on every iteration and simply stops
  // settling the hand if the run just ended.
  for (const instanceId of initialCombat.deck.zones.hand) {
    if (current.combat?.outcome !== "active") {
      break;
    }
    const activeCombat = requireActiveCombat(current);
    const instance = activeCombat.deck.instances[instanceId];
    if (instance === undefined) {
      throw new Error(`Unknown card instance ${instanceId} in hand.`);
    }
    const definition = definitionForInstance(instance);
    if (!isLiabilityCard(definition)) {
      continue;
    }

    const owner = ownerFor(definition, instance.ownerCharacterId);
    const parameters = resolveCardParameters(definition, instance.upgradeLevel > 0);
    const effectContext: CardEffectContext = {
      instanceId: instance.instanceId,
      ownerActorId: owner.kind === "character" ? owner.actorId : null,
      selectedEnemyActorId: null,
      parameters,
    };
    current = applyCardBaseEffects(current, definition.effects, effectContext).state;
  }

  if (current.combat?.outcome !== "active") {
    return current;
  }

  return endPlayerTurnWithCardLifecycle(current, (instance) =>
    cardLifecycleSpecFor(definitionForInstance(instance), []),
  );
}
