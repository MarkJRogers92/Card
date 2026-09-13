import { describe, expect, it } from "vitest";
import {
  ACT_1_ELITE_ENCOUNTERS,
  M19_TEST_ACT_REWARD_CATALOG,
  applyDirectDamage,
  beginRunNode,
  claimRunReward,
  completeRunCombat,
  createDirectDamagePacket,
  createM19Run,
  createM22Run,
  currentReachableNodeIds,
  currentRunNode,
  exportSave,
  hashCanonical,
  importSave,
  restRunCharacter,
  selectRunMapNode,
  type AuthoritativeState,
  type SaveEnvelope,
} from "../../src/engine";

const ACT_1_START = "act-1-row-1-col-0";
const ACT_1_ROW_2 = [
  "act-1-row-2-col-0",
  "act-1-row-2-col-1",
  "act-1-row-2-col-2",
] as const;

function requireRun(state: AuthoritativeState) {
  const run = state.run;
  if (run === null) throw new Error("M22 run is missing.");
  return run;
}

function requireMap(state: AuthoritativeState) {
  const map = requireRun(state).map;
  if (map === null) throw new Error("M22 map is missing.");
  return map;
}

/** Rewrite a snapshot and recompute the envelope checksum, as a writer would. */
function reseal(
  base: string,
  transform: (snapshot: Record<string, unknown>) => Record<string, unknown>,
): string {
  const envelope = JSON.parse(base) as SaveEnvelope;
  const snapshot = transform(
    structuredClone(envelope.snapshot) as Record<string, unknown>,
  );
  return JSON.stringify({
    ...envelope,
    snapshot,
    checksum: hashCanonical({
      saveVersion: envelope.saveVersion,
      engineVersion: envelope.engineVersion,
      contentVersion: envelope.contentVersion,
      contentHash: envelope.contentHash,
      snapshot,
    }),
  });
}

/** Kill every enemy in the active combat so it resolves without card play. */
function killAllEnemies(state: AuthoritativeState): AuthoritativeState {
  let current = state;
  for (const actorId of current.combat?.enemyOrder ?? []) {
    const actor = current.combat?.actors[actorId];
    if (actor === undefined || actor.hp === 0) continue;
    current = applyDirectDamage(
      current,
      actorId,
      createDirectDamagePacket(actor.hp + actor.block),
    ).state;
  }
  return current;
}

/** Resolve the selected combat node to victory and clear its pending reward. */
function completeSelectedCombat(state: AuthoritativeState): AuthoritativeState {
  const won = killAllEnemies(beginRunNode(state));
  const rewarded = completeRunCombat(won, M19_TEST_ACT_REWARD_CATALOG);
  const pending = rewarded.rewards.pending;
  if (pending === null) return rewarded;
  const optionId = pending.choices[0]?.options[0]?.id;
  if (optionId === undefined) throw new Error("Expected a reward option.");
  return claimRunReward(rewarded, pending.transactionId, optionId);
}

/**
 * Build a save schema 2 snapshot from an authored M19 fixed route, the shape an
 * M21 save has on disk. The checksum is recomputed so the migration reads it as
 * a legitimate pre-M22 writer, not as a tampered envelope.
 */
