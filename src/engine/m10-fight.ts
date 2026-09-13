import {
  createCardInstance,
  createCardInstanceId,
  type CardInstance,
  type CardInstanceId,
} from "./cards";
import {
  beginPlayerTurn,
  endPlayerTurn,
  initializeCombatActors,
  payEnergyCost,
  startCombat,
  type CombatState,
} from "./combat";
import {
  applyDirectDamage,
  calculateAttackDamage,
  createDirectDamagePacket,
  gainBlock,
} from "./damage";
import type { RelicDefinition } from "../content/generated";
import { assertCardConservation, type DeckState } from "./deck";
import {
  classifyCardPosition,
  snapshotCardResolutionContext,
  swapCharacters,
  type CardCombatOwner,
  type CardPositionClassification,
} from "./duo";
import {
  executeEnemyPhase,
  initializeEnemyControllers,
  type EnemyBehaviorRegistry,
} from "./enemies";
import type { Ingredient } from "./imprint";
import { installInitialPassives } from "./initial-passives";
import { installRelicContent } from "./relic-content";
import {
  INITIAL_ENEMY_COMBAT_STATS,
  INITIAL_ENEMY_REGISTRY,
  type InitialEncounterFormation,
} from "./initial-enemies";
import { resolvePostCardIngredientWithTriggers } from "./passive-card";
import { createEncounterReward, type RewardCatalog } from "./rewards";
import {
  createAuthoritativeState,
  hashAuthoritativeState,
  type AuthoritativeState,
} from "./state";

export const M10_DEFAULT_SEED = 1010 as const;
export const M10_MORROW_ID = "morrow" as const;
export const M10_SWITCH_ID = "switch" as const;
export const M10_CLAIMS_ADJUSTER_ID = "claims-adjuster" as const;

const M18_REWARD_FIXTURE_CATALOG: RewardCatalog = {
  cards: [
    { id: "source.open_wound", role: "source", rarity: "common", unlocked: true },
    { id: "shaper.cut_corners", role: "shaper", rarity: "common", unlocked: true },
    { id: "crew.toolbox_talk", role: "crew", rarity: "common", unlocked: true },
  ],
  relics: [],
};

export type M10CardOwner = "morrow" | "switch" | "crew";
export type M10CardDestination = "discard" | "exhaust";

export type M10CardEffect =
  | {
      readonly op: "damage";
      readonly amount: number;
      readonly target: "selected_enemy";
    }
  | {
      readonly op: "block_owner";
      readonly amount: number;
    }
  | {
      readonly op: "block_both";
      readonly amount: number;
    }
  | {
      readonly op: "swap_free";
    };

export interface M10StarterCardDefinition {
  readonly id: string;
  readonly name: string;
  readonly owner: M10CardOwner;
  readonly energyCost: number;
  readonly ingredient: Ingredient | null;
  readonly effects: readonly M10CardEffect[];
  readonly destinationAfterPlay: M10CardDestination;
}

function ingredient(value: Ingredient): Ingredient {
  return { ...value } as Ingredient;
}

