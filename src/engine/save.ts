import { ENGINE_VERSION } from "./bootstrap";
import { canonicalStringify, hashCanonical } from "./canonical";
import type { CardInstance } from "./cards";
import {
  COMBAT_STATE_VERSION,
  type CombatOutcome,
  type CombatPhase,
} from "./combat";
import { REWARD_STATE_VERSION } from "./rewards";
import {
  createRunMap,
  validateRunMap,
  type MapNodeKind,
  type RunMap,
} from "./map";
import {
  GAMEPLAY_RNG_STREAMS,
  RNG_ALGORITHM_VERSION,
  RNG_STATE_VERSION,
} from "./rng";
import {
  M19_NODE_IDS,
  M19_RUN_VERSION,
  M19_STARTING_RELIC_IDS,
  M19_TO_M22_ACT_1_ROUTE,
  M22_RUN_VERSION,
  isPlayableMapNodeKind,
  type M19RunOutcome,
} from "./run";
import {
  AUTHORITATIVE_STATE_VERSION,
  type AuthoritativeState,
} from "./state";

/**
 * M20 pure save encoding.
 *
 * This module owns the save envelope, its checksum, JSON export/import, and the
 * migration contract. It performs no browser storage work: M21 owns IndexedDB,
 * the active save, rotating backups, and atomic commits.
 */

export const SAVE_SCHEMA_VERSION = 3 as const;

export const SAVE_ENVELOPE_KEYS = [
  "saveVersion",
  "engineVersion",
  "contentVersion",
  "contentHash",
  "snapshot",
  "checksum",
] as const;

/** Keys the authoritative snapshot must carry, and no others. */
export const SAVE_SNAPSHOT_KEYS = [
  "stateVersion",
  "engineVersion",
  "contentVersion",
  "contentHash",
  "commandSequence",
  "rng",
  "combat",
  "rewards",
  "run",
] as const;

export interface SaveEnvelope {
  readonly saveVersion: number;
  readonly engineVersion: string;
  readonly contentVersion: string;
  readonly contentHash: string;
  readonly snapshot: unknown;
  readonly checksum: string;
}

export interface SaveContentIdentity {
  readonly contentVersion: string;
  readonly contentHash: string;
}

export interface SaveMigration {
  readonly from: number;
  readonly to: number;
  readonly migrate: (snapshot: unknown) => unknown;
}

export type SaveMigrationTable = readonly SaveMigration[];

/** Appended to whenever `SAVE_SCHEMA_VERSION` increases. */
export const SAVE_MIGRATIONS: SaveMigrationTable = [
  {
    from: 1,
    to: 2,
    /**
     * Version 1 predates run relic ownership. A version 1 run owns the starting
     * relic, which the combat setup installs as a passive, and no other relic.
     */
    migrate: (snapshot: unknown) => {
      const record = isPlainObject(snapshot) ? snapshot : {};
      const run = isPlainObject(record.run) ? record.run : null;
      return {
        ...record,
        stateVersion: AUTHORITATIVE_STATE_VERSION,
        // Internal marker: save version 1 predates map navigation, so the
        // next rung keeps this run on the M19 fixed route instead of placing
        // it on the M22 map. Removed before validation.
        fixedRouteOnly: true,
        ...(run === null
          ? {}
          : { run: { ...run, relicIds: [...M19_STARTING_RELIC_IDS] } }),
      };
    },
  },
  {
    from: 2,
    to: 3,
    /**
     * Version 2 persists the M19 fixed route. Version 3 adds the M22 map and
     * navigation. Regenerate the two-act graph from the run seed and map the
     * M19 fixed sequence onto one Act 1 node per row.
     *
     * The M19 kinds do not line up row-for-row with the template (rows 3 and 5
     * are service rows), so this mapping preserves the authored M19 sequence
     * and its persisted state instead of reassigning node kinds. Combat,
     * reward, rest, deck, relic, and character behavior therefore survive
     * selection after the migration.
     *
     * A fixed route that cannot be placed onto the template is refused rather
     * than guessed at, which is why this throws instead of returning a
     * half-migrated run.
     */
    migrate: (snapshot: unknown) => {
      const record = isPlainObject(snapshot) ? snapshot : {};
      const run = isPlainObject(record.run) ? record.run : null;
      if (run === null) return record;

      const { fixedRouteOnly, ...rest } = record;
      if (fixedRouteOnly === true) {
        // Save version 1 predates map navigation; keep the M19 fixed route.
        return { ...rest, stateVersion: AUTHORITATIVE_STATE_VERSION };
      }
      if (isPlainObject(run.map)) {
        return { ...rest, stateVersion: AUTHORITATIVE_STATE_VERSION };
      }

      const seed = run.seed;
      if (!isNonNegativeInteger(seed)) {
        throw new Error("Cannot migrate a run without a nonnegative seed.");
      }
      const rawCurrentNodeId = run.currentNodeId;
      const currentNodeId: keyof typeof M19_TO_M22_ACT_1_ROUTE | null =
        typeof rawCurrentNodeId === "string" &&
        M19_NODE_IDS.includes(rawCurrentNodeId as (typeof M19_NODE_IDS)[number])
          ? (rawCurrentNodeId as keyof typeof M19_TO_M22_ACT_1_ROUTE)
          : null;
      if (currentNodeId === null) {
        throw new Error(
          `Cannot map M19 node ${String(rawCurrentNodeId)} onto the Act 1 template.`,
        );
      }
      const completedNodeIds = Array.isArray(run.completedNodeIds)
        ? run.completedNodeIds
        : [];
      const mapNodeId = M19_TO_M22_ACT_1_ROUTE[currentNodeId];
      const completedMapNodeIds = completedNodeIds
        .filter(
          (nodeId): nodeId is keyof typeof M19_TO_M22_ACT_1_ROUTE =>
            typeof nodeId === "string" &&
            M19_NODE_IDS.includes(nodeId as (typeof M19_NODE_IDS)[number]),
        )
        .map((nodeId) => M19_TO_M22_ACT_1_ROUTE[nodeId]);

      return {
        ...rest,
        stateVersion: AUTHORITATIVE_STATE_VERSION,
        run: {
          ...run,
          runVersion: M22_RUN_VERSION,
          map: createRunMap(seed),
          mapNodeId,
          completedMapNodeIds,
        },
      };
    },
  },
];

