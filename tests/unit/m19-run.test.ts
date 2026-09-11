import { describe, expect, it } from "vitest";
import {
  M10_MORROW_ID,
  M10_SWITCH_ID,
  createAct1Combat,
  createM10Fight,
} from "../../src/engine";

describe("M19 fixed test act", () => {
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
});
