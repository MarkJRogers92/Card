import { ACT_1_ORDINARY_ENCOUNTERS } from "./initial-enemies";
import {
  createGameplayRngState,
  drawGameplayInt,
  type GameplayRngState,
} from "./rng";

export const MAP_VERSION = 1 as const;

export const MAP_NODE_KINDS = [
  "combat",
  "event",
  "shop",
  "workshop",
  "elite",
  "treasure",
  "rest",
  "boss",
] as const;

export type MapNodeKind = (typeof MAP_NODE_KINDS)[number];

export type MapActNumber = 1 | 2;

export interface Act1OrdinaryEncounterPayload {
  readonly kind: "act_1_ordinary_encounter";
  readonly encounterId: string;
}

export interface ReservedRunMapPayload {
  readonly kind: "reserved";
  readonly content: null;
}

export type RunMapNodePayload =
  | Act1OrdinaryEncounterPayload
  | ReservedRunMapPayload;

export interface RunMapNode {
  readonly id: string;
  readonly act: MapActNumber;
  readonly row: number;
  readonly column: number;
  readonly kind: MapNodeKind;
  readonly payload: RunMapNodePayload;
  readonly links: readonly string[];
}

export interface RunMapAct {
  readonly act: MapActNumber;
  readonly rows: number;
  readonly nodes: readonly RunMapNode[];
}

export interface RunMap {
  readonly mapVersion: typeof MAP_VERSION;
  readonly seed: number;
  readonly acts: readonly RunMapAct[];
}

export interface RunMapValidationSuccess {
  readonly ok: true;
  /** Empty and non-enumerable so the serialized success shape is `{ ok: true }`. */
  readonly errors: readonly [];
}

export interface RunMapValidationFailure {
  readonly ok: false;
  readonly errors: readonly string[];
}

export type RunMapValidationResult =
  | RunMapValidationSuccess
  | RunMapValidationFailure;

const MAP_ROW_KINDS = [
  ["combat"],
  ["combat", "event", "event"],
  ["shop", "workshop"],
  ["combat", "elite", "combat"],
  ["treasure", "event", "combat"],
  ["rest"],
  ["boss"],
] as const satisfies readonly (readonly MapNodeKind[])[];

const MAP_ROW_COUNT = MAP_ROW_KINDS.length;
const MAP_NODE_COUNT_PER_ACT = MAP_ROW_KINDS.reduce(
  (total, kinds) => total + kinds.length,
  0,
);

const NEXT_COLUMNS_BY_POSITION: Readonly<Record<string, readonly number[]>> = {
  "1:0": [0, 1, 2],
  "2:0": [0],
  "2:1": [0, 1],
  "2:2": [1],
  "3:0": [0, 1],
  "3:1": [1, 2],
  "4:0": [0, 1],
  "4:1": [0, 1, 2],
  "4:2": [1, 2],
  "5:0": [0],
  "5:1": [0],
  "5:2": [0],
  "6:0": [0],
  "7:0": [],
};

const RESERVED_PAYLOAD: ReservedRunMapPayload = {
  kind: "reserved",
  content: null,
};

const ACT_1_ORDINARY_POSITIONS: ReadonlySet<string> = new Set([
  positionKey(1, 0),
  positionKey(2, 0),
  positionKey(4, 0),
  positionKey(4, 2),
]);

const AUTHORED_ACT_1_ORDINARY_ENCOUNTER_IDS: ReadonlySet<string> = new Set(
  ACT_1_ORDINARY_ENCOUNTERS.map((formation) => formation.id),
);

const EMPTY_ERRORS = Object.freeze([]) as readonly [];

function nodeId(act: MapActNumber, row: number, column: number): string {
  return `act-${act}-row-${row}-col-${column}`;
}

function positionKey(row: number, column: number): string {
  return `${row}:${column}`;
}

function nextLinks(act: MapActNumber, row: number, column: number): readonly string[] {
  const nextColumns = NEXT_COLUMNS_BY_POSITION[positionKey(row, column)] ?? [];
  return nextColumns.map((nextColumn) => nodeId(act, row + 1, nextColumn));
}

