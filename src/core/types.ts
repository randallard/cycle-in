/** Strict calendar-period cadence (ADR-0003): daily = once per calendar day,
 * weekly = once per calendar week (Monday start), monthly = once per calendar
 * month, one-off = until done once. `atTime` (daily only in v1) makes the item
 * due AT that local time rather than at midnight; the UI shows it orange from
 * then until done. */
export interface Cadence {
  kind: "daily" | "weekly" | "monthly" | "one-off";
  atTime?: { hour: number; minute: number };
}

/** Immutable creation-time facts about an item. Everything that changes over
 * time (held/archived/lastDone/cadence...) is derived from events. */
export interface ItemSeed {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  cadence: Cadence;
  /** Present only for items sourced from a branching-video bookmark. */
  bvSource?: { slug: string; nodeId: string };
}

/** Current state of an item, derived by the reducer — never stored directly. */
export interface ItemState {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  cadence: Cadence;
  held: boolean;
  archived: boolean;
  /** Latest effective day ("YYYY-MM-DD") a done was recorded for, if any. */
  lastDoneDay?: string;
  /** ISO timestamp of an explicit start that has no matching done yet. */
  startedAt?: string;
  bvSource?: { slug: string; nodeId: string };
  /** Latest node chosen via "advance to next node" (BV items). */
  currentNodeId?: string;
}

/** Time actually spent — independent of whether it maps to a scheduled item. */
export interface LogEntryState {
  id: string;
  category: string;
  subCategory?: string;
  /** Extra lenses beyond the category (never empty — [] normalizes away). */
  tags?: string[];
  itemId?: string;
  /** Day ("YYYY-MM-DD") the time counts toward (retroactive logging allowed). */
  effectiveDay: string;
  minutes?: number;
  reps?: number;
  notes?: string;
  link?: string;
}

/** Full derived state: the reducer's output, the only thing the UI reads. */
export interface State {
  items: Record<string, ItemState>;
  logEntries: LogEntryState[];
  /** Which items were suggested on which day (deduped per item per day). */
  impressions: { itemId: string; date: string }[];
  /** One-shot priority bumps: item sorts first on `forDate`, then expires. */
  bumps: { itemId: string; forDate: string }[];
  /** "Not today" dismissals: item excluded from selection on `date` only. */
  dismissals: { itemId: string; date: string }[];
  /** Event kinds this reducer version didn't understand (preserved, ignored). */
  unknownEventKinds: string[];
}

export function emptyState(): State {
  return {
    items: {},
    logEntries: [],
    impressions: [],
    bumps: [],
    dismissals: [],
    unknownEventKinds: [],
  };
}
