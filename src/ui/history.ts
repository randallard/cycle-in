import type { Period, PeriodBucket } from "../core/rollup";
import { minutesSeries, periodKey } from "../core/rollup";
import type { Weekday } from "../core/time";
import { fromDayKey } from "../core/time";
import type { LogEntryState, State } from "../core/types";
import { catColor, esc, fmtMin } from "./format";

/** The history view: minutes over the last N days/weeks/months/years as
 * stacked columns, switchable between all categories, one category by
 * sub-category, or one tag by category — plus breakdown panels and the raw
 * entries table (the chart's non-color, non-hover twin). Everything here
 * builds strings from derived state; app.ts owns the DOM and events. */

export const PERIODS: readonly Period[] = ["day", "week", "month", "year"];

const NO_SUB = "(no sub-category)";

const RANGE: Record<Period, { count: number; label: string }> = {
  day: { count: 14, label: "last 14 days" },
  week: { count: 12, label: "last 12 weeks" },
  month: { count: 12, label: "last 12 months" },
  year: { count: 5, label: "last 5 years" },
};

interface TableRow {
  day: string;
  what?: string;
  category: string;
  subCategory?: string;
  tags: readonly string[];
  minutes?: number;
}

export interface HistoryModel {
  period: Period;
  /** "all" | "cat:<category>" | "tag:<tag>" */
  focus: string;
  rangeLabel: string;
  buckets: PeriodBucket[];
  /** Series names in legend/stack order (alphabetical, like the board). */
  names: string[];
  colorOf: (name: string) => string;
  /** Focus-filtered entries within the charted range, for the breakdowns. */
  inRange: LogEntryState[];
  cats: string[];
  tags: string[];
  rows: TableRow[];
  totalEntries: number;
}

export function historyModel(
  state: State,
  cats: readonly string[],
  period: Period,
  focus: string,
  now: Date,
  weekStartsOn: Weekday = 1
): HistoryModel {
  const tags = [
    ...new Set(state.logEntries.flatMap((e) => e.tags ?? [])),
  ].sort();

  let names: string[];
  let colorOf: (name: string) => string;
  let groupBy: (e: LogEntryState) => string | undefined;
  if (focus.startsWith("cat:")) {
    const cat = focus.slice(4);
    names = [
      ...new Set(
        state.logEntries
          .filter((e) => e.category === cat)
          .map((e) => e.subCategory ?? NO_SUB)
      ),
    ].sort();
    const subNames = names;
    colorOf = (n) => catColor(n, subNames);
    groupBy = (e) =>
      e.category === cat ? (e.subCategory ?? NO_SUB) : undefined;
  } else if (focus.startsWith("tag:")) {
    const tag = focus.slice(4);
    names = [...cats];
    colorOf = (n) => catColor(n, cats);
    groupBy = (e) => ((e.tags ?? []).includes(tag) ? e.category : undefined);
  } else {
    names = [...cats];
    colorOf = (n) => catColor(n, cats);
    groupBy = (e) => e.category;
  }

  const { count, label } = RANGE[period];
  const buckets = minutesSeries(
    state.logEntries,
    period,
    count,
    now,
    groupBy,
    weekStartsOn
  );
  const keys = new Set(buckets.map((b) => b.key));
  const inRange = state.logEntries.filter(
    (e) =>
      keys.has(periodKey(period, fromDayKey(e.effectiveDay), weekStartsOn)) &&
      groupBy(e) !== undefined
  );

  const rows = [...inRange]
    .sort((a, b) => (a.effectiveDay < b.effectiveDay ? 1 : -1))
    .slice(0, 15)
    .map((e): TableRow => {
      const itemName =
        e.itemId !== undefined ? state.items[e.itemId]?.name : undefined;
      const what = e.notes ?? itemName;
      return {
        day: e.effectiveDay,
        category: e.category,
        tags: e.tags ?? [],
        ...(what !== undefined ? { what } : {}),
        ...(e.subCategory !== undefined ? { subCategory: e.subCategory } : {}),
        ...(e.minutes !== undefined ? { minutes: e.minutes } : {}),
      };
    });

  return {
    period,
    focus,
    rangeLabel: label,
    buckets,
    names,
    colorOf,
    inRange,
    cats: [...cats],
    tags,
    rows,
    totalEntries: inRange.length,
  };
}

