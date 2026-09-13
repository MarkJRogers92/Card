import type { CombatState } from "./combat";
import { getReserveCharacterId } from "./targeting";
import type { AuthoritativeState } from "./state";
import {
  TRIGGER_EVENT_VERSION,
  dispatchTriggerEvent,
} from "./triggers";

export const FIRST_MANUAL_SWAP_COST = 0 as const;
export const ADDITIONAL_MANUAL_SWAP_COST = 1 as const;

export type CardCombatOwner =
  | { readonly kind: "character"; readonly actorId: string }
  | { readonly kind: "crew" };
export type CardPositionClassification = "lead" | "support" | "crew";
export type SwapMode = "manual" | "card_free";
export const CARD_RESOLUTION_CONTEXT_VERSION = 1 as const;

export interface CardResolutionContext {
  readonly contextVersion: typeof CARD_RESOLUTION_CONTEXT_VERSION;
  readonly owner: CardCombatOwner;
  readonly classification: CardPositionClassification;
}

export interface SwapResolution {
  readonly state: AuthoritativeState;
  readonly mode: SwapMode;
  readonly previousFrontCharacterId: string;
  readonly frontCharacterId: string;
  readonly energyPaid: number;
  readonly manualSwapsUsedThisTurn: number;
}

function requirePlayerCombat(state: AuthoritativeState): CombatState {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  if (state.combat.outcome !== "active") {
    throw new Error(`Combat is already ${state.combat.outcome}.`);
  }
  if (state.combat.phase !== "player") {
    throw new Error("Swaps can only resolve during the player phase.");
  }
  if (
    state.combat.playerCharacterIds === null ||
    state.combat.frontCharacterId === null
  ) {
    throw new Error("Player formation has not been initialized.");
  }
  return state.combat;
}

export function classifyCardPosition(
  combat: CombatState,
  owner: CardCombatOwner,
): CardPositionClassification {
  if (owner.kind === "crew") {
    return "crew";
  }
  if (combat.playerCharacterIds === null || combat.frontCharacterId === null) {
    throw new Error("Player formation has not been initialized.");
  }
  if (!combat.playerCharacterIds.includes(owner.actorId)) {
    throw new Error(`Card owner ${owner.actorId} is not part of the player duo.`);
  }
  return owner.actorId === combat.frontCharacterId ? "lead" : "support";
}

export function snapshotCardResolutionContext(
  state: AuthoritativeState,
  owner: CardCombatOwner,
): CardResolutionContext {
  if (state.combat === null || state.combat.outcome !== "active") {
    throw new Error("An active combat is required to snapshot a card play.");
  }
  if (state.combat.phase !== "player") {
    throw new Error("Cards can only be accepted during the player phase.");
  }
  return {
    contextVersion: CARD_RESOLUTION_CONTEXT_VERSION,
    owner,
    classification: classifyCardPosition(state.combat, owner),
  };
}

export function swapCharacters(
  state: AuthoritativeState,
  mode: SwapMode,
): SwapResolution {
  const combat = requirePlayerCombat(state);
  if (
    !Number.isSafeInteger(combat.manualSwapsUsedThisTurn) ||
    combat.manualSwapsUsedThisTurn < 0
  ) {
    throw new Error("manualSwapsUsedThisTurn must be a nonnegative safe integer.");
  }
  const previousFrontCharacterId = combat.frontCharacterId as string;
  const frontCharacterId = getReserveCharacterId(combat);
  const manual = mode === "manual";
  const energyPaid =
    manual && combat.manualSwapsUsedThisTurn > 0
      ? ADDITIONAL_MANUAL_SWAP_COST
      : FIRST_MANUAL_SWAP_COST;
  if (energyPaid > combat.energy) {
    throw new Error(
      `Insufficient Energy for manual swap: cost ${energyPaid}, available ${combat.energy}.`,
    );
  }
  const manualSwapsUsedThisTurn =
    combat.manualSwapsUsedThisTurn + (manual ? 1 : 0);
  const nextCombat: CombatState = {
    ...combat,
    frontCharacterId,
    energy: combat.energy - energyPaid,
    manualSwapsUsedThisTurn,
  };
  let nextState: AuthoritativeState = { ...state, combat: nextCombat };
  if (nextCombat.triggerBindings.length > 0) {
    nextState = dispatchTriggerEvent(nextState, {
      eventVersion: TRIGGER_EVENT_VERSION,
      kind: "after_swap",
      incomingFrontActorId: frontCharacterId,
      mode,
      energyPaid,
    }).state;
  }
  return {
    state: nextState,
    mode,
    previousFrontCharacterId,
    frontCharacterId,
    energyPaid,
    manualSwapsUsedThisTurn,
  };
}
