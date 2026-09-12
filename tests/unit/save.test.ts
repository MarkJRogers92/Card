import { describe, expect, it } from "vitest";
import {
  AUTHORITATIVE_STATE_VERSION,
  COMBAT_STATE_VERSION,
  SCHEDULED_PACKET_TIMING,
  SCHEDULED_PACKET_VERSION,
  SAVE_SCHEMA_VERSION,
  applyM19Command,
  applySaveMigrations,
  beginRunNode,
  createAuthoritativeState,
  createM10Fight,
  createM19Run,
  exportSave,
  getM19Hand,
  hashAuthoritativeState,
  hashCanonical,
  importSave,
  type AuthoritativeState,
  type M19Command,
  type SaveEnvelope,
  type ScheduledReactionPacket,
} from "../../src/engine";

function envelopeOf(text: string): SaveEnvelope {
  return JSON.parse(text) as SaveEnvelope;
}

/** Rebuild an envelope with recomputed checksum, as a writer would. */
function reseal(base: string, changes: Partial<SaveEnvelope>): string {
  const next = { ...envelopeOf(base), ...changes };
  return JSON.stringify({
    ...next,
    checksum: hashCanonical({
      saveVersion: next.saveVersion,
      engineVersion: next.engineVersion,
      contentVersion: next.contentVersion,
      contentHash: next.contentHash,
      snapshot: next.snapshot,
    }),
  });
}

function playStarterCards(state: AuthoritativeState, plays: number): AuthoritativeState {
  let current = state;
  for (let step = 0; step < plays; step += 1) {
    const combat = current.combat;
    if (combat === null || combat.outcome !== "active") return current;
    const card = getM19Hand(current).find(
      (candidate) => candidate.isPlayable && candidate.energyCost <= combat.energy,
    );
    if (card === undefined) return current;
    const targetActorId = card.isDamageCard
      ? (combat.enemyOrder.find((actorId) => (combat.actors[actorId]?.hp ?? 0) > 0) ??
        null)
      : null;
    const command: M19Command = {
      kind: "play_card",
      instanceId: card.instanceId,
      targetActorId,
    };
    current = applyM19Command(current, command).state;
  }
  return current;
}

/** A real combat state carrying an authored delayed packet and turn counters. */
function stateWithDelayedPacket(): AuthoritativeState {
  const state = playStarterCards(beginRunNode(createM19Run(1900)), 3);
  const combat = state.combat;
  if (combat === null) throw new Error("Expected an active M19 combat.");
  const targetActorId = combat.enemyOrder[0];
  if (targetActorId === undefined) throw new Error("Expected an enemy actor.");

  const packet: ScheduledReactionPacket = {
    packetVersion: SCHEDULED_PACKET_VERSION,
    packetId: "scheduled-v1-m20-test-1",
    timing: SCHEDULED_PACKET_TIMING,
    sourceRecipeId: "loop.contact",
    targetActorId,
    effects: [
      {
        op: "reaction_damage",
        amountBeforeTargetModifiers: 4,
        hits: 1,
        targetActorId,
      },
    ],
  };

  return {
    ...state,
    combat: { ...combat, scheduledPackets: [packet] },
  };
}

const checkpointStates: ReadonlyArray<readonly [string, AuthoritativeState]> = [
  ["a fresh authoritative state", createAuthoritativeState({ seed: 41, contentHash: "m20-test" })],
  ["the M10 checkpoint fight", createM10Fight()],
  ["a fresh M19 run", createM19Run()],
  ["an M19 run mid-combat", playStarterCards(beginRunNode(createM19Run(1900)), 3)],
  ["an M19 run with a delayed packet", stateWithDelayedPacket()],
];

