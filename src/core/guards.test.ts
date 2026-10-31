import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { PERIODS, isPeriod } from "./rollup";
import type { Period } from "./rollup";
import { CADENCE_KINDS, isCadenceKind } from "./types";
import type { Cadence } from "./types";

// A Record over the union type fails to compile if a member is missing, so these pin each list
// to its type: add a cadence kind or a period and these won't build until the list has it too.
const EVERY_CADENCE_KIND: Record<Cadence["kind"], true> = {
  daily: true,
  weekly: true,
  monthly: true,
  "one-off": true,
};
const EVERY_PERIOD: Record<Period, true> = { day: true, week: true, month: true, year: true };

const candidate = fc.oneof(
  fc.string(),
  fc.constantFrom(...CADENCE_KINDS, ...PERIODS, "Daily", " daily", "one off", "")
);

describe("the guards that replace form/DOM casts", () => {
  it("each list is exactly its type's members", () => {
    expect([...CADENCE_KINDS].sort()).toEqual(Object.keys(EVERY_CADENCE_KIND).sort());
    expect([...PERIODS].sort()).toEqual(Object.keys(EVERY_PERIOD).sort());
  });

  it("PROPERTY: isCadenceKind accepts exactly the listed kinds, case and spacing included", () => {
    fc.assert(
      fc.property(candidate, (s) => {
        expect(isCadenceKind(s)).toBe(Object.hasOwn(EVERY_CADENCE_KIND, s));
      })
    );
  });

  it("PROPERTY: isPeriod accepts exactly the listed periods", () => {
    fc.assert(
      fc.property(candidate, (s) => {
        expect(isPeriod(s)).toBe(Object.hasOwn(EVERY_PERIOD, s));
      })
    );
  });
});
