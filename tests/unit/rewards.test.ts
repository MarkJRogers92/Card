import { describe, expect, it } from "vitest";
import { createAuthoritativeState } from "../../src/engine";

describe("M18 rewards", () => {
  it("starts with zero Scrap, no pending reward, and no completed transactions", () => {
    const state = createAuthoritativeState({ seed: 18, contentHash: "m18" });
    expect(state.rewards).toStrictEqual({
      rewardVersion: 1,
      scrap: 0,
      pending: null,
      completedTransactionIds: [],
      claimedCardIds: [],
      claimedRelicIds: [],
    });
  });
});
