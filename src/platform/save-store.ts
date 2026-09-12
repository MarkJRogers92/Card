import {
  SAVE_MIGRATIONS,
  exportSave,
  importSave,
  type AuthoritativeState,
  type SaveContentIdentity,
  type SaveImportFailureCode,
  type SaveMigrationTable,
} from "../engine";

/**
 * M21 browser persistence protocol.
 *
 * This module owns the generation model — one active save, two rotating
 * backups, atomic commits, and recovery — and depends on a small storage
 * backend interface. `indexeddb.ts` supplies the browser backend; tests supply
 * fault-injecting backends that abort a genuine IndexedDB transaction.
 *
 * The engine boundary is unchanged: `src/engine/save.ts` remains the only
 * encoder, and nothing in `src/engine` imports this module.
 *
 * Two invariants drive every rule below:
 *
 * 1. At least one loadable generation survives any prefix of a commit. Slots
 *    are only overwritten when the record replacing them is already known to
 *    be a valid generation, so a damaged slot is never propagated over the
 *    last good one.
 * 2. A generation is selected by slot order (`active`, `backup.1`,
 *    `backup.2`), not by a self-reported generation number. Store metadata
 *    sits outside the save checksum, so it must not be able to promote an
 *    older snapshot over a newer one.
 */

export const SAVE_DB_NAME = "joint-liability";
export const SAVE_DB_VERSION = 1;
export const SAVE_STORE_NAME = "saves";

export const ACTIVE_SLOT_KEY = "active";
export const BACKUP_SLOT_KEYS = ["backup.1", "backup.2"] as const;
export const SAVE_SLOT_KEYS = [ACTIVE_SLOT_KEY, ...BACKUP_SLOT_KEYS] as const;
export const QUARANTINE_SLOT_KEY = "quarantine";

export type SaveSlotKey = (typeof SAVE_SLOT_KEYS)[number];

/** One complete save generation, as stored in a slot. */
export interface SaveGenerationRecord {
  readonly key: SaveSlotKey;
  readonly generation: number;
  readonly text: string;
  readonly profile: unknown;
}

/** One rejected payload, preserved for diagnosis. */
export interface QuarantineEntry {
  readonly slot: string;
  readonly generation: number | null;
  readonly code: SaveImportFailureCode | "invalid_record";
  readonly message: string;
  readonly text: string;
}

/** History of rejected payloads. Entries are appended, never rewritten. */
export interface QuarantineRecord {
  readonly key: typeof QUARANTINE_SLOT_KEY;
  readonly entries: readonly QuarantineEntry[];
}

export interface BackendWrite {
  readonly key: string;
  /** `null` deletes the key. */
  readonly value: unknown | null;
}

export interface SaveBackend {
  read(key: string): Promise<unknown>;
  /**
   * Apply every write in one atomic step: all of them or none. The store
   * supplies writes in the order they must be applied.
   */
  commit(writes: readonly BackendWrite[]): Promise<void>;
  close(): void;
}

export interface SaveStoreOptions {
  readonly backend: SaveBackend;
  /** Running content identity. A mismatch is rejected, never reinterpreted. */
  readonly content?: SaveContentIdentity;
  readonly migrations?: SaveMigrationTable;
}

export interface RejectedGeneration {
  readonly slot: string;
  readonly generation: number | null;
  readonly code: SaveImportFailureCode | "invalid_record";
  readonly message: string;
  /** The payload that was preserved, so a rejection never loses data. */
  readonly text: string;
}

export interface SaveLoadSuccess {
  readonly ok: true;
  readonly state: AuthoritativeState;
  readonly slot: SaveSlotKey;
  readonly generation: number;
  /** True when the recovered generation is the one stored in `active`. */
  readonly repairedOnDisk: boolean;
  readonly rejected: readonly RejectedGeneration[];
  readonly warnings: readonly string[];
}

