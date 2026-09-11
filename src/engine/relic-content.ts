import type { RelicDefinition } from "../content/generated";
import { resolveValueExpr } from "./card-content";
import type { Ingredient } from "./imprint";
import type { AuthoritativeState } from "./state";
import {
  MODIFIER_BINDING_VERSION,
  TRIGGER_BINDING_VERSION,
  appendSetupModifierBindings,
  appendSetupTriggerBindings,
  type ModifierBinding,
  type ModifierCondition,
  type TriggerBinding,
  type TriggerCondition,
  type TriggerEffect,
  type TriggerEventKind,
  type TriggerLimitScope,
} from "./triggers";

type RelicModifier = RelicDefinition["modifiers"][number];
type RelicTrigger = RelicDefinition["triggers"][number];
type RelicEffect = RelicTrigger["effects"][number];

export interface CompiledRelicContent {
  readonly modifierBindings: readonly ModifierBinding[];
  readonly triggerBindings: readonly TriggerBinding[];
}

function compileCondition(condition: RelicModifier["condition"]): ModifierCondition | null {
  if (condition === null) return null;
  if (condition.target_has_status !== undefined) {
    return { targetHasStatus: condition.target_has_status };
  }
  if (condition.source_owner !== undefined) return { sourceOwner: condition.source_owner };
  if (condition.ingredient !== undefined) {
    return { ingredient: { ...condition.ingredient, prime: 1 } as Ingredient };
  }
  if (condition.event !== undefined) return { event: condition.event };
  if (condition.has_card_tag !== undefined) return { hasCardTag: condition.has_card_tag };
  throw new Error("Relic modifier condition is empty.");
}

function compileEvent(event: RelicTrigger["event"]): TriggerEventKind {
  if (event === "after_primary_reaction") return "primary_reaction";
  if (event === "after_swap" || event === "card_played" || event === "card_play_cost") {
    return event;
  }
  throw new Error(`Unsupported relic trigger event: ${event}.`);
}

function compileLimit(scope: RelicTrigger["limit"]["scope"]): TriggerLimitScope {
  if (scope === "command" || scope === "turn" || scope === "combat") return scope;
  throw new Error(`Unsupported combat relic trigger limit scope: ${scope}.`);
}

function constAmount(effect: Extract<RelicEffect, { op: "block" }>): number {
  return resolveValueExpr(effect.amount, new Map());
}

function constAmountFor(
  effect: { readonly amount: Parameters<typeof resolveValueExpr>[0] },
): number {
  return resolveValueExpr(effect.amount, new Map());
}

function compileEffect(
  effect: RelicEffect,
  event: RelicTrigger["event"],
  filterEvent: string | undefined,
): TriggerEffect {
  if (effect.op === "repeat_reaction_packet") {
    return { op: "repeat_largest_reaction_damage", multiplierBps: effect.multiplierBps };
  }
  if (effect.op === "repeat_scheduled_packet") {
    return { op: "repeat_scheduled_packet", multiplierBps: effect.multiplierBps };
  }
  if (effect.op === "gain_energy") {
    return { op: "gain_energy", amount: constAmountFor(effect) };
  }
  if (effect.op === "reduce_card_cost") {
    return { op: "reduce_card_cost", amount: constAmountFor(effect) };
  }
  if (effect.op === "block" && effect.target === "front") {
    const amount = constAmount(effect);
    if (filterEvent === "primary_reaction_applied_bleed") {
      return { op: "gain_block_per_bleed_target", target: "current_front", amountPerTarget: amount };
    }
    if (event === "after_swap") {
      return { op: "gain_block", target: "incoming_front", amount };
    }
    if (event === "after_primary_reaction") {
      return { op: "gain_block", target: "current_front", amount };
    }
  }
  throw new Error(`Unsupported relic trigger effect: ${effect.op}.`);
}

