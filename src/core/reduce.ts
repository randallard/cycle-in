import type { CycleEvent } from "./events";
import { compareEvents } from "./events";
import type { LogEntryState, State } from "./types";
import { emptyState } from "./types";
import { dayKey } from "./time";

/** Fold an event *set* into state (ADR-0003). Deduplicates by event id, sorts
 * by (at, id), applies retractions, then folds — so the result depends only on
 * the set of events, never on arrival order. Unknown kinds are counted and
 * skipped, never an error (an older reducer must not corrupt newer data). */
export function reduce(events: readonly CycleEvent[]): State {
  // Dedupe by id (sync merges are unions; the same event may arrive twice).
  const byId = new Map<string, CycleEvent>();
  for (const e of events) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }

  // Retractions apply to the whole set regardless of relative timestamps —
  // an undo is valid even if a clock skewed it "before" its target.
  const retracted = new Set<string>();
  for (const e of byId.values()) {
    if (e.kind === "event-retracted") retracted.add(e.targetEventId);
  }

  const ordered = [...byId.values()]
    .filter((e) => !retracted.has(e.id) && e.kind !== "event-retracted")
    .sort(compareEvents);

  const state = emptyState();
  const impressionsSeen = new Set<string>();
  const bumpsSeen = new Set<string>();
  const dismissalsSeen = new Set<string>();
  const entriesById = new Map<string, LogEntryState>();
  const unknownKinds = new Set<string>();

  for (const e of ordered) {
    switch (e.kind) {
      case "item-added": {
        const s = e.item;
        // `?? []` also covers a pre-widening bvSource that predates `steps`.
        const firstStep = (s.bvSource?.steps ?? [])[0]?.nodeId;
        state.items[s.id] = {
          id: s.id,
          name: s.name,
          category: s.category,
          cadence: s.cadence,
          held: false,
          archived: false,
          ...(s.subCategory !== undefined ? { subCategory: s.subCategory } : {}),
          ...(s.bvSource !== undefined
            ? {
                bvSource: s.bvSource,
                ...(firstStep !== undefined
                  ? { currentNodeId: firstStep }
                  : {}),
              }
            : {}),
        };
        break;
      }
      case "item-renamed": {
        const it = state.items[e.itemId];
        if (it) it.name = e.name;
        break;
      }
      case "item-recategorized": {
        const it = state.items[e.itemId];
        if (it) {
          it.category = e.category;
          if (e.subCategory !== undefined) it.subCategory = e.subCategory;
          else delete it.subCategory;
        }
        break;
      }
      case "cadence-changed": {
        const it = state.items[e.itemId];
        if (it) it.cadence = e.cadence;
        break;
      }
      case "item-archived": {
        const it = state.items[e.itemId];
        if (it) it.archived = true;
        break;
      }
      case "item-unarchived": {
        const it = state.items[e.itemId];
        if (it) it.archived = false;
        break;
      }
      case "item-held": {
        const it = state.items[e.itemId];
        if (it) it.held = true;
        break;
      }
      case "item-released": {
        const it = state.items[e.itemId];
        if (it) it.held = false;
        break;
      }
      case "item-started": {
        const it = state.items[e.itemId];
        if (it) it.startedAt = e.at;
        break;
      }
      case "item-done": {
        const it = state.items[e.itemId];
        if (it) {
          const day = e.effectiveDate ?? dayKey(new Date(e.at));
          if (it.lastDoneDay === undefined || day > it.lastDoneDay) {
            it.lastDoneDay = day;
          }
          delete it.startedAt; // a done closes any open start
        }
        break;
      }
      case "priority-bumped": {
        const key = `${e.itemId}|${e.forDate}`;
        if (!bumpsSeen.has(key)) {
          bumpsSeen.add(key);
          state.bumps.push({ itemId: e.itemId, forDate: e.forDate });
        }
        break;
      }
      case "dismissed-today": {
        const key = `${e.itemId}|${e.date}`;
        if (!dismissalsSeen.has(key)) {
          dismissalsSeen.add(key);
          state.dismissals.push({ itemId: e.itemId, date: e.date });
        }
        break;
      }
      case "time-logged": {
        const entry: LogEntryState = {
          id: e.entryId,
          category: e.category,
          effectiveDay: e.effectiveDate ?? dayKey(new Date(e.at)),
          ...(e.subCategory !== undefined ? { subCategory: e.subCategory } : {}),
          ...(e.tags !== undefined && e.tags.length > 0 ? { tags: e.tags } : {}),
          ...(e.itemId !== undefined ? { itemId: e.itemId } : {}),
          ...(e.nodeId !== undefined ? { nodeId: e.nodeId } : {}),
          ...(e.minutes !== undefined ? { minutes: e.minutes } : {}),
          ...(e.reps !== undefined ? { reps: e.reps } : {}),
          ...(e.notes !== undefined ? { notes: e.notes } : {}),
          ...(e.link !== undefined ? { link: e.link } : {}),
        };
        entriesById.set(entry.id, entry);
        break;
      }
      case "log-corrected": {
        const entry = entriesById.get(e.targetEntryId);
        if (entry) {
          const p = e.patch;
          if (p.category !== undefined) entry.category = p.category;
          if (p.subCategory !== undefined) entry.subCategory = p.subCategory;
          if (p.tags !== undefined) {
            if (p.tags.length > 0) entry.tags = p.tags;
            else delete entry.tags;
          }
          if (p.nodeId !== undefined) entry.nodeId = p.nodeId;
          if (p.minutes !== undefined) entry.minutes = p.minutes;
          if (p.reps !== undefined) entry.reps = p.reps;
          if (p.notes !== undefined) entry.notes = p.notes;
          if (p.link !== undefined) entry.link = p.link;
          if (p.effectiveDate !== undefined) entry.effectiveDay = p.effectiveDate;
        }
        break;
      }
      case "impression-shown": {
        const key = `${e.itemId}|${e.date}`;
        if (!impressionsSeen.has(key)) {
          impressionsSeen.add(key);
          state.impressions.push({ itemId: e.itemId, date: e.date });
        }
        break;
      }
      case "bv-node-advanced": {
        const it = state.items[e.itemId];
        if (it) it.currentNodeId = e.nodeId;
        break;
      }
      case "event-retracted":
        break; // filtered out above; case kept for switch exhaustiveness
      default: {
        // Statically unreachable for known kinds; a *runtime* event from a
        // newer app version lands here — preserved in the log, skipped here.
        unknownKinds.add((e as { kind: string }).kind);
      }
    }
  }

  state.logEntries = [...entriesById.values()];
  state.unknownEventKinds = [...unknownKinds].sort();
  return state;
}
