/** How often an item should come back up. `daily-at-time` additionally carries
 * a preferred hour/minute (used to flag it in orange once that time has
 * passed today, in the UI layer — not this pure module's concern). */
export type Cadence =
  | { kind: "daily" }
  | { kind: "daily-at-time"; hour: number; minute: number }
  | { kind: "weekly" }
  | { kind: "monthly" }
  | { kind: "one-off" };

/** A cyclable thing: a skill, a bookmarked video, a custom reminder. */
export interface Item {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  cadence: Cadence;
  /** Pinned on the list regardless of cadence-due-ness, until released. */
  held: boolean;
  /** Retired — never suggested again (distinct from a normal cadence cycle-off). */
  archived: boolean;
  /** Present only for items sourced from a branching-video bookmark. */
  bvSource?: { slug: string; nodeId: string };
  /** ISO timestamp of the most recent completion, if any. */
  lastDoneAt?: string;
}

/** Time actually spent — independent of whether it's tied to a scheduled Item. */
export interface LogEntry {
  id: string;
  category: string;
  subCategory?: string;
  itemId?: string;
  /** ISO timestamp — a start can exist without a completion yet. */
  startedAt?: string;
  /** ISO timestamp — set once the activity is marked done. */
  completedAt?: string;
  durationMinutes?: number;
  reps?: number;
  notes?: string;
  link?: string;
}

/** A record that `itemId` was suggested at `shownAt`, so a cycled-off item can
 * still be found and retroactively logged even if it was never acted on at
 * the time. */
export interface Impression {
  id: string;
  itemId: string;
  shownAt: string;
  acted: boolean;
}
