# Progress & Status

_Last updated: 2026-07-08_

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

**Immediate next step — the sync-model decision blocks real data-layer work.** Ryan wants the
main "use" page usable from his phone, and to log time from wherever he is — but
`src/shell/storage.ts` (currently an in-memory stub, see its own comment) can't become the real
data layer until this is settled, since it determines the whole architecture:
- Manual export/import, branching-video-style (simplest, matches precedent, but manual)
- A small real backend, e.g. hosted on the home-fleet server (live sync, no manual step, but
  breaks "static site only" and adds a service to run/secure)
- Git-backed sync (state as JSON in a repo, auditable by construction, but commit-from-phone
  friction)

**Once that's decided**, build (still nothing beyond the stub):
- **The real data layer**, replacing `src/shell/storage.ts`'s in-memory stub, per whichever
  sync model gets picked.
- **Item / log-entry / impression shapes** — types already exist in `src/core/types.ts` (items
  with cadence + hold state; log entries independent of items for freeform time-tracking;
  impressions so a cycled-off item can be retroactively marked). `src/core/cadence.ts`'s
  `isDue` is the first pure function on top of them; the ranking/rollup logic is next.
- **The "next 5–10" ranking** — cadence-overdue-ness, category balance, manual priority bumps.
  Precedence order between those three isn't decided yet.
- **The branching-video integration** — import (assign category/sub-category to incoming BV
  items), the onboarding/review screen (what's pulled in vs. not), and the "advance to next
  node" flow, which needs `cycle-in` to actually parse a BV config's node graph well enough to
  list nodes to choose from — a real integration surface, not just a stored link.

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
3. **Minor code notes** — comment the `monthly`=30-day approximation; derive
   `Impression.acted` instead of storing it (fold both into #6's event-log rework).
4. **Privacy constraint** — record that practice data must never land in this public repo
   (rules out naive git-backed sync *here*; a separate private `cycle-in-data` home on the
   fleet is the natural fit). Feeds the sync decision.
5. **PWA manifest + service worker** — phone home-screen install + offline shell; watch the
   `/cycle-in/` base path and cache-update strategy.
6. **Event-log data model** — the big one. Append-only events (`item-added`, `started`,
   `done`, `held`, `released`, `archived`, `time-logged`, `impression-shown`, corrections)
   with a pure reducer deriving state. Rationale: sync becomes a conflict-free union of event
   sets (transport choice stops being load-bearing — manual export/import works day 1, a
   backend can come later without remodeling); it's the ideal `fast-check` target ("any
   merge-order of two devices' events yields the same state"); retroactive marking and undo
   fall out for free; matches the git-redundancy/home-fleet append-only-audit ethos.

## UI-flow gaps (2026-07-08 second pass)

Found by re-walking the described flow against the docs and `src/core/types.ts`; the first
two are doc-vs-code drift that already exists:

1. **General promote/demote-cadence flow is unspecced** — "advance to next node" covers BV
   items, but the plain "cello is going well, drop it daily→weekly" / "piano is fading, bump
   it up" flow was never written down. It's the literal core of "cycle-in."
2. **"Bump priority for tomorrow" is in the README but not the data model** — `Item` has no
   priority/bump field, and no event for it.
3. **"Daily" semantics: calendar-day vs 24h-elapsed.** `isDue` uses elapsed ms, so an item
   done at 11pm isn't due until 11pm the next day (and drifts later daily). Intent is almost
   certainly calendar-day. Same question for weekly (ISO week?) and monthly (same date vs 30
   days — currently 30 days).
4. **No item-management view** — the main page shows only the next 5–10; there's nowhere to
   list all items or hold/archive/edit/recategorize one that isn't currently suggested.
5. **Category consistency** — free-typed categories fragment rollups (typo = new category).
   Needs pick-from-existing + add-new at entry, and eventually rename/merge.
6. **"Not today" (dismiss for today)** — distinct from done/hold/archive; missing.
7. **No edit/undo on log entries** — phone mis-taps are guaranteed; correction events under
   the event-log model handle this naturally.
8. **Empty/first-run state** — new device, no data: needs a deliberate "import a bundle /
   start fresh" screen (especially while sync is manual).

## Open questions (deliberately unresolved)

- **Cross-device sync model** — see "Immediate next step" above. The load-bearing one. The
  event-log model (worklist #6) is designed to make this decision *less* load-bearing, and the
  privacy constraint (worklist #4) rules out naive git-backed sync in this public repo.
- **Category-coverage view** — its own page/dashboard, or folded into the main "next 5–10" page?
- **Ranking precedence** — cadence-overdue-ness vs. category balance vs. manual bumps, when
  they disagree about what belongs in the next 5–10.
- **Archiving vs. cycling off** — "done for now, comes back per cadence" vs. "retired, never
  suggest again" are different item end-states in `src/core/types.ts`, but nothing in the UI
  distinguishes them yet (there's no UI at all yet).
- **Socket.dev or equivalent** — flagged in ADR-0002 as a real gap (catching an in-progress
  compromise, not just a disclosed CVE); not wired in this round.

## Log

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
