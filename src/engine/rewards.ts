import { cardRewardOptionCount } from "./reward-options";
import type { AuthoritativeState } from "./state";
import { drawGameplayInt } from "./rng";

export const REWARD_STATE_VERSION = 1 as const;

export const REWARD_CARD_ROLES = ["source", "shaper", "crew"] as const;
export type RewardCardRole = (typeof REWARD_CARD_ROLES)[number];

export const REWARD_CARD_RARITIES = ["common", "uncommon", "rare"] as const;
export type RewardCardRarity = (typeof REWARD_CARD_RARITIES)[number];

export const REWARD_ENCOUNTER_KINDS = ["ordinary", "elite", "act_1_boss"] as const;
export type RewardEncounterKind = (typeof REWARD_ENCOUNTER_KINDS)[number];

export interface RewardCardDefinition {
  readonly id: string;
  readonly role: RewardCardRole;
  readonly rarity: RewardCardRarity;
  readonly unlocked: boolean;
}

export interface RewardRelicDefinition {
  readonly id: string;
  readonly unlocked: boolean;
}

export interface RewardCatalog {
  readonly cards: readonly RewardCardDefinition[];
  readonly relics: readonly RewardRelicDefinition[];
}

export interface CardRewardOption {
  readonly id: string;
  readonly kind: "card";
  readonly role: RewardCardRole;
  readonly rarity: RewardCardRarity;
}

export interface RelicRewardOption {
  readonly id: string;
  readonly kind: "relic";
}

export type RewardOption = CardRewardOption | RelicRewardOption;

export interface PendingRewardChoice {
  readonly choiceId: string;
  readonly kind: "card" | "relic";
  readonly options: readonly RewardOption[];
}

export interface PendingReward {
  readonly transactionId: string;
  readonly choices: readonly PendingRewardChoice[];
}

export interface CreateEncounterRewardInput {
  readonly transactionId: string;
  readonly encounter: RewardEncounterKind;
  readonly selectedRoles: readonly RewardCardRole[];
  readonly ownedRelicIds: readonly string[];
}

export interface RewardState {
  readonly rewardVersion: typeof REWARD_STATE_VERSION;
  readonly scrap: number;
  readonly pending: PendingReward | null;
  readonly completedTransactionIds: readonly string[];
  readonly claimedCardIds: readonly string[];
  readonly claimedRelicIds: readonly string[];
}

interface DrawResult {
  readonly state: AuthoritativeState;
  readonly value: number;
}

const CARD_RARITY_WEIGHTS: Readonly<Record<RewardEncounterKind, Readonly<Record<RewardCardRarity, number>>>> = {
  ordinary: { common: 65, uncommon: 30, rare: 5 },
  elite: { common: 20, uncommon: 60, rare: 20 },
  act_1_boss: { common: 0, uncommon: 0, rare: 0 },
};

const EXTRA_ROLE_WEIGHTS: Readonly<Record<RewardCardRole, number>> = {
  source: 40,
  shaper: 40,
  crew: 20,
};

const SCRAP_BY_ENCOUNTER: Readonly<Record<RewardEncounterKind, number>> = {
  ordinary: 15,
  elite: 35,
  act_1_boss: 50,
};

function drawRewardInt(state: AuthoritativeState, maxExclusive: number): DrawResult {
  const draw = drawGameplayInt(state.rng, "reward", maxExclusive);
  return { value: draw.value, state: { ...state, rng: draw.state } };
}

function weightedIndex<T>(
  state: AuthoritativeState,
  values: readonly T[],
  weightOf: (value: T) => number,
): { readonly state: AuthoritativeState; readonly value: T } {
  const total = values.reduce((sum, value) => sum + weightOf(value), 0);
  if (total <= 0) {
    throw new RangeError("Reward selection requires at least one positive weight.");
  }
  const draw = drawRewardInt(state, total);
  let cursor = draw.value;
  for (const value of values) {
    cursor -= weightOf(value);
    if (cursor < 0) {
      return { state: draw.state, value };
    }
  }
  throw new Error("Reward weight selection was not exhaustive.");
}

