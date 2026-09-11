import { describe, expect, it } from "vitest";
import {
  ACT_1_BOSS_ENCOUNTER,
  ACT_1_ELITE_ENCOUNTERS,
  ACT_1_ORDINARY_ENCOUNTERS,
  M19_NODE_IDS,
  M19_TEST_ACT_REWARD_CATALOG,
  advanceRunNode,
  applyDirectDamage,
  applyM19Command,
  beginRunNode,
  claimRewardOption,
  completeRunCombat,
  createDirectDamagePacket,
  createAct1Combat,
  createAuthoritativeState,
  createM19Run,
  currentRunNode,
  getM19Hand,
  restRunCharacter,
  type AuthoritativeState,
  type M19Command,
  type M19NodeId,
} from "../../src/engine";

const characters = [
  { actorId: "morrow", hp: 21, maxHp: 44 },
  { actorId: "switch", hp: 9, maxHp: 36 },
] as const;

function start(formation: (typeof ACT_1_ORDINARY_ENCOUNTERS)[number]) {
  return createAct1Combat(
    createAuthoritativeState({ seed: 191, contentHash: "m19-act-1-test" }),
    { formation, characters, frontCharacterId: "morrow" },
  );
}

describe("M19 Act 1 combat setup", () => {
  it("starts ordinary and elite fights with persistent HP and fresh combat state", () => {
    const claimsAdjuster = start(ACT_1_ORDINARY_ENCOUNTERS[0]);
    const repoForeman = start(ACT_1_ELITE_ENCOUNTERS[0]);

    for (const state of [claimsAdjuster, repoForeman]) {
      expect(state.combat).toMatchObject({ phase: "player", turnNumber: 1 });
      expect(state.combat?.actors.morrow).toMatchObject({ hp: 21, maxHp: 44 });
      expect(state.combat?.actors.switch).toMatchObject({ hp: 9, maxHp: 36 });
      expect(state.combat?.deck.zones.discard).toStrictEqual([]);
      expect(state.combat?.deck.zones.hand).toHaveLength(5);
    }

    expect(claimsAdjuster.combat?.enemySpawnOrder).toStrictEqual(["claims-adjuster"]);
    expect(repoForeman.combat?.enemySpawnOrder).toStrictEqual(["repo-foreman"]);
  });

  it("exports the Act 1 elite and boss formations", () => {
    expect(ACT_1_ELITE_ENCOUNTERS).toMatchObject([
      { id: "repo_foreman", enemyDefinitionIds: ["enemy.repo_foreman"] },
    ]);
    expect(ACT_1_BOSS_ENCOUNTER).toMatchObject({
      id: "head_of_recovery",
      enemyDefinitionIds: ["enemy.head_of_recovery"],
    });
  });
});

function requireRun(state: AuthoritativeState) {
  const run = state.run;
  if (run === null) throw new Error("M19 run is missing.");
  return run;
}

/** Test shortcut: place a fresh run directly on an authored node. */
function atNode(state: AuthoritativeState, nodeId: M19NodeId): AuthoritativeState {
  const run = requireRun(state);
  return {
    ...state,
    run: {
      ...run,
      currentNodeId: nodeId,
      completedNodeIds: M19_NODE_IDS.slice(0, M19_NODE_IDS.indexOf(nodeId)),
    },
  };
}

function playToVictory(state: AuthoritativeState): AuthoritativeState {
  let current = state;
  const commands: M19Command[] = [];
  for (let step = 0; step < 400; step += 1) {
    const combat = current.combat;
    if (combat === null) throw new Error("Combat is missing.");
    if (combat.outcome !== "active") return current;
    const target =
      combat.enemyOrder.find((actorId) => (combat.actors[actorId]?.hp ?? 0) > 0) ??
      null;
    const damageCard = getM19Hand(current).find(
      (card) => card.isDamageCard && card.energyCost <= combat.energy,
    );
    const command: M19Command =
      damageCard === undefined || target === null
        ? { kind: "end_turn" }
        : {
            kind: "play_card",
            instanceId: damageCard.instanceId,
            targetActorId: target,
          };
    commands.push(command);
    current = applyM19Command(current, command).state;
  }
  throw new Error("Combat did not resolve within the command budget.");
}

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

describe("M19 fixed run state", () => {
  it("creates the authored seven-node route with no active combat", () => {
    const state = createM19Run(1900);

    expect(M19_NODE_IDS).toStrictEqual([
      "ordinary_1",
      "rest_1",
      "ordinary_2",
      "elite",
      "rest_2",
      "ordinary_3",
      "boss",
    ]);
    expect(requireRun(state)).toMatchObject({
      runVersion: 1,
      seed: 1900,
      currentNodeId: "ordinary_1",
      completedNodeIds: [],
      outcome: "active",
      deck: null,
    });
    expect(requireRun(state).characters).toStrictEqual([
      { actorId: "morrow", hp: 44, maxHp: 44 },
      { actorId: "switch", hp: 36, maxHp: 36 },
    ]);
    expect(state.combat).toBeNull();
    expect(currentRunNode(state)).toStrictEqual({
      nodeId: "ordinary_1",
      kind: "combat",
      label: "Ordinary Combat 1",
      index: 0,
      isCompleted: false,
    });
  });

  it("knows the kind of every authored node", () => {
    const state = createM19Run(1900);
    expect(
      M19_NODE_IDS.map((nodeId) => currentRunNode(atNode(state, nodeId)).kind),
    ).toStrictEqual(["combat", "rest", "combat", "elite", "rest", "combat", "boss"]);
  });

  it("refuses to begin a combat while a reward is pending or a fight is running", () => {
    const started = beginRunNode(createM19Run(1900));
    expect(() => beginRunNode(started)).toThrow(/already active/);
  });
});