function m21Snapshot(
  currentNodeId: string,
  completedNodeIds: readonly string[],
): string {
  const envelope = JSON.parse(exportSave(createM19Run(1900))) as SaveEnvelope;
  const snapshot = structuredClone(
    envelope.snapshot,
  ) as Record<string, unknown>;
  const run = { ...(snapshot.run as Record<string, unknown>) };
  run.currentNodeId = currentNodeId;
  run.completedNodeIds = [...completedNodeIds];
  snapshot.run = run;
  const next = { ...envelope, saveVersion: 2, snapshot };
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

describe("M22 map-bearing run state", () => {
  it("starts a run on a persisted two-act map with only row 1 selectable", () => {
    const state = createM22Run(1900);
    const run = requireRun(state);

    expect(run.runVersion).toBe(2);
    expect(state.run).not.toBeNull();
    expect(run.map?.acts).toHaveLength(2);
    expect(run.mapNodeId).toBe(ACT_1_START);
    expect(run.completedMapNodeIds).toStrictEqual([]);

    expect(currentReachableNodeIds(state)).toStrictEqual(new Set([ACT_1_START]));

    for (const node of requireMap(state).acts[0]?.nodes ?? []) {
      if (node.row === 1) continue;
      // Non-entrance nodes are rejected up front, either because they are not
      // reachable yet or because M22 has no handler for their kind.
      expect(() => selectRunMapNode(state, node.id)).toThrow(
        /not reachable|not supported/,
      );
    }
  });

  it("keeps a selected node current until its encounter completes", () => {
    const started = createM22Run(1900);
    expect(currentRunNode(started)).toMatchObject({
      nodeId: ACT_1_START,
      kind: "combat",
      isCompleted: false,
    });

    // Selection alone does not complete a node.
    expect(currentReachableNodeIds(started)).toStrictEqual(new Set([ACT_1_START]));
    expect(() => selectRunMapNode(started, ACT_1_ROW_2[0])).toThrow(/not reachable/);
  });

  it("exposes only forward playable nodes after a legal completion", () => {
    const selected = selectRunMapNode(createM22Run(1900), ACT_1_START);
    const completed = completeSelectedCombat(selected);

    expect(requireRun(completed).completedMapNodeIds).toStrictEqual([ACT_1_START]);
    // The two event siblings are linked but unsupported, so they are never
    // offered; the combat node in the same row still is.
    expect(currentReachableNodeIds(completed)).toStrictEqual(
      new Set([ACT_1_ROW_2[0]]),
    );

    // A completed node is never selectable again.
    expect(() => selectRunMapNode(completed, ACT_1_START)).toThrow(/complete/);
    // A jump past the reachable rows stays unreachable.
    expect(() =>
      selectRunMapNode(completed, "act-1-row-6-col-0"),
    ).toThrow(/not reachable/);
  });

  it("rejects completed nodes, unreachable siblings, and every Act 2 node", () => {
    const selected = selectRunMapNode(createM22Run(1900), ACT_1_START);
    const completed = completeSelectedCombat(selected);

    expect(() => selectRunMapNode(completed, ACT_1_START)).toThrow(/complete/);
    expect(() =>
      selectRunMapNode(completed, "act-1-row-6-col-0"),
    ).toThrow(/not reachable/);

    for (const node of requireMap(completed).acts[1]?.nodes ?? []) {
      expect(() => selectRunMapNode(completed, node.id)).toThrow(
        /Act 1|reserved|not reachable/,
      );
    }
  });

  it("only offers nodes with a playable M22 handler", () => {
    const selected = selectRunMapNode(createM22Run(1900), ACT_1_START);
    const completed = completeSelectedCombat(selected);

    // Row 2's event nodes are linked but unsupported, so they stay unselectable.
    const eventNodeId = "act-1-row-2-col-1";
    const eventNode = requireMap(completed).acts[0]?.nodes.find(
      (node) => node.id === eventNodeId,
    );
    expect(eventNode?.kind).toBe("event");
    expect(currentReachableNodeIds(completed).has(eventNodeId)).toBe(false);
    expect(() => selectRunMapNode(completed, eventNodeId)).toThrow(
      /not supported|unsupported/i,
    );

    // The legal combat path in the same row still works.
    const next = selectRunMapNode(completed, ACT_1_ROW_2[0]);
    expect(currentRunNode(next)).toMatchObject({
      nodeId: ACT_1_ROW_2[0],
      kind: "combat",
      isCompleted: false,
    });
    expect(beginRunNode(next).combat).not.toBeNull();
  });

  it("cannot select or reach an unsupported shop node beyond a later row", () => {
    const afterStart = completeSelectedCombat(
      selectRunMapNode(createM22Run(1900), ACT_1_START),
    );
    const midRoute = completeSelectedCombat(
      selectRunMapNode(afterStart, ACT_1_ROW_2[0]),
    );

    // Row 3 is the service row: the shop is a legal link target, and the elite
    // sits one row further along. The shop has no M22 handler, so it must not
    // be offered or accepted, but the walk must still reach the elite beyond it.
    const shopNodeId = "act-1-row-3-col-0";
    const shopNode = requireMap(midRoute).acts[0]?.nodes.find(
      (node) => node.id === shopNodeId,
    );
    expect(shopNode?.kind).toBe("shop");
    expect(currentReachableNodeIds(midRoute).has(shopNodeId)).toBe(false);
    expect(() => selectRunMapNode(midRoute, shopNodeId)).toThrow(
      /not supported|unsupported/i,
    );

    // The elite node is playable and reachable by walking through the service
    // row; it is offered alongside the ordinary combat nodes on row 4.
    const eliteNodeId = "act-1-row-4-col-1";
    const reachable = currentReachableNodeIds(midRoute);
    expect(reachable.has(eliteNodeId)).toBe(true);
    expect(reachable.has("act-1-row-4-col-0")).toBe(true);
    const elite = selectRunMapNode(midRoute, eliteNodeId);
    expect(currentRunNode(elite)).toMatchObject({
      nodeId: eliteNodeId,
      kind: "elite",
      isCompleted: false,
    });
    expect(beginRunNode(elite).combat).not.toBeNull();
  });

  it("walks through unsupported nodes to a playable rest node", () => {
    let state = createM22Run(1900);
    state = completeSelectedCombat(selectRunMapNode(state, ACT_1_START));
    state = completeSelectedCombat(selectRunMapNode(state, ACT_1_ROW_2[0]));
    state = completeSelectedCombat(
      selectRunMapNode(state, "act-1-row-4-col-0"),
    );
    // Row 5 column 0 is treasure; it is walked through to the rest on row 6.
    state = selectRunMapNode(state, "act-1-row-6-col-0");
    expect(currentRunNode(state)).toMatchObject({
      nodeId: "act-1-row-6-col-0",
      kind: "rest",
      isCompleted: false,
    });

    // A damaged character can heal at the reached rest node.
    const damaged = {
      ...state,
      run:
        state.run === null
          ? null
          : {
              ...state.run,
              characters: state.run.characters.map((character) =>
                character.actorId === "morrow"
                  ? { ...character, hp: character.maxHp - 10 }
                  : character,
              ),
            },
    };
    const reloaded = importSave(exportSave(damaged));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    const healed = restRunCharacter(reloaded.state, "morrow");
    const morrow = healed.run?.characters.find(
      (character) => character.actorId === "morrow",
    );
    expect(morrow?.hp).toBe(44);
    expect(healed.run?.completedMapNodeIds).toContain("act-1-row-6-col-0");
  });

  it("moves navigation onto the chosen node and keeps combat behavior intact", () => {
    const selected = selectRunMapNode(createM22Run(1900), ACT_1_START);
    expect(requireRun(selected).mapNodeId).toBe(ACT_1_START);

    const midRoute = completeSelectedCombat(selected);
    // Row 2 column 1 is an event node; column 0 is the combat node.
    const next = selectRunMapNode(midRoute, ACT_1_ROW_2[0]);
    expect(requireRun(next).mapNodeId).toBe(ACT_1_ROW_2[0]);
    expect(currentRunNode(next)).toMatchObject({
      nodeId: ACT_1_ROW_2[0],
      kind: "combat",
      isCompleted: false,
    });
    // The chosen-but-unfinished node is the only reachable node until its
    // combat resolves.
    expect(currentReachableNodeIds(next)).toStrictEqual(new Set([ACT_1_ROW_2[0]]));

    // Combat setup reads the persisted map payload, so the fight is playable.
    const startedCombat = beginRunNode(next);
    expect(startedCombat.combat).not.toBeNull();
    expect(startedCombat.combat?.enemyOrder.length).toBeGreaterThan(0);

    // Completing it exposes only its forward links.
    const completed = completeSelectedCombat(next);
    expect(requireRun(completed).completedMapNodeIds).toStrictEqual([
      ACT_1_START,
      ACT_1_ROW_2[0],
    ]);
    expect(currentReachableNodeIds(completed)).toStrictEqual(
      new Set(["act-1-row-4-col-0", "act-1-row-4-col-1"]),
    );
  });

  it("requires resolving a pending reward before the next selection", () => {
    const selected = selectRunMapNode(createM22Run(1900), ACT_1_START);
    const rewarded = completeRunCombat(
      killAllEnemies(beginRunNode(selected)),
      M19_TEST_ACT_REWARD_CATALOG,
    );
    expect(rewarded.rewards.pending).not.toBeNull();
    expect(() => selectRunMapNode(rewarded, ACT_1_ROW_2[0])).toThrow(
      /reward is still pending/,
    );
  });

  it("persists the map and navigation through the save format", () => {
    const selected = selectRunMapNode(createM22Run(1900), ACT_1_START);
    const result = importSave(exportSave(selected));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.run?.map).toStrictEqual(requireRun(selected).map);
    expect(result.state.run?.map?.acts).toHaveLength(2);
    expect(result.state.run?.mapNodeId).toBe(ACT_1_START);
    expect(result.state.run?.completedMapNodeIds).toStrictEqual([]);
  });

  it("rejects a snapshot whose persisted navigation names an unknown map node", () => {
    const text = exportSave(selectRunMapNode(createM22Run(1900), ACT_1_START));
    // Keep the checksum honest so the failure is structural, not tampering.
    const result = importSave(
      reseal(text, (snapshot) => {
        const run = { ...(snapshot.run as Record<string, unknown>) };
        run.mapNodeId = "act-1-row-9-col-9";
        return { ...snapshot, run };
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("invalid_snapshot");
  });

  it("rejects a recomputed-checksum snapshot with impossible map walks", () => {
    const completedStart = completeSelectedCombat(
      selectRunMapNode(createM22Run(1900), ACT_1_START),
    );
    const text = exportSave(completedStart);

    // A jump into a later row was never a forward link from the completed
    // prefix, so the persisted walk is impossible even with a valid checksum.
    const disconnected = importSave(
      reseal(text, (snapshot) => {
        const run = { ...(snapshot.run as Record<string, unknown>) };
        run.completedMapNodeIds = [ACT_1_START, "act-1-row-6-col-0"];
        run.mapNodeId = "act-1-row-6-col-0";
        return { ...snapshot, run };
      }),
    );
    expect(disconnected.ok).toBe(false);
    if (!disconnected.ok) {
      expect(disconnected.code).toBe("invalid_snapshot");
    }

    // The same completed node twice is not an ordered path either.
    const duplicated = importSave(
      reseal(text, (snapshot) => {
        const run = { ...(snapshot.run as Record<string, unknown>) };
        run.completedMapNodeIds = [ACT_1_START, ACT_1_START];
        run.mapNodeId = ACT_1_START;
        return { ...snapshot, run };
      }),
    );
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) {
      expect(duplicated.code).toBe("invalid_snapshot");
    }

    // An Act 2 node can never be persisted as current or completed.
    const act2 = importSave(
      reseal(text, (snapshot) => {
        const run = { ...(snapshot.run as Record<string, unknown>) };
        run.completedMapNodeIds = [ACT_1_START, "act-2-row-2-col-0"];
        run.mapNodeId = "act-2-row-2-col-0";
        return { ...snapshot, run };
      }),
    );
    expect(act2.ok).toBe(false);
    if (!act2.ok) {
      expect(act2.code).toBe("invalid_snapshot");
    }

    // Act 2 can never be the current node either, even with an otherwise valid
    // Act 1 completed prefix.
    const act2Current = importSave(
      reseal(text, (snapshot) => {
        const run = { ...(snapshot.run as Record<string, unknown>) };
        run.mapNodeId = "act-2-row-2-col-0";
        run.currentNodeId = "act-2-row-2-col-0";
        return { ...snapshot, run };
      }),
    );
    expect(act2Current.ok).toBe(false);
    if (!act2Current.ok) {
      expect(act2Current.code).toBe("invalid_snapshot");
    }
  });
});

describe("M22 Act 2 reservation", () => {
  it("keeps Act 2 out of reachable navigation from Act 1", () => {
    const selected = selectRunMapNode(createM22Run(42), ACT_1_START);
    const completed = completeSelectedCombat(selected);
    const reachable = currentReachableNodeIds(completed);
    for (const nodeId of reachable) {
      expect(nodeId.startsWith("act-2-")).toBe(false);
    }
  });
});

describe("M22 migrated M19 semantics", () => {
  it("keeps a migrated elite run on the authored elite encounter", () => {
    const migrated = importSave(
      m21Snapshot("elite", ["ordinary_1", "rest_1", "ordinary_2"]),
    );
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;

    // The mapped node payload is ordinary combat, but the authored M19 current
    // node must win so the encounter stays elite.
    expect(currentRunNode(migrated.state)).toMatchObject({
      nodeId: "elite",
      kind: "elite",
      isCompleted: false,
    });

    const started = beginRunNode(migrated.state);
    expect(started.combat?.enemyOrder).toStrictEqual(
      ACT_1_ELITE_ENCOUNTERS[0]?.enemyDefinitionIds.map(
        (definitionId) =>
          definitionId.replace(/^enemy\./, "").replaceAll("_", "-"),
      ),
    );

    // Map navigation survives re-persistence: the current map node is still
    // the equivalent Act 1 node and the fixed-route prefix is still mapped.
    const reloaded = importSave(exportSave(migrated.state));
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(reloaded.state.run?.mapNodeId).toBe("act-1-row-4-col-0");
    expect(reloaded.state.run?.completedMapNodeIds).toStrictEqual([
      "act-1-row-1-col-0",
      "act-1-row-2-col-0",
      "act-1-row-3-col-0",
    ]);
    expect(reloaded.state.run?.currentNodeId).toBe("elite");
  });

  it("keeps a migrated boss run on the authored boss encounter", () => {
    const migrated = importSave(
      m21Snapshot("boss", [
        "ordinary_1",
        "rest_1",
        "ordinary_2",
        "elite",
        "rest_2",
        "ordinary_3",
      ]),
    );
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(currentRunNode(migrated.state)).toMatchObject({
      nodeId: "boss",
      kind: "boss",
      isCompleted: false,
    });
    expect(beginRunNode(migrated.state).combat).not.toBeNull();
  });
});
