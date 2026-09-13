import { describe, expect, it } from "vitest";
import { ACT_1_ORDINARY_ENCOUNTERS } from "../../src/engine/initial-enemies";
import {
  MAP_VERSION,
  createRunMap,
  reachableNodeIds,
  validateRunMap,
  type RunMap,
  type RunMapNode,
  type RunMapNodeKind,
} from "../../src/engine/map";

const EXPECTED_ROW_KINDS: readonly (readonly RunMapNodeKind[])[] = [
  ["combat"],
  ["combat", "event", "event"],
  ["shop", "workshop"],
  ["combat", "elite", "combat"],
  ["treasure", "event", "combat"],
  ["rest"],
  ["boss"],
];

const EXPECTED_NODE_COUNT = EXPECTED_ROW_KINDS.reduce(
  (total, kinds) => total + kinds.length,
  0,
);

function node(map: RunMap, id: string): RunMapNode {
  for (const act of map.acts) {
    for (const candidate of act.nodes) {
      if (candidate.id === id) return candidate;
    }
  }
  throw new Error(`Missing map node: ${id}`);
}

/** Reachable node ids one step forward from `id` along the fixed template. */
function forwardLinks(map: RunMap, id: string): readonly string[] {
  const frontier = new Set(reachableNodeIds(map, [id]));
  return node(map, id).links.filter((link) => frontier.has(link));
}

function bossId(map: RunMap, actNumber: number): string {
  const act = map.acts[actNumber - 1];
  if (act === undefined) throw new Error(`Missing act ${actNumber}.`);
  return `act-${actNumber}-row-7-col-0`;
}

/** Players choose one node per row, so duplicates are compared row to row. */
function hasNoConsecutiveDuplicateOrdinaryEncounter(map: RunMap): boolean {
  return map.acts.every((act) => {
    let previous: string | null = null;
    for (let row = 1; row <= 7; row += 1) {
      const ordinary = act.nodes
        .filter(
          (candidate) =>
            candidate.row === row &&
            candidate.payload.kind === "act_1_ordinary_encounter",
        )
        .map((candidate) => candidate.payload.encounterId);
      for (const encounterId of ordinary) {
        if (encounterId === previous) return false;
        previous = encounterId;
      }
    }
    return true;
  });
}

