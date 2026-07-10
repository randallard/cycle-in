# 2026-07-10 (later) — export/import event bundle

The second "next build step," straight after the IndexedDB store landed: the BV-style manual
sync. With the append-only log, sync is just union — so the whole feature is a serializer, a
validator, and two buttons.

## What got built

- `src/core/bundle.ts` — the pure core: `serializeBundle` (deduped, sorted by the `(at, id)`
  total order, so exports of the same event set are byte-identical and diff clean; the
  caller injects `exportedAt`, core never reads the clock), `parseBundle` (envelope-deep
  validation with human-readable errors: format tag `cycle-in-events`, `bundleVersion` 1,
  each event needs string `id`/`at`/`kind` and numeric `v` — but kind-specific payloads are
  *not* schema-checked, because a bundle from a newer app version must import losslessly;
  the reducer already tolerates unknown kinds), and `unionEvents` (dedupe by id, first
  occurrence wins — events are immutable, so a duplicate id *is* the same event).
- `src/main.ts` — the demo page grew a Sync section: **Export events** downloads
  `cycle-in-events-YYYY-MM-DD.json`; **Import bundle…** file-picks, parses, appends
  everything (the store's `put`-by-id makes replays harmless), and re-renders with an
  "imported N new of M in bundle" status — or the validation error, inline, no `alert()`.
  The render was refactored into a re-runnable function to support that.

## Verification

42 tests passing (was 31). The 11 new ones, property tests where it matters:
**round-trip** (parse ∘ serialize reduces to the same state), **determinism** (any
permutation of the event set serializes byte-identically), **two-device merge** (overlapping
halves union to the same state in either direction, and equal plain concatenation),
**self-import idempotence** (importing your own bundle changes nothing), a
**newer-version event kind** flowing through the whole pipe losslessly, and six rejection
cases for malformed bundles. Lint (strictTypeChecked) and build clean.

Left **uncommitted** for Ryan's local review — the visible test: export from the dev page,
wipe or don't, re-import, watch the status line say how many events were actually new.

*Follow-up: Ryan verified locally ("imported 0 new of 5") and landed as `d2198c6` (this
reference added per the journal's self-reference convention — an entry can't name its own
commit's hash).*
