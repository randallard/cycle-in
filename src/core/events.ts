import type { Cadence, ItemSeed } from "./types";

/** Common envelope: `id` is globally unique (dedupe key for sync merges),
 * `at` is a UTC ISO timestamp (total order with `id` as tiebreak), `v` is the
 * per-event schema version. Events are append-only and never edited — undo is
 * an `event-retracted` event, corrections are `log-corrected` events. */
interface EventBase {
  id: string;
  at: string;
  v: 1;
}

export type CycleEvent = EventBase &
  (
    | { kind: "item-added"; item: ItemSeed }
    | { kind: "item-renamed"; itemId: string; name: string }
    | {
        kind: "item-recategorized";
        itemId: string;
        category: string;
        subCategory?: string;
      }
    /** The promote/demote flow — first-class, per ADR-0003. */
    | { kind: "cadence-changed"; itemId: string; cadence: Cadence }
    | { kind: "item-archived"; itemId: string }
    | { kind: "item-unarchived"; itemId: string }
    | { kind: "item-held"; itemId: string }
    | { kind: "item-released"; itemId: string }
    | { kind: "item-started"; itemId: string }
    /** `effectiveDate` ("YYYY-MM-DD") supports retroactive marking; defaults
     * to the local day of `at`. */
    | { kind: "item-done"; itemId: string; effectiveDate?: string }
    | { kind: "priority-bumped"; itemId: string; forDate: string }
    | { kind: "dismissed-today"; itemId: string; date: string }
    | {
        kind: "time-logged";
        entryId: string;
        category: string;
        subCategory?: string;
        /** Extra lenses beyond the one category — a bale-bucking entry is
         * `exercise` (what the balance board weighs) tagged "farm work"
         * (what tag rollups slice by). Empty arrays normalize to absent. */
        tags?: string[];
        itemId?: string;
        /** A branching-video check-in: the step (node) this entry documents,
         * so per-step progress links group under their step (ADR-0004).
         * Absent for an ordinary time log. */
        nodeId?: string;
        effectiveDate?: string;
        minutes?: number;
        reps?: number;
        notes?: string;
        link?: string;
      }
    | {
        kind: "log-corrected";
        targetEntryId: string;
        patch: Partial<{
          category: string;
          subCategory: string;
          /** Replaces the whole tag list; `[]` clears it. */
          tags: string[];
          nodeId: string;
          minutes: number;
          reps: number;
          notes: string;
          link: string;
          effectiveDate: string;
        }>;
      }
    | { kind: "event-retracted"; targetEventId: string }
    | { kind: "impression-shown"; itemId: string; date: string }
    | { kind: "bv-node-advanced"; itemId: string; nodeId: string }
  );

/** Deterministic total order: primary `at` (ISO strings sort chronologically),
 * tiebreak `id`. The reducer sorts internally, so it is a function of the
 * event *set* — any permutation folds to the same state. */
export function compareEvents(a: CycleEvent, b: CycleEvent): number {
  if (a.at !== b.at) return a.at < b.at ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}