function compileFilterConditions(
  trigger: RelicTrigger,
): readonly TriggerCondition[] {
  const filter = trigger.filter;
  if (filter.event !== undefined) {
    if (trigger.event === "after_primary_reaction") {
      if (filter.event === "primary_reaction_potency_3") {
        return [{ kind: "reaction_potency", value: 3 }];
      }
      if (
        filter.event === "after_primary_reaction" ||
        filter.event === "primary_reaction_applied_bleed"
      ) {
        return [];
      }
      throw new Error(`Unsupported primary reaction relic filter: ${filter.event}.`);
    }
    if (filter.event === trigger.event) {
      return [];
    }
    throw new Error(`Unsupported ${trigger.event} relic trigger filter: ${filter.event}.`);
  }
  if (filter.ingredient !== undefined) {
    return [
      {
        kind: "ingredient",
        ingredient: { ...filter.ingredient, prime: 1 } as Ingredient,
      },
    ];
  }
  if (filter.has_card_tag !== undefined) {
    return [{ kind: "has_card_tag", value: filter.has_card_tag }];
  }
  throw new Error("M14 relic triggers require a supported event filter.");
}

function compileModifier(
  definition: RelicDefinition,
  modifier: RelicModifier,
  index: number,
): ModifierBinding {
  return {
    bindingVersion: MODIFIER_BINDING_VERSION,
    sourceId: definition.id,
    modifierId: `modifier.${index + 1}`,
    channel: modifier.channel,
    condition: compileCondition(modifier.condition),
    operation: modifier.operation,
    value: modifier.value,
    priority: modifier.priority,
  };
}

function compileTrigger(
  definition: RelicDefinition,
  trigger: RelicTrigger,
  index: number,
): TriggerBinding {
  if (trigger.limit.keying !== "relic_instance") {
    throw new Error(`Unsupported combat relic trigger keying: ${trigger.limit.keying}.`);
  }
  const conditions = compileFilterConditions(trigger);
  return {
    bindingVersion: TRIGGER_BINDING_VERSION,
    sourceId: definition.id,
    triggerId: `trigger.${index + 1}`,
    sourceActorId: null,
    event: compileEvent(trigger.event),
    conditions,
    effects: trigger.effects.map((effect) =>
      compileEffect(effect, trigger.event, trigger.filter.event),
    ),
    limit: { scope: compileLimit(trigger.limit.scope), count: trigger.limit.count },
    priority: trigger.priority,
  };
}

export function compileRelicContent(
  definitions: readonly RelicDefinition[],
): CompiledRelicContent {
  const seen = new Set<string>();
  const modifierBindings: ModifierBinding[] = [];
  const triggerBindings: TriggerBinding[] = [];
  for (const definition of definitions) {
    if (seen.has(definition.id)) throw new Error(`Duplicate relic definition: ${definition.id}.`);
    seen.add(definition.id);
    modifierBindings.push(
      ...definition.modifiers.map((modifier, index) => compileModifier(definition, modifier, index)),
    );
    triggerBindings.push(
      ...definition.triggers.map((trigger, index) => compileTrigger(definition, trigger, index)),
    );
  }
  return { modifierBindings, triggerBindings };
}

function installedBindingSourceIds(state: AuthoritativeState): ReadonlySet<string> {
  const combat = state.combat;
  const sourceIds = new Set<string>();
  if (combat === null) {
    return sourceIds;
  }
  for (const binding of combat.modifierBindings) {
    sourceIds.add(binding.sourceId);
  }
  for (const binding of combat.triggerBindings) {
    sourceIds.add(binding.sourceId);
  }
  return sourceIds;
}

export function installRelicContent(
  state: AuthoritativeState,
  definitions: readonly RelicDefinition[],
): AuthoritativeState {
  // Relics are unique within a run, so a relic that already owns bindings in this
  // combat must not gain a second, differently keyed binding set. Without this
  // check a relic that also exists as a setup-time passive (Shared Warranty)
  // would silently resolve twice and double its printed effect.
  const installedSourceIds = installedBindingSourceIds(state);
  for (const definition of definitions) {
    if (installedSourceIds.has(definition.id)) {
      throw new Error(
        `Relic ${definition.id} is already installed for this combat. ` +
          "Relics are unique within a run; remove the duplicate initial passive or relic binding first.",
      );
    }
  }
  const compiled = compileRelicContent(definitions);
  let current = appendSetupModifierBindings(state, compiled.modifierBindings);
  current = appendSetupTriggerBindings(current, compiled.triggerBindings);
  return current;
}
