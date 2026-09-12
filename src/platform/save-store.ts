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

/** The most recent record rejected on load, preserved for diagnosis. */
export interface QuarantineRecord {
  readonly key: typeof QUARANTINE_SLOT_KEY;
  readonly generation: number | null;
  readonly text: string;
  readonly reason: string;
}

export interface BackendWrite {
  readonly key: string;
  /** `null` deletes the key. */
  readonly value: unknown | null;
}

export interface SaveBackend {
  read(key: string): Promise<unknown>;
  /**
   * Apply every write in one atomic step: all of them or none. The backend is
   * responsible for ordering; the store supplies writes in the order they must
   * be applied.
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
}

export interface SaveLoadSuccess {
  readonly ok: true;
  readonly state: AuthoritativeState;
  readonly slot: SaveSlotKey;
  readonly generation: number;
  /** True when the corrupt record was quarantined and `active` was rewritten. */
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

export interface SaveStore {
  load(): Promise<SaveLoadResult>;
  commit(
    state: AuthoritativeState,
    options?: SaveCommitOptions,
  ): Promise<SaveCommitResult>;
  readProfile(): Promise<{ readonly ok: true; readonly profile: unknown } | SaveLoadFailure>;
  /** Explicit user action: remove every slot, including the quarantine. */
  clear(): Promise<SaveCommitResult>;
  close(): void;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSaveGenerationRecord(value: unknown): value is SaveGenerationRecord {
  if (!isPlainRecord(value)) {
    return false;
  }
  if (!SAVE_SLOT_KEYS.includes(value.key as SaveSlotKey)) {
    return false;
  }
  if (typeof value.generation !== "number" || !Number.isInteger(value.generation)) {
    return false;
  }
  if (value.generation < 0) {
    return false;
  }
  return typeof value.text === "string";
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
   * Validate every present slot and pick the newest valid generation. Reads
   * never throw for bad data: a rejected slot becomes a diagnosis, not a crash.
   */
  function evaluate(reads: readonly SlotRead[]):
    | {
        readonly valid: ValidGeneration | null;
        readonly rejected: readonly RejectedGeneration[];
      } {
    const rejected: RejectedGeneration[] = [];
    let valid: ValidGeneration | null = null;

    for (const { slot, raw } of reads) {
      if (raw === undefined || raw === null) {
        continue;
      }
      if (!isSaveGenerationRecord(raw)) {
        rejected.push({
          slot,
          generation: null,
          code: "invalid_record",
          message: `${slot} does not hold a save generation record.`,
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
        });
        continue;
      }
      if (valid === null || raw.generation > valid.record.generation) {
        valid = { slot, record: raw, state: imported.state, warnings: imported.warnings };
      }
    }

    return { valid, rejected };
  }

  /**
   * Move a rejected payload into quarantine and rewrite the recovered record
   * into `active` in one transaction. The reject itself never deletes and never
   * depends on this succeeding.
   */
  async function repair(
    rejected: RejectedGeneration,
    recovered: ValidGeneration,
    reads: readonly SlotRead[],
  ): Promise<boolean> {
    const source = reads.find((read) => read.slot === rejected.slot);
    const sourceRaw = source?.raw;
    const quarantine: QuarantineRecord = {
      key: QUARANTINE_SLOT_KEY,
      generation: rejected.generation,
      // Preserve the save text itself when there is one; otherwise keep
      // whatever occupied the slot so the payload is not lost.
      text: isSaveGenerationRecord(sourceRaw)
        ? sourceRaw.text
        : preservedText(sourceRaw),
      reason: `${rejected.code}: ${rejected.message}`,
    };
    const repaired: SaveGenerationRecord = {
      key: ACTIVE_SLOT_KEY,
      generation: recovered.record.generation,
      text: recovered.record.text,
      profile: recovered.record.profile ?? null,
    };
    try {
      await backend.commit([
        { key: QUARANTINE_SLOT_KEY, value: quarantine },
        { key: ACTIVE_SLOT_KEY, value: repaired },
      ]);
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

      const { valid, rejected } = evaluate(reads);

      if (valid === null) {
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

      const firstRejected = rejected[0];
      const repairedOnDisk =
        firstRejected === undefined ? false : await repair(firstRejected, valid, reads);

      return {
        ok: true,
        state: valid.state,
        slot: valid.slot,
        generation: valid.record.generation,
        repairedOnDisk,
        rejected,
        warnings: valid.warnings,
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

      const { valid } = evaluate(reads);
      const generation = (valid?.record.generation ?? 0) + 1;
      const active = reads.find((read) => read.slot === ACTIVE_SLOT_KEY)?.raw;
      const backupOne = reads.find(
        (read) => read.slot === BACKUP_SLOT_KEYS[0],
      )?.raw;

      const writes: BackendWrite[] = [];
      // Backups first, the replacement last: no legal interruption can leave
      // `active` pointing at a generation whose predecessors are unwritten.
      if (isSaveGenerationRecord(backupOne)) {
        writes.push({
          key: BACKUP_SLOT_KEYS[1],
          value: { ...backupOne, key: BACKUP_SLOT_KEYS[1] },
        });
      }
      if (isSaveGenerationRecord(active)) {
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

    async readProfile() {
      let reads: readonly SlotRead[];
      try {
        reads = await readSlots();
      } catch (caught) {
        return {
          ok: false as const,
          code: "unavailable" as const,
          message: `Save storage is unavailable: ${messageOf(caught)}`,
          rejected: [],
        };
      }
      const { valid, rejected } = evaluate(reads);
      if (valid === null) {
        return rejected.length === 0
          ? {
              ok: false as const,
              code: "empty" as const,
              message: "No save has been written yet.",
              rejected,
            }
          : {
              ok: false as const,
              code: "no_valid_generation" as const,
              message: "Every stored save generation was rejected; nothing was deleted.",
              rejected,
            };
      }
      return { ok: true as const, profile: valid.record.profile ?? null };
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
