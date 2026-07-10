import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  BUNDLE_FORMAT,
  BUNDLE_VERSION,
  parseBundle,
  serializeBundle,
  unionEvents,
} from "./bundle";
import type { CycleEvent } from "./events";
import { reduce } from "./reduce";
import { seededShuffle } from "./time";

const EXPORTED_AT = "2026-07-10T12:00:00.000Z";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Arbitrary event sets: unique ids, mixed kinds, including one kind this
 * version of the app doesn't know (bundles from newer versions must import
 * losslessly). */
const eventsArb: fc.Arbitrary<CycleEvent[]> = fc
  .array(
    fc.record({
      shape: fc.integer({ min: 0, max: 3 }),
      day: fc.integer({ min: 1, max: 28 }),
      minutes: fc.integer({ min: 0, max: 120 }),
    }),
    { maxLength: 30 }
  )
  .map((specs) =>
    specs.map((s, i): CycleEvent => {
      const base = {
        id: `e${pad(i)}`,
        at: `2026-07-${pad(s.day)}T10:00:${pad(i % 60)}.000Z`,
        v: 1 as const,
      };
      switch (s.shape) {
        case 0:
          return {
            ...base,
            kind: "item-added",
            item: {
              id: `it${String(i)}`,
              name: `Item ${String(i)}`,
              category: i % 2 === 0 ? "music" : "drawing",
              cadence: { kind: "daily" },
            },
          };
        case 1:
          return {
            ...base,
            kind: "item-done",
            itemId: `it${String(i % 5)}`,
            effectiveDate: `2026-07-${pad(s.day)}`,
          };
        case 2:
          return {
            ...base,
            kind: "time-logged",
            entryId: `l${String(i)}`,
            category: "music",
            minutes: s.minutes,
            effectiveDate: `2026-07-${pad(s.day)}`,
          };
        default:
          return {
            ...base,
            kind: "from-a-newer-version",
            payload: { anything: true },
          } as unknown as CycleEvent;
      }
    })
  );

describe("serializeBundle / parseBundle", () => {
  it("PROPERTY: round-trips — parsed bundle reduces to the same state", () => {
    fc.assert(
      fc.property(eventsArb, (events) => {
        const back = parseBundle(serializeBundle(events, EXPORTED_AT));
        expect(reduce(back)).toEqual(reduce(events));
        expect(back).toEqual(unionEvents(events));
      })
    );
  });

  it("PROPERTY: deterministic — any permutation serializes identically", () => {
    fc.assert(
      fc.property(eventsArb, fc.integer(), (events, seed) => {
        const shuffled = seededShuffle(events, seed >>> 0);
        expect(serializeBundle(shuffled, EXPORTED_AT)).toBe(
          serializeBundle(events, EXPORTED_AT)
        );
      })
    );
  });

  it("carries the envelope fields", () => {
    const parsed = JSON.parse(serializeBundle([], EXPORTED_AT)) as Record<
      string,
      unknown
    >;
    expect(parsed["format"]).toBe(BUNDLE_FORMAT);
    expect(parsed["bundleVersion"]).toBe(BUNDLE_VERSION);
    expect(parsed["exportedAt"]).toBe(EXPORTED_AT);
  });

  it.each([
    ["not JSON at all", "not json {"],
    ["a JSON array", "[]"],
    ["wrong format", '{"format":"other","bundleVersion":1,"events":[]}'],
    [
      "unsupported bundle version",
      `{"format":"${BUNDLE_FORMAT}","bundleVersion":2,"events":[]}`,
    ],
    ["missing events", `{"format":"${BUNDLE_FORMAT}","bundleVersion":1}`],
    [
      "event without id",
      `{"format":"${BUNDLE_FORMAT}","bundleVersion":1,"events":[{"at":"x","kind":"k","v":1}]}`,
    ],
  ])("rejects %s", (_label, text) => {
    expect(() => parseBundle(text)).toThrow();
  });
});

describe("unionEvents", () => {
  it("PROPERTY: two devices merge to the same state in either direction", () => {
    fc.assert(
      fc.property(
        eventsArb,
        fc.integer({ min: 0, max: 30 }),
        fc.integer({ min: 0, max: 30 }),
        (events, cutA, cutB) => {
          // Overlapping halves — shared history plus device-local tails.
          const a = events.slice(0, Math.min(cutA, events.length));
          const b = events.slice(
            Math.min(cutB, events.length, Math.max(0, a.length - 3))
          );
          const merged = reduce(unionEvents(a, b));
          expect(merged).toEqual(reduce(unionEvents(b, a)));
          expect(merged).toEqual(reduce([...a, ...b]));
        }
      )
    );
  });

  it("PROPERTY: importing your own bundle changes nothing (idempotent)", () => {
    fc.assert(
      fc.property(eventsArb, (events) => {
        expect(reduce(unionEvents(events, events))).toEqual(reduce(events));
      })
    );
  });
});
