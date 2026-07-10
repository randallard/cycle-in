import type { CycleEvent } from "../core/events";

/**
 * Event store (shell): append and read-all, nothing else — per ADR-0003 the
 * store must not add semantics; the reducer owns all meaning. The interface
 * is async because the real store is IndexedDB (growth math in ADR-0003:
 * localStorage's ~5 MB cap is reachable within ~18 months at ~30 events/day).
 * Appends are idempotent by event id (`put`), so replaying a sync bundle or
 * re-appending after a partial import is harmless — union semantics all the
 * way down.
 */
export interface EventStore {
  append(event: CycleEvent): Promise<void>;
  all(): Promise<readonly CycleEvent[]>;
}

/** In-memory store, same contract — for tests and non-browser contexts. */
export function createInMemoryStore(): EventStore {
  const events = new Map<string, CycleEvent>();
  return {
    append: (e) => {
      events.set(e.id, e);
      return Promise.resolve();
    },
    all: () => Promise.resolve([...events.values()]),
  };
}

const DB_NAME = "cycle-in";
const DB_VERSION = 1;
const STORE = "events";

/** Wrap one IDBRequest as a Promise. */
function asPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => {
      resolve(r.result);
    };
    r.onerror = () => {
      reject(r.error ?? new Error("IndexedDB request failed"));
    };
  });
}

/**
 * Open (creating on first run) the IndexedDB-backed event store. Events are
 * keyed by their id; `getAll` returns insertion order, which the reducer
 * doesn't rely on anyway (permutation-invariance is the flagship property).
 */
export function openIndexedDbStore(dbName = DB_NAME): Promise<EventStore> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(dbName, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    open.onerror = () => {
      reject(open.error ?? new Error(`IndexedDB open failed: ${dbName}`));
    };
    open.onsuccess = () => {
      const db = open.result;
      resolve({
        append: async (e) => {
          const store = db
            .transaction(STORE, "readwrite")
            .objectStore(STORE);
          await asPromise(store.put(e));
        },
        all: async () => {
          const store = db.transaction(STORE, "readonly").objectStore(STORE);
          const rows: unknown[] = await asPromise(store.getAll());
          // The only writer is `append`, which stores CycleEvents verbatim;
          // unknown kinds are the reducer's job to tolerate, not ours.
          return rows as CycleEvent[];
        },
      });
    };
  });
}
