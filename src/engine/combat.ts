import {
  createCombatActor,
  type ActorVitalityInput,
  type CombatActor,
} from "./actors";
import type { CardInstance } from "./cards";
import {
  assertCardConservation,
  createDeckState,
  discardHand,
  drawCards,
  shuffleDrawPile,
  type DeckState,
} from "./deck";
import type {
  EnemyControllerState,
  SelectedEnemyIntent,
} from "./enemies";
import type { Imprint } from "./imprint";
import {
  resolveScheduledPacketsAtPlayerTurnStart,
  type ScheduledReactionPacket,
} from "./scheduled";
import type { AuthoritativeState } from "./state";
import { decayDurationStatusesForSide } from "./status-runtime";
import {
  createTriggerCounters,
  resetTurnTriggerCounters,
  type TriggerBinding,
  type TriggerCounters,
} from "./triggers";

export const COMBAT_STATE_VERSION = 7 as const;
export const DEFAULT_ENERGY_PER_TURN = 3 as const;
export const DEFAULT_CARDS_PER_TURN = 5 as const;
export const DEFAULT_MAX_HAND_SIZE = 10 as const;

export type CombatPhase = "setup" | "player" | "enemy" | "ended";
export type CombatOutcome = "active" | "victory" | "defeat";

export interface CombatRules {
  readonly energyPerTurn: number;
  readonly cardsPerTurn: number;
  readonly maxHandSize: number;
}

export interface CombatState {
  readonly combatVersion: typeof COMBAT_STATE_VERSION;
  readonly turnNumber: number;
  readonly enemyPhaseNumber: number;
  readonly phase: CombatPhase;
  readonly outcome: CombatOutcome;
  readonly energy: number;
  readonly rules: CombatRules;
  readonly deck: DeckState;
  readonly actors: Readonly<Record<string, CombatActor>>;
  readonly playerCharacterIds: readonly [string, string] | null;
  readonly frontCharacterId: string | null;
  readonly enemySpawnOrder: readonly string[];
  readonly enemyOrder: readonly string[];
  readonly enemyControllers: Readonly<Record<string, EnemyControllerState>>;
  readonly selectedEnemyIntents: readonly SelectedEnemyIntent[];
  readonly enemyPhaseResolved: boolean;
  readonly manualSwapsUsedThisTurn: number;
  readonly imprint: Imprint | null;
  readonly scheduledPackets: readonly ScheduledReactionPacket[];
  readonly nextScheduledPacketOrdinal: number;
  readonly triggerBindings: readonly TriggerBinding[];
  readonly triggerCounters: TriggerCounters;
}

export interface CombatRuleOverrides {
  readonly energyPerTurn?: number;
  readonly cardsPerTurn?: number;
  readonly maxHandSize?: number;
}

export interface CombatActorSetup {
  readonly playerCharacters: readonly [ActorVitalityInput, ActorVitalityInput];
  readonly enemies?: readonly ActorVitalityInput[];
  readonly frontCharacterId: string;
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
  if (state.combat.outcome !== "active") {
    throw new Error(`Combat is already ${state.combat.outcome}.`);
  }
  return state.combat;
}

function clearBlockForSide(
  actors: Readonly<Record<string, CombatActor>>,
  side: CombatActor["side"],
): Readonly<Record<string, CombatActor>> {
  let changed = false;
  const next: Record<string, CombatActor> = { ...actors };
  for (const actor of Object.values(actors)) {
    if (actor.side === side && actor.block !== 0) {
      next[actor.actorId] = { ...actor, block: 0 };
      changed = true;
    }
  }
  return changed ? next : actors;
}

function assertSameCardRegistry(current: DeckState, next: DeckState): void {
  const currentIds = Object.keys(current.instances).sort();
  const nextIds = Object.keys(next.instances).sort();
  if (
    currentIds.length !== nextIds.length ||
    currentIds.some((instanceId, index) => instanceId !== nextIds[index])
  ) {
    throw new Error("Settled hand cannot change the combat card registry.");
  }
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
    enemyPhaseNumber: 0,
    phase: "setup",
    outcome: "active",
    energy: 0,
    rules: createRules(rules),
    deck: shuffled.deck,
    actors: {},
    playerCharacterIds: null,
    frontCharacterId: null,
    enemySpawnOrder: [],
    enemyOrder: [],
    enemyControllers: {},
    selectedEnemyIntents: [],
    enemyPhaseResolved: true,
    manualSwapsUsedThisTurn: 0,
    imprint: null,
    scheduledPackets: [],
    nextScheduledPacketOrdinal: 1,
    triggerBindings: [],
    triggerCounters: createTriggerCounters(),
  };
  assertCardConservation(combat.deck);

  return {
    ...state,
    rng: shuffled.rng,
    combat,
  };
}

