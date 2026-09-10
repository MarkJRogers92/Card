import type { CardInstance } from "./cards";
import {
  assertCardConservation,
  createDeckState,
  discardHand,
  drawCards,
  shuffleDrawPile,
  type DeckState,
} from "./deck";
import type { AuthoritativeState } from "./state";

export const COMBAT_STATE_VERSION = 1 as const;
export const DEFAULT_ENERGY_PER_TURN = 3 as const;
export const DEFAULT_CARDS_PER_TURN = 5 as const;
export const DEFAULT_MAX_HAND_SIZE = 10 as const;

export type CombatPhase = "setup" | "player" | "enemy";

export interface CombatRules {
  readonly energyPerTurn: number;
  readonly cardsPerTurn: number;
  readonly maxHandSize: number;
}

export interface CombatState {
  readonly combatVersion: typeof COMBAT_STATE_VERSION;
  readonly turnNumber: number;
  readonly phase: CombatPhase;
  readonly energy: number;
  readonly rules: CombatRules;
  readonly deck: DeckState;
}

export interface CombatRuleOverrides {
  readonly energyPerTurn?: number;
  readonly cardsPerTurn?: number;
  readonly maxHandSize?: number;
}

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

function createRules(overrides: CombatRuleOverrides = {}): CombatRules {
  const rules: CombatRules = {
    energyPerTurn: overrides.energyPerTurn ?? DEFAULT_ENERGY_PER_TURN,
    cardsPerTurn: overrides.cardsPerTurn ?? DEFAULT_CARDS_PER_TURN,
    maxHandSize: overrides.maxHandSize ?? DEFAULT_MAX_HAND_SIZE,
  };
  assertNonnegativeInteger("energyPerTurn", rules.energyPerTurn);
  assertNonnegativeInteger("cardsPerTurn", rules.cardsPerTurn);
  assertNonnegativeInteger("maxHandSize", rules.maxHandSize);
  return rules;
}

function requireCombat(state: AuthoritativeState): CombatState {
  if (state.combat === null) {
    throw new Error("No combat is active.");
  }
  return state.combat;
}

export function startCombat(
  state: AuthoritativeState,
  cards: readonly CardInstance[],
  rules: CombatRuleOverrides = {},
): AuthoritativeState {
  if (state.combat !== null) {
    throw new Error("Combat is already active.");
  }

  const createdDeck = createDeckState(cards);
  const shuffled = shuffleDrawPile(createdDeck, state.rng);
  const combat: CombatState = {
    combatVersion: COMBAT_STATE_VERSION,
    turnNumber: 0,
    phase: "setup",
    energy: 0,
    rules: createRules(rules),
    deck: shuffled.deck,
  };
  assertCardConservation(combat.deck);

  return {
    ...state,
    rng: shuffled.rng,
    combat,
  };
}

export function beginPlayerTurn(state: AuthoritativeState): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase === "player") {
    throw new Error("Player turn is already active.");
  }
  if (combat.phase !== "setup" && combat.phase !== "enemy") {
    throw new Error(`Cannot begin a player turn from phase ${combat.phase}.`);
  }

  const draw = drawCards(
    combat.deck,
    state.rng,
    combat.rules.cardsPerTurn,
    combat.rules.maxHandSize,
  );
  const nextCombat: CombatState = {
    ...combat,
    turnNumber: combat.turnNumber + 1,
    phase: "player",
    energy: combat.rules.energyPerTurn,
    deck: draw.deck,
  };
  assertCardConservation(nextCombat.deck);

  return {
    ...state,
    rng: draw.rng,
    combat: nextCombat,
  };
}

export function payEnergyCost(
  state: AuthoritativeState,
  cost: number,
): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Energy costs can only be paid during the player phase.");
  }
  assertNonnegativeInteger("Energy cost", cost);
  if (cost > combat.energy) {
    throw new Error(
      `Insufficient Energy: cost ${cost}, available ${combat.energy}.`,
    );
  }

  return {
    ...state,
    combat: {
      ...combat,
      energy: combat.energy - cost,
    },
  };
}

export function endPlayerTurn(state: AuthoritativeState): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Player turn can only end during the player phase.");
  }

  const deck = discardHand(combat.deck);
  const nextCombat: CombatState = {
    ...combat,
    phase: "enemy",
    energy: 0,
    deck,
  };
  assertCardConservation(nextCombat.deck);

  return {
    ...state,
    combat: nextCombat,
  };
}