describe("M19 node progression", () => {
  it("resolves an ordinary victory into a 15 Scrap reward and blocks advance until it is resolved", () => {
    const started = beginRunNode(createM19Run(1900));
    const won = playToVictory(started);
    expect(won.combat?.outcome).toBe("victory");

    const rewarded = completeRunCombat(won, M19_TEST_ACT_REWARD_CATALOG);
    expect(rewarded.rewards.scrap).toBe(15);
    expect(rewarded.rewards.pending?.transactionId).toBe("m19.ordinary_1.reward");
    expect(currentRunNode(rewarded).isCompleted).toBe(true);
    expect(() => advanceRunNode(rewarded)).toThrow(/reward is still pending/);

    const optionId = rewarded.rewards.pending?.choices[0]?.options[0]?.id;
    if (optionId === undefined) throw new Error("Expected a card reward option.");
    const claimed = claimRewardOption(rewarded, "m19.ordinary_1.reward", optionId);
    expect(claimed.rewards.claimedCardIds).toStrictEqual([optionId]);

    const advanced = advanceRunNode(claimed);
    expect(advanced.combat).toBeNull();
    expect(currentRunNode(advanced)).toMatchObject({ nodeId: "rest_1", kind: "rest" });
    expect(requireRun(advanced).characters[0]?.hp).toBe(
      requireRun(rewarded).characters[0]?.hp,
    );
  });

  it("heals one character for 18 at a rest node and caps at maximum HP", () => {
    const resting = atNode(createM19Run(1900), "rest_1");
    const run = requireRun(resting);
    const damaged: AuthoritativeState = {
      ...resting,
      run: {
        ...run,
        characters: [
          { actorId: "morrow", hp: 14, maxHp: 44 },
          { actorId: "switch", hp: 36, maxHp: 36 },
        ],
      },
    };

    const healed = restRunCharacter(damaged, "morrow");
    expect(requireRun(healed).characters).toStrictEqual([
      { actorId: "morrow", hp: 32, maxHp: 44 },
      { actorId: "switch", hp: 36, maxHp: 36 },
    ]);
    expect(currentRunNode(healed).isCompleted).toBe(true);

    const advanced = advanceRunNode(healed);
    expect(currentRunNode(advanced)).toMatchObject({ nodeId: "ordinary_2" });

    const nearlyFull: AuthoritativeState = {
      ...atNode(healed, "rest_2"),
      run: {
        ...run,
        currentNodeId: "rest_2",
        completedNodeIds: M19_NODE_IDS.slice(0, 4),
        characters: [
          { actorId: "morrow", hp: 39, maxHp: 44 },
          { actorId: "switch", hp: 36, maxHp: 36 },
        ],
      },
    };
    expect(requireRun(restRunCharacter(nearlyFull, "morrow")).characters[0]?.hp).toBe(44);
    expect(() => restRunCharacter(damaged, "crew")).toThrow(/Unknown run character/);
    expect(() => restRunCharacter(createM19Run(1900), "morrow")).toThrow(
      /not a rest node/,
    );
  });

  it("grants 35 Scrap for the elite and 50 for the boss", () => {
    const elite = completeRunCombat(
      killAllEnemies(beginRunNode(atNode(createM19Run(1900), "elite"))),
      M19_TEST_ACT_REWARD_CATALOG,
    );
    expect(elite.rewards.scrap).toBe(35);
    expect(elite.rewards.pending?.transactionId).toBe("m19.elite.reward");
    expect(elite.rewards.pending?.choices.map((choice) => choice.kind)).toStrictEqual([
      "card",
      "relic",
    ]);

    const boss = completeRunCombat(
      killAllEnemies(beginRunNode(atNode(createM19Run(1900), "boss"))),
      M19_TEST_ACT_REWARD_CATALOG,
    );
    expect(boss.rewards.scrap).toBe(50);
    expect(boss.rewards.pending?.transactionId).toBe("m19.boss.reward");

    const completed = advanceRunNode(
      claimRewardOption(
        boss,
        "m19.boss.reward",
        boss.rewards.pending?.choices[0]?.options[0]?.id ?? "",
      ),
    );
    expect(requireRun(completed).outcome).toBe("victory");
  });

  it("ends the run on defeat and never creates a reward", () => {
    const started = beginRunNode(createM19Run(1900));
    const morrowDown = applyDirectDamage(
      started,
      "morrow",
      createDirectDamagePacket(60),
    ).state;
    const defeated =
      morrowDown.combat?.outcome === "active"
        ? applyDirectDamage(morrowDown, "switch", createDirectDamagePacket(60)).state
        : morrowDown;

    expect(defeated.combat?.outcome).toBe("defeat");
    const lost = completeRunCombat(defeated, M19_TEST_ACT_REWARD_CATALOG);
    expect(lost.combat?.outcome).toBe("defeat");
    expect(requireRun(lost).outcome).toBe("defeat");
    expect(lost.rewards.scrap).toBe(0);
    expect(lost.rewards.pending).toBeNull();
    expect(() => advanceRunNode(lost)).toThrow(/already defeat/);
  });
});
