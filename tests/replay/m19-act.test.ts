import { describe, expect, it } from "vitest";
import {
  M19_TEST_ACT_REWARD_CATALOG,
  advanceRunNode,
  applyM19Command,
  beginRunNode,
  claimRewardOption,
  completeRunCombat,
  createM19Run,
  currentRunNode,
  getM19Hand,
  hashAuthoritativeState,
  restRunCharacter,
  type AuthoritativeState,
  type M19Command,
} from "../../src/engine";

const ACT_SEED = 1900;

interface CommandTrace {
  readonly commands: M19Command[];
  cursor: number;
}

interface AuthoredActRun {
  readonly state: AuthoritativeState;
  readonly firstVictory: AuthoritativeState;
  readonly secondNodeStart: AuthoritativeState;
}

function requireRun(state: AuthoritativeState) {
  const run = state.run;
  if (run === null) throw new Error("M19 run is missing.");
  return run;
}

function nextCommand(state: AuthoritativeState): M19Command {
  const combat = state.combat;
  if (combat === null) throw new Error("Combat is missing.");
  const target =
    combat.enemyOrder.find((actorId) => (combat.actors[actorId]?.hp ?? 0) > 0) ?? null;
  const damageCard = getM19Hand(state).find(
    (card) => card.isDamageCard && card.energyCost <= combat.energy,
  );
  return damageCard === undefined || target === null
    ? { kind: "end_turn" }
    : {
        kind: "play_card",
        instanceId: damageCard.instanceId,
        targetActorId: target,
      };
}

function takeCommand(trace: CommandTrace, command: M19Command): M19Command {
  const recorded = trace.commands[trace.cursor];
  if (recorded === undefined) {
    trace.commands.push(command);
  } else if (JSON.stringify(recorded) !== JSON.stringify(command)) {
    throw new Error(
      `Authored M19 trace diverged at step ${trace.cursor}: expected ${JSON.stringify(recorded)}, got ${JSON.stringify(command)}.`,
    );
  }
  trace.cursor += 1;
  return command;
}

function fightToVictory(
  state: AuthoritativeState,
  trace: CommandTrace,
): AuthoritativeState {
  let current = state;
  for (let step = 0; step < 400; step += 1) {
    const combat = current.combat;
    if (combat === null) throw new Error("Combat is missing.");
    if (combat.outcome !== "active") return current;
    const command = takeCommand(trace, nextCommand(current));
    current = applyM19Command(current, command).state;
  }
  throw new Error("Combat did not resolve within the command budget.");
}

function claimFirstOption(state: AuthoritativeState): AuthoritativeState {
  const pending = state.rewards.pending;
  if (pending === null) throw new Error("Expected a pending reward.");
  const optionId = pending.choices[0]?.options[0]?.id;
  if (optionId === undefined) throw new Error("Expected a reward option.");
  return claimRewardOption(state, pending.transactionId, optionId);
}

function playAuthoredAct(trace: CommandTrace): AuthoredActRun {
  let state = createM19Run(ACT_SEED);

  const firstVictory = fightToVictory(beginRunNode(state), trace);
  state = claimFirstOption(completeRunCombat(firstVictory, M19_TEST_ACT_REWARD_CATALOG));
  state = advanceRunNode(state);

  state = restRunCharacter(state, "morrow");
  state = advanceRunNode(state);

  const secondNodeStart = beginRunNode(state);
  state = fightToVictory(secondNodeStart, trace);
  return {
    state: completeRunCombat(state, M19_TEST_ACT_REWARD_CATALOG),
    firstVictory,
    secondNodeStart,
  };
}

describe("M19 fixed act replay", () => {
  it("persists run state and rebuilds only combat state for the second node", () => {
    const { state, firstVictory, secondNodeStart } = playAuthoredAct({
      commands: [],
      cursor: 0,
    });
    const run = requireRun(state);
    const firstCombat = firstVictory.combat;
    const secondCombat = secondNodeStart.combat;
    if (firstCombat === null || secondCombat === null) {
      throw new Error("Expected two combats.");
    }

    expect(run.completedNodeIds).toStrictEqual(["ordinary_1", "rest_1", "ordinary_2"]);
    expect(currentRunNode(state)).toMatchObject({
      nodeId: "ordinary_2",
      kind: "combat",
      isCompleted: true,
    });
    expect(state.rewards.scrap).toBe(30);
    expect(state.rewards.claimedCardIds).toHaveLength(1);
    expect(state.rewards.pending?.transactionId).toBe("m19.ordinary_2.reward");

    expect(firstCombat.turnNumber).toBeGreaterThan(1);
    expect(secondCombat.turnNumber).toBe(1);
    expect(secondCombat.phase).toBe("player");
    expect(secondCombat.deck.zones.discard).toStrictEqual([]);
    expect(secondCombat.deck.zones.hand).toHaveLength(5);
    expect(secondCombat.energy).toBe(firstCombat.rules.energyPerTurn);
    for (const actorId of secondCombat.enemyOrder) {
      const actor = secondCombat.actors[actorId];
      expect(actor?.hp).toBe(actor?.maxHp);
    }
    for (const actorId of firstCombat.enemyOrder) {
      expect(firstCombat.actors[actorId]?.hp).toBe(0);
    }
    expect(Object.keys(secondCombat.deck.instances).sort()).toStrictEqual(
      Object.keys(firstCombat.deck.instances).sort(),
    );

    const firstCharacterState = requireRun(firstVictory).characters;
    const firstMorrowHp = firstCharacterState[0]?.hp ?? 0;
    const secondFightCharacters = secondCombat.actors;
    expect(secondFightCharacters.morrow?.hp).toBe(Math.min(firstMorrowHp + 18, 44));
    expect(secondFightCharacters.switch?.hp).toBe(firstCharacterState[1]?.hp);

    const finalCombat = state.combat;
    if (finalCombat === null) throw new Error("Final combat is missing.");
    expect(run.characters).toStrictEqual([
      { actorId: "morrow", hp: finalCombat.actors.morrow?.hp, maxHp: 44 },
      { actorId: "switch", hp: finalCombat.actors.switch?.hp, maxHp: 36 },
    ]);
    expect(hashAuthoritativeState(state)).toMatch(/^fnv1a64-utf8-v1:[0-9a-f]+$/);
  });

  it("replays the exact authored command trace to the same state hash", () => {
    const baseline = playAuthoredAct({ commands: [], cursor: 0 }).state;
    const trace: CommandTrace = { commands: [], cursor: 0 };
    const recorded = playAuthoredAct(trace);
    const replayed = playAuthoredAct({ commands: trace.commands, cursor: 0 }).state;

    expect(trace.commands.length).toBeGreaterThan(0);
    expect(trace.cursor).toBe(trace.commands.length);
    expect(hashAuthoritativeState(recorded.state)).toBe(hashAuthoritativeState(baseline));
    expect(hashAuthoritativeState(replayed)).toBe(hashAuthoritativeState(baseline));
  });
});
