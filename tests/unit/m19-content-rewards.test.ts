import { describe, expect, it } from "vitest";
import { createContentBundle } from "../../src/content/bundle";
import {
  M19_TEST_ACT_REWARD_CATALOG,
  advanceRunNode,
  applyDirectDamage,
  applyM19Command,
  beginRunNode,
  claimRunReward,
  completeRunCombat,
  createCardInstance,
  createCardInstanceId,
  createDirectDamagePacket,
  createEncounterReward,
  createM19Run,
  currentRunNode,
  exportSave,
  getM19Hand,
  hashAuthoritativeState,
  importSave,
  M19_SELECTED_REWARD_ROLES,
  restRunCharacter,
  skipCardReward,
  type AuthoritativeState,
  type CardInstance,
  type CardInstanceId,
} from "../../src/engine";

const content = createContentBundle();

function killAllEnemies(state: AuthoritativeState): AuthoritativeState {
  let current = state;
  for (const actorId of current.combat?.enemyOrder ?? []) {
    const actor = current.combat?.actors[actorId];
    if (actor === undefined || actor.hp === 0) continue;
    current = applyDirectDamage(
      current,
      actorId,
      createDirectDamagePacket(actor.hp + actor.block),
    ).state;
  }
  return current;
}

/** Resolve the first encounter and claim the first offered card. */
function claimFirstCard(seed: number): {
  readonly state: AuthoritativeState;
  readonly definitionId: string;
} {
  const won = killAllEnemies(beginRunNode(createM19Run(seed)));
  const rewarded = completeRunCombat(won, M19_TEST_ACT_REWARD_CATALOG);
  const pending = rewarded.rewards.pending;
  if (pending === null) throw new Error("Expected a pending reward.");
  const choice = pending.choices.find((candidate) => candidate.kind === "card");
  const optionId = choice?.options[0]?.id;
  if (optionId === undefined) throw new Error("Expected a card reward option.");
  return {
    state: claimRunReward(rewarded, pending.transactionId, optionId),
    definitionId: optionId,
  };
}

function runWithDeck(deck: readonly CardInstance[]): AuthoritativeState {
  const state = createM19Run(1900);
  if (state.run === null) throw new Error("M19 run is missing.");
  return { ...state, run: { ...state.run, deck } };
}

