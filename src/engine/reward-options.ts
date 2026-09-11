import type { AuthoritativeState } from "./state";
import { collectApplicableModifiers } from "./triggers";

// Shared channel contract between this module and relic-content.ts's compiler.
export const REWARD_CARD_OPTION_COUNT_CHANNEL = "reward.card_options" as const;
export const BASE_CARD_REWARD_OPTIONS = 3 as const;

/**
 * The number of card options a card reward offers.
 *
 * M15 exposes the modifier channel so Blank Badge is real, tested state rather
 * than inert data; M18's reward engine is the consumer.
 */
export function cardRewardOptionCount(state: AuthoritativeState): number {
  const combat = state.combat;
  if (combat === null) {
    return BASE_CARD_REWARD_OPTIONS;
  }
  const modifiers = collectApplicableModifiers(
    combat.modifierBindings,
    REWARD_CARD_OPTION_COUNT_CHANNEL,
  );
  let count: number = BASE_CARD_REWARD_OPTIONS;
  for (const modifier of modifiers) {
    if (modifier.operation === "set") {
      count = modifier.value;
      continue;
    }
    if (modifier.operation === "add") {
      count += modifier.value;
      continue;
    }
    throw new Error(
      `Unsupported ${REWARD_CARD_OPTION_COUNT_CHANNEL} modifier operation: ${modifier.operation}.`,
    );
  }
  return Math.max(0, count);
}
