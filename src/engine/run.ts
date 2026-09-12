import type { CardDefinition, RelicDefinition } from "../content/generated";
import {
  cardLifecycleSpecFor,
  playContentCard,
  resolveAdditionalHpCosts,
  resolveCardParameters,
  resolveIngredient,
  resolveValueExpr,
} from "./card-content";
import {
  endPlayerTurnWithCardLifecycle,
  type CardLifecycleSpec,
} from "./card-lifecycle";
import {
  createCardInstance,
  createCardInstanceId,
  type CardInstance,
  type CardInstanceId,
} from "./cards";
import { beginPlayerTurn } from "./combat";
import { classifyCardPosition, type CardPositionClassification } from "./duo";
import { executeEnemyPhase } from "./enemies";
import type { Ingredient } from "./imprint";
import { SHARED_WARRANTY_SOURCE_ID } from "./initial-passives";
import {
  ACT_1_BOSS_ENCOUNTER,
  ACT_1_ELITE_ENCOUNTERS,
  ACT_1_ORDINARY_ENCOUNTERS,
  INITIAL_ENEMY_REGISTRY,
  type InitialEncounterFormation,
} from "./initial-enemies";
import {
  M10_STARTER_CARDS,
  createAct1Combat,
  endCombatTurn,
  getM10CardView,
  playM10Card,
  swapM10Characters,
  type M10Command,
  type M10CommandResult,
  type M10CardOwner,
} from "./m10-fight";
import {
  claimRewardOption,
  createEncounterReward,
  type RewardOption,
  type RewardCatalog,
  type RewardEncounterKind,
} from "./rewards";
import { createAuthoritativeState, type AuthoritativeState } from "./state";

export const M19_RUN_VERSION = 1 as const;

export const M19_DEFAULT_SEED = 1900 as const;

export const M19_REST_HEAL_AMOUNT = 18 as const;

/** The M19 test act is a fixed, linear seven-node route. M22 owns map generation. */
export const M19_NODE_IDS = [
  "ordinary_1",
  "rest_1",
  "ordinary_2",
  "elite",
  "rest_2",
  "ordinary_3",
  "boss",
] as const;

export type M19NodeId = (typeof M19_NODE_IDS)[number];

export type M19NodeKind = "combat" | "elite" | "rest" | "boss";

export type M19RunOutcome = "active" | "victory" | "defeat";

export const M19_MORROW_ID = "morrow" as const;
export const M19_SWITCH_ID = "switch" as const;

export const M19_SELECTED_REWARD_ROLES = ["source", "shaper", "crew"] as const;

export interface RunCharacterState {
  readonly actorId: string;
  readonly hp: number;
  readonly maxHp: number;
}

export interface RunState {
  readonly runVersion: typeof M19_RUN_VERSION;
  readonly seed: number;
  readonly currentNodeId: M19NodeId;
  readonly completedNodeIds: readonly M19NodeId[];
  readonly outcome: M19RunOutcome;
  readonly characters: readonly RunCharacterState[];
  /**
   * Persistent deck instances carried between nodes. `null` means the run has
   * not left its first combat yet, so the starter deck is used as-is.
   */
  readonly deck: readonly CardInstance[] | null;
  /** Owned relics, including the starting relic, in acquisition order. */
  readonly relicIds: readonly string[];
}

export interface M19RunNodeView {
  readonly nodeId: M19NodeId;
  readonly kind: M19NodeKind;
  readonly label: string;
  readonly index: number;
  readonly isCompleted: boolean;
}

/** The M19 test act reuses the M10 card command surface over M17 enemies. */
export type M19Command = M10Command;

/**
 * Definitions the test act needs to play cards that live in `content/`.
 *
 * The starter deck is authored in `m10-fight.ts`, but reward cards are real
 * content definitions, so the run needs a way to resolve them. Callers supply
 * the bundle; `src/content/bundle.ts` builds it for the browser and tests.
 */
export interface RunContent {
  readonly cardFor: (definitionId: string) => CardDefinition | undefined;
  readonly relicFor: (relicId: string) => RelicDefinition | undefined;
}

