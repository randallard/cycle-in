import type { CycleEvent } from "./core/events";
import { reduce } from "./core/reduce";
import { minutesByCategory } from "./core/rollup";
import { selectOptions } from "./core/select";
import { dayKey } from "./core/time";
import { createInMemoryStore, openIndexedDbStore } from "./shell/storage";

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

async function main(): Promise<void> {
  // Real IndexedDB store (persists across reloads); in-memory only where
  // IndexedDB doesn't exist. Demo events seed the store on first run only —
  // the real UI replaces this whole block ("Next build steps" in PROGRESS.md).
  const store =
    typeof indexedDB === "undefined"
      ? createInMemoryStore()
      : await openIndexedDbStore();
  if ((await store.all()).length === 0) {
    for (const e of demo) await store.append(ev(e));
  }

  const state = reduce(await store.all());
  const options = selectOptions(state, now);
  const attention = minutesByCategory(state.logEntries, "day", now);

  const app = document.querySelector<HTMLDivElement>("#app");
  if (!app) return;
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
    <p>Event-log core demo (ADR-0003), now persisted in IndexedDB — reloads
    keep the same events. Real UI not built yet; see
    <code>docs/PROGRESS.md</code>.</p>
    <h2>Options right now</h2>
    <ul>${list}</ul>
    <h2>Attention today</h2>
    <ul>${rollup}</ul>
  `;
}

void main();