export type SaveImportFailureCode =
  | "malformed_json"
  | "invalid_envelope"
  | "checksum_mismatch"
  | "unsupported_save_version"
  | "unmigratable_save_version"
  | "incompatible_content"
  | "incompatible_state_version"
  | "invalid_snapshot";

export interface SaveImportSuccess {
  readonly ok: true;
  readonly state: AuthoritativeState;
  readonly saveVersion: number;
  readonly migratedFrom: number | null;
  readonly warnings: readonly string[];
}

export interface SaveImportFailure {
  readonly ok: false;
  readonly code: SaveImportFailureCode;
  readonly message: string;
  readonly saveVersion: number | null;
}

export type SaveImportResult = SaveImportSuccess | SaveImportFailure;

export interface ImportSaveOptions {
  /** Running content identity. A mismatch is rejected, not reinterpreted. */
  readonly content?: SaveContentIdentity;
  readonly migrations?: SaveMigrationTable;
}

const COMBAT_PHASES = [
  "setup",
  "player",
  "enemy",
  "ended",
] as const satisfies readonly CombatPhase[];

const COMBAT_OUTCOMES = [
  "active",
  "victory",
  "defeat",
] as const satisfies readonly CombatOutcome[];

const RUN_OUTCOMES = [
  "active",
  "victory",
  "defeat",
] as const satisfies readonly M19RunOutcome[];

type SnapshotFailureCode = "invalid_snapshot" | "incompatible_state_version";

interface ValidationFailure {
  readonly ok: false;
  readonly code: SnapshotFailureCode;
  readonly message: string;
}

interface EnvelopeFailure {
  readonly ok: false;
  readonly code: "invalid_envelope";
  readonly message: string;
}

function invalid(message: string): ValidationFailure {
  return { ok: false, code: "invalid_snapshot", message };
}

function incompatible(message: string): ValidationFailure {
  return { ok: false, code: "incompatible_state_version", message };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasOnlyKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  return Object.keys(record).every((key) => allowed.includes(key));
}

function saveChecksum(
  saveVersion: number,
  engineVersion: string,
  contentVersion: string,
  contentHash: string,
  snapshot: unknown,
): string {
  return hashCanonical({
    saveVersion,
    engineVersion,
    contentVersion,
    contentHash,
    snapshot,
  });
}

export function createSaveEnvelope(state: AuthoritativeState): SaveEnvelope {
  const saveVersion: number = SAVE_SCHEMA_VERSION;
  const { engineVersion, contentVersion, contentHash } = state;
  return {
    saveVersion,
    engineVersion,
    contentVersion,
    contentHash,
    snapshot: state,
    checksum: saveChecksum(
      saveVersion,
      engineVersion,
      contentVersion,
      contentHash,
      state,
    ),
  };
}