/**
 * Relics the run owns before any reward. Shared Warranty is installed as a
 * setup-time passive, so it is owned, is never offered again, and is never
 * passed back through the relic compiler.
 */
export const M19_STARTING_RELIC_IDS: readonly string[] = [SHARED_WARRANTY_SOURCE_ID];

/** Instance ordinals for reward cards start above the 10-card starter deck. */
const REWARD_CARD_ORDINAL_BASE = 1_000;

/**
 * Card view for Act 1 run combats. Starter cards behave exactly as they do in
 * M10; generated junk (for example `junk.invoice`) has no M10 starter
 * definition, so it renders as an unplayable card instead of throwing.
 */
export interface M19CardView {
  readonly instanceId: CardInstanceId;
  readonly definitionId: string;
  readonly name: string;
  readonly owner: M10CardOwner;
  readonly energyCost: number;
  readonly classification: CardPositionClassification;
  readonly ingredient: Ingredient | null;
  readonly isDamageCard: boolean;
  readonly isPlayable: boolean;
}

const M19_NODE_KINDS: Readonly<Record<M19NodeId, M19NodeKind>> = {
  ordinary_1: "combat",
  rest_1: "rest",
  ordinary_2: "combat",
  elite: "elite",
  rest_2: "rest",
  ordinary_3: "combat",
  boss: "boss",
};

const M19_NODE_LABELS: Readonly<Record<M19NodeId, string>> = {
  ordinary_1: "Ordinary Combat 1",
  rest_1: "Rest 1",
  ordinary_2: "Ordinary Combat 2",
  elite: "Elite - Repo Foreman",
  rest_2: "Rest 2",
  ordinary_3: "Ordinary Combat 3",
  boss: "Boss - Head of Recovery",
};

const M19_ENCOUNTER_KINDS: Readonly<Record<M19NodeKind, RewardEncounterKind | null>> = {
  combat: "ordinary",
  elite: "elite",
  rest: null,
  boss: "act_1_boss",
};

const M19_DEFAULT_CHARACTERS: readonly RunCharacterState[] = [
  { actorId: M19_MORROW_ID, hp: 44, maxHp: 44 },
  { actorId: M19_SWITCH_ID, hp: 36, maxHp: 36 },
];

/**
 * M19 test-act reward catalog. Every entry is a real content card or relic
 * from `content/`; the route stays a fixture until M22 owns live content
 * unlocks, so the catalog is data rather than an engine content-ID branch.
 */
