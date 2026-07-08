import type { Impression, Item, LogEntry } from "../core/types";

/**
 * Data-layer stub. Cross-device sync (phone + other devices) is an explicitly
 * open decision — see docs/PROGRESS.md, "Immediate next step." This in-memory
 * implementation exists only to prove the app's plumbing end-to-end: it does
 * not persist across a reload and must not be mistaken for the real data
 * layer. Replace this module once the sync model is decided.
 */
export interface Store {
  items: Item[];
  logEntries: LogEntry[];
  impressions: Impression[];
}

export function createInMemoryStore(): Store {
  return { items: [], logEntries: [], impressions: [] };
}
