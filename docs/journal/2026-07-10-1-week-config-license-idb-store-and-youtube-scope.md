# 2026-07-10 — week-start config, MIT license, the IndexedDB store, and YouTube scope

Session opened with "check out where we're at": everything from 2026-07-08 was landed and
green (local = fleet = GitHub at `285307a`, CI green, live site 200, 24/24 tests) — but this
checkout had **no GitHub remote**, only the fleet pair (`data`/`data-lan`). Restored it as
`origin` (git@github.com:randallard/cycle-in.git); already in sync, nothing to push.

## Scope additions (Ryan, this session)

- **Fork-and-configure is a goal**: people should be able to fork the repo, set their
  preferences, and start using it easily. Preferences now accumulate in one place,
  `src/core/config.ts` (`CycleConfig`).
- **Terminology convention**: in requirements, "I"/"my" means **the user** ("the user's"),
  not Ryan specifically — set down when the YouTube requirement was stated.
- **YouTube playlists**: the user can hook into specific playlists on their YouTube account;
  a **"Planning" section on the main page** shows, per configured playlist, how many videos
  are **not yet incorporated or set to cycle in**. How a static Pages site reads playlists
  (Data API key for public playlists vs OAuth for private; per-fork key config) is a new
  open question — requirement recorded, design deferred.

## Decisions

- **License: MIT** — chosen by Ryan from MIT / Apache-2.0 / AGPL-3.0 / MPL-2.0 with
  fork-friendliness as the deciding criterion. `LICENSE` added, `package.json` gets
  `"license": "MIT"`, README gets a "Fork it" section.
- **Week start is config, not constant**: `weekStartsOn` (0–6, `Date.getDay()` convention,
  default 1 = Monday per the 2026-07-08 pick) threaded through `weekKey`, the cadence
  predicates, rollups, and `selectOptions`. `SelectConfig` grew into `CycleConfig`
  (config.ts); `selectOptions` takes a `Partial<CycleConfig>` merged over defaults, so
  existing `{ maxOptions }` call sites didn't change.

## Built: the IndexedDB event store (first "next build step")

`src/shell/storage.ts` rewritten per ADR-0003's storage direction: hand-rolled thin wrapper,
no runtime dependency, **append + read-all only, no semantics**. The `EventStore` interface
went async (IndexedDB is). Appends use `put` keyed by event id — idempotent, so replaying a
sync bundle is harmless: union semantics all the way down. The in-memory store keeps the
same async contract (now also deduping by id); `main.ts` seeds its demo events only when the
store is empty, so reloads actually demonstrate persistence.

Testing needed `fake-indexeddb`, vetted per ADR-0002 before install: 6.2.5, published
2025-11-07 (≥30 days), Apache-2.0 (on the CI allowlist), zero dependencies, zero install
scripts. Exact-pinned as a devDependency.

## Verification

31 tests passing (was 24): 3 new week-start tests (a property that `weekKey` lands on the
configured start day within 6 days back, Sunday-start cadence unit cases, and a
`selectOptions({ weekStartsOn: 0 })` case) and 4 store tests (reduce round-trip, idempotent
replay, persistence across re-open, in-memory contract parity). Lint (strictTypeChecked) and
build clean.

Left **uncommitted** for Ryan's local review, per his standing rule — `pnpm dev` should show
the demo persisting across reloads.

*Follow-up: Ryan verified locally ("this runs") and landed as `8bb1a81` (this reference added
per the journal's self-reference convention — an entry can't name its own commit's hash).*
