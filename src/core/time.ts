/** Calendar helpers, all in the device's local timezone (ADR-0003) — the
 * caller injects `now`, nothing here reads the clock. Day keys are
 * "YYYY-MM-DD" strings, comparable lexicographically. */

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${String(y).padStart(4, "0")}-${m}-${day}`;
}

/** Parse a "YYYY-MM-DD" day key as a local-midnight Date. */
export function fromDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Day of week in `Date.getDay()` convention: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** The day key of the first day of the week containing `d`. The week's start
 * day is a config value so forks can pick their own; the default (Monday) is
 * `DEFAULT_CONFIG.weekStartsOn` in config.ts. */
export function weekKey(d: Date, weekStartsOn: Weekday = 1): string {
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sinceStart = (local.getDay() - weekStartsOn + 7) % 7;
  local.setDate(local.getDate() - sinceStart);
  return dayKey(local);
}

export function monthKey(d: Date): string {
  return dayKey(d).slice(0, 7); // "YYYY-MM"
}

/** Is the local time-of-day of `now` at or past hour:minute? */
export function timeHasPassed(
  now: Date,
  t: { hour: number; minute: number }
): boolean {
  return (
    now.getHours() > t.hour ||
    (now.getHours() === t.hour && now.getMinutes() >= t.minute)
  );
}

// --- deterministic PRNG for day-seeded selection (ADR-0003) -----------------

/** FNV-1a string hash → 32-bit seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — tiny, deterministic, good enough for shuffling a day's list. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher–Yates: same seed + same input order → same output. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rand = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a !== undefined && b !== undefined) {
      out[i] = b;
      out[j] = a;
    }
  }
  return out;
}