describe("M19 card rewards", () => {
  it("turns a claimed card reward into a deck instance", () => {
    const { state, definitionId } = claimFirstCard(1900);

    expect(state.rewards.claimedCardIds).toStrictEqual([definitionId]);
    const carried = state.run?.deck ?? [];
    expect(carried.map((instance) => instance.definitionId)).toContain(definitionId);
    const claimed = carried.find((instance) => instance.definitionId === definitionId);
    expect(claimed?.upgradeLevel).toBe(0);
  });

  it("plays the claimed card in the next combat using its content definition", () => {
    const claimed = claimFirstCard(1900);
    let state = advanceRunNode(claimed.state);
    state = restRunCharacter(state, "morrow");
    state = advanceRunNode(state);
    expect(currentRunNode(state).nodeId).toBe("ordinary_2");
    state = beginRunNode(state);

    const combat = state.combat;
    if (combat === null) throw new Error("Expected an active combat.");
    const instanceId = Object.values(combat.deck.instances).find(
      (instance) => instance.definitionId === claimed.definitionId,
    )?.instanceId;
    if (instanceId === undefined) {
      throw new Error(`Claimed card ${claimed.definitionId} is missing from the deck.`);
    }

    // The opening draw is deterministic but not guaranteed to include it, so
    // place the claimed instance in hand the way playing it would need.
    const hand = combat.deck.zones.hand;
    if (!hand.includes(instanceId)) {
      state = {
        ...state,
        combat: {
          ...combat,
          deck: {
            ...combat.deck,
            zones: {
              ...combat.deck.zones,
              hand: [...hand, instanceId],
              draw: combat.deck.zones.draw.filter((id) => id !== instanceId),
            },
          },
        },
      };
    }

    const definition = content.cardFor(claimed.definitionId);
    if (definition === undefined) {
      throw new Error(`No content definition for ${claimed.definitionId}.`);
    }
    const view = getM19Hand(state, content).find(
      (card) => card.instanceId === instanceId,
    );
    expect(view).toMatchObject({
      definitionId: definition.id,
      name: definition.name,
      isPlayable: true,
    });

    const targetActorId =
      state.combat?.enemyOrder.find(
        (actorId) => (state.combat?.actors[actorId]?.hp ?? 0) > 0,
      ) ?? null;
    const enemyBefore = targetActorId === null ? 0 : (state.combat?.actors[targetActorId]?.hp ?? 0);
    const played = applyM19Command(
      state,
      { kind: "play_card", instanceId, targetActorId },
      content,
    ).state;

    // Every card in the test-act catalog resolves; an attack also lands damage.
    expect(played).not.toBe(state);
    if (definition.category === "attack" && targetActorId !== null) {
      expect(played.combat?.actors[targetActorId]?.hp).toBeLessThan(enemyBefore);
    }
  });

  it("settles Retain and Fleeting with the content lifecycle", () => {
    const morrowTape = createCardInstance({
      instanceId: createCardInstanceId(1),
      definitionId: "source.surgical_tape",
      ownerCharacterId: "morrow",
    });
    const invoice = createCardInstance({
      instanceId: createCardInstanceId(2),
      definitionId: "junk.invoice",
      ownerCharacterId: "crew",
    });
    const starters = Array.from({ length: 10 }, (_, index) =>
      createCardInstance({
        instanceId: createCardInstanceId(index + 3),
        definitionId: index % 2 === 0 ? "starter.repossess" : "starter.test_fire",
        ownerCharacterId: index % 2 === 0 ? "morrow" : "switch",
      }),
    );
    let state = beginRunNode(runWithDeck([morrowTape, invoice, ...starters]));

    const combat = state.combat;
    if (combat === null) throw new Error("Expected an active combat.");
    const rest = Object.keys(combat.deck.instances).filter(
      (id) => id !== morrowTape.instanceId && id !== invoice.instanceId,
    );
    state = {
      ...state,
      combat: {
        ...combat,
        deck: {
          ...combat.deck,
          zones: {
            ...combat.deck.zones,
            hand: [morrowTape.instanceId, invoice.instanceId],
            draw: rest as CardInstanceId[],
            discard: [],
            exhaust: [],
          },
        },
      },
    };

    const hand = getM19Hand(state, content);
    expect(hand.find((card) => card.instanceId === morrowTape.instanceId)).toMatchObject({
      name: "Surgical Tape",
      isPlayable: true,
    });
    expect(hand.find((card) => card.instanceId === invoice.instanceId)).toMatchObject({
      isPlayable: false,
    });

    const ended = applyM19Command(state, { kind: "end_turn" }, content).state;
    const nextHand = ended.combat?.deck.zones.hand ?? [];
    expect(nextHand).toContain(morrowTape.instanceId);
    expect(nextHand).not.toContain(invoice.instanceId);
    // Fleeting junk leaves the hand and is exhausted, not discarded.
    expect(ended.combat?.deck.zones.exhaust).toContain(invoice.instanceId);
  });

  it("still refuses content cards when no bundle is supplied", () => {
    const { state, definitionId } = claimFirstCard(1900);
    let next = advanceRunNode(state);
    next = restRunCharacter(next, "morrow");
    next = advanceRunNode(next);
    next = beginRunNode(next);
    const combat = next.combat;
    if (combat === null) throw new Error("Expected an active combat.");
    const instance = Object.values(combat.deck.instances).find(
      (candidate) => candidate.definitionId === definitionId,
    );
    expect(instance).toBeDefined();
    expect(() =>
      applyM19Command(next, {
        kind: "play_card",
        instanceId: instance!.instanceId,
        targetActorId: null,
      }),
    ).toThrow(/not playable in the M19 test act/);
    expect(next).toBe(next);
  });
});

