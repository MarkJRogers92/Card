import { gainEnergy, type CombatState } from "./combat";
import {
  MATERIAL_INGREDIENT_IDS,
  FORM_INGREDIENT_IDS,
  boostImprintPotency,
  type Imprint,
  type Ingredient,
} from "./imprint";
import {
  REACTION_RECIPES,
  type PrimaryReactionResolution,
} from "./reactions";
import {
  scheduleReactionPacket,
  type ScheduledReactionEffect,
} from "./scheduled";
import type { AuthoritativeState } from "./state";
import {
  collectApplicableModifiers,
  type ModifierBinding,
  type ModifierContext,
} from "./triggers";
import { DAMAGE_MULTIPLIER_BASIS } from "./damage";

export const IMPRINT_REINFORCEMENT_BONUS_CHANNEL = "imprint.reinforce_bonus" as const;
export const POTENCY_THREE_REACTION_ENERGY_CHANNEL =
  "reaction.potency3.energy_refund" as const;
export const FIRST_GRAFTED_CARD_ENERGY_COST_CHANNEL =
  "card.energy_cost.first_grafted" as const;
export const LOOP_REACTION_DELAYED_COPY_CHANNEL =
  "reaction.loop.delayed_copy_bps" as const;
export const CARD_REWARD_OPTION_COUNT_CHANNEL = "reward.card.option_count" as const;
export const BASE_CARD_REWARD_OPTION_COUNT = 3 as const;

export interface ImprintReinforcementRelicInput {
  readonly previousImprint: Imprint | null;
  readonly ownerCharacterId: string;
  readonly ingredient: Ingredient;
}

export interface PrimaryReactionRelicResolution {
  readonly state: AuthoritativeState;
  readonly energyGained: number;
  readonly additionalScheduledPacketIds: readonly string[];
}

export interface GraftedCardEnergyCostResolution {
  readonly state: AuthoritativeState;
  readonly cost: number;
  readonly discount: number;
}

function assertSafeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer.`);
  }
}

function assertNonnegativeInteger(label: string, value: number): void {
  assertSafeInteger(label, value);
  if (value < 0) {
    throw new RangeError(`${label} must be nonnegative.`);
  }
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

function applyIntegerModifiers(
  baseValue: number,
  modifiers: readonly ModifierBinding[],
): number {
  assertSafeInteger("Modifier base value", baseValue);
  let current = baseValue;
  for (const modifier of modifiers) {
    assertSafeInteger("Modifier value", modifier.value);
    if (modifier.operation === "add") {
      current += modifier.value;
    } else if (modifier.operation === "set") {
      current = modifier.value;
    } else if (modifier.operation === "cap") {
      current = Math.min(current, modifier.value);
    } else {
      const multiplied =
        (BigInt(current) * BigInt(modifier.value)) /
        BigInt(DAMAGE_MULTIPLIER_BASIS);
      if (
        multiplied > BigInt(Number.MAX_SAFE_INTEGER) ||
        multiplied < BigInt(Number.MIN_SAFE_INTEGER)
      ) {
        throw new RangeError("Modified integer exceeds the safe integer range.");
      }
      current = Number(multiplied);
    }
    assertSafeInteger("Modified integer", current);
  }
  return current;
}

function modifierUseKey(modifier: ModifierBinding): string {
  return `modifier-use::${modifier.sourceId}::${modifier.modifierId}`;
}

function unusedTurnModifiers(
  combat: CombatState,
  channel: string,
  context: ModifierContext = {},
): readonly ModifierBinding[] {
  return collectApplicableModifiers(combat.modifierBindings, channel, context).filter(
    (modifier) => (combat.triggerCounters.turn[modifierUseKey(modifier)] ?? 0) === 0,
  );
}

function consumeTurnModifiers(
  state: AuthoritativeState,
  modifiers: readonly ModifierBinding[],
): AuthoritativeState {
  if (modifiers.length === 0) return state;
  const combat = requireActiveCombat(state);
  const turn = { ...combat.triggerCounters.turn };
  for (const modifier of modifiers) {
    turn[modifierUseKey(modifier)] = 1;
  }
  return {
    ...state,
    combat: {
      ...combat,
      triggerCounters: { ...combat.triggerCounters, turn },
    },
  };
}

function reactionFormIngredient(
  reaction: PrimaryReactionResolution,
): Ingredient {
  for (const material of MATERIAL_INGREDIENT_IDS) {
    for (const form of FORM_INGREDIENT_IDS) {
      const recipe = REACTION_RECIPES[material][form];
      if (recipe.id === reaction.recipeId) {
        return { kind: "form", id: recipe.form, prime: 1 };
      }
    }
  }
  throw new Error(`Unknown Reaction recipe: ${reaction.recipeId}.`);
}

function scaleOutput(value: number, multiplierBps: number): number {
  assertNonnegativeInteger("Repeat output", value);
  assertNonnegativeInteger("Repeat multiplier", multiplierBps);
  const result =
    (BigInt(value) * BigInt(multiplierBps)) /
    BigInt(DAMAGE_MULTIPLIER_BASIS);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Scaled repeat output exceeds the safe integer range.");
  }
  return Number(result);
}

function scaledScheduledEffects(
  effects: readonly ScheduledReactionEffect[],
  multiplierBps: number,
): ScheduledReactionEffect[] {
  const result: ScheduledReactionEffect[] = [];
  for (const effect of effects) {
    if (effect.op === "reaction_damage") {
      const amountBeforeTargetModifiers = scaleOutput(
        effect.amountBeforeTargetModifiers,
        multiplierBps,
      );
      if (amountBeforeTargetModifiers === 0) continue;
      result.push({ ...effect, amountBeforeTargetModifiers });
      continue;
    }
    const amount = scaleOutput(effect.amount, multiplierBps);
    if (amount === 0) continue;
    result.push({ ...effect, amount });
  }
  return result;
}

export function applyImprintReinforcementRelics(
  state: AuthoritativeState,
  input: ImprintReinforcementRelicInput,
): AuthoritativeState {
  const combat = requireActiveCombat(state);
  const previous = input.previousImprint;
  if (
    previous === null ||
    previous.ownerCharacterId !== input.ownerCharacterId ||
    previous.ingredient.kind !== input.ingredient.kind ||
    previous.ingredient.id !== input.ingredient.id
  ) {
    return state;
  }

  const modifiers = collectApplicableModifiers(
    combat.modifierBindings,
    IMPRINT_REINFORCEMENT_BONUS_CHANNEL,
    { ingredient: input.ingredient },
  );
  const bonus = applyIntegerModifiers(0, modifiers);
  if (bonus <= 0) return state;
  return boostImprintPotency(state, bonus);
}

export function applyPrimaryReactionRelics(
  state: AuthoritativeState,
  reaction: PrimaryReactionResolution,
): PrimaryReactionRelicResolution {
  let current = state;
  let energyGained = 0;
  const additionalScheduledPacketIds: string[] = [];

  if (reaction.potency === 3 && current.combat?.outcome === "active") {
    const combat = requireActiveCombat(current);
    const modifiers = unusedTurnModifiers(
      combat,
      POTENCY_THREE_REACTION_ENERGY_CHANNEL,
      { event: "primary_reaction_potency_3" },
    );
    if (modifiers.length > 0) {
      const amount = Math.max(0, applyIntegerModifiers(0, modifiers));
      current = consumeTurnModifiers(current, modifiers);
      if (amount > 0) {
        current = gainEnergy(current, amount);
        energyGained = amount;
      }
    }
  }

  if (current.combat?.outcome === "active") {
    const formIngredient = reactionFormIngredient(reaction);
    const combat = requireActiveCombat(current);
    const modifiers = unusedTurnModifiers(
      combat,
      LOOP_REACTION_DELAYED_COPY_CHANNEL,
      { ingredient: formIngredient },
    );
    if (modifiers.length > 0) {
      const multiplierBps = Math.max(0, applyIntegerModifiers(0, modifiers));
      current = consumeTurnModifiers(current, modifiers);
      const originalPacketIds = [...reaction.scheduledPacketIds];
      for (const packetId of originalPacketIds) {
        if (current.combat?.outcome !== "active") break;
        const packet = current.combat?.scheduledPackets.find(
          (candidate) => candidate.packetId === packetId,
        );
        if (packet === undefined) continue;
        const effects = scaledScheduledEffects(packet.effects, multiplierBps);
        if (effects.length === 0) continue;
        const scheduled = scheduleReactionPacket(
          current,
          packet.sourceRecipeId,
          packet.targetActorId,
          effects,
        );
        current = scheduled.state;
        additionalScheduledPacketIds.push(scheduled.packet.packetId);
      }
    }
  }

  return { state: current, energyGained, additionalScheduledPacketIds };
}

export function resolveFirstGraftedCardEnergyCost(
  state: AuthoritativeState,
  baseCost: number,
  cardTags: readonly string[],
): GraftedCardEnergyCostResolution {
  assertNonnegativeInteger("Card Energy cost", baseCost);
  const combat = requireActiveCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Grafted-card Energy cost modifiers require the player phase.");
  }
  const modifiers = unusedTurnModifiers(
    combat,
    FIRST_GRAFTED_CARD_ENERGY_COST_CHANNEL,
    { cardTags },
  );
  if (modifiers.length === 0) {
    return { state, cost: baseCost, discount: 0 };
  }
  const modified = Math.max(0, applyIntegerModifiers(baseCost, modifiers));
  const current = consumeTurnModifiers(state, modifiers);
  return {
    state: current,
    cost: modified,
    discount: baseCost - modified,
  };
}

export function resolveCardRewardOptionCount(
  modifierBindings: readonly ModifierBinding[],
  baseCount = BASE_CARD_REWARD_OPTION_COUNT,
): number {
  assertNonnegativeInteger("Base card reward option count", baseCount);
  const modifiers = collectApplicableModifiers(
    modifierBindings,
    CARD_REWARD_OPTION_COUNT_CHANNEL,
  );
  const result = applyIntegerModifiers(baseCount, modifiers);
  if (!Number.isSafeInteger(result) || result <= 0) {
    throw new RangeError("Card reward option count must remain positive.");
  }
  return result;
}