export function initializeCombatActors(
  state: AuthoritativeState,
  setup: CombatActorSetup,
): AuthoritativeState {
  const combat = requireCombat(state);
  if (Object.keys(combat.actors).length !== 0 || combat.playerCharacterIds !== null) {
    throw new Error("Combat actors are already initialized.");
  }

  const players = setup.playerCharacters.map((input) =>
    createCombatActor(input, "player"),
  ) as unknown as readonly [CombatActor, CombatActor];
  const enemies = (setup.enemies ?? []).map((input) =>
    createCombatActor(input, "enemy"),
  );
  const allActors = [...players, ...enemies];
  const actors: Record<string, CombatActor> = {};
  for (const actor of allActors) {
    if (actors[actor.actorId] !== undefined) {
      throw new Error(`Duplicate combat actor ID: ${actor.actorId}.`);
    }
    actors[actor.actorId] = actor;
  }

  const playerCharacterIds = [players[0].actorId, players[1].actorId] as const;
  if (!playerCharacterIds.includes(setup.frontCharacterId)) {
    throw new Error("frontCharacterId must identify one of the two player characters.");
  }

  return {
    ...state,
    combat: {
      ...combat,
      actors,
      playerCharacterIds,
      frontCharacterId: setup.frontCharacterId,
      enemySpawnOrder: enemies.map((enemy) => enemy.actorId),
    },
  };
}

export function setFrontCharacter(
  state: AuthoritativeState,
  actorId: string,
): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "setup") {
    throw new Error(
      "setFrontCharacter is setup-only; use swapCharacters for player actions.",
    );
  }
  if (combat.playerCharacterIds === null) {
    throw new Error("Player formation has not been initialized.");
  }
  if (!combat.playerCharacterIds.includes(actorId)) {
    throw new Error(`Actor ${actorId} is not part of the player duo.`);
  }
  return {
    ...state,
    combat: {
      ...combat,
      frontCharacterId: actorId,
    },
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
  if (
    combat.phase === "enemy" &&
    combat.enemyOrder.length > 0 &&
    !combat.enemyPhaseResolved
  ) {
    throw new Error("Cannot begin the next player turn before the enemy phase resolves.");
  }

  const turnStartState: AuthoritativeState = {
    ...state,
    combat: {
      ...combat,
      actors: clearBlockForSide(combat.actors, "player"),
      turnNumber: combat.turnNumber + 1,
      phase: "player",
      energy: combat.rules.energyPerTurn,
      manualSwapsUsedThisTurn: 0,
      triggerCounters: resetTurnTriggerCounters(combat.triggerCounters),
    },
  };
  const scheduled = resolveScheduledPacketsAtPlayerTurnStart(turnStartState);
  if (scheduled.state.combat?.outcome !== "active") {
    return scheduled.state;
  }
  const afterScheduled = scheduled.state.combat;
  if (afterScheduled === null) {
    throw new Error("Scheduled packet resolution removed combat state.");
  }

  const draw = drawCards(
    afterScheduled.deck,
    scheduled.state.rng,
    afterScheduled.rules.cardsPerTurn,
    afterScheduled.rules.maxHandSize,
  );
  const nextCombat: CombatState = {
    ...afterScheduled,
    deck: draw.deck,
  };
  assertCardConservation(nextCombat.deck);

  return {
    ...scheduled.state,
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

export function gainEnergy(
  state: AuthoritativeState,
  amount: number,
): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Energy can only be gained during the player phase.");
  }
  assertNonnegativeInteger("Energy gain", amount);
  const nextEnergy = combat.energy + amount;
  if (!Number.isSafeInteger(nextEnergy)) {
    throw new RangeError("Energy total exceeds the safe integer range.");
  }

  return {
    ...state,
    combat: {
      ...combat,
      energy: nextEnergy,
    },
  };
}

export function endPlayerTurnWithSettledHand(
  state: AuthoritativeState,
  settledDeck: DeckState,
): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Player turn can only end during the player phase.");
  }
  assertCardConservation(settledDeck);
  assertSameCardRegistry(combat.deck, settledDeck);

  const afterPlayerDurations = decayDurationStatusesForSide(
    combat.actors,
    "player",
  );
  const actors = clearBlockForSide(afterPlayerDurations, "enemy");
  const nextCombat: CombatState = {
    ...combat,
    actors,
    phase: "enemy",
    energy: 0,
    deck: settledDeck,
    enemyPhaseNumber: combat.enemyPhaseNumber + 1,
    enemyPhaseResolved: combat.enemyOrder.length === 0,
  };
  assertCardConservation(nextCombat.deck);

  return {
    ...state,
    combat: nextCombat,
  };
}

export function endPlayerTurn(state: AuthoritativeState): AuthoritativeState {
  const combat = requireCombat(state);
  if (combat.phase !== "player") {
    throw new Error("Player turn can only end during the player phase.");
  }
  return endPlayerTurnWithSettledHand(state, discardHand(combat.deck));
}