describe("M20 save round trip", () => {
  for (const [label, state] of checkpointStates) {
    it(`reloads ${label} with an identical authoritative hash`, () => {
      const text = exportSave(state);
      const result = importSave(text);

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.state).toStrictEqual(state);
      expect(hashAuthoritativeState(result.state)).toBe(hashAuthoritativeState(state));
      expect(result.saveVersion).toBe(SAVE_SCHEMA_VERSION);
      expect(result.migratedFrom).toBeNull();
      expect(result.warnings).toStrictEqual([]);
      expect(exportSave(result.state)).toBe(text);
    });
  }

  it("carries delayed packets, trigger counters, decks, and party state across the round trip", () => {
    const state = stateWithDelayedPacket();
    const result = importSave(exportSave(state));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const before = state.combat;
    const after = result.state.combat;
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after?.scheduledPackets).toStrictEqual([
      {
        packetVersion: SCHEDULED_PACKET_VERSION,
        packetId: "scheduled-v1-m20-test-1",
        timing: SCHEDULED_PACKET_TIMING,
        sourceRecipeId: "loop.contact",
        targetActorId: before?.enemyOrder[0],
        effects: [
          {
            op: "reaction_damage",
            amountBeforeTargetModifiers: 4,
            hits: 1,
            targetActorId: before?.enemyOrder[0],
          },
        ],
      },
    ]);
    expect(after?.triggerCounters).toStrictEqual(before?.triggerCounters);
    expect(after?.triggerBindings).toStrictEqual(before?.triggerBindings);
    expect(after?.deck).toStrictEqual(before?.deck);
    expect(after?.actors).toStrictEqual(before?.actors);
    expect(result.state.rng).toStrictEqual(state.rng);
    expect(result.state.run).toStrictEqual(state.run);
    expect(result.state.rewards).toStrictEqual(state.rewards);
  });

  it("writes canonical text and accepts equivalent non-canonical formatting", () => {
    const state = createM19Run(7);
    const text = exportSave(state);
    expect(exportSave(state)).toBe(text);

    const pretty = JSON.stringify(envelopeOf(text), null, 2);
    const result = importSave(pretty);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(hashAuthoritativeState(result.state)).toBe(hashAuthoritativeState(state));
    expect(exportSave(result.state)).toBe(text);
  });

  it("round trips every committed command state, so each is an atomic save boundary", () => {
    let state: AuthoritativeState = beginRunNode(createM19Run(1900));
    for (let step = 0; step < 8; step += 1) {
      const text = exportSave(state);
      const result = importSave(text);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(hashAuthoritativeState(result.state)).toBe(hashAuthoritativeState(state));
      }

      const command: M19Command =
        step % 2 === 0 ? { kind: "swap" } : { kind: "end_turn" };
      state = applyM19Command(state, command).state;
    }
  });
});

describe("M20 save rejection", () => {
  it("rejects text that is not a save", () => {
    for (const text of ["", "not json", "{", "[]", "null", "42"]) {
      const result = importSave(text);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(["malformed_json", "invalid_envelope"]).toContain(result.code);
      expect(result.saveVersion).toBeNull();
    }
  });

  it("rejects an envelope that is missing fields or carries extras", () => {
    const text = exportSave(createM19Run(7));

    const missingChecksum: Record<string, unknown> = { ...envelopeOf(text) };
    delete missingChecksum.checksum;
    const missing = importSave(JSON.stringify(missingChecksum));
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("invalid_envelope");

    const extra = JSON.stringify({ ...envelopeOf(text), note: "hi" });
    const extraResult = importSave(extra);
    expect(extraResult.ok).toBe(false);
    if (extraResult.ok) return;
    expect(extraResult.code).toBe("invalid_envelope");

    const nullSnapshot = importSave(JSON.stringify({ ...envelopeOf(text), snapshot: null }));
    expect(nullSnapshot.ok).toBe(false);
    if (nullSnapshot.ok) return;
    expect(nullSnapshot.code).toBe("invalid_envelope");
  });

  it("rejects a tampered snapshot or checksum instead of loading it", () => {
    const text = exportSave(createM19Run(7));
    const envelope = envelopeOf(text);

    const tamperedSnapshot = JSON.stringify({
      ...envelope,
      snapshot: { ...(envelope.snapshot as Record<string, unknown>), commandSequence: 99 },
    });
    const snapshotResult = importSave(tamperedSnapshot);
    expect(snapshotResult.ok).toBe(false);
    if (snapshotResult.ok) return;
    expect(snapshotResult.code).toBe("checksum_mismatch");

    const tamperedChecksum = importSave(
      JSON.stringify({ ...envelope, checksum: `${envelope.checksum}0` }),
    );
    expect(tamperedChecksum.ok).toBe(false);
    if (tamperedChecksum.ok) return;
    expect(tamperedChecksum.code).toBe("checksum_mismatch");
  });

  it("rejects a newer save format or an unsupported embedded state version", () => {
    const base = exportSave(createM19Run(7));

    const newer = importSave(reseal(base, { saveVersion: SAVE_SCHEMA_VERSION + 1 }));
    expect(newer.ok).toBe(false);
    if (newer.ok) return;
    expect(newer.code).toBe("unsupported_save_version");

    const envelope = envelopeOf(base);
    const olderState = reseal(base, {
      snapshot: {
        ...(envelope.snapshot as Record<string, unknown>),
        stateVersion: AUTHORITATIVE_STATE_VERSION - 1,
      },
    });
    const stateVersion = importSave(olderState);
    expect(stateVersion.ok).toBe(false);
    if (stateVersion.ok) return;
    expect(stateVersion.code).toBe("incompatible_state_version");

    const olderCombat = reseal(base, {
      snapshot: {
        ...(envelope.snapshot as Record<string, unknown>),
        combat: {
          ...((envelope.snapshot as { combat: Record<string, unknown> }).combat ?? {}),
          combatVersion: COMBAT_STATE_VERSION - 1,
        },
      },
    });
    const combatVersion = importSave(olderCombat);
    expect(combatVersion.ok).toBe(false);
    if (combatVersion.ok) return;
    expect(combatVersion.code).toBe("incompatible_state_version");
  });

  it("rejects a structurally invalid snapshot that still carries a valid checksum", () => {
    const envelope = envelopeOf(exportSave(createM19Run(7)));
    const snapshot = envelope.snapshot as Record<string, unknown>;

    const missingRewards = reseal(exportSave(createM19Run(7)), {
      snapshot: Object.fromEntries(
        Object.entries(snapshot).filter(([key]) => key !== "rewards"),
      ),
    });
    const missing = importSave(missingRewards);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("invalid_snapshot");

    const brokenRng = reseal(exportSave(createM19Run(7)), {
      snapshot: { ...snapshot, rng: { version: 1, rootSeed: "", streams: {} } },
    });
    const rng = importSave(brokenRng);
    expect(rng.ok).toBe(false);
    if (rng.ok) return;
    expect(rng.code).toBe("invalid_snapshot");
  });

  it("rejects a save authored against different content and leaves the text untouched", () => {
    const text = exportSave(createM19Run(7));
    const mismatched = importSave(text, {
      content: { contentVersion: "other.content", contentHash: "other-hash" },
    });

    expect(mismatched.ok).toBe(false);
    if (mismatched.ok) return;
    expect(mismatched.code).toBe("incompatible_content");

    const matching = importSave(text, {
      content: { contentVersion: "m19.test_act", contentHash: "joint-liability-m19-test-act-v1" },
    });
    expect(matching.ok).toBe(true);

    // Rejection is pure: the same text still loads with the running identity.
    const afterwards = importSave(text);
    expect(afterwards.ok).toBe(true);
  });

  it("reports an engine version change as a warning instead of a silent reinterpretation", () => {
    const older = reseal(exportSave(createM19Run(7)), { engineVersion: "0.0.0-test" });
    const result = importSave(older);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("engine_version_changed");
  });
});

