# Progress & Status

_Last updated: 2026-07-10_

## Status / next

**Status:** Repo scaffolded, pushed, and **confirmed live**: https://randallard.github.io/cycle-in/
(HTTP 200, verified directly with `curl`, not just a green CI checkmark) — Vite + TypeScript
strict + ESLint + Vitest + `fast-check`, a minimal proof-of-life page, CI (build/test/lint, a
supply-chain job, OSV-Scanner, GitHub Pages deploy), and this docs set. Two real CI bugs found
and fixed post-push (OSV-Scanner job permissions; Node 20→22 for pnpm's own engine requirement)
— see the 2026-07-08 (later still) journal entry. Nothing beyond proof-of-life is built yet:
the real data layer is an explicit stub. Low-key personal project
— no deadline, work on it as time allows. Not currently reflected in `work/README.md`'s
"Right now" line (by choice) — see `work/`'s own index instead.

**The core is built ([ADR-0003](adr/0003-append-only-event-log-core.md), reviewed by Ryan and
committed 2026-07-08).** The append-only event log + pure reducer +
calendar-period cadences + category-balanced selection + rollups are implemented in
`src/core/` (`events.ts`, `reduce.ts`, `time.ts`, `cadence.ts`, `select.ts`, `rollup.ts`) with
24 passing tests including the flagship properties (reducer permutation-invariance, selection
monotonicity/determinism/caps). The sync-model question is still open but **demoted** by
ADR-0003: any transport that can union two event sets works, so it no longer blocks anything.

**2026-07-10 session:** the **IndexedDB event store is built** (async `EventStore`, `put`
keyed by event id so appends are idempotent — sync-replay safe; `fake-indexeddb` vetted per
ADR-0002 for tests; demo seeds only an empty store, so persistence is visible across
reloads). **Week start is now a config value** (`weekStartsOn` in `src/core/config.ts`'s
`CycleConfig`, default Monday), threaded through cadences, rollups, and selection. **License
decided: MIT** (Ryan's pick, fork-friendliness the criterion) — `LICENSE` + package.json +
README "Fork it" section. The **GitHub remote was missing from this checkout** (fleet
remotes only) and was restored as `origin`. 31 tests passing. New scope recorded below.

## Scope & requirements (2026-07-10 additions)

- **Fork-and-configure goal**: people can fork this repo, set their preferences, and start
  using it easily. Consequence: user preferences accumulate in `src/core/config.ts`
  (`CycleConfig` — `maxOptions`, `weekStartsOn` so far), never scattered; a friendlier
  settings surface comes with the real UI; MIT license supports this.
- **Terminology convention**: in requirements Ryan states, "I"/"my" means **the user**/"the
  user's" — features are for any user of a fork, not hardcoded to Ryan.
- **YouTube playlist integration**: the user can hook into **specific playlists on their
  YouTube account** as an item source (alongside the BV bundle and custom reminders).
- **"Planning" section on the main page**: shows, per configured YouTube playlist, **how many
  videos are not yet incorporated or set to cycle in** — the backlog view that makes
  un-onboarded material visible. (How a static site reads playlists — Data API key for
  public playlists vs OAuth for private ones, per-fork key config — is an open question
  below.)

**Next build steps, in order:**
- **Export/import event bundle** — the BV-style manual sync that works with any future
  transport; union-by-event-id merge, trivially safe per ADR-0003.
- **The real UI** — the choices page (options list + per-category day/week/month attention +
  category-focus view + done/start/hold/dismiss/bump/log actions), then the item-management
  view, the recent-suggestions review (impressions), and first-run/import. PWA
  manifest/service worker (worklist #5) fits naturally alongside. The **Planning section**
  (YouTube backlog counts, above) is part of the main page.
- **The branching-video integration** — import with category assignment, the onboarding/review
  screen, and "advance to next node" (`bv-node-advanced` events exist; the config-graph parse
  and UI don't yet).
- **YouTube playlist integration** — playlist config, fetch, per-playlist
  not-yet-incorporated counts feeding the Planning section, and importing a video as an item
  (needs the API-access design decision first).

## Provability

**Decided and implemented ([ADR-0001](adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md)):**
strict TypeScript + `fast-check` property tests on the pure core, no Rust/WASM. Validated in
practice, not just in theory: the first property test written (`isDue`, in
`src/core/cadence.test.ts`) immediately caught a real bug on its first real run — not in the
implementation, but in the test's own arbitrary (`fc.date()` can generate an `Invalid Date`
unless `noInvalidDate: true` is set, which threw inside `.toISOString()`). Fixed and confirmed
stable across 5 repeated runs with different random seeds.

## Supply chain

**Decided and implemented ([ADR-0002](adr/0002-npm-supply-chain-discipline.md)):** install
scripts blocked (`.npmrc` + `pnpm-workspace.yaml`'s `allowBuilds`), exact-pinned dependencies
verified against the live registry to be ≥30 days old, `pnpm audit` + OSV-Scanner in CI, a
license allowlist (extended beyond git-redundancy's Rust-crate list after checking real
transitive deps — `Python-2.0`, `BlueOak-1.0.0`, `CC-BY-3.0`, each verified via `pnpm why`), an
SBOM via `anchore/sbom-action` (Syft) after two npm-ecosystem CycloneDX tools both failed in
practice against pnpm, and Renovate configured with a 14-day `minimumReleaseAge` for ongoing
updates. See the ADR for the two dead ends (`@cyclonedx/cyclonedx-npm`, `@cyclonedx/cdxgen`)
and why each was reverted.

## Ranked worklist (2026-07-08 review, easiest → hardest)

From a post-scaffold review session with Ryan; work through in order:

1. ~~**Fleet backup** — `gr create` so cycle-in is redundant on acer+tenx, not GitHub-only.~~
2. **Renovate app install** — Ryan-only (his GitHub account): https://github.com/apps/renovate
   scoped to `cycle-in`. Until then `renovate.json` is inert — no onboarding PR exists, so the
   app is not installed.
3. ~~**Minor code notes**~~ — absorbed by #6: `Impression.acted` no longer exists (derived),
   the 30-day question dissolved into calendar-month semantics.
4. **Privacy constraint** — record that practice data must never land in this public repo
   (rules out naive git-backed sync *here*; a separate private `cycle-in-data` home on the
   fleet is the natural fit). Feeds the sync decision; noted here, full ADR when sync lands.
5. **PWA manifest + service worker** — phone home-screen install + offline shell; watch the
   `/cycle-in/` base path and cache-update strategy.
6. ~~**Event-log data model**~~ — **core implemented 2026-07-08 (evening)** per
   [ADR-0003](adr/0003-append-only-event-log-core.md), after a design deliberation with Ryan
   that settled cadence semantics (strict calendar periods, Monday weeks), due-at-time for
   timed items, the category-balanced selection algorithm (config max, default 10; even split
   on a fresh day shifting toward less-logged categories; day-seeded randomness), one-shot
   bumps, and backfill-with-"early". The IndexedDB event store landed 2026-07-10; remaining
   under this item: the export/import bundle (see "Next build steps").

## UI-flow gaps (2026-07-08 second pass; core-level ones closed by ADR-0003 the same evening)

Found by re-walking the described flow against the docs and the then-current
`src/core/types.ts`. Status after the ADR-0003 core landed:

1. ~~**General promote/demote-cadence flow**~~ — `cadence-changed` is a first-class event;
   the UI verb still needs building, but the model gap is closed.
2. ~~**"Bump priority for tomorrow" missing from the model**~~ — `priority-bumped` event,
   one-shot for `forDate`, expires with the day.
3. ~~**Calendar-day vs 24h-elapsed**~~ — strict calendar periods (daily / Monday-start week /
   calendar month); timed items due *at* their time. The drift is gone; tested.
4. **No item-management view** — still open; UI work ("Next build steps").
5. **Category consistency** — still open; UI work (pick-from-existing + add-new; a
   `category-renamed` event is the eventual rename/merge mechanism).
6. ~~**"Not today"**~~ — `dismissed-today` event; excluded from that day's selection only.
7. ~~**No edit/undo on log entries**~~ — `log-corrected` + `event-retracted` events.
8. **Empty/first-run state** — still open; UI work.

## Open questions (deliberately unresolved)

- **YouTube playlist access from a static site** (new 2026-07-10) — the Data API can read
  *public* playlists with just an API key (which is per-fork config and visible client-side —
  quota abuse is the risk to think through), but *private* playlists need OAuth. Decide the
  v1 shape (public-playlists-only with an API key is the simplest honest start) when the
  YouTube build step comes up.
- **Cross-device sync model** — still open but **demoted by ADR-0003**: any transport that
  can union two event sets works; the privacy constraint (worklist #4) rules out naive
  git-backed sync in this public repo.
- **Category-coverage view** — Ryan settled the main-page part (per-category day/week/month
  attention shows inline on the choices page, plus a category-focus view); whether a separate
  richer dashboard is also wanted stays open.
- ~~**Ranking precedence**~~ — settled by Ryan 2026-07-08: held → bumped-for-today →
  timed-and-due → category-balanced untimed due (inverse attention) → "early" backfill. See
  ADR-0003.
- **Archiving vs. cycling off** — model distinguishes them (`item-archived` vs a normal
  period rollover); UI still needs to expose both verbs distinctly.
- **Socket.dev or equivalent** — flagged in ADR-0002 as a real gap (catching an in-progress
  compromise, not just a disclosed CVE); not wired in this round.

## Log

### 2026-07-10 — week-start config, MIT license, IndexedDB store, YouTube scope

Restored the missing GitHub remote (`origin`) in this checkout — fleet remotes only until
now, though GitHub was already at the same commit. Made the week's start day a config value
(`CycleConfig.weekStartsOn`, default Monday), decided MIT (Ryan's pick), built the IndexedDB
event store (first "next build step" — async, idempotent-by-event-id appends,
`fake-indexeddb` vetted per ADR-0002 for its tests), and recorded the new scope: the
fork-and-configure goal, the "I = the user" terminology convention, YouTube playlist
integration, and the main-page Planning section (per-playlist not-yet-incorporated counts).
31 tests passing. Full detail:
[`journal/2026-07-10-1-week-config-license-idb-store-and-youtube-scope.md`](journal/2026-07-10-1-week-config-license-idb-store-and-youtube-scope.md).

### 2026-07-08 (later still) — pushed, CI fixed, confirmed live

First push (`69b87ba`) failed before any job ran — GitHub's validation error, fetched directly
rather than guessed: the OSV-Scanner reusable-workflow job needs `actions: read` +
`security-events: write`, which the workflow's top-level `permissions: contents: read` denied
by default once set at all. Fixed in `b0d7bc5`. Next run got further but `build + test` and
`supply-chain` both failed at Node setup: pnpm 11.5.3 requires Node ≥22.13, workflow had 20
pinned — invisible locally since this machine runs Node 24. Fixed in `01b69af` (workflow →
Node 22, `package.json`'s `engines.node` corrected to match reality). Also enabled GitHub Pages
itself via the API (`build_type: workflow`) since it had never been turned on for this repo.
Third push: all four jobs green. Confirmed the site is actually reachable, not just that the
deploy step reported success — `curl`'d the live URL and its JS bundle directly (both HTTP
200). Full detail: [`journal/2026-07-08-4-ci-fixes-and-live-verification.md`](journal/2026-07-08-4-ci-fixes-and-live-verification.md).

### 2026-07-08 (scaffolding session) — repo stood up, verified, and documented

Ryan created the empty public GitHub repo (`git@github.com:randallard/cycle-in.git`, `main`
default) and asked to get it squared away to start working. Scoped to **structure only, data
layer stubbed** (the sync decision stays open) and **plain TS + vanilla DOM, no framework**.

Built: Vite + TS strict + ESLint (`typescript-eslint` `strictTypeChecked`) + Vitest +
`fast-check`, wired per ADR-0001. Hit and resolved a real supply-chain snag along the way (see
ADR-0002): `@cyclonedx/cyclonedx-npm` failed outright under pnpm's `node_modules` layout;
its replacement `@cyclonedx/cdxgen` turned out to need a native binary + a Java component that
timed out downloading; settled on `anchore/sbom-action` (Syft) instead, which needs no npm
devDependency at all. Both dead ends were reverted and verified back to a clean, working state
before moving on — never left in a broken intermediate state.

Verified end-to-end, for real, not just assumed: `pnpm install` (zero install scripts run, one
reviewed-and-blocked exception logged in `pnpm-workspace.yaml`), `pnpm lint`, `pnpm test`
(including catching and fixing the `fc.date()` arbitrary bug above), `pnpm build` (confirmed
the GitHub Pages `base: /cycle-in/` path is baked correctly into the built `dist/index.html`),
`pnpm audit`, and the license-allowlist command — all green. GitHub Actions tags
(`actions/checkout`, `pnpm/action-setup`, etc.) were checked against the live GitHub API rather
than assumed, since several had moved past what training-data knowledge suggested.

Migrated this docs set from `~/Development/work/cycle-in/` (README, PROGRESS, journal,
ADR-0001) per the sub-repo convention `work/README.md` codifies — a real code repo lives as a
sibling top-level directory, never nested in `work/`. `work/cycle-in/` itself is retired as
part of this same change; see `work/README.md`'s updated row.

### 2026-07-08 (later) — flow rounded out + provability tier decided

Follow-up design conversation (not yet building). Landed on three distinct object types
(items / log entries / impressions) instead of one, since "log time spent, maybe against a
category, maybe against an item, maybe never suggested at all" doesn't fit an item-only model.
Added: hold/release (pin an item regardless of cadence), archiving as distinct from a normal
cadence-driven cycle-off, start-without-done, duration/reps/notes/link on a log entry, the BV
"advance to next node" flow (parse the imported config's node graph, let Ryan pick the next
node to surface), and a BV onboarding/review screen (what's imported vs. not yet pulled in).

Searched the codebase for "provable" per Ryan's ask — it originates in git-redundancy
(ADR-0001/0002: Rust, functional core/imperative shell, proptest, Kani), and home-fleet
(ADR-0001) explicitly inherits that bar; judicial-institute-notebook-cms's
`Engineering-Strategy.md` is the TS+React variant (Rust backend + strict-TS frontend). All
three pair "provable" with Rust somewhere. cycle-in has no Rust and (per branching-video's
precedent) was heading toward zero-build vanilla JS — a real fork, not a template to copy.
Raised it as a question; **decided: strict TS + property tests (`fast-check`), no Rust/WASM
core** — see [ADR-0001](adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md).

Cross-device sync (phone + other devices) was raised as the one open question that reshapes
the whole architecture — **left explicitly open**, still the blocking next step above.

### 2026-07-08 — effort opened

Ryan described the idea via `/new-work`: cycle old skills (e.g. piano, low frequency) and new
skills (e.g. cello, regular frequency) through a "what to do now" view. Seeded from (a)
branching-video's bookmarked/curated videos via its new Export-All JSON bundle, (b)
categorized/sub-categorized items so category-level neglect is visible over time, and (c) a
custom list of standalone reminders not tied to any video. Modeled as a branching-video-style
static GitHub Pages repo — confirmed during the interview that a static site can't read
browser bookmarks directly, so the bundle-import path is the right ingestion mechanism rather
than trying to read bookmarks live.