function drawAct1OrdinaryPayload(
  rng: GameplayRngState,
  previousEncounterId: string | null,
): {
  readonly rng: GameplayRngState;
  readonly payload: Act1OrdinaryEncounterPayload;
} {
  const draw = drawGameplayInt(
    rng,
    "map",
    ACT_1_ORDINARY_ENCOUNTERS.length,
  );
  let encounterIndex = draw.value;
  if (
    ACT_1_ORDINARY_ENCOUNTERS[encounterIndex]?.id === previousEncounterId
  ) {
    encounterIndex = (encounterIndex + 1) % ACT_1_ORDINARY_ENCOUNTERS.length;
  }
  const encounter = ACT_1_ORDINARY_ENCOUNTERS[encounterIndex];
  if (encounter === undefined) {
    throw new Error("The Act 1 ordinary encounter pool cannot be empty.");
  }
  return {
    rng: draw.state,
    payload: {
      kind: "act_1_ordinary_encounter",
      encounterId: encounter.id,
    },
  };
}

function createActNodes(
  act: MapActNumber,
  initialRng: GameplayRngState,
): { readonly nodes: readonly RunMapNode[]; readonly rng: GameplayRngState } {
  const nodes: RunMapNode[] = [];
  let rng = initialRng;
  let previousEncounterId: string | null = null;

  for (const [rowIndex, kinds] of MAP_ROW_KINDS.entries()) {
    const row = rowIndex + 1;
    for (const [column, kind] of kinds.entries()) {
      let payload: RunMapNodePayload = RESERVED_PAYLOAD;
      if (
        act === 1 &&
        kind === "combat" &&
        ACT_1_ORDINARY_POSITIONS.has(positionKey(row, column))
      ) {
        const draw = drawAct1OrdinaryPayload(rng, previousEncounterId);
        rng = draw.rng;
        payload = draw.payload;
        previousEncounterId = draw.payload.encounterId;
      }
      nodes.push({
        id: nodeId(act, row, column),
        act,
        row,
        column,
        kind,
        payload,
        links: nextLinks(act, row, column),
      });
    }
  }

  return { nodes, rng };
}

export function createRunMap(seed: number): RunMap {
  let rng = createGameplayRngState(seed);
  const acts: RunMapAct[] = [];

  for (const act of [1, 2] as const) {
    const generated = createActNodes(act, rng);
    rng = generated.rng;
    acts.push({
      act,
      rows: MAP_ROW_COUNT,
      nodes: generated.nodes,
    });
  }

  return {
    mapVersion: MAP_VERSION,
    seed,
    acts,
  };
}

function validationSuccess(): RunMapValidationSuccess {
  const result = { ok: true } as RunMapValidationSuccess;
  Object.defineProperty(result, "errors", {
    value: EMPTY_ERRORS,
    enumerable: false,
  });
  return result;
}