describe("M20 save migration contract", () => {
  it("applies registered migrations in order", () => {
    const applied: number[] = [];
    const table = [
      { from: 1, to: 2, migrate: (snapshot: unknown) => { applied.push(1); return { ...(snapshot as object), step: 1 }; } },
      { from: 2, to: 3, migrate: (snapshot: unknown) => { applied.push(2); return { ...(snapshot as object), step: 2 }; } },
    ];

    const result = applySaveMigrations({ origin: true }, 1, table, 3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(applied).toStrictEqual([1, 2]);
    expect(result.snapshot).toStrictEqual({ origin: true, step: 2 });
  });

  it("does nothing when the save is already current", () => {
    const result = applySaveMigrations({ origin: true }, SAVE_SCHEMA_VERSION, []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot).toStrictEqual({ origin: true });
  });

  it("refuses a missing migration rung and a rung that does not move forward", () => {
    const missing = applySaveMigrations({}, 1, [], 2);
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.message).toContain("No save migration is registered");

    const backwards = applySaveMigrations(
      {},
      1,
      [{ from: 1, to: 1, migrate: (snapshot: unknown) => snapshot }],
      2,
    );
    expect(backwards.ok).toBe(false);
  });

  it("does not run migration rungs for a save that is already current", () => {
    let called = false;
    const result = importSave(exportSave(createM19Run(7)), {
      migrations: [
        {
          from: SAVE_SCHEMA_VERSION,
          to: SAVE_SCHEMA_VERSION + 1,
          migrate: (snapshot: unknown) => {
            called = true;
            return snapshot;
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(called).toBe(false);
    expect(result.migratedFrom).toBeNull();
  });

  it("migrates a version 1 save that predates run relic ownership", () => {
    const current = exportSave(createM19Run(1900));
    const snapshot = structuredClone(envelopeOf(current).snapshot) as Record<
      string,
      unknown
    >;
    // Version 1 predates both the run relic list and authoritative version 9.
    snapshot.stateVersion = 8;
    const run = { ...(snapshot.run as Record<string, unknown>) };
    delete run.relicIds;
    snapshot.run = run;

    const legacy = reseal(current, { saveVersion: 1, snapshot });
    const result = importSave(legacy);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.saveVersion).toBe(1);
    expect(result.migratedFrom).toBe(1);
    expect(result.state.stateVersion).toBe(AUTHORITATIVE_STATE_VERSION);
    expect(result.state.run?.relicIds).toStrictEqual(["relic.shared_warranty"]);
    expect(exportSave(result.state)).toBe(exportSave(createM19Run(1900)));
  });

  it("rejects a run without relic ownership instead of guessing", () => {
    const current = exportSave(createM19Run(1900));
    const snapshot = structuredClone(envelopeOf(current).snapshot) as Record<
      string,
      unknown
    >;
    const run = { ...(snapshot.run as Record<string, unknown>) };
    delete run.relicIds;
    snapshot.run = run;

    const result = importSave(reseal(current, { snapshot }));

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ code: "invalid_snapshot" });
  });
});