function takeCard(
  state: AuthoritativeState,
  candidates: readonly RewardCardDefinition[],
  role: RewardCardRole,
  encounter: RewardEncounterKind,
): { readonly state: AuthoritativeState; readonly card: RewardCardDefinition; readonly remaining: readonly RewardCardDefinition[] } | null {
  const forRole = candidates.filter((card) => card.role === role);
  if (forRole.length === 0) {
    return null;
  }
  const availableRarities = REWARD_CARD_RARITIES.filter((rarity) =>
    forRole.some((card) => card.rarity === rarity),
  );
  const rarityDraw = weightedIndex(state, availableRarities, (rarity) => CARD_RARITY_WEIGHTS[encounter][rarity]);
  const forRarity = forRole.filter((card) => card.rarity === rarityDraw.value);
  const cardDraw = drawRewardInt(rarityDraw.state, forRarity.length);
  const card = forRarity[cardDraw.value] as RewardCardDefinition;
  return {
    state: cardDraw.state,
    card,
    remaining: candidates.filter((candidate) => candidate.id !== card.id),
  };
}

function createCardChoice(
  state: AuthoritativeState,
  catalog: RewardCatalog,
  input: CreateEncounterRewardInput,
): { readonly state: AuthoritativeState; readonly choice: PendingRewardChoice } {
  let current = state;
  let candidates: readonly RewardCardDefinition[] = catalog.cards.filter(
    (card) => card.unlocked && input.selectedRoles.includes(card.role),
  );
  const options: CardRewardOption[] = [];
  const addForRole = (role: RewardCardRole): void => {
    const result = takeCard(current, candidates, role, input.encounter);
    if (result === null) return;
    current = result.state;
    candidates = result.remaining;
    options.push({ id: result.card.id, kind: "card", role: result.card.role, rarity: result.card.rarity });
  };

  addForRole("source");
  addForRole("shaper");
  const targetCount = cardRewardOptionCount(state);
  while (options.length < targetCount && candidates.length > 0) {
    const roles = REWARD_CARD_ROLES.filter((role) => candidates.some((card) => card.role === role));
    const roleDraw = weightedIndex(current, roles, (role) => EXTRA_ROLE_WEIGHTS[role]);
    current = roleDraw.state;
    addForRole(roleDraw.value);
  }
  return {
    state: current,
    choice: { choiceId: "card", kind: "card", options },
  };
}

function createRelicChoice(
  state: AuthoritativeState,
  catalog: RewardCatalog,
  ownedRelicIds: readonly string[],
  optionCount: number,
): { readonly state: AuthoritativeState; readonly choice: PendingRewardChoice } {
  let current = state;
  let candidates = catalog.relics.filter(
    (relic) => relic.unlocked && !ownedRelicIds.includes(relic.id),
  );
  const options: RelicRewardOption[] = [];
  while (options.length < optionCount && candidates.length > 0) {
    const draw = drawRewardInt(current, candidates.length);
    current = draw.state;
    const relic = candidates[draw.value] as RewardRelicDefinition;
    candidates = candidates.filter((candidate) => candidate.id !== relic.id);
    options.push({ id: relic.id, kind: "relic" });
  }
  return { state: current, choice: { choiceId: "relic", kind: "relic", options } };
}

export function createEncounterReward(
  state: AuthoritativeState,
  catalog: RewardCatalog,
  input: CreateEncounterRewardInput,
): AuthoritativeState {
  if (input.transactionId.length === 0) {
    throw new RangeError("Reward transaction IDs cannot be empty.");
  }
  if (state.rewards.completedTransactionIds.includes(input.transactionId)) {
    return state;
  }
  if (state.rewards.pending !== null) {
    if (state.rewards.pending.transactionId === input.transactionId) return state;
    throw new Error("Cannot create a reward while another reward is pending.");
  }

  let current = state;
  const choices: PendingRewardChoice[] = [];
  if (input.encounter !== "act_1_boss") {
    const cardChoice = createCardChoice(current, catalog, input);
    current = cardChoice.state;
    choices.push(cardChoice.choice);
  }
  const relicCount = input.encounter === "elite" ? 2 : input.encounter === "act_1_boss" ? 3 : 0;
  if (relicCount > 0) {
    const relicChoice = createRelicChoice(current, catalog, input.ownedRelicIds, relicCount);
    current = relicChoice.state;
    choices.push(relicChoice.choice);
  }
  return {
    ...current,
    rewards: {
      ...current.rewards,
      scrap: current.rewards.scrap + SCRAP_BY_ENCOUNTER[input.encounter],
      pending: { transactionId: input.transactionId, choices },
    },
  };
}

export function createRewardState(): RewardState {
  return {
    rewardVersion: REWARD_STATE_VERSION,
    scrap: 0,
    pending: null,
    completedTransactionIds: [],
    claimedCardIds: [],
    claimedRelicIds: [],
  };
}