export interface SaveLoadFailure {
  readonly ok: false;
  readonly code: "empty" | "no_valid_generation" | "unavailable";
  readonly message: string;
  readonly rejected: readonly RejectedGeneration[];
}

export type SaveLoadResult = SaveLoadSuccess | SaveLoadFailure;

export interface SaveCommitSuccess {
  readonly ok: true;
  readonly generation: number;
}

export interface SaveCommitFailure {
  readonly ok: false;
  readonly code: "encode_failed" | "write_failed" | "unavailable";
  readonly message: string;
}

export type SaveCommitResult = SaveCommitSuccess | SaveCommitFailure;

export interface SaveCommitOptions {
  /** Opaque platform payload committed in the same generation as the run. */
  readonly profile?: unknown;
}

export interface SaveProfileResult {
  readonly ok: true;
  readonly profile: unknown;
}

export interface SaveStore {
  load(): Promise<SaveLoadResult>;
  commit(
    state: AuthoritativeState,
    options?: SaveCommitOptions,
  ): Promise<SaveCommitResult>;
  readProfile(): Promise<SaveProfileResult | SaveLoadFailure>;
  /** Explicit user action: remove every slot, including the quarantine. */
  clear(): Promise<SaveCommitResult>;
  close(): void;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * A slot record is only recognized when its embedded key matches the slot it
 * was read from, so a mislabelled record cannot be selected or rotated.
 */
function isGenerationRecord(
  value: unknown,
  slot: SaveSlotKey,
): value is SaveGenerationRecord {
  if (!isPlainRecord(value)) {
    return false;
  }
  if (value.key !== slot) {
    return false;
  }
  if (
    typeof value.generation !== "number" ||
    !Number.isSafeInteger(value.generation) ||
    value.generation < 0
  ) {
    return false;
  }
  return typeof value.text === "string";
}

function quarantineEntries(value: unknown): readonly QuarantineEntry[] {
  if (!isPlainRecord(value) || value.key !== QUARANTINE_SLOT_KEY) {
    return [];
  }
  const entries = value.entries;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries.filter(
    (entry): entry is QuarantineEntry =>
      isPlainRecord(entry) &&
      typeof entry.slot === "string" &&
      typeof entry.code === "string" &&
      typeof entry.message === "string" &&
      typeof entry.text === "string",
  );
}

function messageOf(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}

/** Text preserved in the quarantine slot; never throws on odd input. */
function preservedText(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }
  try {
    return JSON.stringify(raw) ?? String(raw);
  } catch {
    return String(raw);
  }
}

interface SlotRead {
  readonly slot: SaveSlotKey;
  readonly raw: unknown;
}

interface ValidGeneration {
  readonly slot: SaveSlotKey;
  readonly record: SaveGenerationRecord;
  readonly state: AuthoritativeState;
  readonly warnings: readonly string[];
}

interface Evaluation {
  readonly validBySlot: ReadonlyMap<SaveSlotKey, ValidGeneration>;
  /** The newest valid generation, by slot order rather than by metadata. */
  readonly selected: ValidGeneration | null;
  readonly rejected: readonly RejectedGeneration[];
}

