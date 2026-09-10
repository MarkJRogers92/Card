import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  createAuthoritativeState,
  createCosmeticRngState,
  drawCosmeticUint32,
  drawStateUint32,
  hashAuthoritativeState,
} from "../../src/engine";

describe("M02 engine foundation properties", () => {
  it("cosmetic draws never perturb the first gameplay draw", () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 0, max: 200 }),
        (seed, cosmeticDrawCount) => {
          const initial = createAuthoritativeState({
            seed,
            contentVersion: "m01.property-fixture",
            contentHash: "fixture-content-v1",
          });
          let cosmetic = createCosmeticRngState(seed);

          for (let index = 0; index < cosmeticDrawCount; index += 1) {
            cosmetic = drawCosmeticUint32(cosmetic).state;
          }

          const baseline = drawStateUint32(initial, "combat");
          const afterCosmetics = drawStateUint32(initial, "combat");

          expect(afterCosmetics.value).toBe(baseline.value);
          expect(hashAuthoritativeState(afterCosmetics.state)).toBe(
            hashAuthoritativeState(baseline.state),
          );
          expect(cosmetic.cursor.draws).toBe(cosmeticDrawCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
