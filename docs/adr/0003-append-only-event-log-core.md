# ADR-0003: Append-only event log core, calendar-period cadences, category-balanced selection
- Status: Accepted
- Date: 2026-07-08
- Deciders: Ryan

## Context
Three forces converged after scaffolding:

1. **The cross-device sync model is still open** (PROGRESS.md's load-bearing question), and every
   candidate transport (manual bundle, small backend, git-backed) needs a data model that merges
   two devices' histories safely. A mutable-state model makes the transport choice load-bearing;
   an append-only model makes it almost irrelevant.
2. **The UI-flow gap pass** (PROGRESS.md, 2026-07-08) found gaps that are all naturally *events*:
   priority-bump (in the README but missing from the model), "not today" dismissal, log-entry
   corrections/undo, the general promote/demote-cadence flow, and retroactive marking via
   impressions.
3. **`isDue`'s elapsed-time semantics were wrong**: done at 11pm meant not due until 11pm the
   next day, drifting later daily. Ryan confirmed the intent is **strict calendar periods**.

Ryan also specified the selection model concretely (deliberation, 2026-07-08): items declare
strict daily/weekly/monthly cadence at creation with an *optional optimal time* — a timed item
becomes **due at that time** (orange once past); untimed due items fill the remaining list
slots **grouped by category**, split evenly at the start of the day and shifting toward
categories/sub-categories with less time logged today; the list is capped by a **config value
(default 10)**; the choices page shows per-category day/week/month attention inline and offers
a single-category focus view.

## Decision

### Event log
All state changes are immutable events `{ id, at, v: 1, kind, ...payload }`, appended, never
edited. Kinds (v1): `item-added`, `item-renamed`, `item-recategorized`, `cadence-changed` (the
promote/demote verb, first-class), `item-archived`/`item-unarchived`, `item-held`/
`item-released`, `item-started`, `item-done` (optional `effectiveDate` for retroactive
marking), `priority-bumped` (`forDate`, one-shot), `dismissed-today` (`date`), `time-logged`,
`log-corrected` (patch targeting a prior entry), `event-retracted` (undo; targets a prior
event id), `impression-shown` (deduped to once per item per day), `bv-node-advanced`.

A **pure reducer** folds the event set → state (`items`, `logEntries`, `impressions`, `bumps`,
`dismissals`). Events are sorted internally by `(at, id)` before folding, so the reducer is a
function of the event *set* — any permutation or interleaving yields the same state. Unknown
event kinds are **preserved but ignored** (an older app version can't corrupt newer data).
Merging two devices = union of event sets by id. Undo = retraction event, not deletion.

### Cadence semantics (replaces the elapsed-interval `isDue`)
Strict calendar periods: daily = once per calendar day; weekly = once per calendar week,
**Monday start**; monthly = once per calendar month; one-off = until done once. An item with
an optimal time (`atTime`, daily only in v1) becomes due **at** that time rather than at
midnight, and renders orange from then until done. Evaluation uses the device's local
timezone via an injected `now` — no stored timezone.

### Selection (the "next N" list)
Pure function of (state, now, config, day-seed). Config: `maxOptions` (default 10).
Precedence: held items (always present) → items bumped for today → timed items whose time has
passed (orange) → remaining slots filled with untimed due items, allocated across categories
by **inverse attention**: even split when nothing is logged today, weighted toward
less-logged categories as the day accrues (weight = 1 + max-logged-today − category-logged-
today; largest-remainder allocation; monotone: logging more in a category never gains it
slots). Within a category, items are ordered by least-logged sub-category today, then a
**day-seeded shuffle** — deterministic for a given (day, event set), so the list is stable
across refreshes but varies day to day. `dismissed-today` and archived items are excluded;
if slots remain, soonest-upcoming items backfill, explicitly labeled "early" (doing one early
counts as done for its period).

### Rollups
Per-category (and sub-category) minutes for day / ISO-Monday-week / calendar-month, derived
from log entries — displayed on the choices page so neglect is visible before choosing.

### Storage direction (shell, not this ADR's core)
The log will live in **IndexedDB** (hand-rolled thin wrapper, no dependency): at ~30
events/day ≈ 3.6 MB/year of JSON, localStorage's ~5 MB cap is reachable within ~18 months.
The current in-memory stub stays until the sync decision lands; nothing in the core knows or
cares where events are stored.

## Alternatives considered
- **Mutable state + per-field merge on sync** — rejected: makes the sync transport decision
  load-bearing (conflict resolution needed everywhere), loses free undo/retroactivity/audit.
- **Elapsed-interval cadences** (status quo code) — rejected by Ryan: calendar-period is the
  intent; elapsed drifts later every day.
- **Unseeded randomness in selection** — rejected: the list would reshuffle every render and
  the selection function would be untestable as a pure property.
- **Impressions per render** — rejected for log bloat; deduped to once per item per day, which
  still fully serves the "review what I was shown but never marked" flow.

## Consequences
- The sync question (still open) is demoted from architecture-shaping to transport-shopping:
  any mechanism that can union two event sets works, starting with a BV-style manual bundle.
- The reducer and selector are the provable-lite core ADR-0001 promised: flagship properties
  are permutation-invariance of the reducer and the selection invariants (never exceeds
  `maxOptions`; held always present; archived/dismissed never; even category split on a
  fresh day; neglect monotonicity; same-day determinism).
- The log grows forever by design; compaction/snapshotting is deliberately deferred until it
  matters (IndexedDB removes the near-term cap).
- `src/core/types.ts`'s stored-mutable `Item` shape is replaced by derived `ItemState`;
  `Impression.acted` disappears (derived), closing that two-sources-of-truth gap.
