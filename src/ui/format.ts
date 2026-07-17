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

/** Stable category hue assignment: alphabetical order onto the validated
 * slots; categories beyond the palette get the neutral ink. */
export function catColor(
  category: string,
  allCategories: readonly string[]
): string {
  const i = allCategories.indexOf(category);
  return i >= 0 && i < 6 ? `var(--cat-${String(i + 1)})` : "var(--ink-3)";
}