export const M10_STARTER_CARDS: Readonly<Record<string, M10StarterCardDefinition>> = {
  "starter.repossess": {
    id: "starter.repossess",
    name: "Repossess",
    owner: "morrow",
    energyCost: 1,
    ingredient: ingredient({ kind: "material", id: "gore", prime: 1 }),
    effects: [{ op: "damage", amount: 6, target: "selected_enemy" }],
    destinationAfterPlay: "discard",
  },
  "starter.sealant": {
    id: "starter.sealant",
    name: "Sealant",
    owner: "morrow",
    energyCost: 1,
    ingredient: null,
    effects: [{ op: "block_owner", amount: 5 }],
    destinationAfterPlay: "discard",
  },
  "starter.test_fire": {
    id: "starter.test_fire",
    name: "Test Fire",
    owner: "switch",
    energyCost: 1,
    ingredient: ingredient({ kind: "form", id: "needle", prime: 1 }),
    effects: [{ op: "damage", amount: 6, target: "selected_enemy" }],
    destinationAfterPlay: "discard",
  },
  "starter.safety_briefing": {
    id: "starter.safety_briefing",
    name: "Safety Briefing",
    owner: "switch",
    energyCost: 1,
    ingredient: null,
    effects: [{ op: "block_owner", amount: 5 }],
    destinationAfterPlay: "discard",
  },
  "starter.shared_cover": {
    id: "starter.shared_cover",
    name: "Shared Cover",
    owner: "crew",
    energyCost: 1,
    ingredient: null,
    effects: [{ op: "block_both", amount: 3 }],
    destinationAfterPlay: "discard",
  },
  "starter.change_of_shift": {
    id: "starter.change_of_shift",
    name: "Change of Shift",
    owner: "crew",
    energyCost: 0,
    ingredient: null,
    effects: [{ op: "swap_free" }],
    destinationAfterPlay: "exhaust",
  },
};

const M10_STARTER_DECK_BLUEPRINT = [
  "starter.repossess",
  "starter.repossess",
  "starter.sealant",
  "starter.sealant",
  "starter.test_fire",
  "starter.test_fire",
  "starter.safety_briefing",
  "starter.safety_briefing",
  "starter.shared_cover",
  "starter.change_of_shift",
] as const;

export const M10_CLAIMS_ADJUSTER_REGISTRY: EnemyBehaviorRegistry = {
  "enemy.claims_adjuster": {
    id: "enemy.claims_adjuster",
    moves: [
      {
        id: "stamp",
        label: "Stamp",
        target: { kind: "front" },
        effects: [{ op: "damage", amount: 7, hits: 1 }],
      },
      {
        id: "paperwork",
        label: "Paperwork",
        target: { kind: "self" },
        effects: [{ op: "block", amount: 6 }],
      },
      {
        id: "stamp_harder",
        label: "Stamp Harder",
        target: { kind: "front" },
        effects: [{ op: "damage", amount: 10, hits: 1 }],
      },
    ],
    ai: {
      kind: "cycle",
      moveIds: ["stamp", "paperwork", "stamp_harder"],
      startIndex: 0,
    },
  },
};

export type M10Command =
  | {
      readonly kind: "play_card";
      readonly instanceId: CardInstanceId;
      readonly targetActorId: string | null;
    }
  | { readonly kind: "swap" }
  | { readonly kind: "end_turn" };

export interface M10CommandResult {
  readonly state: AuthoritativeState;
  readonly command: M10Command;
}

export interface M10CardView {
  readonly instanceId: CardInstanceId;
  readonly definitionId: string;
  readonly name: string;
  readonly owner: M10CardOwner;
  readonly energyCost: number;
  readonly classification: CardPositionClassification;
  readonly ingredient: Ingredient | null;
  readonly isDamageCard: boolean;
}

export interface Act1CombatSetup {
  readonly formation: InitialEncounterFormation;
  readonly characters: readonly {
    readonly actorId: string;
    readonly hp: number;
    readonly maxHp: number;
  }[];
  readonly frontCharacterId?: string;
  readonly deck?: readonly CardInstance[];
  /** Relics the run owns, installed during combat setup. */
  readonly relics?: readonly RelicDefinition[];
}

interface CombatEnemySetup {
  readonly actorId: string;
  readonly definitionId: string;
  readonly maxHp: number;
  readonly block?: number;
}

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

function requireActiveCombat(state: AuthoritativeState): CombatState {
  const combat = state.combat;
  if (combat === null) {
    throw new Error("No M10 combat is active.");
  }
  if (combat.outcome !== "active") {
    throw new Error(`M10 combat is already ${combat.outcome}.`);
  }
  return combat;
}

function requirePlayerPhase(state: AuthoritativeState): CombatState {
  const combat = requireActiveCombat(state);
  if (combat.phase !== "player") {
    throw new Error("M10 player commands require the player phase.");
  }
  return combat;
}

