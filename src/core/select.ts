import { isDue, isOverdueForTime, isUpcoming } from "./cadence";
import { minutesByCategory, minutesBySubCategory } from "./rollup";
import { dayKey, hashString, seededShuffle } from "./time";
import type { ItemState, State } from "./types";

export interface SelectConfig {
  /** Maximum entries on the choices list (Ryan: config value, default 10). */
  maxOptions: number;
}

export const DEFAULT_CONFIG: SelectConfig = { maxOptions: 10 };

export type SelectionReason =
  | "held"
  | "bumped"
  | "due-timed"
  | "due"
  | "early";

export interface SelectionEntry {
  item: ItemState;
  reason: SelectionReason;
  /** Render orange: optimal time already passed today, not done yet. */
  orange: boolean;
}

/**
 * The "next N" choices list (ADR-0003). Pure and deterministic for a given
 * (state, calendar day, config): randomness is seeded by the day, so the list
 * is stable across refreshes and varies day to day.
 *
 * Precedence: held → bumped-for-today → timed-and-due (orange) → untimed due,
 * allocated across categories by inverse attention (even split on a fresh
 * day, weighted toward less-logged categories as the day accrues; within a
 * category, least-logged sub-category first, then day-seeded shuffle) →
 * "early" backfill from upcoming items if slots remain. Archived and
 * dismissed-today items never appear. Pass `focusCategory` for the
 * single-category view.
 */
export function selectOptions(
  state: State,
  now: Date,
  config: SelectConfig = DEFAULT_CONFIG,
  focusCategory?: string
): SelectionEntry[] {
  const today = dayKey(now);
  const dismissedToday = new Set(
    state.dismissals.filter((d) => d.date === today).map((d) => d.itemId)
  );
  const bumpedToday = new Set(
    state.bumps.filter((b) => b.forDate === today).map((b) => b.itemId)
  );

  const visible = Object.values(state.items).filter(
    (it) =>
      !it.archived &&
      !dismissedToday.has(it.id) &&
      (focusCategory === undefined || it.category === focusCategory)
  );

  const out: SelectionEntry[] = [];
  const taken = new Set<string>();
  const push = (item: ItemState, reason: SelectionReason) => {
    if (taken.has(item.id) || out.length >= config.maxOptions) return;
    taken.add(item.id);
    out.push({ item, reason, orange: isOverdueForTime(item, now) });
  };

  // 1. Held — always present, regardless of cadence.
  for (const it of sortStable(visible.filter((it) => it.held))) {
    push(it, "held");
  }

  // 2. Bumped for today (one-shot; expires with the day).
  for (const it of sortStable(
    visible.filter((it) => bumpedToday.has(it.id) && isDue(it, now))
  )) {
    push(it, "bumped");
  }

  // 3. Timed items whose time has passed (due-at-time semantics).
  for (const it of sortStable(
    visible.filter(
      (it) =>
        !it.held && it.cadence.atTime !== undefined && isDue(it, now)
    )
  )) {
    push(it, "due-timed");
  }

  // 4. Untimed due items, category-balanced by inverse attention.
  const pool = visible.filter(
    (it) =>
      !taken.has(it.id) && it.cadence.atTime === undefined && isDue(it, now)
  );
  const slots = config.maxOptions - out.length;
  for (const it of allocateByCategory(pool, slots, state, now, today)) {
    push(it, "due");
  }

  // 5. Backfill with upcoming ("early") items if the list ran short.
  if (out.length < config.maxOptions) {
    const early = visible.filter(
      (it) => !taken.has(it.id) && isUpcoming(it, now)
    );
    const seed = hashString(`${today}|early`);
    for (const it of seededShuffle(sortStable(early), seed)) {
      push(it, "early");
    }
  }

  return out;
}

/** Stable base order (by id) so seeded shuffles are reproducible. */
function sortStable(items: ItemState[]): ItemState[] {
  return [...items].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Split `slots` across the pool's categories by inverse attention: weight =
 * 1 + (max minutes logged today across categories) − (this category's
 * minutes today). All-zero day → equal weights → even split (largest-
 * remainder keeps counts within 1). Logging more in a category never gains
 * it slots (monotone). Within a category: least-logged sub-category today
 * first, then a day-seeded shuffle among ties.
 */
function allocateByCategory(
  pool: ItemState[],
  slots: number,
  state: State,
  now: Date,
  today: string
): ItemState[] {
  if (slots <= 0 || pool.length === 0) return [];

  const byCategory = new Map<string, ItemState[]>();
  for (const it of pool) {
    const list = byCategory.get(it.category);
    if (list) list.push(it);
    else byCategory.set(it.category, [it]);
  }
  const categories = [...byCategory.keys()].sort();

  const catMinutes = minutesByCategory(state.logEntries, "day", now);
  const maxLogged = Math.max(0, ...categories.map((c) => catMinutes[c] ?? 0));
  const weights = categories.map(
    (c) => 1 + maxLogged - (catMinutes[c] ?? 0)
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  // Largest-remainder allocation, capped by each category's pool size.
  const exact = weights.map((w) => (slots * w) / totalWeight);
  const counts = exact.map((x) => Math.floor(x));
  let remaining = slots - counts.reduce((a, b) => a + b, 0);
  const order = categories
    .map((_, i) => i)
    .sort((a, b) => (exact[b] ?? 0) - Math.floor(exact[b] ?? 0) - ((exact[a] ?? 0) - Math.floor(exact[a] ?? 0)));
  for (const i of order) {
    if (remaining <= 0) break;
    counts[i] = (counts[i] ?? 0) + 1;
    remaining--;
  }

  // Order each category's items: least-logged sub-category first, then a
  // day-seeded shuffle (stable within the day, different tomorrow).
  const subMinutes = minutesBySubCategory(state.logEntries, "day", now);
  const picked: ItemState[] = [];
  const leftovers: ItemState[] = [];
  categories.forEach((cat, i) => {
    const items = byCategory.get(cat) ?? [];
    const seed = hashString(`${today}|${cat}`);
    const ordered = seededShuffle(sortStable(items), seed).sort((a, b) => {
      const ka =
        a.subCategory !== undefined ? `${cat}/${a.subCategory}` : cat;
      const kb =
        b.subCategory !== undefined ? `${cat}/${b.subCategory}` : cat;
      return (subMinutes[ka] ?? 0) - (subMinutes[kb] ?? 0);
    });
    const n = Math.min(counts[i] ?? 0, ordered.length);
    picked.push(...ordered.slice(0, n));
    leftovers.push(...ordered.slice(n));
  });

  // Spill unused capacity (small categories) to remaining due items.
  const spillSeed = hashString(`${today}|spill`);
  for (const it of seededShuffle(leftovers, spillSeed)) {
    if (picked.length >= slots) break;
    picked.push(it);
  }
  return picked.slice(0, slots);
}
