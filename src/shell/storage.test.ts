import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { CycleEvent } from "../core/events";
import { reduce } from "../core/reduce";
import { createInMemoryStore, openIndexedDbStore } from "./storage";

let dbCount = 0;
/** Fresh DB per test — fake-indexeddb keeps state for the process lifetime. */
function freshName(): string {
  dbCount++;
  return `cycle-in-test-${String(dbCount)}`;
}

function sampleEvents(): CycleEvent[] {
  return [
    {
      id: "e1",
      at: "2026-07-10T08:00:00.000Z",
      v: 1,
      kind: "item-added",
      item: {
        id: "piano",
        name: "Piano",
        category: "music",
        cadence: { kind: "weekly" },
      },
    },
    {
      id: "e2",
      at: "2026-07-10T08:01:00.000Z",
      v: 1,
      kind: "item-done",
      itemId: "piano",
      effectiveDate: "2026-07-10",
    },
    {
      id: "e3",
      at: "2026-07-10T08:02:00.000Z",
      v: 1,
      kind: "time-logged",
      entryId: "l1",
      category: "music",
      minutes: 30,
      effectiveDate: "2026-07-10",
    },
  ];
}

describe("openIndexedDbStore", () => {
  it("round-trips events: what was appended reduces identically", async () => {
    const store = await openIndexedDbStore(freshName());
    for (const e of sampleEvents()) await store.append(e);
    expect(reduce(await store.all())).toEqual(reduce(sampleEvents()));
  });

  it("append is idempotent by event id (sync-echo safe)", async () => {
    const store = await openIndexedDbStore(freshName());
    for (const e of sampleEvents()) await store.append(e);
    for (const e of sampleEvents()) await store.append(e); // replay
    expect(await store.all()).toHaveLength(sampleEvents().length);
  });

  it("persists across re-open of the same database", async () => {
    const name = freshName();
    const first = await openIndexedDbStore(name);
    for (const e of sampleEvents()) await first.append(e);
    const second = await openIndexedDbStore(name);
    expect((await second.all()).length).toBe(sampleEvents().length);
  });

  it("matches the in-memory store's contract exactly", async () => {
    const idb = await openIndexedDbStore(freshName());
    const mem = createInMemoryStore();
    for (const e of sampleEvents()) {
      await idb.append(e);
      await mem.append(e);
    }
    const byId = (a: CycleEvent, b: CycleEvent) => a.id.localeCompare(b.id);
    expect([...(await idb.all())].sort(byId)).toEqual(
      [...(await mem.all())].sort(byId)
    );
  });
});