function validationFailure(errors: readonly string[]): RunMapValidationFailure {
  return { ok: false, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function arraysEqual(
  actual: unknown,
  expected: readonly unknown[],
): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function isReservedPayload(value: unknown): value is ReservedRunMapPayload {
  return (
    isRecord(value) &&
    value.kind === "reserved" &&
    value.content === null
  );
}

function isAct1OrdinaryPayload(
  value: unknown,
): value is Act1OrdinaryEncounterPayload {
  return (
    isRecord(value) &&
    value.kind === "act_1_ordinary_encounter" &&
    typeof value.encounterId === "string" &&
    AUTHORED_ACT_1_ORDINARY_ENCOUNTER_IDS.has(value.encounterId)
  );
}

function validateAct(
  value: unknown,
  expectedAct: MapActNumber,
  errors: string[],
): void {
  if (!isRecord(value)) {
    errors.push(`Act ${expectedAct} must be an object.`);
    return;
  }
  if (value.act !== expectedAct) {
    errors.push(`Act ${expectedAct} has an invalid act number.`);
  }
  if (value.rows !== MAP_ROW_COUNT) {
    errors.push(`Act ${expectedAct} must have ${MAP_ROW_COUNT} rows.`);
  }

  const nodes = value.nodes;
  if (!Array.isArray(nodes)) {
    errors.push(`Act ${expectedAct} nodes must be an array.`);
    return;
  }
  if (nodes.length !== MAP_NODE_COUNT_PER_ACT) {
    errors.push(
      `Act ${expectedAct} must have ${MAP_NODE_COUNT_PER_ACT} nodes.`,
    );
  }

  let previousEncounterId: string | null = null;
  let nodeIndex = 0;
  for (const [rowIndex, kinds] of MAP_ROW_KINDS.entries()) {
    const row = rowIndex + 1;
    for (const [column, expectedKind] of kinds.entries()) {
      const candidate = nodes[nodeIndex];
      nodeIndex += 1;
      const expectedId = nodeId(expectedAct, row, column);
      if (!isRecord(candidate)) {
        errors.push(`Missing map node ${expectedId}.`);
        continue;
      }
      if (candidate.id !== expectedId) {
        errors.push(`Map node ${expectedId} has an invalid id.`);
      }
      if (candidate.act !== expectedAct) {
        errors.push(`Map node ${expectedId} has an invalid act.`);
      }
      if (candidate.row !== row) {
        errors.push(`Map node ${expectedId} has an invalid row.`);
      }
      if (candidate.column !== column) {
        errors.push(`Map node ${expectedId} has an invalid column.`);
      }
      if (candidate.kind !== expectedKind) {
        errors.push(`Map node ${expectedId} has an invalid kind.`);
      }

      const expectedLinks = nextLinks(expectedAct, row, column);
      if (!arraysEqual(candidate.links, expectedLinks)) {
        errors.push(`Map node ${expectedId} has invalid links.`);
      }

      if (
        expectedAct === 1 &&
        expectedKind === "combat" &&
        ACT_1_ORDINARY_POSITIONS.has(positionKey(row, column))
      ) {
        if (!isAct1OrdinaryPayload(candidate.payload)) {
          errors.push(
            `Map node ${expectedId} must reference an authored Act 1 ordinary encounter.`,
          );
        } else {
          if (candidate.payload.encounterId === previousEncounterId) {
            errors.push(
              `Map node ${expectedId} repeats its preceding ordinary encounter.`,
            );
          }
          previousEncounterId = candidate.payload.encounterId;
        }
      } else if (!isReservedPayload(candidate.payload)) {
        errors.push(`Map node ${expectedId} must use a reserved payload.`);
      }
    }
  }
}

function actHasReachableBoss(
  value: Record<string, unknown>,
  actNumber: MapActNumber,
): boolean {
  const nodes = Array.isArray(value.nodes) ? value.nodes : [];
  const byId = new Map<string, readonly string[]>();
  for (const candidate of nodes) {
    if (!isRecord(candidate) || typeof candidate.id !== "string") continue;
    byId.set(
      candidate.id,
      Array.isArray(candidate.links)
        ? candidate.links.filter((link): link is string => typeof link === "string")
        : [],
    );
  }

  const target = nodeId(actNumber, MAP_ROW_COUNT, 0);
  const frontier = [...byId.keys()].filter((id) =>
    id.startsWith(`act-${actNumber}-row-1-`),
  );
  const seen = new Set<string>();
  while (frontier.length > 0) {
    const current = frontier.pop();
    if (current === undefined) continue;
    if (current === target) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const link of byId.get(current) ?? []) {
      if (!seen.has(link)) frontier.push(link);
    }
  }
  return false;
}

export function validateRunMap(map: RunMap): RunMapValidationResult {
  const candidate: unknown = map;
  if (!isRecord(candidate)) {
    return validationFailure(["Run map must be an object."]);
  }

  const errors: string[] = [];
  if (candidate.mapVersion !== MAP_VERSION) {
    errors.push(`Run map version must be ${MAP_VERSION}.`);
  }
  if (!Number.isSafeInteger(candidate.seed)) {
    errors.push("Run map seed must be a safe integer.");
  }

  const acts = candidate.acts;
  if (!Array.isArray(acts) || acts.length !== 2) {
    errors.push("Run map must contain exactly two acts.");
  } else {
    for (const [index, act] of acts.entries()) {
      const expectedAct = (index + 1) as MapActNumber;
      validateAct(act, expectedAct, errors);
      if (
        errors.length === 0 &&
        isRecord(act) &&
        !actHasReachableBoss(act, expectedAct)
      ) {
        errors.push(`Act ${expectedAct} boss must be reachable.`);
      }
    }
  }

  return errors.length === 0
    ? validationSuccess()
    : validationFailure(errors);
}

export function reachableNodeIds(
  map: RunMap,
  completedNodeIds: readonly string[],
): ReadonlySet<string> {
  const act1 = map.acts.find((act) => act.act === 1);
  if (act1 === undefined) return new Set();

  if (completedNodeIds.length === 0) {
    return new Set(
      act1.nodes
        .filter((candidate) => candidate.row === 1)
        .map((candidate) => candidate.id),
    );
  }

  const completed = new Set(completedNodeIds);
  const completedAct1Nodes = act1.nodes.filter((candidate) =>
    completed.has(candidate.id),
  );
  if (completedAct1Nodes.length === 0) return new Set();

  const maxCompletedRow = Math.max(
    ...completedAct1Nodes.map((candidate) => candidate.row),
  );
  const reachable = new Set<string>();

  for (const candidate of completedAct1Nodes) {
    if (candidate.row !== maxCompletedRow) continue;
    for (const link of candidate.links) {
      reachable.add(link);
    }
  }
  return reachable;
}