/** Build a pending elite reward without having to win the elite fight. */
function eliteReward(state: AuthoritativeState): AuthoritativeState {
  return createEncounterReward(state, M19_TEST_ACT_REWARD_CATALOG, {
    transactionId: "test.elite.reward",
    encounter: "elite",
    selectedRoles: M19_SELECTED_REWARD_ROLES,
    ownedRelicIds: state.run?.relicIds ?? [],
  });
}

describe("M19 relic rewards", () => {
  it("carries a claimed relic into the next combat", () => {
    const rewarded = eliteReward(createM19Run(1900));
    const pending = rewarded.rewards.pending;
    if (pending === null) throw new Error("Expected a pending elite reward.");
    const relicId = pending.choices
      .find((choice) => choice.kind === "relic")
      ?.options[0]?.id;
    if (relicId === undefined) throw new Error("Expected a relic option.");

    const claimed = claimRunReward(rewarded, pending.transactionId, relicId);
    expect(claimed.run?.relicIds).toContain(relicId);

    const resolved = skipCardReward(claimed, pending.transactionId);
    expect(resolved.rewards.pending).toBeNull();

    // The relic survives a save round trip with the run.
    const reloaded = importSave(exportSave(resolved));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(reloaded.state.run?.relicIds).toStrictEqual(resolved.run?.relicIds);
    expect(hashAuthoritativeState(reloaded.state)).toBe(hashAuthoritativeState(resolved));

    const control = beginRunNode(createM19Run(1900), content).combat;
    const combat = beginRunNode(reloaded.state, content).combat;
    if (combat === null || control === null) {
      throw new Error("Expected an active combat.");
    }
    expect(combat.installedRelics.map((relic) => relic.id)).toContain(relicId);
    const ownBindings =
      combat.modifierBindings.length + combat.triggerBindings.length;
    const controlBindings =
      control.modifierBindings.length + control.triggerBindings.length;
    expect(ownBindings).toBeGreaterThan(controlBindings);
  });

  it("never offers a relic the run already owns", () => {
    const state = createM19Run(1900);
    expect(state.run?.relicIds).toStrictEqual(["relic.shared_warranty"]);

    const rewarded = eliteReward(state);
    const options = (rewarded.rewards.pending?.choices ?? [])
      .filter((choice) => choice.kind === "relic")
      .flatMap((choice) => choice.options.map((option) => option.id));
    expect(options).not.toContain("relic.shared_warranty");
    expect(options).toHaveLength(2);
  });

  it("installs two claimed relics together without duplicating a binding", () => {
    const first = eliteReward(createM19Run(1900));
    const firstPending = first.rewards.pending;
    if (firstPending === null) throw new Error("Expected a pending reward.");
    const firstId = firstPending.choices
      .find((choice) => choice.kind === "relic")
      ?.options[0]?.id;
    if (firstId === undefined) throw new Error("Expected a relic option.");
    const claimedFirst = skipCardReward(
      claimRunReward(first, firstPending.transactionId, firstId),
      firstPending.transactionId,
    );

    const second = createEncounterReward(claimedFirst, M19_TEST_ACT_REWARD_CATALOG, {
      transactionId: "test.boss.reward",
      encounter: "act_1_boss",
      selectedRoles: M19_SELECTED_REWARD_ROLES,
      ownedRelicIds: claimedFirst.run?.relicIds ?? [],
    });
    const secondPending = second.rewards.pending;
    if (secondPending === null) throw new Error("Expected a pending boss reward.");
    const secondId = secondPending.choices
      .find((choice) => choice.kind === "relic")
      ?.options[0]?.id;
    if (secondId === undefined) throw new Error("Expected a relic option.");
    const claimedBoth = claimRunReward(second, secondPending.transactionId, secondId);

    const combat = beginRunNode(claimedBoth, content).combat;
    if (combat === null) throw new Error("Expected an active combat.");
    const installed = combat.installedRelics.map((relic) => relic.id);
    expect(installed).toContain(firstId);
    expect(installed).toContain(secondId);
    expect(new Set(installed).size).toBe(installed.length);
  });
});
