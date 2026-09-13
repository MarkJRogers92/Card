import { describe, expect, it } from "vitest";
import {
  M19_TEST_ACT_REWARD_CATALOG,
  SAVE_SCHEMA_VERSION,
  advanceRunNode,
  applyM19Command,
  beginRunNode,
  claimRunReward,
  claimRewardOption,
  completeRunCombat,
  createM19Run,
  currentRunNode,
  exportSave,
  getM19Hand,
  hashAuthoritativeState,
  hashCanonical,
  importSave,
  restRunCharacter,
  selectRunMapNode,
  createM22Run,
  type AuthoritativeState,
  type M19Command,
} from "../../src/engine";

const ACT_SEED = 1900;
const OP_BUDGET = 2000;

type ActOp =
  | { readonly kind: "begin" }
  | { readonly kind: "command"; readonly command: M19Command }
  | { readonly kind: "complete" }
  | { readonly kind: "claim" }
  | { readonly kind: "rest"; readonly actorId: string }
  | { readonly kind: "advance" };

function nextCombatCommand(state: AuthoritativeState): M19Command {
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

function nextOp(state: AuthoritativeState): ActOp | null {
  const run = state.run;
  if (run === null) throw new Error("M19 run is missing.");
  if (run.outcome !== "active") return null;
  /**
   * M20 drives the act through both ordinary fights, both rewards, and the
   * first rest. It deliberately stops at the elite: selecting the Repo
   * Foreman's second move throws `Locked target source is not a player
   * character`, because the authored `named_claim` target is the placeholder
   * `{ kind: "locked", actorId: "source" }`. That is an M17 content/engine
   * boundary, not a save-format question, and it is recorded in
   * `docs/milestones/M20_SNAPSHOT_SERIALIZATION.md`.
   */
  if (run.currentNodeId === "elite" && state.combat === null) return null;

  const node = currentRunNode(state);
  const combat = state.combat;

  if (combat === null) {
    if (node.isCompleted) return { kind: "advance" };
    return node.kind === "rest"
      ? { kind: "rest", actorId: "morrow" }
      : { kind: "begin" };
  }
  if (combat.outcome === "active") {
    return { kind: "command", command: nextCombatCommand(state) };
  }
  if (state.rewards.pending !== null) return { kind: "claim" };
  return node.isCompleted ? { kind: "advance" } : { kind: "complete" };
}

function applyOp(state: AuthoritativeState, op: ActOp): AuthoritativeState {
  switch (op.kind) {
    case "begin":
      return beginRunNode(state);
    case "command":
      return applyM19Command(state, op.command).state;
    case "complete":
      return completeRunCombat(state, M19_TEST_ACT_REWARD_CATALOG);
    case "claim": {
      const pending = state.rewards.pending;
      if (pending === null) throw new Error("Expected a pending reward.");
      const optionId = pending.choices[0]?.options[0]?.id;
      if (optionId === undefined) throw new Error("Expected a reward option.");
      // The run-level claim also carries the picked card into the deck, so the
      // round trip covers a deck that contains content-card instances.
      return claimRunReward(state, pending.transactionId, optionId);
    }
    case "rest":
      return restRunCharacter(state, op.actorId);
    case "advance":
      return advanceRunNode(state);
  }
}

interface ActDrive {
  readonly ops: readonly ActOp[];
  readonly states: readonly AuthoritativeState[];
}

/** Drives the whole authored act once, recording every op and every state. */
function driveAct(): ActDrive {
  const ops: ActOp[] = [];
  const states: AuthoritativeState[] = [createM19Run(ACT_SEED)];

  for (let step = 0; step < OP_BUDGET; step += 1) {
    const current = states[states.length - 1];
    if (current === undefined) throw new Error("Act drive lost its state.");
    const op = nextOp(current);
    if (op === null) return { ops, states };
    ops.push(op);
    states.push(applyOp(current, op));
  }
  throw new Error("Act did not finish within the op budget.");
}

describe("M20 save and replay hash", () => {
  it("continues a saved act to the same final hash as the unsaved act", () => {
    const { ops, states } = driveAct();
    const finalState = states[states.length - 1];
    if (finalState === undefined) throw new Error("Act produced no states.");

    expect(ops.length).toBeGreaterThan(20);
    expect(finalState.run?.outcome).toBe("active");
    expect(finalState.run?.completedNodeIds).toStrictEqual([
      "ordinary_1",
      "rest_1",
      "ordinary_2",
    ]);
    expect(finalState.run?.currentNodeId).toBe("elite");

    const checkpoints = [3, Math.floor(ops.length / 2), ops.length - 5, ops.length - 1];
    for (const index of checkpoints) {
      const checkpoint = states[index];
      if (checkpoint === undefined) throw new Error(`Missing checkpoint ${index}.`);

      const text = exportSave(checkpoint);
      const loaded = importSave(text);
      expect(loaded.ok).toBe(true);
      if (!loaded.ok) continue;

      expect(hashAuthoritativeState(loaded.state)).toBe(
        hashAuthoritativeState(checkpoint),
      );

      let original = checkpoint;
      let restored = loaded.state;
      for (let cursor = index; cursor < ops.length; cursor += 1) {
        const op = ops[cursor];
        if (op === undefined) throw new Error(`Missing op ${cursor}.`);
        original = applyOp(original, op);
        restored = applyOp(restored, op);
      }

      expect(hashAuthoritativeState(restored)).toBe(hashAuthoritativeState(original));
      expect(hashAuthoritativeState(restored)).toBe(hashAuthoritativeState(finalState));
    }
  });

  it("keeps a pending reward resolvable after a round trip", () => {
    const { states } = driveAct();
    const pendingState = states.find((state) => state.rewards.pending !== null);
    if (pendingState === undefined) throw new Error("Act produced no pending reward.");

    const loaded = importSave(exportSave(pendingState));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const pending = loaded.state.rewards.pending;
    if (pending === null) throw new Error("Loaded state lost its pending reward.");
    const optionId = pending.choices[0]?.options[0]?.id;
    if (optionId === undefined) throw new Error("Loaded reward has no options.");

    const claimed = claimRewardOption(
      loaded.state,
      pending.transactionId,
      optionId,
    );
    const expected = claimRewardOption(pendingState, pending.transactionId, optionId);

    expect(claimed.rewards.scrap).toBe(expected.rewards.scrap);
    expect(claimed.rewards.pending).toBeNull();
    expect(claimed.rewards.completedTransactionIds).toStrictEqual(
      expected.rewards.completedTransactionIds,
    );
    expect(hashAuthoritativeState(claimed)).toBe(hashAuthoritativeState(expected));
  });

  it("migrates an M21 fixed-route snapshot into a playable map run", () => {
    // An M21 snapshot: save schema 2, M19 fixed route stopped at the elite.
    const m21Text = exportSave(createM19Run(ACT_SEED));
    const envelope = JSON.parse(m21Text) as {
      saveVersion: number;
      engineVersion: string;
      contentVersion: string;
      contentHash: string;
      snapshot: Record<string, unknown>;
      checksum: string;
    };
    const snapshot = structuredClone(envelope.snapshot) as Record<string, unknown>;
    const run = { ...(snapshot.run as Record<string, unknown>) };
    run.currentNodeId = "elite";
    run.completedNodeIds = ["ordinary_1", "rest_1", "ordinary_2"];
    snapshot.run = run;
    const m21Envelope = {
      ...envelope,
      saveVersion: 2,
      snapshot,
    };
    const m21Save = JSON.stringify({
      ...m21Envelope,
      checksum: hashCanonical({
        saveVersion: m21Envelope.saveVersion,
        engineVersion: m21Envelope.engineVersion,
        contentVersion: m21Envelope.contentVersion,
        contentHash: m21Envelope.contentHash,
        snapshot: m21Envelope.snapshot,
      }),
    });

    const migrated = importSave(m21Save);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.migratedFrom).toBe(2);
    expect(migrated.state.run?.map?.acts).toHaveLength(2);

    // The migrated run is still the M19 fixed sequence at the elite. The
    // authored node wins over the navigation-equivalent map payload, which is
    // ordinary combat, so the encounter stays elite.
    expect(migrated.state.run?.currentNodeId).toBe("elite");
    expect(currentRunNode(migrated.state)).toMatchObject({
      nodeId: "elite",
      kind: "elite",
      isCompleted: false,
    });

    const reloaded = importSave(exportSave(migrated.state));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(hashAuthoritativeState(reloaded.state)).toBe(
      hashAuthoritativeState(migrated.state),
    );
  });

  it("round trips an M22 map run at a committed navigation boundary", () => {
    const mapped = selectRunMapNode(createM22Run(ACT_SEED), "act-1-row-1-col-0");
    const loaded = importSave(exportSave(mapped));
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(hashAuthoritativeState(loaded.state)).toBe(hashAuthoritativeState(mapped));
    expect(loaded.state.run?.map?.acts).toHaveLength(2);
    expect(SAVE_SCHEMA_VERSION).toBe(3);
  });
});
