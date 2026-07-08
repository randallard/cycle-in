import type { ItemState } from "./types";
import { dayKey, fromDayKey, monthKey, timeHasPassed, weekKey } from "./time";

/** Has this item been done within the calendar period containing `now`?
 * (ADR-0003: daily = calendar day, weekly = Monday-start week, monthly =
 * calendar month; one-off = ever.) */
export function doneThisPeriod(item: ItemState, now: Date): boolean {
  if (item.lastDoneDay === undefined) return false;
  const last = fromDayKey(item.lastDoneDay);
  switch (item.cadence.kind) {
    case "daily":
      return item.lastDoneDay === dayKey(now);
    case "weekly":
      return weekKey(last) === weekKey(now);
    case "monthly":
      return monthKey(last) === monthKey(now);
    case "one-off":
      return true; // done once = done forever
  }
}

/**
 * Is `item` due at `now`? Strict calendar periods; an optimal time (`atTime`)
 * delays due-ness to that local time on the due day.
 *
 * - Archived → never. Held → always (that's the point of a hold).
 * - Done this period → not due again until the next period.
 * - Otherwise due — except a timed item before its time today, which is
 *   "upcoming" (eligible for early backfill, not yet due).
 */
export function isDue(item: ItemState, now: Date): boolean {
  if (item.archived) return false;
  if (item.held) return true;
  if (doneThisPeriod(item, now)) return false;
  const t = item.cadence.atTime;
  if (t !== undefined && !timeHasPassed(now, t)) return false;
  return true;
}

/** Should the UI render this item orange? True when its optimal time has
 * passed today and it hasn't been done yet (per ADR-0003 / the original spec:
 * orange = "you said this time of day, and it already went by"). */
export function isOverdueForTime(item: ItemState, now: Date): boolean {
  const t = item.cadence.atTime;
  if (t === undefined || item.archived) return false;
  return timeHasPassed(now, t) && !doneThisPeriod(item, now);
}

/** Upcoming = would be due this period but isn't yet (a timed item before its
 * time). Used for the "early" backfill when the due list runs short. */
export function isUpcoming(item: ItemState, now: Date): boolean {
  if (item.archived || item.held) return false;
  if (doneThisPeriod(item, now)) return false;
  const t = item.cadence.atTime;
  return t !== undefined && !timeHasPassed(now, t);
}
