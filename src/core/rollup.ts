import type { LogEntryState } from "./types";
import type { Weekday } from "./time";
import { dayKey, fromDayKey, monthKey, weekKey } from "./time";

export type Period = "day" | "week" | "month";

function periodKeyOf(period: Period, d: Date, weekStartsOn: Weekday): string {
  switch (period) {
    case "day":
      return dayKey(d);
    case "week":
      return weekKey(d, weekStartsOn);
    case "month":
      return monthKey(d);
  }
}

/** Minutes logged per category within the period containing `now` — the
 * "attention" numbers shown on the choices page (ADR-0003). Entries without
 * minutes contribute 0 (they still exist for notes/reps history). */
export function minutesByCategory(
  entries: readonly LogEntryState[],
  period: Period,
  now: Date,
  weekStartsOn: Weekday = 1
): Record<string, number> {
  const key = periodKeyOf(period, now, weekStartsOn);
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (periodKeyOf(period, fromDayKey(e.effectiveDay), weekStartsOn) !== key)
      continue;
    out[e.category] = (out[e.category] ?? 0) + (e.minutes ?? 0);
  }
  return out;
}

/** Same, keyed by "category/subCategory" (entries without a sub-category roll
 * up under the bare category key). */
export function minutesBySubCategory(
  entries: readonly LogEntryState[],
  period: Period,
  now: Date,
  weekStartsOn: Weekday = 1
): Record<string, number> {
  const key = periodKeyOf(period, now, weekStartsOn);
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (periodKeyOf(period, fromDayKey(e.effectiveDay), weekStartsOn) !== key)
      continue;
    const k =
      e.subCategory !== undefined
        ? `${e.category}/${e.subCategory}`
        : e.category;
    out[k] = (out[k] ?? 0) + (e.minutes ?? 0);
  }
  return out;
}