/** Canonical save text for one authoritative state. Pure; never mutates. */
export function exportSave(state: AuthoritativeState): string {
  return canonicalStringify(createSaveEnvelope(state));
}

function readEnvelope(
  parsed: unknown,
): { readonly ok: true; readonly envelope: SaveEnvelope } | EnvelopeFailure {
  const envelopeIssue = (message: string): EnvelopeFailure => ({
    ok: false,
    code: "invalid_envelope",
    message,
  });

  if (!isPlainObject(parsed)) {
    return envelopeIssue("Save text must decode to a JSON object.");
  }
  if (!hasOnlyKeys(parsed, SAVE_ENVELOPE_KEYS)) {
    return envelopeIssue("Save envelope carries unexpected fields.");
  }
  for (const key of SAVE_ENVELOPE_KEYS) {
    if (!(key in parsed)) {
      return envelopeIssue(`Save envelope is missing ${key}.`);
    }
  }
  if (!isNonNegativeInteger(parsed.saveVersion) || parsed.saveVersion < 1) {
    return envelopeIssue("saveVersion must be a positive integer.");
  }
  if (!isNonEmptyString(parsed.engineVersion)) {
    return envelopeIssue("engineVersion must be a non-empty string.");
  }
  if (!isNonEmptyString(parsed.contentVersion)) {
    return envelopeIssue("contentVersion must be a non-empty string.");
  }
  if (!isNonEmptyString(parsed.contentHash)) {
    return envelopeIssue("contentHash must be a non-empty string.");
  }
  if (!isPlainObject(parsed.snapshot)) {
    return envelopeIssue("snapshot must be a JSON object.");
  }
  if (!isNonEmptyString(parsed.checksum)) {
    return envelopeIssue("checksum must be a non-empty string.");
  }
  return {
    ok: true,
    envelope: {
      saveVersion: parsed.saveVersion,
      engineVersion: parsed.engineVersion,
      contentVersion: parsed.contentVersion,
      contentHash: parsed.contentHash,
      snapshot: parsed.snapshot,
      checksum: parsed.checksum,
    },
  };
}

/**
 * Runs the registered migration rungs from `fromVersion` to `toVersion`.
 * Migrations receive the parsed snapshot and return a new one.
 */