export function createSaveStore(options: SaveStoreOptions): SaveStore {
  const { backend } = options;
  const migrations = options.migrations ?? SAVE_MIGRATIONS;
  const content = options.content;

  async function readSlots(): Promise<readonly SlotRead[]> {
    return Promise.all(
      SAVE_SLOT_KEYS.map(async (slot) => ({ slot, raw: await backend.read(slot) })),
    );
  }

  /**
   * Validate every present slot. Reads never throw for bad data: a rejected
   * slot becomes a diagnosis, not a crash, and it carries its payload so the
   * rejection can be preserved.
   */
  function evaluate(reads: readonly SlotRead[]): Evaluation {
    const validBySlot = new Map<SaveSlotKey, ValidGeneration>();
    const rejected: RejectedGeneration[] = [];

    for (const { slot, raw } of reads) {
      if (raw === undefined || raw === null) {
        continue;
      }
      if (!isGenerationRecord(raw, slot)) {
        const label = isPlainRecord(raw) ? raw.key : undefined;
        rejected.push({
          slot,
          generation: null,
          code: "invalid_record",
          message:
            typeof label === "string"
              ? `${slot} holds a record labelled ${label}.`
              : `${slot} does not hold a save generation record.`,
          text: preservedText(raw),
        });
        continue;
      }
      const imported = importSave(raw.text, { content, migrations });
      if (!imported.ok) {
        rejected.push({
          slot,
          generation: raw.generation,
          code: imported.code,
          message: imported.message,
          text: raw.text,
        });
        continue;
      }
      validBySlot.set(slot, {
        slot,
        record: raw,
        state: imported.state,
        warnings: imported.warnings,
      });
    }

    let selected: ValidGeneration | null = null;
    for (const slot of SAVE_SLOT_KEYS) {
      const candidate = validBySlot.get(slot);
      if (candidate !== undefined) {
        selected = candidate;
        break;
      }
    }

    return { validBySlot, selected, rejected };
  }

  /**
   * Make the recovery durable: append every rejected payload to the quarantine
   * history and rewrite `active` with the recovered generation, in one atomic
   * transaction. Nothing is deleted, repeated loads add nothing, and a failed
   * repair write still returns the recovered state.
   */
  async function repair(
    rejected: readonly RejectedGeneration[],
    recovered: ValidGeneration,
    reads: readonly SlotRead[],
  ): Promise<boolean> {
    let known: readonly QuarantineEntry[] = [];
    try {
      known = quarantineEntries(await backend.read(QUARANTINE_SLOT_KEY));
    } catch {
      known = [];
    }
    const seen = new Set(
      known.map((entry) => `${entry.slot}|${entry.generation}|${entry.code}`),
    );
    const additions = rejected
      .filter((entry) => !seen.has(`${entry.slot}|${entry.generation}|${entry.code}`))
      .map((entry) => ({
        slot: entry.slot,
        generation: entry.generation,
        code: entry.code,
        message: entry.message,
        text: entry.text,
      }));

    const activeRaw = reads.find((read) => read.slot === ACTIVE_SLOT_KEY)?.raw;
    const activeAlreadyRecovered =
      isGenerationRecord(activeRaw, ACTIVE_SLOT_KEY) &&
      activeRaw.text === recovered.record.text &&
      activeRaw.generation === recovered.record.generation;

    const writes: BackendWrite[] = [];
    if (additions.length > 0) {
      writes.push({
        key: QUARANTINE_SLOT_KEY,
        value: {
          key: QUARANTINE_SLOT_KEY,
          entries: [...known, ...additions],
        } satisfies QuarantineRecord,
      });
    }
    if (!activeAlreadyRecovered) {
      writes.push({
        key: ACTIVE_SLOT_KEY,
        value: {
          key: ACTIVE_SLOT_KEY,
          generation: recovered.record.generation,
          text: recovered.record.text,
          profile: recovered.record.profile ?? null,
        } satisfies SaveGenerationRecord,
      });
    }
    if (writes.length === 0) {
      return true;
    }
    try {
      await backend.commit(writes);
      return true;
    } catch {
      return false;
    }
  }

  return {
    async load(): Promise<SaveLoadResult> {
      let reads: readonly SlotRead[];
      try {
        reads = await readSlots();
      } catch (caught) {
        return {
          ok: false,
          code: "unavailable",
          message: `Save storage is unavailable: ${messageOf(caught)}`,
          rejected: [],
        };
      }

      const { selected, rejected } = evaluate(reads);

      if (selected === null) {
        if (rejected.length === 0) {
          return {
            ok: false,
            code: "empty",
            message: "No save has been written yet.",
            rejected,
          };
        }
        return {
          ok: false,
          code: "no_valid_generation",
          message: "Every stored save generation was rejected; nothing was deleted.",
          rejected,
        };
      }

      // Repair when a slot was rejected, or when the recovered generation is
      // not the one `active` holds.
      const repairedOnDisk =
        rejected.length === 0 && selected.slot === ACTIVE_SLOT_KEY
          ? false
          : await repair(rejected, selected, reads);

      return {
        ok: true,
        state: selected.state,
        slot: selected.slot,
        generation: selected.record.generation,
        repairedOnDisk,
        rejected,
        warnings: selected.warnings,
      };
    },

    async commit(
      state: AuthoritativeState,
      commitOptions: SaveCommitOptions = {},
    ): Promise<SaveCommitResult> {
      let text: string;
      try {
        text = exportSave(state);
      } catch (caught) {
        return {
          ok: false,
          code: "encode_failed",
          message: `Save could not be encoded: ${messageOf(caught)}`,
        };
      }

      let reads: readonly SlotRead[];
      try {
        reads = await readSlots();
      } catch (caught) {
        return {
          ok: false,
          code: "unavailable",
          message: `Save storage is unavailable: ${messageOf(caught)}`,
        };
      }

      const { validBySlot } = evaluate(reads);
      let highestGeneration = 0;
      for (const valid of validBySlot.values()) {
        highestGeneration = Math.max(highestGeneration, valid.record.generation);
      }
      const generation = highestGeneration + 1;

      const active = validBySlot.get(ACTIVE_SLOT_KEY)?.record;
      const backupOne = validBySlot.get(BACKUP_SLOT_KEYS[0])?.record;

      const writes: BackendWrite[] = [];
      // Backups first, the replacement last, and only ever from a record that
      // already loaded as a valid generation: a damaged slot is never promoted
      // over the last good one.
      if (backupOne !== undefined) {
        writes.push({
          key: BACKUP_SLOT_KEYS[1],
          value: { ...backupOne, key: BACKUP_SLOT_KEYS[1] },
        });
      }
      if (active !== undefined) {
        writes.push({
          key: BACKUP_SLOT_KEYS[0],
          value: { ...active, key: BACKUP_SLOT_KEYS[0] },
        });
      }
      writes.push({
        key: ACTIVE_SLOT_KEY,
        value: {
          key: ACTIVE_SLOT_KEY,
          generation,
          text,
          profile: commitOptions.profile ?? null,
        } satisfies SaveGenerationRecord,
      });

      try {
        await backend.commit(writes);
      } catch (caught) {
        return {
          ok: false,
          code: "write_failed",
          message: `Save commit was interrupted: ${messageOf(caught)}`,
        };
      }
      return { ok: true, generation };
    },

    async readProfile(): Promise<SaveProfileResult | SaveLoadFailure> {
      let reads: readonly SlotRead[];
      try {
        reads = await readSlots();
      } catch (caught) {
        return {
          ok: false,
          code: "unavailable",
          message: `Save storage is unavailable: ${messageOf(caught)}`,
          rejected: [],
        };
      }
      const { selected, rejected } = evaluate(reads);
      if (selected === null) {
        return rejected.length === 0
          ? {
              ok: false,
              code: "empty",
              message: "No save has been written yet.",
              rejected,
            }
          : {
              ok: false,
              code: "no_valid_generation",
              message: "Every stored save generation was rejected; nothing was deleted.",
              rejected,
            };
      }
      return { ok: true, profile: selected.record.profile ?? null };
    },

    async clear(): Promise<SaveCommitResult> {
      try {
        await backend.commit([
          { key: ACTIVE_SLOT_KEY, value: null },
          { key: BACKUP_SLOT_KEYS[0], value: null },
          { key: BACKUP_SLOT_KEYS[1], value: null },
          { key: QUARANTINE_SLOT_KEY, value: null },
        ]);
      } catch (caught) {
        return {
          ok: false,
          code: "write_failed",
          message: `Save storage could not be cleared: ${messageOf(caught)}`,
        };
      }
      return { ok: true, generation: 0 };
    },

    close(): void {
      backend.close();
    },
  };
}
