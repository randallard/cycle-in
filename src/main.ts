import { parseBundle, serializeBundle } from "./core/bundle";
import type { CycleEvent } from "./core/events";
import { reduce } from "./core/reduce";
import { minutesByCategory } from "./core/rollup";
import { selectOptions } from "./core/select";
import { dayKey } from "./core/time";
import type { EventStore } from "./shell/storage";
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

async function render(
  store: EventStore,
  app: HTMLDivElement,
  status = ""
): Promise<void> {
  const events = await store.all();
  const state = reduce(events);
  const options = selectOptions(state, now);
  const attention = minutesByCategory(state.logEntries, "day", now);

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
    <p>Event-log core demo (ADR-0003), persisted in IndexedDB — reloads keep
    the same events. Real UI not built yet; see
    <code>docs/PROGRESS.md</code>.</p>
    <h2>Options right now</h2>
    <ul>${list}</ul>
    <h2>Attention today</h2>
    <ul>${rollup}</ul>
    <h2>Sync</h2>
    <p>
      <button id="export">Export events</button>
      <button id="import">Import bundle…</button>
      <input id="import-file" type="file" accept=".json,application/json" hidden />
      <em id="sync-status">${status}</em>
    </p>
    <p><small>${String(events.length)} events in the log. Export downloads
    them as a JSON bundle; importing a bundle unions by event id, so merging
    devices (or re-importing your own export) can only add, never conflict.
    </small></p>
  `;

  document
    .querySelector<HTMLButtonElement>("#export")
    ?.addEventListener("click", () => {
      const blob = new Blob(
        [serializeBundle(events, new Date().toISOString())],
        { type: "application/json" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cycle-in-events-${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

  const file = document.querySelector<HTMLInputElement>("#import-file");
  document
    .querySelector<HTMLButtonElement>("#import")
    ?.addEventListener("click", () => {
      file?.click();
    });
  file?.addEventListener("change", () => {
    void (async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        const incoming = parseBundle(await f.text());
        const known = new Set(events.map((e) => e.id));
        let added = 0;
        for (const e of incoming) {
          if (!known.has(e.id)) added++;
          await store.append(e); // idempotent by id — replays are harmless
        }
        await render(
          store,
          app,
          `imported ${String(added)} new of ${String(incoming.length)} in bundle`
        );
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        await render(store, app, `import failed: ${reason}`);
      }
    })();
  });
}

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

  const app = document.querySelector<HTMLDivElement>("#app");
  if (app) await render(store, app);
}

void main();