// ── labels ─────────────────────────────────────────────────────────────────

function bucketLabel(period: Period, start: Date, first: boolean): string {
  switch (period) {
    case "day":
    case "week":
      return start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    case "month":
      return first || start.getMonth() === 0
        ? start.toLocaleDateString(undefined, {
            month: "short",
            year: "2-digit",
          })
        : start.toLocaleDateString(undefined, { month: "short" });
    case "year":
      return String(start.getFullYear());
  }
}

function chartTitle(m: HistoryModel): string {
  if (m.focus.startsWith("cat:"))
    return `Minutes logged — ${m.focus.slice(4)}, by sub-category`;
  if (m.focus.startsWith("tag:"))
    return `Minutes logged — tag “${m.focus.slice(4)}”, by category`;
  return "Minutes logged, by category";
}

function rangePhrase(m: HistoryModel): string {
  return `the ${m.rangeLabel}`;
}

function bucketTotal(b: PeriodBucket): number {
  return Object.values(b.minutes).reduce((a, v) => a + v, 0);
}

// ── page sections ──────────────────────────────────────────────────────────

function filtersHtml(m: HistoryModel): string {
  const segs = PERIODS.map(
    (p) =>
      `<button data-action="hist-gran" data-g="${p}" aria-pressed="${String(p === m.period)}">${p.charAt(0).toUpperCase()}${p.slice(1)}</button>`
  ).join("");
  const opt = (value: string, label: string): string =>
    `<option value="${esc(value)}"${value === m.focus ? " selected" : ""}>${esc(label)}</option>`;
  const opts = [
    opt("all", "all categories"),
    ...m.cats.map((c) => opt(`cat:${c}`, `category: ${c}`)),
    ...m.tags.map((t) => opt(`tag:${t}`, `tag: ${t}`)),
  ].join("");
  return `
    <div class="filters" role="group" aria-label="History filters">
      <div class="segctl" role="group" aria-label="Bucket size">${segs}</div>
      <label>show <select id="hist-focus">${opts}</select></label>
      <span class="range">${esc(m.rangeLabel)}</span>
    </div>`;
}

function tilesHtml(m: HistoryModel): string {
  const last = m.buckets.at(-1);
  const prev = m.buckets.at(-2);
  const cur = last !== undefined ? bucketTotal(last) : 0;
  const pre = prev !== undefined ? bucketTotal(prev) : 0;
  const periodName = {
    day: "Today",
    week: "This week",
    month: "This month",
    year: "This year",
  }[m.period];
  const prevName = {
    day: "yesterday",
    week: "last week",
    month: "last month",
    year: "last year",
  }[m.period];
  const diff = cur - pre;
  const totals: Record<string, number> = {};
  for (const b of m.buckets) {
    for (const [k, v] of Object.entries(b.minutes)) totals[k] = (totals[k] ?? 0) + v;
  }
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const topLabel = m.focus.startsWith("cat:") ? "Top sub-category" : "Top category";
  const topBody = top
    ? `<div class="v"><span class="dot" style="background:${m.colorOf(top[0])}"></span>${esc(top[0])}</div>
       <div class="d">${fmtMin(top[1])} in range</div>`
    : `<div class="v">—</div><div class="d">nothing in range</div>`;
  return `
    <div class="tiles">
      <div class="tile">
        <div class="micro">${esc(periodName)}</div>
        <div class="v">${fmtMin(cur)}</div>
        <div class="d">${diff >= 0 ? "+" : "−"}${fmtMin(Math.abs(diff))} vs ${esc(prevName)}</div>
      </div>
      <div class="tile">
        <div class="micro">${esc(topLabel)}</div>
        ${topBody}
      </div>
      <div class="tile">
        <div class="micro">Entries logged</div>
        <div class="v">${String(m.totalEntries)}</div>
        <div class="d">${esc(m.rangeLabel)}</div>
      </div>
    </div>`;
}

