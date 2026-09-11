import { describe, expect, it } from "vitest";
import {
  M10_MORROW_ID,
  M10_SWITCH_ID,
  M19_NODE_IDS,
  createAct1Combat,
  createM19Run,
  beginRunNode,
  currentRunNode,
  createM10Fight,
} from "../../src/engine";

describe("M19 fixed test act", () => {
  it("creates the fixed seven-node route before any combat begins", () => {
    const state = createM19Run(19);

    expect(M19_NODE_IDS).toEqual([
      "ordinary_1", "rest_1", "ordinary_2", "elite", "rest_2", "ordinary_3", "boss",
    ]);
    expect(currentRunNode(state)).toBe("ordinary_1");
    expect(state.run?.completedNodeIds).toEqual([]);
    expect(state.combat).toBeNull();
  });

  it("starts an Act 1 formation from persistent player HP with fresh combat state", () => {
    const previousCombat = createM10Fight(19).combat;
    const state = createAct1Combat({
      seed: 19,
      formationId: "claims_adjuster",
      playerHp: {
        [M10_MORROW_ID]: 17,
        [M10_SWITCH_ID]: 9,
      },
    });

    expect(state.combat?.actors[M10_MORROW_ID]?.hp).toBe(17);
    expect(state.combat?.actors[M10_SWITCH_ID]?.hp).toBe(9);
    expect(state.combat?.turnNumber).toBe(1);
    expect(state.combat?.deck.zones.hand).toHaveLength(5);
    expect(state.combat?.deck.zones.hand).toEqual(previousCombat?.deck.zones.hand);
    expect(state.combat).not.toBe(previousCombat);
  });

  it("begins the first ordinary node as a fresh combat", () => {
    const state = beginRunNode(createM19Run(23));

    expect(state.run?.currentNodeId).toBe("ordinary_1");
    expect(state.combat?.outcome).toBe("active");
    expect(state.combat?.actors[M10_MORROW_ID]?.hp).toBe(44);
    expect(state.combat?.actors[M10_SWITCH_ID]?.hp).toBe(36);
  });
});
