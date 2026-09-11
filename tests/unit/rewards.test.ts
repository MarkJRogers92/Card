import { describe, expect, it } from "vitest";
import {
  createAuthoritativeState,
  createEncounterReward,
  type RewardCatalog,
} from "../../src/engine";

const catalog: RewardCatalog = {
  cards: [
    { id: "source.common", role: "source", rarity: "common", unlocked: true },
    { id: "source.uncommon", role: "source", rarity: "uncommon", unlocked: true },
    { id: "shaper.common", role: "shaper", rarity: "common", unlocked: true },
    { id: "shaper.rare", role: "shaper", rarity: "rare", unlocked: true },
    { id: "crew.common", role: "crew", rarity: "common", unlocked: true },
    { id: "locked.source", role: "source", rarity: "common", unlocked: false },
  ],
  relics: [
    { id: "relic.common", unlocked: true },
    { id: "relic.locked", unlocked: false },
  ],
};

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

  it("creates the same ordinary Source and Shaper card offer for the same seed", () => {
    const state = createAuthoritativeState({ seed: 18, contentHash: "m18" });
    const input = {
      transactionId: "ordinary-1",
      encounter: "ordinary" as const,
      selectedRoles: ["source", "shaper", "crew"] as const,
      ownedRelicIds: [],
    };

    const first = createEncounterReward(state, catalog, input);
    const second = createEncounterReward(state, catalog, input);

    expect(first).toStrictEqual(second);
    expect(first.rewards.scrap).toBe(15);
    expect(first.rewards.pending?.choices).toHaveLength(1);
    expect(first.rewards.pending?.choices[0]?.kind).toBe("card");
    expect(first.rewards.pending?.choices[0]?.options).toHaveLength(3);
    expect(first.rewards.pending?.choices[0]?.options
      .filter((option) => option.kind === "card")
      .map((option) => option.role)).toEqual(
      expect.arrayContaining(["source", "shaper"]),
    );
  });
});
