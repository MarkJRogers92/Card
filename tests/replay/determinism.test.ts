import { describe, expect, it } from "vitest";
import {
  GAMEPLAY_RNG_STREAMS,
  commitCommand,
  createAuthoritativeState,
  createCommand,
  createCosmeticRngState,
  createEventRecords,
  drawCosmeticUint32,
  drawStateUint32,
  hashAuthoritativeState,
  type GameplayRngStream,
} from "../../src/engine";

function runSeededSequence(seed: number, withCosmeticNoise: boolean) {
  let state = createAuthoritativeState({
    seed,
    contentVersion: "m01.replay-fixture",
    contentHash: "fixture-content-v1",
  });
  let cosmetic = createCosmeticRngState(seed);
  const eventIds: string[] = [];
  const sampledValues: number[] = [];

  for (let ordinal = 0; ordinal < 80; ordinal += 1) {
    if (withCosmeticNoise) {
      const cosmeticDraws = ordinal % 7;
      for (let index = 0; index < cosmeticDraws; index += 1) {
        cosmetic = drawCosmeticUint32(cosmetic).state;
      }
    }

    const stream: GameplayRngStream =
      GAMEPLAY_RNG_STREAMS[(ordinal + seed) % GAMEPLAY_RNG_STREAMS.length];
    const command = createCommand(state, "foundation.probe", {
      ordinal,
      stream,
    });
    const draw = drawStateUint32(state, stream);
    state = commitCommand(draw.state, command);
    sampledValues.push(draw.value);

    const events = createEventRecords(command, [
      {
        type: "rng.sampled",
        payload: { ordinal, stream, value: draw.value },
      },
    ]);
    eventIds.push(...events.map((event) => event.id));
  }

  return {
    stateHash: hashAuthoritativeState(state),
    rng: state.rng,
    eventIds,
    sampledValues,
  };
}

describe("M02 seeded replay determinism", () => {
  it("repeats 100 seeded command sequences with identical hashes", () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const first = runSeededSequence(seed, false);
      const replay = runSeededSequence(seed, false);
      const cosmeticNoise = runSeededSequence(seed, true);

      expect(replay).toStrictEqual(first);
      expect(cosmeticNoise).toStrictEqual(first);
    }
  });
});
