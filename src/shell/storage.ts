import type { CycleEvent } from "../core/events";

/**
 * Event-store stub. Cross-device sync (phone + other devices) is an explicitly
 * open decision — see docs/PROGRESS.md, "Immediate next step" — but per
 * ADR-0003 the model is settled: an append-only event log, so any future
 * transport is just "union two event sets." This in-memory implementation
 * proves the plumbing; the real one is planned for IndexedDB (growth math in
 * ADR-0003) and must not add semantics — append and read-all, nothing else.
 */
export interface EventStore {
  append(event: CycleEvent): void;
  all(): readonly CycleEvent[];
}

export function createInMemoryStore(): EventStore {
  const events: CycleEvent[] = [];
  return {
    append: (e) => {
      events.push(e);
    },
    all: () => events,
  };
}
