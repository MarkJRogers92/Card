import {
  SAVE_DB_NAME,
  SAVE_DB_VERSION,
  SAVE_STORE_NAME,
  createSaveStore,
  type BackendWrite,
  type SaveBackend,
  type SaveStore,
  type SaveStoreOptions,
} from "./save-store";

/**
 * IndexedDB backend for the M21 persistence protocol.
 *
 * The database holds one object store keyed by slot, so a commit is a
 * multi-record rotation inside a single `readwrite` transaction. IndexedDB
 * aborts that transaction as a unit, which is the atomicity the store relies
 * on.
 */

export interface IndexedDbBackendOptions {
  readonly storeName?: string;
  /**
   * Test seam. Runs inside the live transaction immediately before each write,
   * so a fault-injection test can abort a genuine IndexedDB transaction at a
   * chosen boundary and prove that the interrupted commit changed nothing.
   */
  readonly beforeWrite?: (
    write: BackendWrite,
    index: number,
    transaction: IDBTransaction,
  ) => void;
}

export interface OpenSaveStoreOptions extends Omit<SaveStoreOptions, "backend"> {
  readonly databaseName?: string;
  readonly databaseVersion?: number;
  readonly factory?: IDBFactory;
  readonly beforeWrite?: IndexedDbBackendOptions["beforeWrite"];
}

function requestError(request: IDBRequest, fallback: string): Error {
  return request.error ?? new Error(fallback);
}

/** Open (and, on first run, create) the persistence database. */
export function openSaveDatabase(
  factory: IDBFactory | undefined = globalThis.indexedDB,
  name: string = SAVE_DB_NAME,
  version: number = SAVE_DB_VERSION,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (factory === undefined) {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }
    const request = factory.open(name, version);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SAVE_STORE_NAME)) {
        database.createObjectStore(SAVE_STORE_NAME, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(requestError(request, "IndexedDB could not be opened."));
    request.onblocked = () =>
      reject(new Error("IndexedDB upgrade is blocked by an open connection."));
  });
}

export function createIndexedDbBackend(
  database: IDBDatabase,
  options: IndexedDbBackendOptions = {},
): SaveBackend {
  const storeName = options.storeName ?? SAVE_STORE_NAME;

  return {
    read(key: string): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(requestError(request, `Save slot ${key} could not be read.`));
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("Save read transaction aborted."));
      });
    },

    commit(writes: readonly BackendWrite[]): Promise<void> {
      return new Promise((resolve, reject) => {
        const transaction = database.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        let settled = false;

        transaction.oncomplete = () => {
          settled = true;
          resolve();
        };
        transaction.onabort = () => {
          if (settled) return;
          settled = true;
          reject(transaction.error ?? new Error("Save transaction aborted."));
        };
        transaction.onerror = () => {
          if (settled) return;
          settled = true;
          reject(transaction.error ?? new Error("Save transaction failed."));
        };

        try {
          writes.forEach((write, index) => {
            options.beforeWrite?.(write, index, transaction);
            if (write.value === null) {
              store.delete(write.key);
            } else {
              store.put(write.value);
            }
          });
        } catch (caught) {
          try {
            transaction.abort();
          } catch {
            // The transaction was already aborted by the injected fault.
          }
          if (!settled) {
            settled = true;
            reject(caught instanceof Error ? caught : new Error(String(caught)));
          }
        }
      });
    },

    close(): void {
      database.close();
    },
  };
}

/** Open the database and return a ready persistence store. */
export async function openIndexedDbSaveStore(
  options: OpenSaveStoreOptions = {},
): Promise<SaveStore> {
  const database = await openSaveDatabase(
    options.factory,
    options.databaseName,
    options.databaseVersion,
  );
  return createSaveStore({
    backend: createIndexedDbBackend(database, {
      beforeWrite: options.beforeWrite,
    }),
    content: options.content,
    migrations: options.migrations,
  });
}