function requireDefinition(definitionId: string): M10StarterCardDefinition {
  const definition = M10_STARTER_CARDS[definitionId];
  if (definition === undefined) {
    throw new Error(`Unknown M10 starter card definition: ${definitionId}.`);
  }
  return definition;
}

function ownerForDefinition(definition: M10StarterCardDefinition): CardCombatOwner {
  if (definition.owner === "crew") {
    return { kind: "crew" };
  }
  return {
    kind: "character",
    actorId: definition.owner === "morrow" ? M10_MORROW_ID : M10_SWITCH_ID,
  };
}

function expectedInstanceOwner(definition: M10StarterCardDefinition): string {
  if (definition.owner === "morrow") return M10_MORROW_ID;
  if (definition.owner === "switch") return M10_SWITCH_ID;
  return "crew";
}

function createStarterDeck(): readonly CardInstance[] {
  return M10_STARTER_DECK_BLUEPRINT.map((definitionId, index) => {
    const definition = requireDefinition(definitionId);
    return createCardInstance({
      instanceId: createCardInstanceId(index + 1),
      definitionId,
      ownerCharacterId: expectedInstanceOwner(definition),
    });
  });
}

function requireTwoCharacters(
  characters: Act1CombatSetup["characters"],
): readonly [Act1CombatSetup["characters"][number], Act1CombatSetup["characters"][number]] {
  if (characters.length !== 2) {
    throw new Error("Act 1 combat requires exactly two player characters.");
  }
  return [characters[0], characters[1]];
}

function actorIdForEnemy(definitionId: string, occurrence: number): string {
  const base = definitionId.replace(/^enemy\./, "").replaceAll("_", "-");
  return occurrence === 1 ? base : `${base}-${occurrence}`;
}

function createSharedCombat(
  state: AuthoritativeState,
  setup: Pick<
    Act1CombatSetup,
    "characters" | "frontCharacterId" | "deck" | "relics"
  >,
  enemies: readonly CombatEnemySetup[],
  registry: EnemyBehaviorRegistry,
): AuthoritativeState {
  const characters = requireTwoCharacters(setup.characters);
  let next = startCombat(state, setup.deck ?? createStarterDeck());
  next = initializeCombatActors(next, {
    playerCharacters: characters,
    enemies: enemies.map(({ actorId, maxHp, block }) => ({ actorId, maxHp, block })),
    frontCharacterId: setup.frontCharacterId ?? characters[0].actorId,
  });
  next = initializeEnemyControllers(next, registry, enemies.map(({ actorId, definitionId }) => ({
    actorId,
    definitionId,
  })));
  next = installInitialPassives(next, {
    morrowActorId: characters[0].actorId,
    switchActorId: characters[1].actorId,
    includeSharedWarranty: true,
  });
  next = installRelicContent(next, setup.relics ?? []);
  return beginPlayerTurn(next);
}

export function createAct1Combat(
  state: AuthoritativeState,
  setup: Act1CombatSetup,
): AuthoritativeState {
  const occurrences = new Map<string, number>();
  const enemies = setup.formation.enemyDefinitionIds.map((definitionId) => {
    const stats = INITIAL_ENEMY_COMBAT_STATS[definitionId];
    if (stats === undefined) {
      throw new Error(`Missing Act 1 combat stats for enemy definition: ${definitionId}.`);
    }
    const occurrence = (occurrences.get(definitionId) ?? 0) + 1;
    occurrences.set(definitionId, occurrence);
    return {
      actorId: actorIdForEnemy(definitionId, occurrence),
      definitionId,
      maxHp: stats.maxHp,
      ...(stats.block === undefined ? {} : { block: stats.block }),
    };
  });
  return createSharedCombat(state, setup, enemies, INITIAL_ENEMY_REGISTRY);
}

