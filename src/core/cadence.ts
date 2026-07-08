import type { Item } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const CADENCE_INTERVAL_DAYS: Record<
  Exclude<Item["cadence"]["kind"], "one-off">,
  number
> = {
  daily: 1,
  "daily-at-time": 1,
  weekly: 7,
  monthly: 30,
};

/**
 * Is `item` due to be suggested at `now`?
 *
 * - An archived item is never due.
 * - A held item is always due, regardless of cadence — that's the point of a hold.
 * - A never-done item is always due (nothing to measure elapsed time against yet).
 * - A one-off item is due exactly once: never again after it's been done.
 * - Otherwise, due once its cadence interval has elapsed since `lastDoneAt`.
 */
export function isDue(item: Item, now: Date): boolean {
  if (item.archived) return false;
  if (item.held) return true;
  if (!item.lastDoneAt) return true;
  if (item.cadence.kind === "one-off") return false;

  const intervalDays = CADENCE_INTERVAL_DAYS[item.cadence.kind];
  const elapsedMs = now.getTime() - new Date(item.lastDoneAt).getTime();
  return elapsedMs >= intervalDays * MS_PER_DAY;
}