export const M19_TEST_ACT_REWARD_CATALOG: RewardCatalog = {
  cards: [
    { id: "source.blood_bank", role: "source", rarity: "rare", unlocked: true },
    { id: "source.bone_saw", role: "source", rarity: "uncommon", unlocked: true },
    { id: "source.controlled_decay", role: "source", rarity: "common", unlocked: true },
    { id: "source.double_take", role: "source", rarity: "uncommon", unlocked: true },
    { id: "source.emergency_rebuild", role: "source", rarity: "rare", unlocked: true },
    { id: "source.ground_fault", role: "source", rarity: "uncommon", unlocked: true },
    { id: "source.open_wound", role: "source", rarity: "common", unlocked: true },
    { id: "source.spoiled_sample", role: "source", rarity: "common", unlocked: true },
    { id: "source.surgical_tape", role: "source", rarity: "common", unlocked: true },
    { id: "source.tenderize", role: "source", rarity: "uncommon", unlocked: true },
    { id: "source.thick_skin", role: "source", rarity: "uncommon", unlocked: true },
    { id: "source.unlicensed_procedure", role: "source", rarity: "rare", unlocked: true },
    { id: "shaper.broad_hint", role: "shaper", rarity: "uncommon", unlocked: true },
    { id: "shaper.collection_notice", role: "shaper", rarity: "common", unlocked: true },
    { id: "shaper.cross_examination", role: "shaper", rarity: "uncommon", unlocked: true },
    { id: "shaper.double_booking", role: "shaper", rarity: "uncommon", unlocked: true },
    { id: "shaper.fan_service", role: "shaper", rarity: "common", unlocked: true },
    { id: "shaper.friendly_leech", role: "shaper", rarity: "uncommon", unlocked: true },
    { id: "shaper.insulated_coat", role: "shaper", rarity: "common", unlocked: true },
    { id: "shaper.nail_driver", role: "shaper", rarity: "common", unlocked: true },
    { id: "shaper.operating_manual", role: "shaper", rarity: "rare", unlocked: true },
    { id: "shaper.overclock", role: "shaper", rarity: "rare", unlocked: true },
    { id: "shaper.scheduled_violence", role: "shaper", rarity: "uncommon", unlocked: true },
    { id: "shaper.switchblade", role: "shaper", rarity: "rare", unlocked: true },
    { id: "crew.cover_both", role: "crew", rarity: "common", unlocked: true },
    { id: "crew.cross_training", role: "crew", rarity: "common", unlocked: true },
    { id: "crew.reservoir", role: "crew", rarity: "uncommon", unlocked: true },
    { id: "crew.sudden_exit", role: "crew", rarity: "uncommon", unlocked: true },
  ],
  relics: [
    { id: "relic.arc_welder", unlocked: true },
    { id: "relic.blank_badge", unlocked: true },
    { id: "relic.carbon_copy", unlocked: true },
    { id: "relic.clot_filter", unlocked: true },
    { id: "relic.counterfeit_seal", unlocked: true },
    { id: "relic.organ_bag", unlocked: true },
    { id: "relic.parallel_port", unlocked: true },
    { id: "relic.refund_capacitor", unlocked: true },
    { id: "relic.shared_warranty", unlocked: true },
    { id: "relic.wetware_die", unlocked: true },
  ],
};

