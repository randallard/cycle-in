import type { LogEntryState } from "./types";
import type { Weekday } from "./time";
import { dayKey, fromDayKey, monthKey, weekKey, yearKey } from "./time";

export type Period = "day" | "week" | "month" | "year";

/** The bucket key of the period containing `d` — comparable for equality
 * only (keys of different periods have different shapes). */
export function periodKey(
  period: Period,
  d: Date,
  weekStartsOn: Weekday = 1
): string {
  switch (period) {
    case "day":
      return dayKey(d);
    case "week":
      return weekKey(d, weekStartsOn);
    case "month":
      return monthKey(d);
    case "year":
      return yearKey(d);
  }
}

/** Local-midnight start of the period containing `d`. */
export function periodStart(
  period: Period,
  d: Date,
  weekStartsOn: Weekday = 1
): Date {
  switch (period) {
    case "day":
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    case "week":
      return fromDayKey(weekKey(d, weekStartsOn));
    case "month":
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case "year":
      return new Date(d.getFullYear(), 0, 1);
  }
}

/** Starts of the last `count` periods, oldest first, ending with the period
 * containing `now` — the x-axis of a history chart. */
export function periodStarts(
  period: Period,
  count: number,
  now: Date,
  weekStartsOn: Weekday = 1
): Date[] {
  const out: Date[] = [];
  const d = periodStart(period, now, weekStartsOn);
  for (let i = 0; i < count; i++) {
    out.unshift(new Date(d));
    switch (period) {
      case "day":
        d.setDate(d.getDate() - 1);
        break;
      case "week":
        d.setDate(d.getDate() - 7);
        break;
      case "month":
        d.setMonth(d.getMonth() - 1);
        break;
      case "year":
        d.setFullYear(d.getFullYear() - 1);
        break;
    }
  }
  return out;
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
  const key = periodKey(period, now, weekStartsOn);
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (periodKey(period, fromDayKey(e.effectiveDay), weekStartsOn) !== key)
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
  const key = periodKey(period, now, weekStartsOn);
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (periodKey(period, fromDayKey(e.effectiveDay), weekStartsOn) !== key)
      continue;
    const k =
      e.subCategory !== undefined
        ? `${e.category}/${e.subCategory}`
        : e.category;
    out[k] = (out[k] ?? 0) + (e.minutes ?? 0);
  }
  return out;
}

/** Minutes per tag within the period containing `now`. Tags are lenses on
 * top of the one category, so an entry counts toward each of its tags and
 * tag totals may overlap each other and the category totals. */
export function minutesByTag(
  entries: readonly LogEntryState[],
  period: Period,
  now: Date,
  weekStartsOn: Weekday = 1
): Record<string, number> {
  const key = periodKey(period, now, weekStartsOn);
  const out: Record<string, number> = {};
  for (const e of entries) {
    if (periodKey(period, fromDayKey(e.effectiveDay), weekStartsOn) !== key)
      continue;
    for (const t of e.tags ?? []) out[t] = (out[t] ?? 0) + (e.minutes ?? 0);
  }
  return out;
}

/** One period of a history series: its key, its local start, and minutes per
 * group within it. */
export interface PeriodBucket {
  key: string;
  start: Date;
  minutes: Record<string, number>;
}

/** Minutes per group for each of the last `count` periods (oldest first) —
 * the history chart's data. `groupBy` names an entry's series, or returns
 * undefined to exclude it, so one call both filters and groups: by category
 * (the default), by sub-category within one category, or by category among
 * entries carrying one tag. */
export function minutesSeries(
  entries: readonly LogEntryState[],
  period: Period,
  count: number,
  now: Date,
  groupBy: (e: LogEntryState) => string | undefined = (e) => e.category,
  weekStartsOn: Weekday = 1
): PeriodBucket[] {
  const starts = periodStarts(period, count, now, weekStartsOn);
  const buckets: PeriodBucket[] = starts.map((start) => ({
    key: periodKey(period, start, weekStartsOn),
    start,
    minutes: {},
  }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const e of entries) {
    const b = byKey.get(
      periodKey(period, fromDayKey(e.effectiveDay), weekStartsOn)
    );
    if (b === undefined) continue;
    const group = groupBy(e);
    if (group === undefined) continue;
    b.minutes[group] = (b.minutes[group] ?? 0) + (e.minutes ?? 0);
  }
  return buckets;
}