function movePlayedCard(
  deck: DeckState,
  instanceId: CardInstanceId,
  destination: M10CardDestination,
): DeckState {
  if (!deck.zones.hand.includes(instanceId)) {
    throw new Error(`Card ${instanceId} is not in hand.`);
  }
  const hand = deck.zones.hand.filter((candidate) => candidate !== instanceId);
  const zones =
    destination === "discard"
      ? {
          ...deck.zones,
          hand,
          discard: [...deck.zones.discard, instanceId],
        }
      : {
          ...deck.zones,
          hand,
          exhaust: [...deck.zones.exhaust, instanceId],
        };
  const next: DeckState = { ...deck, zones };
  assertCardConservation(next);
  return next;
}

function stateWithDeck(state: AuthoritativeState, deck: DeckState): AuthoritativeState {
  const combat = requireActiveCombat(state);
  return { ...state, combat: { ...combat, deck } };
}

function requireEnemyTarget(
  state: AuthoritativeState,
  actorId: string | null,
): string {
  if (actorId === null) {
    throw new Error("This card requires an enemy target.");
  }
  const actor = requireActiveCombat(state).actors[actorId];
  if (actor === undefined || actor.side !== "enemy" || actor.hp === 0) {
    throw new Error(`M10 target ${actorId} is not a living enemy.`);
  }
  return actorId;
}

function applyBaseEffect(
  state: AuthoritativeState,
  definition: M10StarterCardDefinition,
  effect: M10CardEffect,
  targetActorId: string | null,
): AuthoritativeState {
  if (effect.op === "swap_free") {
    return swapCharacters(state, "card_free").state;
  }

  if (effect.op === "block_both") {
    let current = state;
    const players = requireActiveCombat(current).playerCharacterIds;
    if (players === null) {
      throw new Error("Player formation has not been initialized.");
    }
    for (const actorId of players) {
      current = gainBlock(current, actorId, effect.amount);
    }
    return current;
  }

  const owner = ownerForDefinition(definition);
  if (owner.kind !== "character") {
    throw new Error(`Crew card ${definition.id} cannot use ${effect.op}.`);
  }

  if (effect.op === "block_owner") {
    return gainBlock(state, owner.actorId, effect.amount);
  }

  const target = requireEnemyTarget(state, targetActorId);
  const combat = requireActiveCombat(state);
  const calculated = calculateAttackDamage(
    combat,
    owner.actorId,
    target,
    effect.amount,
  );
  return applyDirectDamage(
    state,
    target,
    createDirectDamagePacket(calculated.amount),
  ).state;
}

export function createM10Fight(seed: number = M10_DEFAULT_SEED): AuthoritativeState {
  assertNonnegativeInteger("M10 seed", seed);
  return createSharedCombat(
    createAuthoritativeState({
      seed,
      contentVersion: "m10.checkpoint",
      contentHash: "joint-liability-m10-checkpoint-v1",
    }),
    {
      characters: [
        { actorId: M10_MORROW_ID, hp: 44, maxHp: 44 },
        { actorId: M10_SWITCH_ID, hp: 36, maxHp: 36 },
      ],
      frontCharacterId: M10_MORROW_ID,
      deck: createStarterDeck(),
    },
    [{ actorId: M10_CLAIMS_ADJUSTER_ID, definitionId: "enemy.claims_adjuster", maxHp: 30 }],
    M10_CLAIMS_ADJUSTER_REGISTRY,
  );
}

export function createM10RewardFixture(): AuthoritativeState {
  return createEncounterReward(createM10Fight(), M18_REWARD_FIXTURE_CATALOG, {
    transactionId: "m10-reward-fixture",
    encounter: "ordinary",
    selectedRoles: ["source", "shaper", "crew"],
    ownedRelicIds: [],
  });
}