describe("M22 deterministic map graph", () => {
  it("materializes two acts of seven rows and fourteen nodes each", () => {
    const map = createRunMap(0);
    expect(map.mapVersion).toBe(MAP_VERSION);
    expect(map.acts).toHaveLength(2);
    for (const act of map.acts) {
      expect(act.rows).toBe(7);
      expect(act.nodes).toHaveLength(EXPECTED_NODE_COUNT);
      const rows = new Set(act.nodes.map((candidate) => candidate.row));
      expect([...rows].sort((a, b) => a - b)).toStrictEqual([1, 2, 3, 4, 5, 6, 7]);
    }
  });

  it("places the exact fixed row layout for both acts", () => {
    const map = createRunMap(1900);
    for (const [actIndex, act] of map.acts.entries()) {
      const actNumber = actIndex + 1;
      for (const [rowIndex, kinds] of EXPECTED_ROW_KINDS.entries()) {
        const row = rowIndex + 1;
        const found = act.nodes
          .filter((candidate) => candidate.row === row)
          .sort((a, b) => a.column - b.column);
        expect(found.map((candidate) => candidate.column)).toStrictEqual(
          kinds.map((_, column) => column),
        );
        expect(found.map((candidate) => candidate.kind)).toStrictEqual([...kinds]);
        for (const candidate of found) {
          expect(candidate.id).toBe(`act-${actNumber}-row-${row}-col-${candidate.column}`);
        }
      }
    }
  });

  it("materializes the exact fixed link template for each act", () => {
    const map = createRunMap(1900);
    const edges: readonly (readonly [string, readonly string[]])[] = [
      ["act-1-row-1-col-0", ["act-1-row-2-col-0", "act-1-row-2-col-1", "act-1-row-2-col-2"]],
      ["act-1-row-2-col-0", ["act-1-row-3-col-0"]],
      ["act-1-row-2-col-1", ["act-1-row-3-col-0", "act-1-row-3-col-1"]],
      ["act-1-row-2-col-2", ["act-1-row-3-col-1"]],
      ["act-1-row-3-col-0", ["act-1-row-4-col-0", "act-1-row-4-col-1"]],
      ["act-1-row-3-col-1", ["act-1-row-4-col-1", "act-1-row-4-col-2"]],
      ["act-1-row-4-col-0", ["act-1-row-5-col-0", "act-1-row-5-col-1"]],
      ["act-1-row-4-col-1", ["act-1-row-5-col-0", "act-1-row-5-col-1", "act-1-row-5-col-2"]],
      ["act-1-row-4-col-2", ["act-1-row-5-col-1", "act-1-row-5-col-2"]],
      ["act-1-row-5-col-0", ["act-1-row-6-col-0"]],
      ["act-1-row-5-col-1", ["act-1-row-6-col-0"]],
      ["act-1-row-5-col-2", ["act-1-row-6-col-0"]],
      ["act-1-row-6-col-0", ["act-1-row-7-col-0"]],
      ["act-1-row-7-col-0", []],
    ];
    const allEdges = map.acts.flatMap((_, actIndex) =>
      edges.map(
        ([id, links]) =>
          [
            id.replace("act-1", `act-${actIndex + 1}`),
            links.map((link) => link.replace("act-1", `act-${actIndex + 1}`)),
          ] as const,
      ),
    );
    for (const [id, links] of allEdges) {
      expect(node(map, id).links).toStrictEqual(links);
      expect(forwardLinks(map, id)).toStrictEqual(links);
    }
  });

  it("is deterministic for a seed and differs across seeds", () => {
    expect(createRunMap(4242)).toStrictEqual(createRunMap(4242));
    expect(createRunMap(4242).acts[0]?.nodes).toStrictEqual(
      createRunMap(4242).acts[0]?.nodes,
    );
    expect(createRunMap(1)).not.toStrictEqual(createRunMap(2));
  });

  it("assigns only authored Act 1 ordinary encounters and reserves Act 2", () => {
    const authored = new Set(ACT_1_ORDINARY_ENCOUNTERS.map((formation) => formation.id));
    const map = createRunMap(77);
    for (const act of map.acts) {
      for (const candidate of act.nodes) {
        if (act.act === 1 && candidate.payload.kind === "act_1_ordinary_encounter") {
          expect(authored.has(candidate.payload.encounterId)).toBe(true);
        }
        if (act.act === 2) {
          expect(candidate.payload).toStrictEqual({ kind: "reserved", content: null });
        }
      }
    }
    const ordinary = map.acts[0]?.nodes.filter(
      (candidate) => candidate.payload.kind === "act_1_ordinary_encounter",
    );
    expect(ordinary).toHaveLength(4);
  });

  it("validates the graph and reports malformed maps", () => {
    expect(validateRunMap(createRunMap(3))).toEqual({ ok: true });
    const broken = createRunMap(3);
    const mutated = {
      ...broken,
      acts: [
        {
          ...broken.acts[0],
          nodes: broken.acts[0]?.nodes.slice(0, 3),
        },
        broken.acts[1],
      ],
    } as unknown as RunMap;
    const result = validateRunMap(mutated);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("proves map invariants across 1,000 seeds", () => {
    for (let seed = 0; seed < 1_000; seed += 1) {
      const map = createRunMap(seed);
      expect(validateRunMap(map)).toEqual({ ok: true });
      expect(hasReachableBoss(map, 1)).toBe(true);
      expect(hasReachableBoss(map, 2)).toBe(true);
      expect(hasNoConsecutiveDuplicateOrdinaryEncounter(map)).toBe(true);
    }
  });

  it("exposes only next-row links as reachable", () => {
    const map = createRunMap(1900);
    expect(reachableNodeIds(map, [])).toStrictEqual(
      new Set(["act-1-row-1-col-0", "act-2-row-1-col-0"]),
    );
    expect(reachableNodeIds(map, ["act-1-row-1-col-0"])).toStrictEqual(
      new Set(["act-1-row-2-col-0", "act-1-row-2-col-1", "act-1-row-2-col-2"]),
    );
    expect(reachableNodeIds(map, ["act-1-row-1-col-0", "act-1-row-2-col-1"])).toStrictEqual(
      new Set(["act-1-row-3-col-0", "act-1-row-3-col-1"]),
    );
    expect(reachableNodeIds(map, ["unknown-node"])).toStrictEqual(new Set());
  });
});

/**
 * A boss is reachable when a legal walk from the act entrance reaches it.
 * Playable Act 1 seeds are fixed, so any seed maps onto the authored Act 1
 * encounter pool and the topology (not content) is what is proven here.
 */
function hasReachableBoss(map: RunMap, actNumber: number): boolean {
  const target = bossId(map, actNumber);
  const actNodes = map.acts[actNumber - 1]?.nodes ?? [];
  const byId = new Map(actNodes.map((candidate) => [candidate.id, candidate]));
  const frontier: string[] = actNodes
    .filter((candidate) => candidate.row === 1)
    .map((candidate) => candidate.id);
  const seen = new Set<string>();
  while (frontier.length > 0) {
    const current = frontier.pop() as string;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const link of byId.get(current)?.links ?? []) {
      if (!seen.has(link)) frontier.push(link);
    }
  }
  return false;
}
