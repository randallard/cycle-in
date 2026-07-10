import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { CycleEvent } from "./events";
import { reduce } from "./reduce";
import { doneThisPeriod, isDue, isOverdueForTime, isUpcoming } from "./cadence";
import { minutesByCategory } from "./rollup";
import { selectOptions } from "./select";
import { fromDayKey, seededShuffle, weekKey } from "./time";
import type { Weekday } from "./time";
import type { Cadence, State } from "./types";

// --- event builder: unique ids, strictly increasing timestamps --------------

function builder() {
  let n = 0;
  const base = () => {
    n++;
    return {
      id: `e${String(n).padStart(4, "0")}`,
      at: new Date(Date.UTC(2026, 5, 1) + n * 1000).toISOString(),
      v: 1 as const,
    };
  };
  const events: CycleEvent[] = [];
  const push = (e: CycleEvent) => {
    events.push(e);
    return e;
  };
  return {
    events,
    addItem: (
      id: string,
      category: string,
      cadence: Cadence = { kind: "daily" },
      subCategory?: string
    ) =>
      push({
        ...base(),
        kind: "item-added",
        item: {
          id,
          name: id,
          category,
          cadence,
          ...(subCategory !== undefined ? { subCategory } : {}),
        },
      }),
    done: (itemId: string, effectiveDate: string) =>
      push({ ...base(), kind: "item-done", itemId, effectiveDate }),
    hold: (itemId: string) => push({ ...base(), kind: "item-held", itemId }),
    release: (itemId: string) =>
      push({ ...base(), kind: "item-released", itemId }),
    archive: (itemId: string) =>
      push({ ...base(), kind: "item-archived", itemId }),
    bump: (itemId: string, forDate: string) =>
      push({ ...base(), kind: "priority-bumped", itemId, forDate }),
    dismiss: (itemId: string, date: string) =>
      push({ ...base(), kind: "dismissed-today", itemId, date }),
    cadence: (itemId: string, cadence: Cadence) =>
      push({ ...base(), kind: "cadence-changed", itemId, cadence }),
    log: (
      entryId: string,
      category: string,
      minutes: number,
      effectiveDate: string,
      subCategory?: string
    ) =>
      push({
        ...base(),
        kind: "time-logged",
        entryId,
        category,
        minutes,
        effectiveDate,
        ...(subCategory !== undefined ? { subCategory } : {}),
      }),
    correct: (
      targetEntryId: string,
      patch: { minutes?: number; category?: string }
    ) => push({ ...base(), kind: "log-corrected", targetEntryId, patch }),
    retract: (targetEventId: string) =>
      push({ ...base(), kind: "event-retracted", targetEventId }),
    impression: (itemId: string, date: string) =>
      push({ ...base(), kind: "impression-shown", itemId, date }),
  };
}

// --- reducer -----------------------------------------------------------------