function legendHtml(m: HistoryModel): string {
  return m.names
    .map(
      (n) =>
        `<span><span class="dot" style="background:${m.colorOf(n)}"></span>${esc(n)}</span>`
    )
    .join("");
}

function brkBarHtml(width: number, color: string): string {
  return `
    <div class="track"><div class="fill" style="width:${String(width)}%; background:${color}"></div></div>`;
}

function byCategoryHtml(m: HistoryModel): string {
  const catFocus = m.focus.startsWith("cat:");
  const totals = new Map<string, { total: number; subs: Map<string, number> }>();
  for (const e of m.inRange) {
    const key = catFocus ? (e.subCategory ?? NO_SUB) : e.category;
    const row = totals.get(key) ?? { total: 0, subs: new Map<string, number>() };
    row.total += e.minutes ?? 0;
    if (!catFocus) {
      const s = e.subCategory ?? NO_SUB;
      row.subs.set(s, (row.subs.get(s) ?? 0) + (e.minutes ?? 0));
    }
    totals.set(key, row);
  }
  const rows = [...totals.entries()].sort((a, b) => b[1].total - a[1].total);
  const max = Math.max(...rows.map(([, v]) => v.total), 1);
  const items = rows
    .map(([name, v]) => {
      const subs =
        v.subs.size > 0
          ? `<ul class="subs">${[...v.subs.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(
                ([s, min]) =>
                  `<li><span>${esc(s)}</span><span class="min mono">${fmtMin(min)}</span></li>`
              )
              .join("")}</ul>`
          : "";
      return `
        <li>
          <div class="head">
            <span class="dot" style="background:${m.colorOf(name)}"></span>
            <span class="name">${esc(name)}</span>
            <span class="min mono">${fmtMin(v.total)}</span>
          </div>
          ${brkBarHtml((v.total / max) * 100, m.colorOf(name))}
          ${subs}
        </li>`;
    })
    .join("");
  const cap = catFocus
    ? `Sub-categories of ${esc(m.focus.slice(4))} over ${esc(rangePhrase(m))}.`
    : `Minutes over ${esc(rangePhrase(m))}, with sub-categories underneath.`;
  return `
    <section class="panel" style="border-top-color: var(--ink-3)">
      <h2>By category</h2>
      <p class="cap">${cap}</p>
      <ul class="brk">${items !== "" ? items : "<li>Nothing logged in this range.</li>"}</ul>
    </section>`;
}

function byTagHtml(m: HistoryModel): string {
  const totals = new Map<string, { total: number; count: number }>();
  for (const e of m.inRange) {
    for (const t of e.tags ?? []) {
      const row = totals.get(t) ?? { total: 0, count: 0 };
      row.total += e.minutes ?? 0;
      row.count += 1;
      totals.set(t, row);
    }
  }
  const rows = [...totals.entries()].sort((a, b) => b[1].total - a[1].total);
  const max = Math.max(...rows.map(([, v]) => v.total), 1);
  const items = rows
    .map(
      ([name, v]) => `
        <li>
          <div class="head">
            <span class="chip tag">${esc(name)}</span>
            <span class="min mono">${fmtMin(v.total)} · ${String(v.count)} ${v.count === 1 ? "entry" : "entries"}</span>
          </div>
          ${brkBarHtml((v.total / max) * 100, "var(--ink-3)")}
        </li>`
    )
    .join("");
  return `
    <section class="panel" style="border-top-color: var(--ink-3)">
      <h2>By tag</h2>
      <p class="cap">An entry counts once in its category; tags are extra lenses, so tag
      totals can overlap each other and the category totals.</p>
      <ul class="brk">${items !== "" ? items : "<li>No tagged entries in this range.</li>"}</ul>
    </section>`;
}

