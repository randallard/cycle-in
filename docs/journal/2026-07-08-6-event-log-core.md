# 2026-07-08 (night) — the event-log core, designed and built

Ryan: "lets figure 6 out — are there any questions we need to deliberate there?" Worked
through the design space, took defaults where they were obvious (event IDs, retraction-based
undo, impressions deduped per item per day, IndexedDB direction, unknown-kind tolerance), and
put four questions to Ryan. His answers — especially the first — did more than answer:

- **Cadence**: strict calendar periods, set at creation, with an *optional optimal time*; a
  timed item becomes **due at that time** (orange once past). This replaced my
  calendar-vs-elapsed question with a sharper model than either option as posed.
- **Selection**: max options is a **config value (default 10)**; untimed due items fill slots
  **grouped by category** — even split at the start of the day, shifting toward
  categories/sub-categories with less time logged today; per-category day/week/month attention
  shows inline on the choices page; a single-category focus view exists. This settled the
  ranking-precedence open question wholesale.
- **Monday weeks**; **backfill with "early"-labeled upcoming items**; **one-shot bumps**.

One design call made unilaterally (flagged to Ryan in the moment): within-category randomness
is **seeded by the calendar day** — deterministic for a given (day, event set), so the list is
stable across refreshes, varies day to day, and stays a pure, property-testable function.

## What got built

`docs/adr/0003-append-only-event-log-core.md` records the model. Code, all in `src/core/`:

- `events.ts` — the v1 event union (16 kinds incl. `cadence-changed` as the first-class
  promote/demote verb, `priority-bumped`, `dismissed-today`, `log-corrected`,
  `event-retracted`) + the `(at, id)` total order.
- `reduce.ts` — pure reducer: dedupe by id, apply retractions set-wide, sort, fold. Unknown
  kinds preserved-but-counted, never fatal.
- `time.ts` — local-calendar helpers (day/Monday-week/month keys) + FNV-1a/mulberry32
  seeded shuffle, dependency-free.
- `cadence.ts` — rewritten on calendar periods: `isDue`, `isUpcoming`, `isOverdueForTime`
  (the orange predicate). The 11pm-drift bug class is gone.
- `select.ts` — the choices list: held → bumped → timed-due → inverse-attention
  category-balanced fill (largest-remainder; sub-category deficit orders within a category)
  → "early" backfill. `focusCategory` gives the single-category view.
- `rollup.ts` — per-category / per-sub-category minutes for day/week/month.

`types.ts` was rewritten around derived state (`ItemState`, `State`); `Impression.acted` is
gone (derived), closing that two-sources-of-truth gap. The storage stub now stores *events*
(append + read-all only); `main.ts` demos the full pipeline.

## Verification

24 tests, all passing across repeated runs (fresh fast-check seeds each): the flagship
**permutation-invariance** property (any shuffle of the event set — including a doubled
"sync echo" union — reduces to the same state), selection invariants (cap, no archived/
dismissed, held-always-present, exact even split on a fresh day, **monotonicity**: logging
more time in a category never gains it slots, same-day determinism), the calendar-boundary
unit cases (late-Sunday-done → due Monday; month rollover on the 1st; timed items
upcoming→due+orange across their time), and rollup sum/week-boundary properties. Lint
(strictTypeChecked) and build clean; the strict gates caught three real slips on the first
pass (a non-distributive `Omit` over the event union being the interesting one).

Left **uncommitted** for Ryan's local review, per his standing rule — `pnpm dev` shows the
demo page driving the real pipeline.

*Follow-up: reviewed and landed as `83ff04e` (this reference added per the journal's
self-reference convention — an entry can't name its own commit's hash).*