function assertNonnegativeInteger(label: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a nonnegative safe integer.`);
  }
}

function requireRun(state: AuthoritativeState): RunState {
  const run = state.run;
  if (run === null) {
    throw new Error("No M19 test act is active.");
  }
  return run;
}

function requireRunNode(state: AuthoritativeState): M19RunNodeView {
  return currentRunNode(state);
}

function requireActiveRun(state: AuthoritativeState): RunState {
  const run = requireRun(state);
  if (run.outcome !== "active") {
    throw new Error(`The M19 test act is already ${run.outcome}.`);
  }
  return run;
}

function replaceRun(state: AuthoritativeState, run: RunState): AuthoritativeState {
  return { ...state, run };
}

function persistDeckInstances(
  deck: { readonly instances: Readonly<Record<string, CardInstance>> },
): readonly CardInstance[] {
  return Object.keys(deck.instances)
    .sort()
    .map((instanceId) => deck.instances[instanceId] as CardInstance);
}

function formationForNode(state: AuthoritativeState, node: M19RunNodeView): InitialEncounterFormation {
  if (node.kind === "elite") {
    const elite = ACT_1_ELITE_ENCOUNTERS[0];
    if (elite === undefined) throw new Error("No Act 1 elite encounter is authored.");
    return elite;
  }
  if (node.kind === "boss") {
    return ACT_1_BOSS_ENCOUNTER;
  }
  const run = requireRun(state);
  const index = (run.seed + node.index) % ACT_1_ORDINARY_ENCOUNTERS.length;
  const formation = ACT_1_ORDINARY_ENCOUNTERS[index];
  if (formation === undefined) throw new Error("No Act 1 ordinary encounter is authored.");
  return formation;
}

function requireCombatNode(node: M19RunNodeView): void {
  if (M19_ENCOUNTER_KINDS[node.kind] === null) {
    throw new Error(`Node ${node.nodeId} is not a combat node.`);
  }
}

/**
 * Relic definitions to install into the next combat. The starting relic is
 * already installed as a setup passive, so only claimed relics are compiled.
 */
function runRelicDefinitions(
  run: RunState,
  content: RunContent | undefined,
): readonly RelicDefinition[] {
  const claimed = run.relicIds.filter(
    (relicId) => !M19_STARTING_RELIC_IDS.includes(relicId),
  );
  return claimed.map((relicId) => {
    const definition = content?.relicFor(relicId);
    if (definition === undefined) {
      throw new Error(`No relic content is available for ${relicId}.`);
    }
    return definition;
  });
}

export function createM19Run(seed: number = M19_DEFAULT_SEED): AuthoritativeState {
  assertNonnegativeInteger("M19 seed", seed);
  const state = createAuthoritativeState({
    seed,
    contentVersion: "m19.test_act",
    contentHash: "joint-liability-m19-test-act-v1",
  });
  return replaceRun(state, {
    runVersion: M19_RUN_VERSION,
    seed,
    currentNodeId: M19_NODE_IDS[0],
    completedNodeIds: [],
    outcome: "active",
    characters: M19_DEFAULT_CHARACTERS.map((character) => ({ ...character })),
    deck: null,
    relicIds: [...M19_STARTING_RELIC_IDS],
  });
}

export function m19NodeKind(nodeId: M19NodeId): M19NodeKind {
  return M19_NODE_KINDS[nodeId];
}

export function currentRunNode(state: AuthoritativeState): M19RunNodeView {
  const run = requireRun(state);
  return {
    nodeId: run.currentNodeId,
    kind: M19_NODE_KINDS[run.currentNodeId],
    label: M19_NODE_LABELS[run.currentNodeId],
    index: M19_NODE_IDS.indexOf(run.currentNodeId),
    isCompleted: run.completedNodeIds.includes(run.currentNodeId),
  };
}

export function beginRunNode(
  state: AuthoritativeState,
  content?: RunContent,
): AuthoritativeState {
  const run = requireActiveRun(state);
  const node = requireRunNode(state);
  requireCombatNode(node);
  if (node.isCompleted) {
    throw new Error(`Node ${node.nodeId} is already complete.`);
  }
  if (state.rewards.pending !== null) {
    throw new Error("A reward is still pending for the previous node.");
  }
  if (state.combat !== null) {
    throw new Error("A combat is already active.");
  }
  return createAct1Combat(state, {
    formation: formationForNode(state, node),
    characters: run.characters,
    deck: run.deck ?? undefined,
    relics: runRelicDefinitions(run, content),
  });
}

export function completeRunCombat(
  state: AuthoritativeState,
  catalog: RewardCatalog,
): AuthoritativeState {
  const run = requireRun(state);
  const node = requireRunNode(state);
  requireCombatNode(node);
  if (node.isCompleted) {
    return state;
  }
  const combat = state.combat;
  if (combat === null) {
    throw new Error(`Node ${node.nodeId} has no active combat.`);
  }
  if (combat.outcome === "active") {
    throw new Error("The current combat has not resolved.");
  }
  if (combat.outcome === "defeat") {
    return replaceRun(state, { ...run, outcome: "defeat" });
  }

  const encounter = M19_ENCOUNTER_KINDS[node.kind];
  if (encounter === null) {
    throw new Error(`Node ${node.nodeId} does not grant a combat reward.`);
  }

  const withReward = createEncounterReward(state, catalog, {
    transactionId: `m19.${node.nodeId}.reward`,
    encounter,
    selectedRoles: M19_SELECTED_REWARD_ROLES,
    ownedRelicIds: run.relicIds,
  });

  return replaceRun(withReward, {
    ...run,
    completedNodeIds: [...run.completedNodeIds, node.nodeId],
    characters: run.characters.map((character) => {
      const actor = combat.actors[character.actorId];
      if (actor === undefined) {
        throw new Error(`Combat is missing persistent character ${character.actorId}.`);
      }
      return { ...character, hp: actor.hp };
    }),
    deck: persistDeckInstances(combat.deck),
  });
}

export function restRunCharacter(
  state: AuthoritativeState,
  actorId: string,
): AuthoritativeState {
  const run = requireActiveRun(state);
  const node = requireRunNode(state);
  if (node.kind !== "rest") {
    throw new Error(`Node ${node.nodeId} is not a rest node.`);
  }
  if (node.isCompleted) {
    throw new Error(`Node ${node.nodeId} is already complete.`);
  }
  if (state.combat !== null) {
    throw new Error("A combat is already active.");
  }
  if (!run.characters.some((character) => character.actorId === actorId)) {
    throw new Error(`Unknown run character: ${actorId}.`);
  }
  return replaceRun(state, {
    ...run,
    completedNodeIds: [...run.completedNodeIds, node.nodeId],
    characters: run.characters.map((character) =>
      character.actorId === actorId
        ? {
            ...character,
            hp: Math.min(character.hp + M19_REST_HEAL_AMOUNT, character.maxHp),
          }
        : character,
    ),
  });
}

export function applyM19Command(
  state: AuthoritativeState,
  command: M19Command,
  content?: RunContent,
): M10CommandResult {
  if (command.kind === "play_card") {
    const instance = state.combat?.deck.instances[command.instanceId];
    if (instance === undefined) {
      throw new Error(`Unknown card instance: ${command.instanceId}.`);
    }
    if (M10_STARTER_CARDS[instance.definitionId] !== undefined) {
      return playM10Card(state, command.instanceId, command.targetActorId);
    }
    const definition = content?.cardFor(instance.definitionId);
    if (definition === undefined) {
      throw new Error(
        `Card ${instance.definitionId} is not playable in the M19 test act.`,
      );
    }
    return {
      state: playContentCard(state, {
        instanceId: command.instanceId,
        definition,
        upgraded: instance.upgradeLevel > 0,
        ownerCharacterId: instance.ownerCharacterId,
        selectedEnemyActorId: command.targetActorId,
      }).state,
      command,
    };
  }
  if (command.kind === "swap") {
    return swapM10Characters(state);
  }
  if (runHasContentCards(state, content)) {
    // A deck that carries content cards must settle Retain, Fleeting, Exhaust,
    // and unplayable junk the way the M11 lifecycle defines it.
    let current = endPlayerTurnWithCardLifecycle(state, runLifecycleResolver(content));
    if (current.combat?.outcome === "active") {
      current = executeEnemyPhase(current, INITIAL_ENEMY_REGISTRY).state;
    }
    if (current.combat?.outcome === "active") {
      current = beginPlayerTurn(current);
    }
    return { state: current, command };
  }
  return endCombatTurn(state, INITIAL_ENEMY_REGISTRY);
}

function ownerCharacterIdForRole(role: string): M10CardOwner {
  if (role === "source") return M19_MORROW_ID;
  if (role === "shaper") return M19_SWITCH_ID;
  return "crew";
}

function isContentDefinitionUnplayable(definition: CardDefinition): boolean {
  return (definition.keywords as readonly string[]).includes("unplayable");
}

function contentCardView(
  state: AuthoritativeState,
  instance: CardInstance,
  definition: CardDefinition,
): M19CardView {
  const combat = state.combat;
  if (combat === null) {
    throw new Error("No M19 combat is active.");
  }
  const parameters = resolveCardParameters(definition, instance.upgradeLevel > 0);
  const ownerCharacterId = ownerCharacterIdForRole(definition.owner);
  const owner =
    definition.owner === "crew"
      ? ({ kind: "crew" } as const)
      : ({ kind: "character", actorId: ownerCharacterId } as const);
  return {
    instanceId: instance.instanceId,
    definitionId: definition.id,
    name: definition.name,
    owner: ownerCharacterId,
    energyCost: resolveValueExpr(definition.energyCost, parameters),
    classification: classifyCardPosition(combat, owner),
    ingredient: resolveIngredient(definition, parameters),
    isDamageCard: definition.effects.some((effect) => effect.op === "damage"),
    isPlayable: !isContentDefinitionUnplayable(definition),
  };
}

function runHasContentCards(
  state: AuthoritativeState,
  content: RunContent | undefined,
): boolean {
  if (content === undefined) return false;
  const instances = state.combat?.deck.instances ?? {};
  return Object.values(instances).some(
    (instance) => M10_STARTER_CARDS[instance.definitionId] === undefined,
  );
}

/**
 * Lifecycle for every instance in the run deck: starter cards discard unless
 * their definition Exhausts, content cards use the M11 lifecycle compiled from
 * their keywords, and anything unresolvable is treated as unplayable junk.
 */
function runLifecycleResolver(
  content: RunContent | undefined,
): (instance: CardInstance) => CardLifecycleSpec {
  return (instance) => {
    const starter = M10_STARTER_CARDS[instance.definitionId];
    if (starter !== undefined) {
      return {
        category: "skill",
        keywords: starter.destinationAfterPlay === "exhaust" ? ["exhaust"] : [],
        additionalHpCosts: [],
      };
    }
    const definition = content?.cardFor(instance.definitionId);
    if (definition === undefined) {
      return { category: "status", keywords: ["unplayable"], additionalHpCosts: [] };
    }
    const parameters = resolveCardParameters(definition, instance.upgradeLevel > 0);
    return cardLifecycleSpecFor(
      definition,
      resolveAdditionalHpCosts(definition, parameters),
    );
  };
}

export function getM19Hand(
  state: AuthoritativeState,
  content?: RunContent,
): readonly M19CardView[] {
  const combat = state.combat;
  if (combat === null) {
    throw new Error("No M19 combat is active.");
  }
  return combat.deck.zones.hand.map((instanceId) => {
    const instance = combat.deck.instances[instanceId];
    if (instance === undefined) {
      throw new Error(`Unknown card instance: ${instanceId}.`);
    }
    if (M10_STARTER_CARDS[instance.definitionId] !== undefined) {
      return { ...getM10CardView(state, instanceId), isPlayable: true };
    }
    const definition = content?.cardFor(instance.definitionId);
    if (definition !== undefined) {
      return contentCardView(state, instance, definition);
    }
    return {
      instanceId,
      definitionId: instance.definitionId,
      name: instance.definitionId,
      owner: "crew",
      energyCost: 0,
      classification: "crew",
      ingredient: null,
      isDamageCard: false,
      isPlayable: false,
    };
  });
}

/**
 * Claim a run reward. A card option becomes a real deck instance, so the pick
 * is carried into every later node; the claim stays idempotent because a
 * repeated option never reaches the insertion.
 */
export function claimRunReward(
  state: AuthoritativeState,
  transactionId: string,
  optionId: string,
): AuthoritativeState {
  const option: RewardOption | undefined = state.rewards.pending?.choices
    .flatMap((choice) => choice.options)
    .find((candidate) => candidate.id === optionId);
  const claimed = claimRewardOption(state, transactionId, optionId);
  if (claimed === state || option === undefined) {
    return claimed;
  }

  const run = requireRun(claimed);
  if (option.kind === "relic") {
    if (run.relicIds.includes(option.id)) {
      return claimed;
    }
    return replaceRun(claimed, { ...run, relicIds: [...run.relicIds, option.id] });
  }
  if (option.kind !== "card") {
    return claimed;
  }

  const deck =
    run.deck ??
    (claimed.combat === null ? [] : persistDeckInstances(claimed.combat.deck));
  const instance = createCardInstance({
    instanceId: createCardInstanceId(
      REWARD_CARD_ORDINAL_BASE + claimed.rewards.claimedCardIds.length,
    ),
    definitionId: option.id,
    ownerCharacterId: ownerCharacterIdForRole(option.role),
  });
  return replaceRun(claimed, { ...run, deck: [...deck, instance] });
}

export function advanceRunNode(state: AuthoritativeState): AuthoritativeState {
  const run = requireActiveRun(state);
  const node = requireRunNode(state);
  if (!node.isCompleted) {
    throw new Error(`Node ${node.nodeId} is not complete.`);
  }
  if (state.rewards.pending !== null) {
    throw new Error("A reward is still pending.");
  }

  const nextNodeId = M19_NODE_IDS[node.index + 1];
  if (nextNodeId === undefined) {
    return replaceRun({ ...state, combat: null }, { ...run, outcome: "victory" });
  }
  return replaceRun({ ...state, combat: null }, { ...run, currentNodeId: nextNodeId });
}
