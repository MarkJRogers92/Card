export const REWARD_STATE_VERSION = 1 as const;

export interface RewardState {
  readonly rewardVersion: typeof REWARD_STATE_VERSION;
  readonly scrap: number;
  readonly pending: null;
  readonly completedTransactionIds: readonly string[];
  readonly claimedCardIds: readonly string[];
  readonly claimedRelicIds: readonly string[];
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