export function applySaveMigrations(
  snapshot: unknown,
  fromVersion: number,
  table: SaveMigrationTable = SAVE_MIGRATIONS,
  toVersion: number = SAVE_SCHEMA_VERSION,
): { readonly ok: true; readonly snapshot: unknown } | { readonly ok: false; readonly message: string } {
  let current = snapshot;
  let version = fromVersion;
  let steps = 0;

  while (version < toVersion) {
    const step = table.find((candidate) => candidate.from === version);
    if (step === undefined) {
      return {
        ok: false,
        message: `No save migration is registered from version ${version} to ${version + 1}.`,
      };
    }
    if (step.to <= step.from) {
      return {
        ok: false,
        message: `Save migration ${step.from} advances to ${step.to}, which is not forward progress.`,
      };
    }
    try {
      current = step.migrate(current);
    } catch (error) {
      return {
        ok: false,
        message: `Save migration ${step.from} to ${step.to} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
    version = step.to;
    steps += 1;
    if (steps > table.length) {
      return {
        ok: false,
        message: "Save migration table does not reach the current save version.",
      };
    }
  }

  return { ok: true, snapshot: current };
}

function requireVersion(
  label: string,
  value: unknown,
  expected: number,
): ValidationFailure | null {
  if (!isNonNegativeInteger(value)) {
    return invalid(`${label} must be a nonnegative integer.`);
  }
  if (value !== expected) {
    return incompatible(`${label} ${value} is not supported; this engine reads ${expected}.`);
  }
  return null;
}

function validateRng(rng: unknown): ValidationFailure | null {
  if (!isPlainObject(rng)) {
    return invalid("rng must be an object.");
  }
  const version = requireVersion("rng.version", rng.version, RNG_STATE_VERSION);
  if (version !== null) {
    return version;
  }
  if (!isNonEmptyString(rng.rootSeed)) {
    return invalid("rng.rootSeed must be a non-empty string.");
  }
  if (!isPlainObject(rng.streams)) {
    return invalid("rng.streams must be an object.");
  }
  for (const stream of GAMEPLAY_RNG_STREAMS) {
    const cursor = rng.streams[stream];
    if (!isPlainObject(cursor)) {
      return invalid(`rng.streams.${stream} must be an object.`);
    }
    if (cursor.algorithm !== RNG_ALGORITHM_VERSION) {
      return incompatible(
        `rng.streams.${stream}.algorithm ${String(cursor.algorithm)} is not supported.`,
      );
    }
    if (!isNonNegativeInteger(cursor.state) || !isNonNegativeInteger(cursor.draws)) {
      return invalid(`rng.streams.${stream} must carry integer state and draws.`);
    }
  }
  return null;
}

function validateCombat(combat: unknown): ValidationFailure | null {
  if (combat === null) {
    return null;
  }
  if (!isPlainObject(combat)) {
    return invalid("combat must be null or an object.");
  }
  const version = requireVersion(
    "combat.combatVersion",
    combat.combatVersion,
    COMBAT_STATE_VERSION,
  );
  if (version !== null) {
    return version;
  }
  for (const field of ["turnNumber", "enemyPhaseNumber", "energy"]) {
    if (!isNonNegativeInteger(combat[field])) {
      return invalid(`combat.${field} must be a nonnegative integer.`);
    }
  }
  if (!COMBAT_PHASES.includes(combat.phase as CombatPhase)) {
    return invalid("combat.phase is not a known phase.");
  }
  if (!COMBAT_OUTCOMES.includes(combat.outcome as CombatOutcome)) {
    return invalid("combat.outcome is not a known outcome.");
  }
  if (!isPlainObject(combat.rules) || !isPlainObject(combat.deck)) {
    return invalid("combat.rules and combat.deck must be objects.");
  }
  if (!isPlainObject(combat.actors) || !isPlainObject(combat.enemyControllers)) {
    return invalid("combat.actors and combat.enemyControllers must be objects.");
  }
  if (!isPlainObject(combat.triggerCounters)) {
    return invalid("combat.triggerCounters must be an object.");
  }
  if (
    !isStringArray(combat.enemySpawnOrder) ||
    !isStringArray(combat.enemyOrder) ||
    !Array.isArray(combat.selectedEnemyIntents) ||
    !Array.isArray(combat.scheduledPackets) ||
    !Array.isArray(combat.triggerBindings) ||
    !Array.isArray(combat.modifierBindings) ||
    !Array.isArray(combat.installedRelics)
  ) {
    return invalid("combat lists must be arrays.");
  }
  if (
    combat.playerCharacterIds !== null &&
    (!Array.isArray(combat.playerCharacterIds) ||
      combat.playerCharacterIds.length !== 2 ||
      !combat.playerCharacterIds.every((id) => typeof id === "string"))
  ) {
    return invalid("combat.playerCharacterIds must be null or two actor IDs.");
  }
  if (combat.frontCharacterId !== null && !isNonEmptyString(combat.frontCharacterId)) {
    return invalid("combat.frontCharacterId must be null or a non-empty string.");
  }
  if (
    !isNonNegativeInteger(combat.manualSwapsUsedThisTurn) ||
    !isNonNegativeInteger(combat.nextScheduledPacketOrdinal) ||
    !isNonNegativeInteger(combat.reactionRecoveryUsed)
  ) {
    return invalid("combat counters must be nonnegative integers.");
  }
  if (combat.imprint !== null && !isPlainObject(combat.imprint)) {
    return invalid("combat.imprint must be null or an object.");
  }
  return null;
}

function validateRewards(rewards: unknown): ValidationFailure | null {
  if (!isPlainObject(rewards)) {
    return invalid("rewards must be an object.");
  }
  const version = requireVersion(
    "rewards.rewardVersion",
    rewards.rewardVersion,
    REWARD_STATE_VERSION,
  );
  if (version !== null) {
    return version;
  }
  if (!isNonNegativeInteger(rewards.scrap)) {
    return invalid("rewards.scrap must be a nonnegative integer.");
  }
  if (rewards.pending !== null) {
    if (!isPlainObject(rewards.pending)) {
      return invalid("rewards.pending must be null or an object.");
    }
    if (!isNonEmptyString(rewards.pending.transactionId)) {
      return invalid("rewards.pending.transactionId must be a non-empty string.");
    }
    if (!Array.isArray(rewards.pending.choices)) {
      return invalid("rewards.pending.choices must be an array.");
    }
  }
  for (const field of [
    "completedTransactionIds",
    "resolvedChoiceIds",
    "resolvedOptionIds",
    "claimedCardIds",
    "claimedRelicIds",
  ]) {
    if (!isStringArray(rewards[field])) {
      return invalid(`rewards.${field} must be an array of strings.`);
    }
  }
  return null;
}

interface PersistedMapNode {
  readonly id: string;
  readonly act: number;
  readonly row: number;
  readonly kind: MapNodeKind;
  readonly links: readonly string[];
}

function indexPersistedMap(
  map: RunMap,
): ReadonlyMap<string, PersistedMapNode> {
  const index = new Map<string, PersistedMapNode>();
  for (const act of map.acts) {
    for (const node of act.nodes) {
      index.set(node.id, {
        id: node.id,
        act: node.act,
        row: node.row,
        kind: node.kind,
        links: node.links,
      });
    }
  }
  return index;
}

/**
 * Playable Act 1 nodes a legal walk may stand on next. Unsupported node kinds
 * (event, shop, workshop, treasure) are traversed but never offered, mirroring
 * `currentReachableNodeIds`, so a run is never persisted on a node M22 cannot
 * begin.
 */
function playablePersistedReachableNodeIds(
  nodes: ReadonlyMap<string, PersistedMapNode>,
  completedMapNodeIds: readonly string[],
): ReadonlySet<string> {
  const act1Nodes = [...nodes.values()].filter((node) => node.act === 1);
  if (act1Nodes.length === 0) return new Set();
  const startIds =
    completedMapNodeIds.length === 0
      ? act1Nodes.filter((node) => node.row === 1).map((node) => node.id)
      : (() => {
          const completedNodes = act1Nodes.filter((node) =>
            completedMapNodeIds.includes(node.id),
          );
          if (completedNodes.length === 0) return [] as string[];
          const maxCompletedRow = Math.max(
            ...completedNodes.map((node) => node.row),
          );
          return completedNodes
            .filter((node) => node.row === maxCompletedRow)
            .flatMap((node) => [...node.links]);
        })();
  return playablePersistedReachableFrom(nodes, startIds, completedMapNodeIds);
}

/** Nearest playable nodes reachable from a frontier, walking through unsupported nodes. */
function playablePersistedReachableFrom(
  nodes: ReadonlyMap<string, PersistedMapNode>,
  startIds: readonly string[],
  completedMapNodeIds: readonly string[],
): ReadonlySet<string> {
  const completed = new Set(completedMapNodeIds);
  const visited = new Set<string>();
  const distanceByNode = new Map<string, number>();
  const frontier = startIds.map((id) => ({ id, distance: 0 }));
  while (frontier.length > 0) {
    const entry = frontier.shift();
    if (entry === undefined || visited.has(entry.id)) {
      continue;
    }
    visited.add(entry.id);
    if (completed.has(entry.id)) continue;
    const node = nodes.get(entry.id);
    if (node === undefined || node.act !== 1) continue;
    if (isPlayableMapNodeKind(node.kind)) {
      // A playable node is a stop: the walk does not continue past it.
      const existing = distanceByNode.get(node.id);
      if (existing === undefined || entry.distance < existing) {
        distanceByNode.set(node.id, entry.distance);
      }
      continue;
    }
    for (const link of node.links) {
      frontier.push({ id: link, distance: entry.distance + 1 });
    }
  }
  if (distanceByNode.size === 0) return new Set();
  const minDistance = Math.min(...distanceByNode.values());
  return new Set(
    [...distanceByNode]
      .filter(([, distance]) => distance === minDistance)
      .map(([id]) => id),
  );
}

/**
 * Whether any forward-linked walk from `startIds` reaches `target`. This is the
 * chain predicate for consecutive completed nodes: a completed service node is
 * a legal step even though M22 never lets the player stop on it.
 */
function mapWalkReaches(
  nodes: ReadonlyMap<string, PersistedMapNode>,
  startIds: readonly string[],
  target: string,
): boolean {
  const visited = new Set<string>();
  const frontier = [...startIds];
  while (frontier.length > 0) {
    const nodeId = frontier.pop();
    if (nodeId === undefined || visited.has(nodeId)) continue;
    visited.add(nodeId);
    const node = nodes.get(nodeId);
    if (node === undefined || node.act !== 1) continue;
    if (node.id === target) return true;
    for (const link of node.links) frontier.push(link);
  }
  return false;
}

/**
 * Reject a persisted M22 navigation state that could not have been reached by
 * the engine: completed map nodes must form one ordered, forward-linked Act 1
 * path with no duplicates, `mapNodeId` must be that path's terminal node or a
 * legal next playable node, and Act 2 can never be completed or current. A
 * migrated M19 run keeps its authored `currentNodeId`; its `mapNodeId` is the
 * navigation equivalent and must match the same walk.
 */
function invalidMapNavigation(
  map: RunMap,
  run: Record<string, unknown>,
  currentNodeId: string,
): ValidationFailure | null {
  const nodes = indexPersistedMap(map);
  const mapNodeId = run.mapNodeId;
  if (typeof mapNodeId !== "string" || !nodes.has(mapNodeId)) {
    return invalid("run.mapNodeId must name a node on the persisted map.");
  }
  const completedMapNodeIds = run.completedMapNodeIds;
  if (
    !Array.isArray(completedMapNodeIds) ||
    !completedMapNodeIds.every(
      (nodeId) => typeof nodeId === "string" && nodes.has(nodeId),
    )
  ) {
    return invalid("run.completedMapNodeIds must list nodes on the persisted map.");
  }

  // A node the run may hold as "current" after a legal walk. Unsupported
  // kinds are only acceptable as a migrated M19 equivalent, handled below.
  const selectable = playablePersistedReachableNodeIds(nodes, completedMapNodeIds);

  const orderedCompleted: PersistedMapNode[] = [];
  const seen = new Set<string>();
  for (const nodeId of completedMapNodeIds) {
    if (seen.has(nodeId)) {
      return invalid(
        `run.completedMapNodeIds repeats map node ${nodeId}.`,
      );
    }
    seen.add(nodeId);
    const node = nodes.get(nodeId) as PersistedMapNode;
    if (node.act !== 1) {
      return invalid(
        `run.completedMapNodeIds cannot contain Act 2 node ${nodeId}.`,
      );
    }
    orderedCompleted.push(node);
  }
  // The first completed node must be a stop a legal walk could reach from the
  // empty completion set, mirroring `reachableNodeIds`/selection semantics.
  // Pairwise links alone would accept a later Act 1 node as a run's very first
  // completed node, which no entrance walk could produce.
  const firstCompleted = orderedCompleted[0];
  if (
    firstCompleted !== undefined &&
    !playablePersistedReachableNodeIds(nodes, []).has(firstCompleted.id)
  ) {
    return invalid(
      `run.completedMapNodeIds must start at an Act 1 entrance reachable from an empty completion: ${firstCompleted.id} is not.`,
    );
  }
  for (let index = 1; index < orderedCompleted.length; index += 1) {
    const previous = orderedCompleted[index - 1] as PersistedMapNode;
    const current = orderedCompleted[index] as PersistedMapNode;
    // Each step must be reachable from the previous completed node, passing
    // only through unsupported service nodes. This accepts the authored M19
    // route, whose rows map straight to the same column, while still rejecting
    // jumps that no walk could make.
    if (!mapWalkReaches(nodes, previous.links, current.id)) {
      return invalid(
        `run.completedMapNodeIds is not a forward-linked Act 1 path: ${previous.id} does not reach ${current.id}.`,
      );
    }
  }

  const mapNode = nodes.get(mapNodeId) as PersistedMapNode;
  if (mapNode.act !== 1) {
    return invalid(
      `run.mapNodeId cannot point at reserved Act 2 node ${mapNodeId}.`,
    );
  }
  const migratedM19NodeId =
    M19_NODE_IDS.find(
      (candidate) => M19_TO_M22_ACT_1_ROUTE[candidate] === mapNodeId,
    ) ?? null;
  // A migrated M19 run keeps the authored node; a pure M22 run keeps the map
  // node. Both must still sit on the walk's legal stopping point.
  const isMigratedM19Current =
    migratedM19NodeId !== null && currentNodeId === migratedM19NodeId;
  if (
    !isMigratedM19Current &&
    currentNodeId !== mapNodeId
  ) {
    return invalid(
      "run.currentNodeId must name the current map node or its authored M19 counterpart.",
    );
  }
  const terminal = orderedCompleted[orderedCompleted.length - 1];
  const isTerminal = terminal !== undefined && terminal.id === mapNodeId;
  if (!isTerminal && !selectable.has(mapNodeId)) {
    return invalid(
      `run.mapNodeId ${mapNodeId} is not the current or next reachable map node.`,
    );
  }
  return null;
}

function validateRun(run: unknown): ValidationFailure | null {
  if (run === null) {
    return null;
  }
  if (!isPlainObject(run)) {
    return invalid("run must be null or an object.");
  }
  const runVersion: unknown = run.runVersion;
  if (runVersion !== M19_RUN_VERSION && runVersion !== M22_RUN_VERSION) {
    return incompatible(
      `run.runVersion ${String(runVersion)} is not supported; this engine reads ${M19_RUN_VERSION} or ${M22_RUN_VERSION}.`,
    );
  }
  if (!isNonNegativeInteger(run.seed)) {
    return invalid("run.seed must be a nonnegative integer.");
  }

  const map = run.map;
  if (map !== null && map !== undefined && !isPlainObject(map)) {
    return invalid("run.map must be null or an object.");
  }
  const mapNodeIds = new Set<string>();
  if (isPlainObject(map)) {
    const mapResult = validateRunMap(map as unknown as RunMap);
    if (!mapResult.ok) {
      return invalid(`run.map is invalid: ${mapResult.errors.join(" ")}`);
    }
    for (const act of (map as unknown as RunMap).acts) {
      for (const node of act.nodes) {
        mapNodeIds.add(node.id);
      }
    }
  }

  const currentNodeId = run.currentNodeId;
  if (typeof currentNodeId !== "string") {
    return invalid("run.currentNodeId must be a string.");
  }
  const isM19Node = M19_NODE_IDS.includes(
    currentNodeId as (typeof M19_NODE_IDS)[number],
  );
  if (!isM19Node && !mapNodeIds.has(currentNodeId)) {
    return invalid(
      "run.currentNodeId is not an authored M19 node or a persisted map node.",
    );
  }

  if (!Array.isArray(run.completedNodeIds)) {
    return invalid("run.completedNodeIds must be an array of node ids.");
  }
  if (
    !run.completedNodeIds.every(
      (nodeId) =>
        typeof nodeId === "string" &&
        (M19_NODE_IDS.includes(nodeId as (typeof M19_NODE_IDS)[number]) ||
          mapNodeIds.has(nodeId)),
    )
  ) {
    return invalid(
      "run.completedNodeIds must list authored M19 nodes or persisted map nodes.",
    );
  }

  if (map === null || map === undefined) {
    if ((runVersion as number) === M22_RUN_VERSION) {
      return invalid("A version 2 run must persist its M22 map.");
    }
    if (run.mapNodeId !== null && run.mapNodeId !== undefined) {
      return invalid("A run without a map cannot name a map node.");
    }
    if (
      run.completedMapNodeIds !== undefined &&
      (!Array.isArray(run.completedMapNodeIds) ||
        run.completedMapNodeIds.length > 0)
    ) {
      return invalid("A run without a map cannot list completed map nodes.");
    }
  } else {
    // A pure M22 run keeps currentNodeId on the map node. A migrated M19 run
    // keeps its authored M19 id while mapNodeId names the equivalent Act 1
    // node, so the two may differ while both resolving. Either way the
    // persisted walk must be one the engine could have produced.
    const navigationFailure = invalidMapNavigation(
      map as unknown as RunMap,
      run,
      currentNodeId,
    );
    if (navigationFailure !== null) return navigationFailure;
  }

  if (!RUN_OUTCOMES.includes(run.outcome as M19RunOutcome)) {
    return invalid("run.outcome is not a known outcome.");
  }
  if (!Array.isArray(run.characters)) {
    return invalid("run.characters must be an array.");
  }
  for (const character of run.characters) {
    if (!isPlainObject(character)) {
      return invalid("run.characters entries must be objects.");
    }
    if (!isNonEmptyString(character.actorId)) {
      return invalid("run character actorId must be a non-empty string.");
    }
    if (!isFiniteNumber(character.hp) || !isFiniteNumber(character.maxHp)) {
      return invalid("run character HP must be numeric.");
    }
  }
  if (run.deck !== null && !Array.isArray(run.deck)) {
    return invalid("run.deck must be null or an array of instances.");
  }
  if (!isStringArray(run.relicIds)) {
    return invalid("run.relicIds must be an array of relic ids.");
  }
  return null;
}

function validateSnapshot(
  snapshot: Record<string, unknown>,
): { readonly ok: true; readonly state: AuthoritativeState } | ValidationFailure {
  if (!hasOnlyKeys(snapshot, SAVE_SNAPSHOT_KEYS)) {
    return invalid("Snapshot carries unexpected fields.");
  }
  for (const key of SAVE_SNAPSHOT_KEYS) {
    if (!(key in snapshot)) {
      return invalid(`Snapshot is missing ${key}.`);
    }
  }
  const stateVersion = requireVersion(
    "stateVersion",
    snapshot.stateVersion,
    AUTHORITATIVE_STATE_VERSION,
  );
  if (stateVersion !== null) {
    return stateVersion;
  }
  if (!isNonEmptyString(snapshot.engineVersion)) {
    return invalid("engineVersion must be a non-empty string.");
  }
  if (!isNonEmptyString(snapshot.contentVersion)) {
    return invalid("contentVersion must be a non-empty string.");
  }
  if (!isNonEmptyString(snapshot.contentHash)) {
    return invalid("contentHash must be a non-empty string.");
  }
  if (!isNonNegativeInteger(snapshot.commandSequence)) {
    return invalid("commandSequence must be a nonnegative integer.");
  }

  const sections = [
    validateRng(snapshot.rng),
    validateCombat(snapshot.combat),
    validateRewards(snapshot.rewards),
    validateRun(snapshot.run),
  ];
  for (const failure of sections) {
    if (failure !== null) {
      return failure;
    }
  }

  return { ok: true, state: snapshot as unknown as AuthoritativeState };
}

/**
 * JSON cannot carry prototypes, so rebuild the one record the engine creates
 * with a null prototype (`deck.instances`). Loading then returns the shape the
 * engine itself would have built, not a lookalike.
 */
function rehydrateSnapshot(state: AuthoritativeState): AuthoritativeState {
  const combat = state.combat;
  if (combat === null || typeof combat.deck?.instances !== "object") {
    return state;
  }
  const instances: Record<string, CardInstance> = Object.create(null) as Record<
    string,
    CardInstance
  >;
  for (const [instanceId, instance] of Object.entries(combat.deck.instances)) {
    instances[instanceId] = instance;
  }
  return {
    ...state,
    combat: { ...combat, deck: { ...combat.deck, instances } },
  };
}

/**
 * Read save text. Never throws for bad input, never mutates or deletes the
 * source text, and encodes why a save was rejected so the caller can preserve
 * it and report the incompatibility.
 */
export function importSave(
  text: string,
  options: ImportSaveOptions = {},
): SaveImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      code: "malformed_json",
      message: "Save text is not parseable JSON.",
      saveVersion: null,
    };
  }

  const read = readEnvelope(parsed);
  if (!read.ok) {
    return {
      ok: false,
      code: "invalid_envelope",
      message: read.message,
      saveVersion: null,
    };
  }
  const envelope = read.envelope;

  const expectedChecksum = saveChecksum(
    envelope.saveVersion,
    envelope.engineVersion,
    envelope.contentVersion,
    envelope.contentHash,
    envelope.snapshot,
  );
  if (envelope.checksum !== expectedChecksum) {
    return {
      ok: false,
      code: "checksum_mismatch",
      message: "Save checksum does not match the stored snapshot.",
      saveVersion: envelope.saveVersion,
    };
  }

  if (envelope.saveVersion > SAVE_SCHEMA_VERSION) {
    return {
      ok: false,
      code: "unsupported_save_version",
      message: `Save version ${envelope.saveVersion} is newer than supported version ${SAVE_SCHEMA_VERSION}.`,
      saveVersion: envelope.saveVersion,
    };
  }

  if (options.content !== undefined) {
    const { contentVersion, contentHash } = options.content;
    if (
      contentVersion !== envelope.contentVersion ||
      contentHash !== envelope.contentHash
    ) {
      return {
        ok: false,
        code: "incompatible_content",
        message: `Save content ${envelope.contentVersion} (${envelope.contentHash}) does not match running content ${contentVersion} (${contentHash}).`,
        saveVersion: envelope.saveVersion,
      };
    }
  }

  const migrations = options.migrations ?? SAVE_MIGRATIONS;
  const migrated = applySaveMigrations(
    envelope.snapshot,
    envelope.saveVersion,
    migrations,
  );
  if (!migrated.ok) {
    return {
      ok: false,
      code: "unmigratable_save_version",
      message: migrated.message,
      saveVersion: envelope.saveVersion,
    };
  }
  if (!isPlainObject(migrated.snapshot)) {
    return {
      ok: false,
      code: "invalid_snapshot",
      message: "Migrated snapshot is not a JSON object.",
      saveVersion: envelope.saveVersion,
    };
  }

  const validated = validateSnapshot(migrated.snapshot);
  if (!validated.ok) {
    return { ...validated, saveVersion: envelope.saveVersion };
  }

  const warnings =
    envelope.engineVersion === ENGINE_VERSION
      ? []
      : [
          `engine_version_changed: save was written by engine ${envelope.engineVersion}, running engine is ${ENGINE_VERSION}.`,
        ];

  return {
    ok: true,
    state: rehydrateSnapshot(validated.state),
    saveVersion: envelope.saveVersion,
    migratedFrom:
      envelope.saveVersion === SAVE_SCHEMA_VERSION
        ? null
        : envelope.saveVersion,
    warnings,
  };
}
