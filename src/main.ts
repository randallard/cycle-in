import type { CycleEvent } from "./core/events";
import { reduce } from "./core/reduce";
import { minutesByCategory } from "./core/rollup";
import { selectOptions } from "./core/select";
import { dayKey } from "./core/time";
import { createInMemoryStore } from "./shell/storage";

// Demo data, exercising the ADR-0003 pipeline end-to-end: events → reducer →
// selection + rollups. Replaced by the real event store once sync is decided.
const store = createInMemoryStore();
const now = new Date();
const today = dayKey(now);

/** Omit distributed over the event union (plain Omit collapses a union to its
 * common properties, losing every kind-specific payload). */
type EventInput = CycleEvent extends infer E
  ? E extends CycleEvent
    ? Omit<E, "id" | "at" | "v">
    : never
  : never;

let n = 0;
const ev = (e: EventInput): CycleEvent => {
  n++;
  return {
    ...e,
    id: `demo-${String(n)}`,
    at: new Date(Date.now() + n).toISOString(),
    v: 1,
  };
};

const demo: EventInput[] = [
  { kind: "item-added", item: { id: "piano", name: "Piano", category: "music", subCategory: "piano", cadence: { kind: "monthly" } } },
  { kind: "item-added", item: { id: "cello", name: "Cello", category: "music", subCategory: "cello", cadence: { kind: "daily" } } },
  { kind: "item-added", item: { id: "sketch", name: "Sketch practice", category: "drawing", cadence: { kind: "weekly" } } },
  { kind: "item-added", item: { id: "run", name: "Run", category: "exercise", cadence: { kind: "daily", atTime: { hour: 7, minute: 0 } } } },
  { kind: "time-logged", entryId: "l1", category: "music", subCategory: "cello", minutes: 25, effectiveDate: today },
];
for (const e of demo) store.append(ev(e));

const state = reduce(store.all());
const options = selectOptions(state, now);
const attention = minutesByCategory(state.logEntries, "day", now);

const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  const list = options
    .map((o) => {
      const style = o.orange ? ' style="color: darkorange"' : "";
      const tag = o.reason === "due" ? "" : ` <small>(${o.reason})</small>`;
      return `<li${style}>${o.item.name} — ${o.item.category}${tag}</li>`;
    })
    .join("");
  const rollup = Object.entries(attention)
    .map(([c, m]) => `<li>${c}: ${String(m)} min today</li>`)
    .join("");
  app.innerHTML = `
    <h1>cycle-in</h1>
    <p>Event-log core demo (ADR-0003) — data layer still stubbed, see
    <code>docs/PROGRESS.md</code>.</p>
    <h2>Options right now</h2>
    <ul>${list}</ul>
    <h2>Attention today</h2>
    <ul>${rollup}</ul>
  `;
}