describe("reduce", () => {
  it("applies the basic item lifecycle", () => {
    const b = builder();
    b.addItem("piano", "music", { kind: "monthly" });
    b.hold("piano");
    b.done("piano", "2026-07-08");
    const s = reduce(b.events);
    expect(s.items["piano"]).toMatchObject({
      held: true,
      archived: false,
      lastDoneDay: "2026-07-08",
    });
  });

  it("cadence-changed is the promote/demote verb", () => {
    const b = builder();
    b.addItem("cello", "music", { kind: "daily" });
    b.cadence("cello", { kind: "weekly" });
    expect(reduce(b.events).items["cello"]!.cadence.kind).toBe("weekly");
  });

  it("a retraction undoes its target event", () => {
    const b = builder();
    b.addItem("run", "exercise");
    const done = b.done("run", "2026-07-08");
    b.retract(done.id);
    expect(reduce(b.events).items["run"]!.lastDoneDay).toBeUndefined();
  });

  it("log corrections patch the target entry", () => {
    const b = builder();
    b.log("l1", "drawing", 25, "2026-07-08");
    b.correct("l1", { minutes: 40 });
    const s = reduce(b.events);
    expect(s.logEntries[0]).toMatchObject({ minutes: 40, category: "drawing" });
  });

  it("impressions are deduped per item per day", () => {
    const b = builder();
    b.addItem("x", "c");
    b.impression("x", "2026-07-08");
    b.impression("x", "2026-07-08");
    b.impression("x", "2026-07-09");
    expect(reduce(b.events).impressions).toHaveLength(2);
  });

  it("unknown event kinds are counted, not fatal", () => {
    const b = builder();
    b.addItem("x", "c");
    const alien = {
      id: "zzz",
      at: "2026-07-08T12:00:00.000Z",
      v: 1,
      kind: "from-the-future",
    } as unknown as CycleEvent;
    const s = reduce([...b.events, alien]);
    expect(s.items["x"]).toBeDefined();
    expect(s.unknownEventKinds).toEqual(["from-the-future"]);
  });

  it("PROPERTY: any permutation of the event set reduces to the same state", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 0, max: 200 }), (seed, extra) => {
        const b = builder();
        b.addItem("a", "music", { kind: "daily" });
        b.addItem("b", "exercise", { kind: "weekly" });
        b.done("a", "2026-07-07");
        b.hold("b");
        b.log("l1", "music", 10 + (extra % 50), "2026-07-08");
        const done = b.done("b", "2026-07-08");
        b.bump("a", "2026-07-09");
        if (extra % 2 === 0) b.retract(done.id);
        b.impression("a", "2026-07-08");
        const shuffled = seededShuffle(b.events, seed >>> 0);
        expect(reduce(shuffled)).toEqual(reduce(b.events));
      })
    );
  });

  it("PROPERTY: union with itself (sync echo) changes nothing", () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const b = builder();
        b.addItem("a", "music");
        b.done("a", "2026-07-08");
        b.log("l1", "music", 30, "2026-07-08");
        const doubled = seededShuffle([...b.events, ...b.events], seed >>> 0);
        expect(reduce(doubled)).toEqual(reduce(b.events));
      })
    );
  });
});

// --- cadence (calendar-period semantics, the drift fix) ----------------------

function itemState(cadence: Cadence, lastDoneDay?: string) {
  const b = builder();
  b.addItem("x", "c", cadence);
  if (lastDoneDay !== undefined) b.done("x", lastDoneDay);
  return reduce(b.events).items["x"]!;
}

describe("cadence", () => {
  it("daily done late yesterday is due early today (no elapsed-time drift)", () => {
    const it_ = itemState({ kind: "daily" }, "2026-07-07");
    expect(isDue(it_, new Date(2026, 6, 8, 6, 0))).toBe(true);
  });

  it("daily done today is not due again today", () => {
    const it_ = itemState({ kind: "daily" }, "2026-07-08");
    expect(isDue(it_, new Date(2026, 6, 8, 23, 59))).toBe(false);
  });

  it("weeks start Monday: done Sunday → due Monday; done Monday → covered all week", () => {
    // 2026-07-05 is a Sunday, 2026-07-06 a Monday.
    expect(weekKey(new Date(2026, 6, 5))).not.toBe(weekKey(new Date(2026, 6, 6)));
    const doneSunday = itemState({ kind: "weekly" }, "2026-07-05");
    expect(isDue(doneSunday, new Date(2026, 6, 6, 8, 0))).toBe(true);
    const doneMonday = itemState({ kind: "weekly" }, "2026-07-06");
    expect(isDue(doneMonday, new Date(2026, 6, 12, 23, 0))).toBe(false); // Sunday, same week
  });

  it("PROPERTY: weekKey starts weeks on the configured day, within 6 days back", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date(2000, 0, 1),
          max: new Date(2100, 0, 1),
          noInvalidDate: true,
        }),
        fc.integer({ min: 0, max: 6 }),
        (d, s) => {
          const start = s as Weekday;
          const startDay = fromDayKey(weekKey(d, start));
          expect(startDay.getDay()).toBe(start);
          const localMidnight = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
          );
          const daysBack = Math.round(
            (localMidnight.getTime() - startDay.getTime()) / 86_400_000
          );
          expect(daysBack).toBeGreaterThanOrEqual(0);
          expect(daysBack).toBeLessThanOrEqual(6);
        }
      )
    );
  });

  it("configured Sunday-start weeks: done Sunday covers through Saturday", () => {
    // 2026-07-05 is a Sunday; 2026-07-08 a Wednesday; 2026-07-11 a Saturday.
    const doneSunday = itemState({ kind: "weekly" }, "2026-07-05");
    expect(isDue(doneSunday, new Date(2026, 6, 8, 12, 0))).toBe(true); // Monday weeks
    expect(isDue(doneSunday, new Date(2026, 6, 8, 12, 0), 0)).toBe(false);
    expect(isDue(doneSunday, new Date(2026, 6, 11, 23, 0), 0)).toBe(false);
    expect(isDue(doneSunday, new Date(2026, 6, 12, 8, 0), 0)).toBe(true); // next Sunday
  });

  it("monthly rolls over on the 1st", () => {
    const it_ = itemState({ kind: "monthly" }, "2026-06-30");
    expect(isDue(it_, new Date(2026, 6, 1, 0, 1))).toBe(true);
  });

  it("one-off: due until done once, then never again", () => {
    expect(isDue(itemState({ kind: "one-off" }), new Date())).toBe(true);
    const done = itemState({ kind: "one-off" }, "2026-07-01");
    expect(isDue(done, new Date(2030, 0, 1))).toBe(false);
    expect(doneThisPeriod(done, new Date(2030, 0, 1))).toBe(true);
  });

  it("timed items: upcoming before their time, due + orange after", () => {
    const timed = itemState({ kind: "daily", atTime: { hour: 7, minute: 30 } });
    const before = new Date(2026, 6, 8, 6, 0);
    const after = new Date(2026, 6, 8, 9, 0);
    expect(isDue(timed, before)).toBe(false);
    expect(isUpcoming(timed, before)).toBe(true);
    expect(isOverdueForTime(timed, before)).toBe(false);
    expect(isDue(timed, after)).toBe(true);
    expect(isOverdueForTime(timed, after)).toBe(true);
  });
});

