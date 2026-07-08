import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { isDue } from "./cadence";
import type { Cadence, Item } from "./types";

const cadenceArb: fc.Arbitrary<Cadence> = fc.oneof(
  fc.constant<Cadence>({ kind: "daily" }),
  fc.record({
    kind: fc.constant("daily-at-time" as const),
    hour: fc.integer({ min: 0, max: 23 }),
    minute: fc.integer({ min: 0, max: 59 }),
  }),
  fc.constant<Cadence>({ kind: "weekly" }),
  fc.constant<Cadence>({ kind: "monthly" }),
  fc.constant<Cadence>({ kind: "one-off" })
);

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "x",
    name: "x",
    category: "x",
    cadence: { kind: "daily" },
    held: false,
    archived: false,
    ...overrides,
  };
}

describe("isDue", () => {
  it("a held item is always due, regardless of cadence or last-done", () => {
    fc.assert(
      fc.property(cadenceArb, fc.boolean(), (cadence, hasLastDone) => {
        const item = makeItem({
          cadence,
          held: true,
          ...(hasLastDone ? { lastDoneAt: new Date().toISOString() } : {}),
        });
        expect(isDue(item, new Date())).toBe(true);
      })
    );
  });

  it("an archived item is never due, even if held", () => {
    fc.assert(
      fc.property(cadenceArb, fc.boolean(), (cadence, held) => {
        const item = makeItem({ cadence, held, archived: true });
        expect(isDue(item, new Date())).toBe(false);
      })
    );
  });

  it("a never-done, non-archived item is always due", () => {
    fc.assert(
      fc.property(cadenceArb, (cadence) => {
        const item = makeItem({ cadence });
        expect(isDue(item, new Date())).toBe(true);
      })
    );
  });

  it("a one-off item is never due again once it's been done", () => {
    fc.assert(
      fc.property(fc.date({ max: new Date(), noInvalidDate: true }), (lastDoneAt) => {
        const item = makeItem({
          cadence: { kind: "one-off" },
          lastDoneAt: lastDoneAt.toISOString(),
        });
        expect(isDue(item, new Date())).toBe(false);
      })
    );
  });
});
