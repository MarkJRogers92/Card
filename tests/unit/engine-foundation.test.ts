import { describe, expect, it } from "vitest";
import {
  GAMEPLAY_RNG_STREAMS,
  canonicalStringify,
  commitCommand,
  createAuthoritativeState,
  createCommand,
  createCosmeticRngState,
  createEventRecords,
  drawCosmeticUint32,
  drawStateUint32,
  hashAuthoritativeState,
} from "../../src/engine";

describe("M02 engine foundation", () => {
  it("canonicalizes object keys before hashing", () => {
    expect(canonicalStringify({ b: 2, a: 1 })).toBe(
      canonicalStringify({ a: 1, b: 2 }),
    );
  });

  it("keeps gameplay RNG streams independent", () => {
    const initial = createAuthoritativeState({
      seed: 90210,
      contentVersion: "m01.test",
      contentHash: "fixture-content",
    });

    const combatDraw = drawStateUint32(initial, "combat");
    expect(combatDraw.state.rng.streams.reward).toStrictEqual(
      initial.rng.streams.reward,
    );
    expect(combatDraw.state.rng.streams.combat.draws).toBe(1);
    expect(initial.rng.streams.combat.draws).toBe(0);
  });

  it("creates stable command IDs and deterministic event records", () => {
    const initial = createAuthoritativeState({
      seed: "joint-liability",
      contentVersion: "m01.test",
      contentHash: "fixture-content",
    });
    const command = createCommand(initial, "foundation.probe", {
      stream: GAMEPLAY_RNG_STREAMS[0],
    });
    const events = createEventRecords(command, [
      { type: "foundation.recorded", payload: { ordinal: 1 } },
      { type: "foundation.recorded", payload: { ordinal: 2 } },
    ]);

    expect(command.id).toBe("cmd-v1-000000000001");
    expect(events.map((event) => event.id)).toStrictEqual([
      "evt-v1-000000000001-0001",
      "evt-v1-000000000001-0002",
    ]);
    expect(commitCommand(initial, command).commandSequence).toBe(1);
  });

  it("rejects out-of-order command commits", () => {
    const initial = createAuthoritativeState({
      seed: 1,
      contentVersion: "m01.test",
      contentHash: "fixture-content",
    });
    const first = createCommand(initial, "foundation.first", null);
    const afterFirst = commitCommand(initial, first);

    expect(() => commitCommand(afterFirst, first)).toThrow(
      /Command ordering violation/,
    );
  });

  it("does not include cosmetic RNG in authoritative state", () => {
    const initial = createAuthoritativeState({
      seed: 11,
      contentVersion: "m01.test",
      contentHash: "fixture-content",
    });
    const initialHash = hashAuthoritativeState(initial);
    let cosmetic = createCosmeticRngState(11);

    for (let index = 0; index < 50; index += 1) {
      cosmetic = drawCosmeticUint32(cosmetic).state;
    }

    expect(cosmetic.cursor.draws).toBe(50);
    expect(hashAuthoritativeState(initial)).toBe(initialHash);
  });
});