// --- selection ----------------------------------------------------------------

const NOON = new Date(2026, 6, 8, 12, 0);
const TODAY = "2026-07-08";

function fleet(opts: {
  categories: string[];
  perCategory: number;
  logs?: { category: string; minutes: number }[];
  held?: string[];
  archived?: string[];
  dismissed?: string[];
  bumped?: string[];
}): State {
  const b = builder();
  for (const c of opts.categories) {
    for (let i = 0; i < opts.perCategory; i++) {
      b.addItem(`${c}-${String(i)}`, c);
    }
  }
  (opts.logs ?? []).forEach((l, i) =>
    b.log(`log-${String(i)}`, l.category, l.minutes, TODAY)
  );
  for (const id of opts.held ?? []) b.hold(id);
  for (const id of opts.archived ?? []) b.archive(id);
  for (const id of opts.dismissed ?? []) b.dismiss(id, TODAY);
  for (const id of opts.bumped ?? []) b.bump(id, TODAY);
  return reduce(b.events);
}

describe("selectOptions", () => {
  it("PROPERTY: never exceeds maxOptions; archived and dismissed never appear", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 2, max: 4 }),
        (maxOptions, k) => {
          const categories = ["a", "b", "c", "d"].slice(0, k);
          const s = fleet({
            categories,
            perCategory: 6,
            archived: [`${categories[0]!}-0`],
            dismissed: [`${categories[0]!}-1`],
          });
          const out = selectOptions(s, NOON, { maxOptions });
          expect(out.length).toBeLessThanOrEqual(maxOptions);
          const ids = out.map((e) => e.item.id);
          expect(ids).not.toContain(`${categories[0]!}-0`);
          expect(ids).not.toContain(`${categories[0]!}-1`);
          expect(new Set(ids).size).toBe(ids.length); // no duplicates
        }
      )
    );
  });

  it("held items are always present, even when done this period", () => {
    const b = builder();
    b.addItem("pinned", "music");
    b.hold("pinned");
    b.done("pinned", TODAY);
    const out = selectOptions(reduce(b.events), NOON);
    expect(out[0]).toMatchObject({ item: { id: "pinned" }, reason: "held" });
  });

  it("bumped-for-today sorts ahead of ordinary due items", () => {
    const s = fleet({ categories: ["a", "b"], perCategory: 5, bumped: ["b-3"] });
    const out = selectOptions(s, NOON, { maxOptions: 4 });
    expect(out[0]).toMatchObject({ item: { id: "b-3" }, reason: "bumped" });
  });

  it("fresh day (nothing logged): slots split evenly across categories", () => {
    const s = fleet({ categories: ["a", "b"], perCategory: 10 });
    const out = selectOptions(s, NOON, { maxOptions: 10 });
    const counts = new Map<string, number>();
    for (const e of out) {
      counts.set(e.item.category, (counts.get(e.item.category) ?? 0) + 1);
    }
    expect(counts.get("a")).toBe(5);
    expect(counts.get("b")).toBe(5);
  });

  it("PROPERTY: logging more time in a category never gains it slots", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 180 }), (minutes) => {
        const base = fleet({ categories: ["a", "b", "c"], perCategory: 10 });
        const logged = fleet({
          categories: ["a", "b", "c"],
          perCategory: 10,
          logs: [{ category: "a", minutes }],
        });
        const count = (s: State) =>
          selectOptions(s, NOON, { maxOptions: 9 }).filter(
            (e) => e.item.category === "a"
          ).length;
        expect(count(logged)).toBeLessThanOrEqual(count(base));
      })
    );
  });

  it("PROPERTY: deterministic for a given day — repeated calls agree", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (maxOptions) => {
        const s = fleet({ categories: ["a", "b", "c"], perCategory: 8 });
        const one = selectOptions(s, NOON, { maxOptions });
        const two = selectOptions(s, NOON, { maxOptions });
        expect(two).toEqual(one);
      })
    );
  });

  it("backfills with upcoming items marked early when the list runs short", () => {
    const b = builder();
    b.addItem("done-today", "music");
    b.done("done-today", TODAY);
    b.addItem("evening", "music", { kind: "daily", atTime: { hour: 21, minute: 0 } });
    const out = selectOptions(reduce(b.events), NOON);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ item: { id: "evening" }, reason: "early" });
  });

  it("honors weekStartsOn: weekly item done Sunday stays off the list all week", () => {
    const b = builder();
    b.addItem("laundry", "home", { kind: "weekly" });
    b.done("laundry", "2026-07-05"); // Sunday
    const s = reduce(b.events);
    const wednesday = new Date(2026, 6, 8, 12, 0);
    expect(
      selectOptions(s, wednesday).map((e) => e.item.id)
    ).toContain("laundry"); // Monday weeks: new week began, due again
    expect(
      selectOptions(s, wednesday, { weekStartsOn: 0 }).map((e) => e.item.id)
    ).not.toContain("laundry"); // Sunday weeks: still covered
  });

  it("focusCategory filters to a single category", () => {
    const s = fleet({ categories: ["a", "b"], perCategory: 5 });
    const out = selectOptions(s, NOON, { maxOptions: 10 }, "b");
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((e) => e.item.category === "b")).toBe(true);
  });
});

// --- rollups -------------------------------------------------------------------

describe("rollups", () => {
  it("PROPERTY: category totals sum to the grand total (day period)", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            category: fc.constantFrom("music", "drawing", "exercise"),
            minutes: fc.integer({ min: 0, max: 120 }),
          }),
          { maxLength: 30 }
        ),
        (logs) => {
          const s = fleet({ categories: ["music"], perCategory: 1, logs });
          const byCat = minutesByCategory(s.logEntries, "day", NOON);
          const sum = Object.values(byCat).reduce((a, b) => a + b, 0);
          const total = logs.reduce((a, l) => a + l.minutes, 0);
          expect(sum).toBe(total);
        }
      )
    );
  });

  it("weeks split on Monday for rollups too", () => {
    const b = builder();
    b.log("sun", "music", 30, "2026-07-05"); // Sunday — prior week
    b.log("mon", "music", 45, "2026-07-06"); // Monday — this week
    const s = reduce(b.events);
    const thisWeek = minutesByCategory(s.logEntries, "week", new Date(2026, 6, 8));
    expect(thisWeek["music"]).toBe(45);
  });
});
