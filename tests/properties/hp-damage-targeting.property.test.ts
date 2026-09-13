import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  applyDirectDamage,
  createAuthoritativeState,
  createDirectDamagePacket,
  gainBlock,
  initializeCombatActors,
  startCombat,
} from "../../src/engine";

describe("M04 vitality properties", () => {
  it("direct damage never creates negative HP or Block and conserves requested damage", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 0, max: 1000 }),
        (hp, block, damage) => {
          let state = startCombat(
            createAuthoritativeState({
              seed: hp + block + damage,
              contentVersion: "m04.property",
              contentHash: "fixture-content-v1",
            }),
            [],
          );
          state = initializeCombatActors(state, {
            playerCharacters: [
              { actorId: "source", maxHp: hp, hp },
              { actorId: "shaper", maxHp: 1 },
            ],
            enemies: [{ actorId: "enemy", maxHp: 10000 }],
            frontCharacterId: "source",
          });
          state = gainBlock(state, "source", block);
          const result = applyDirectDamage(
            state,
            "source",
            createDirectDamagePacket(damage),
          );
          const actor = result.state.combat?.actors.source;
          const hit = result.results[0];
          if (actor === undefined || hit === undefined) {
            throw new Error("Expected source actor and damage result.");
          }

          expect(actor.hp).toBeGreaterThanOrEqual(0);
          expect(actor.block).toBeGreaterThanOrEqual(0);
          expect(hit.blockedDamage + hit.hpLost).toBeLessThanOrEqual(damage);
          expect(hit.blockedDamage).toBe(Math.min(block, damage));
          expect(hit.hpLost).toBe(Math.min(hp, Math.max(0, damage - block)));
        },
      ),
      { numRuns: 200 },
    );
  });
});
