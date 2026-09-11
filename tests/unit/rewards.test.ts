import { describe, expect, it } from "vitest";
import {
  createAuthoritativeState,
  createEncounterReward,
  claimRewardOption,
  skipCardReward,
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
      resolvedChoiceIds: [],
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

  it("claims a card once and makes a repeated completed command a no-op", () => {
    const offered = createEncounterReward(
      createAuthoritativeState({ seed: 19, contentHash: "m18" }),
      catalog,
      {
        transactionId: "ordinary-claim",
        encounter: "ordinary",
        selectedRoles: ["source", "shaper", "crew"],
        ownedRelicIds: [],
      },
    );
    const optionId = offered.rewards.pending?.choices[0]?.options[0]?.id;
    expect(optionId).toBeDefined();

    const claimed = claimRewardOption(offered, "ordinary-claim", optionId as string);

    expect(claimed.rewards.pending).toBeNull();
    expect(claimed.rewards.claimedCardIds).toEqual([optionId]);
    expect(claimed.rewards.completedTransactionIds).toEqual(["ordinary-claim"]);
    expect(claimRewardOption(claimed, "ordinary-claim", optionId as string)).toBe(claimed);
  });

  it("skips only a card reward and rejects mismatched transactions", () => {
    const offered = createEncounterReward(
      createAuthoritativeState({ seed: 20, contentHash: "m18" }),
      catalog,
      {
        transactionId: "ordinary-skip",
        encounter: "ordinary",
        selectedRoles: ["source", "shaper"],
        ownedRelicIds: [],
      },
    );

    const skipped = skipCardReward(offered, "ordinary-skip");
    expect(skipped.rewards.pending).toBeNull();
    expect(skipped.rewards.claimedCardIds).toEqual([]);
    expect(() => claimRewardOption(offered, "wrong-id", "source.common")).toThrow(
      "does not match",
    );
  });

  it("makes an elite card skip idempotent while preserving its relic choice", () => {
    const offered = createEncounterReward(
      createAuthoritativeState({ seed: 21, contentHash: "m18" }),
      {
        ...catalog,
        relics: [
          { id: "relic.a", unlocked: true },
          { id: "relic.b", unlocked: true },
          { id: "relic.owned", unlocked: true },
        ],
      },
      {
        transactionId: "elite-skip",
        encounter: "elite",
        selectedRoles: ["source", "shaper", "crew"],
        ownedRelicIds: ["relic.owned"],
      },
    );

    const skipped = skipCardReward(offered, "elite-skip");
    expect(skipped.rewards.scrap).toBe(35);
    expect(skipped.rewards.pending?.choices).toHaveLength(1);
    expect(skipped.rewards.pending?.choices[0]?.options.map((option) => option.id)).toEqual(
      expect.arrayContaining(["relic.a", "relic.b"]),
    );
    expect(skipCardReward(skipped, "elite-skip")).toBe(skipped);
  });
});