function tableHtml(m: HistoryModel): string {
  const rows = m.rows
    .map((r) => {
      const d = fromDayKey(r.day);
      const dateStr = d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const tags =
        r.tags.length > 0
          ? `<span class="tags">${r.tags.map((t) => `<span class="chip tag">${esc(t)}</span>`).join("")}</span>`
          : "—";
      return `
        <tr>
          <td class="mono">${esc(dateStr)}</td>
          <td>${r.what !== undefined ? `<b>${esc(r.what)}</b>` : "—"}</td>
          <td><span class="dot" style="background:${catColor(r.category, m.cats)}"></span>${esc(r.category)}</td>
          <td>${r.subCategory !== undefined ? esc(r.subCategory) : "—"}</td>
          <td>${tags}</td>
          <td class="min mono">${r.minutes !== undefined ? fmtMin(r.minutes) : "—"}</td>
        </tr>`;
    })
    .join("");
  return `
    <section class="panelbox" aria-label="Log entries">
      <header><h2>Entries</h2><span class="sub">${String(m.rows.length)} most recent of ${String(m.totalEntries)} in range</span></header>
      <div class="tablewrap">
        <table>
          <thead><tr>
            <th>Date</th><th>What</th><th>Category</th><th>Sub-category</th><th>Tags</th><th class="min">Time</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>`;
}

/** The whole page below the top bar. The chart SVG is injected afterward by
 * app.ts into #hist-chart, once the container's width is measurable. */
export function historyHtml(m: HistoryModel): string {
  if (m.cats.length === 0) {
    return `
      <section class="firstrun">
        <h2>No history yet</h2>
        <p>Log time from the board — with a category, an optional sub-category, and
        optional tags — and it shows up here, sliceable by day, week, month, and year.</p>
      </section>`;
  }
  return `
    ${filtersHtml(m)}
    ${tilesHtml(m)}
    <section class="panelbox" aria-label="Time logged">
      <header>
        <h2>${esc(chartTitle(m))}</h2>
        <span class="sub">per ${esc(m.period)}</span>
        <div class="legend">${legendHtml(m)}</div>
      </header>
      <div class="chartwrap">
        <div id="hist-chart"></div>
        <div class="tooltip" id="hist-tip"></div>
      </div>
    </section>
    <div class="panels">
      ${byCategoryHtml(m)}
      ${byTagHtml(m)}
    </div>
    ${tableHtml(m)}`;
}

// ── the chart: stacked columns, SVG ────────────────────────────────────────
// Mark specs: bars ≤24px, 4px rounded cap on the topmost segment (square at
// the baseline), 2px surface gaps between stacked segments, solid hairline
// gridlines, one axis. Tooltips ride pointerover/focus in app.ts.

function niceMax(m: number): number {
  const steps = [
    60, 120, 180, 240, 300, 360, 480, 600, 900, 1200, 1800, 2400, 3600, 4800,
    6000, 9000, 12000, 18000, 24000,
  ];
  for (const s of steps) {
    if (m <= s * 4) return Math.max(s, Math.ceil(m / s) * s);
  }
  return Math.ceil(m / 24000) * 24000;
}