export function getM10CardView(
  state: AuthoritativeState,
  instanceId: CardInstanceId,
): M10CardView {
  const combat = requireActiveCombat(state);
  const instance = combat.deck.instances[instanceId];
  if (instance === undefined) {
    throw new Error(`Unknown M10 card instance: ${instanceId}.`);
  }
  const definition = requireDefinition(instance.definitionId);
  const owner = ownerForDefinition(definition);
  return {
    instanceId,
    definitionId: definition.id,
    name: definition.name,
    owner: definition.owner,
    energyCost: definition.energyCost,
    classification: classifyCardPosition(combat, owner),
    ingredient: definition.ingredient === null ? null : ingredient(definition.ingredient),
    isDamageCard: definition.effects.some((effect) => effect.op === "damage"),
  };
}

export function getM10Hand(state: AuthoritativeState): readonly M10CardView[] {
  const combat = requireActiveCombat(state);
  return combat.deck.zones.hand.map((instanceId) => getM10CardView(state, instanceId));
}

export function playM10Card(
  state: AuthoritativeState,
  instanceId: CardInstanceId,
  targetActorId: string | null,
): M10CommandResult {
  const combat = requirePlayerPhase(state);
  const instance = combat.deck.instances[instanceId];
  if (instance === undefined || !combat.deck.zones.hand.includes(instanceId)) {
    throw new Error(`Card ${instanceId} is not available in the current hand.`);
  }
  const definition = requireDefinition(instance.definitionId);
  if (instance.ownerCharacterId !== expectedInstanceOwner(definition)) {
    throw new Error(`Card ${instanceId} owner does not match its M10 definition.`);
  }
  const owner = ownerForDefinition(definition);
  const cardContext = snapshotCardResolutionContext(state, owner);

  let current = payEnergyCost(state, definition.energyCost);
  const paidCombat = requireActiveCombat(current);
  current = stateWithDeck(
    current,
    movePlayedCard(
      paidCombat.deck,
      instanceId,
      definition.destinationAfterPlay,
    ),
  );

  for (const effect of definition.effects) {
    if (current.combat?.outcome !== "active") break;
    current = applyBaseEffect(current, definition, effect, targetActorId);
  }

  const post = resolvePostCardIngredientWithTriggers(current, {
    cardContext,
    ingredient: definition.ingredient,
    selectedEnemyActorId: targetActorId,
  });

  return {
    state: post.state,
    command: { kind: "play_card", instanceId, targetActorId },
  };
}

export function swapM10Characters(state: AuthoritativeState): M10CommandResult {
  requirePlayerPhase(state);
  return {
    state: swapCharacters(state, "manual").state,
    command: { kind: "swap" },
  };
}

export function endM10Turn(state: AuthoritativeState): M10CommandResult {
  return endCombatTurn(state, M10_CLAIMS_ADJUSTER_REGISTRY);
}

/**
 * Shared player-turn cycle for any authored enemy registry. M10 keeps its
 * Claims Adjuster registry; Act 1 run combats pass the full M17 registry.
 */
export function endCombatTurn(
  state: AuthoritativeState,
  registry: EnemyBehaviorRegistry,
): M10CommandResult {
  requirePlayerPhase(state);
  let current = endPlayerTurn(state);
  if (current.combat?.outcome === "active") {
    current = executeEnemyPhase(current, registry).state;
  }
  if (current.combat?.outcome === "active") {
    current = beginPlayerTurn(current);
  }
  return { state: current, command: { kind: "end_turn" } };
}

export function applyM10Command(
  state: AuthoritativeState,
  command: M10Command,
): M10CommandResult {
  if (command.kind === "play_card") {
    return playM10Card(state, command.instanceId, command.targetActorId);
  }
  if (command.kind === "swap") {
    return swapM10Characters(state);
  }
  return endM10Turn(state);
}

export function replayM10Commands(
  commands: readonly M10Command[],
  seed: number = M10_DEFAULT_SEED,
): AuthoritativeState {
  let state = createM10Fight(seed);
  for (const command of commands) {
    state = applyM10Command(state, command).state;
  }
  return state;
}

export function hashM10Fight(state: AuthoritativeState): string {
  return hashAuthoritativeState(state);
}
