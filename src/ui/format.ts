/** Small formatting helpers shared by the board (app.ts) and the history
 * view (history.ts). */

export const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] ?? c
  );

export function fmtMin(total: number): string {
  if (total < 60) return `${String(total)}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h)}h${String(m).padStart(2, "0")}`;
}

/** Seconds → `m:ss` clock, for branching-video segment timestamps. */
export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`;
}

/** Whether a user-supplied link is a web address we're willing to render as a
 * clickable anchor. Callers check this *before* emitting an `<a>`, so an
 * unusable link is shown as inert text rather than a link that goes nowhere. */
export function isWebLink(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Only http(s) URLs are safe to place in an href — blocks `javascript:` and
 * other script-bearing schemes from user-supplied check-in links. Kept as the
 * last line of defence for anything that reaches an href regardless. */
export function safeHref(url: string): string {
  return isWebLink(url) ? url : "#";
}

/** Stable category hue assignment: alphabetical order onto the validated
 * slots; categories beyond the palette get the neutral ink. */
export function catColor(
  category: string,
  allCategories: readonly string[]
): string {
  const i = allCategories.indexOf(category);
  return i >= 0 && i < 6 ? `var(--cat-${String(i + 1)})` : "var(--ink-3)";
}
