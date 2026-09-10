import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  calculateAttackDamage,
  createAuthoritativeState,
  initializeCombatActors,
  startCombat,
} from "../../src/engine";

describe("M06 damage modifier properties", () => {
  it("matches the one-floor basis-point formula for Strength, Weak, and Exposed", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 100 }),
        fc.boolean(),
        fc.boolean(),
        (printedDamage, strength, weak, exposed) => {
          let state = startCombat(
            createAuthoritativeState({
              seed: printedDamage + strength,
              contentVersion: "m06.property",
              contentHash: "fixture-content-v1",
            }),
            [],
          );
          state = initializeCombatActors(state, {
            playerCharacters: [
              {
                actorId: "source",
                maxHp: 10_000,
                statuses: exposed ? { exposed: 1 } : {},
              },
              { actorId: "shaper", maxHp: 10_000 },
            ],
            enemies: [
              {
                actorId: "enemy",
                maxHp: 10_000,
                statuses: {
                  strength,
                  weak: weak ? 1 : 0,
                },
              },
            ],
            frontCharacterId: "source",
          });
          const combat = state.combat;
          if (combat === null) {
            throw new Error("Expected combat.");
          }

          const result = calculateAttackDamage(
            combat,
            "enemy",
            "source",
            printedDamage,
          );
          const numerator =
            BigInt(printedDamage + strength) *
            BigInt(weak ? 7_500 : 10_000) *
            BigInt(exposed ? 15_000 : 10_000);
          const expected = Number(numerator / 100_000_000n);

          expect(result.amount).toBe(expected);
          expect(result.strength).toBe(strength);
          expect(result.weakApplied).toBe(weak);
          expect(result.exposedApplied).toBe(exposed);
        },
      ),
      { numRuns: 250 },
    );
  });
});