export function chartSvg(m: HistoryModel, width: number): string {
  const W = Math.max(320, width);
  const plotH = 240;
  const axisB = 26;
  const padL = 44;
  const padR = 8;
  const padT = 8;
  const H = padT + plotH + axisB;
  const maxTotal = Math.max(...m.buckets.map(bucketTotal), 1);
  const yMax = niceMax(maxTotal);
  const ticks = 4;
  const y = (min: number): number => padT + plotH - (min / yMax) * plotH;

  const parts: string[] = [];
  for (let i = 0; i <= ticks; i++) {
    const v = (yMax / ticks) * i;
    const yy = y(v);
    parts.push(
      `<line x1="${String(padL)}" x2="${String(W - padR)}" y1="${String(yy)}" y2="${String(yy)}" stroke="var(--line)" stroke-width="1" />`,
      `<text x="${String(padL - 8)}" y="${String(yy + 3.5)}" text-anchor="end" fill="var(--ink-3)" font-size="10" font-family="ui-monospace, Menlo, monospace">${v === 0 ? "0" : fmtMin(v)}</text>`
    );
  }

  const n = m.buckets.length;
  const plotW = W - padL - padR;
  const band = plotW / n;
  const barW = Math.min(24, band * 0.62);
  const GAP = 2;
  const labelEvery = Math.max(1, Math.ceil((n * 60) / plotW));

  m.buckets.forEach((b, i) => {
    const cx = padL + band * i + band / 2;
    const segs = m.names
      .map((name) => ({ name, min: b.minutes[name] ?? 0 }))
      .filter((s) => s.min > 0);
    const total = segs.reduce((a, s) => a + s.min, 0);
    const label = bucketLabel(m.period, b.start, i === 0);
    const aria =
      total === 0
        ? `${label}: nothing logged`
        : `${label}: ${segs.map((s) => `${s.name} ${fmtMin(s.min)}`).join(", ")}`;

    const seg: string[] = [];
    // Stack bottom-up. Each non-top segment gives up GAP px at its own top,
    // so a 2px surface gap separates every adjacent pair while the bottom
    // stays square on the baseline and the top keeps its rounded cap.
    let yTop = y(0);
    segs.forEach((s, si) => {
      const hRaw = (s.min / yMax) * plotH;
      const yy = yTop - hRaw;
      const x0 = cx - barW / 2;
      const isTop = si === segs.length - 1;
      const fill = m.colorOf(s.name);
      if (isTop && hRaw >= 5) {
        const r = 4;
        seg.push(
          `<path class="hseg" fill="${fill}" d="M${String(x0)},${String(yy + hRaw)} L${String(x0)},${String(yy + r)} Q${String(x0)},${String(yy)} ${String(x0 + r)},${String(yy)} L${String(x0 + barW - r)},${String(yy)} Q${String(x0 + barW)},${String(yy)} ${String(x0 + barW)},${String(yy + r)} L${String(x0 + barW)},${String(yy + hRaw)} Z" />`
        );
      } else {
        const h = isTop ? Math.max(1, hRaw) : Math.max(1, hRaw - GAP);
        seg.push(
          `<rect class="hseg" x="${String(x0)}" y="${String(isTop ? yy : yy + GAP)}" width="${String(barW)}" height="${String(h)}" fill="${fill}" />`
        );
      }
      yTop = yy;
    });

    // Hit target: the whole band, full plot height — far bigger than the mark.
    parts.push(
      `<g class="col" tabindex="0" role="img" aria-label="${esc(aria)}" data-i="${String(i)}" data-ax="${String(Math.round(cx))}" data-ay="${String(Math.round(y(total)))}">` +
        `<rect class="hit" x="${String(padL + band * i + 1)}" y="${String(padT)}" width="${String(band - 2)}" height="${String(plotH)}" fill="transparent" />` +
        seg.join("") +
        `</g>`
    );

    if (i % labelEvery === 0) {
      parts.push(
        `<text x="${String(cx)}" y="${String(padT + plotH + 16)}" text-anchor="middle" fill="var(--ink-3)" font-size="10">${esc(label)}</text>`
      );
    }
  });

  parts.push(
    `<line x1="${String(padL)}" x2="${String(W - padR)}" y1="${String(y(0))}" y2="${String(y(0))}" stroke="var(--line)" stroke-width="1" />`
  );

  return `<svg width="${String(W)}" height="${String(H)}" viewBox="0 0 ${String(W)} ${String(H)}" role="img" aria-label="Minutes logged per ${esc(m.period)}, stacked by series">${parts.join("")}</svg>`;
}

/** Tooltip body for bucket `i` — values lead, series names follow, one row
 * per series present plus a total. */
export function tooltipHtml(m: HistoryModel, i: number): string {
  const b = m.buckets[i];
  if (b === undefined) return "";
  const segs = m.names
    .map((name) => ({ name, min: b.minutes[name] ?? 0 }))
    .filter((s) => s.min > 0);
  const rows = [...segs]
    .reverse()
    .map(
      (s) => `
      <div class="row">
        <span class="key" style="background:${m.colorOf(s.name)}"></span>
        <span class="val">${fmtMin(s.min)}</span>
        <span class="name">${esc(s.name)}</span>
      </div>`
    )
    .join("");
  const total =
    segs.length > 1
      ? `<div class="row total"><span class="key"></span><span class="val">${fmtMin(
          segs.reduce((a, s) => a + s.min, 0)
        )}</span><span class="name">total</span></div>`
      : "";
  return `
    <div class="when">${esc(bucketLabel(m.period, b.start, false))}</div>
    ${segs.length === 0 ? `<div class="name">nothing logged</div>` : rows}
    ${total}`;
}
