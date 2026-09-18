# Progress & Status

_Last updated: 2026-07-18_

## Status / next

**Now (2026-07-18) — a working app, not a stub, and now driven end to end in a browser.** The
board (direction B "balance board"), the `#history` view, the IndexedDB event store, and
export/import all work, and **Phase 1 of the branching-video arc is done and verified**: import a
video's `config.json`, pick/reorder its steps, walk them (advance / jump), and attach per-step
check-in links — all on the append-only event log. The 2026-07-18 in-browser pass drove the whole
slice (both config shapes, the error paths, reload, and an export → wipe → re-import round-trip)
and produced **four fixes** the 104 green tests couldn't have caught: zero-step imports silently
dropped their video provenance, the board's verb row collapsed on every advance, a blocked
`javascript:` link still rendered as a clickable anchor, and most verbs left the *previous*
status message standing. 113 tests; `pnpm build` + lint clean. Still uncommitted pending Ryan's
own look. **Next up: Phase 2** — the `interval` cadence ("every 50 min"), snooze, and the
live-refreshing list (ADR-0005). Doesn't change with the 2026-09-18 migration below. The
paragraphs below are the accreted history, oldest first.

**2026-09-18 (later): first real CI run in two months caught 7 live advisories.** The
migration's new `ci.yml` was the first push-triggered CI run since 2026-07-19 — and in the
intervening two months, 7 high-severity advisories landed against transitive dev-tooling deps
(brace-expansion, ip-address, nanoid, postcss, tar) whose pinned versions never moved, because
Renovate is still not installed (worklist #2, unchanged). Nothing wrong with the migration
itself; it just turned CI back on and the drift was sitting there waiting. **postcss and tar**
had patched versions old enough to clear ADR-0008's 14-day age-gate, so those got a
`pnpm-workspace.yaml` `overrides` entry (both are transitive, not direct deps, so a plain
`pnpm update` doesn't reach them). **brace-expansion, ip-address, and nanoid's patches are all
younger than 14 days** — genuinely no usable patched version exists yet under this project's
own quarantine policy — so those 5 GHSAs are quarantined in both `pnpm-workspace.yaml`
(`auditConfig.ignoreGhsas`) and the new `osv-scanner.toml` (`ignoreUntil` dates: 2026-09-24 for
the nanoid pair, 2026-09-28/29 for the others), self-expiring rather than needing a manual
follow-up. Verified locally, not just assumed: `pnpm audit --audit-level=high` and the
containerized `osv-scanner` both exit 0 against the current lockfile. Full narrative:
[`journal/2026-09-18-3-first-ci-run-in-two-months-finds-real-drift.md`](journal/2026-09-18-3-first-ci-run-in-two-months-finds-real-drift.md).
⚠️ **Renovate installation is now more overdue, not less** — this whole episode is exactly what
it exists to prevent.

**2026-09-18 (correction, same evening): that "verified locally" claim above was only half
right.** Pushing the fix still failed CI — `ts supply chain` passed, but `OSV scan` didn't. The
local check I'd run (`osv-scanner -r ./`, no flags) doesn't reproduce the actual gate: the
reusable workflow runs a separate `osv-reporter` binary with `--fail-on-vuln=true`, which fails
on **any** severity, not just High — 8 Medium findings I'd left alone as "doesn't block the
deploy" were exactly what was blocking it. Fixed for real this time: bumped `postcss` again
(8.5.18 → 8.5.23, a newer advisory than the one already fixed) and added an `undici` override;
`nanoid` turned out to need nothing, resolving clean as a side effect of the postcss bump
(confirmed via `pnpm why`, not assumed) — the two nanoid ignore entries came back out of both
files since `osv-scanner` itself flagged them unused. Three more findings (two older ip-address
Mediums, one vitest/`@vitest/mocker`) joined the dated ignore list, all clearing by 2026-09-29.
This time verified against the actual failing command shape, not a same-named approximation —
plain `osv-scanner -r ./` now reports "No issues found" with zero unused-ignore warnings. Full
narrative:
[`journal/2026-09-18-4-osv-scan-fails-on-any-severity-not-just-high.md`](journal/2026-09-18-4-osv-scan-fails-on-any-severity-not-just-high.md).

**2026-09-18: migrated onto `cr-ci-cd-rust-typescript-template`'s conventions.** Docs/CI only —
no application code touched, Phase 2 unaffected. cycle-in predates the template (started
2026-07-08, template's earliest commit 2026-07-18) and had independently converged on most of
the same shape, so this was additive: `scripts/docs-hygiene.py` +
`.github/workflows/docs-hygiene.yml` (mechanical ADR/journal/link checks, now gating CI — found
and fixed 5 pre-existing broken/escaping links in the process, all in cross-links to
`work/kiss-ai`, which has no public remote to link to so those became inline-code paths
instead); `.github/workflows/stance-review.yml` + `docs/reviews/` + the `stance-review` skill
(the monthly habit didn't exist here before); `.github/CODEOWNERS`; `CLAUDE.md` +
`.claude/skills/project-conventions/SKILL.md`, adapted from the template to point at
[ADR-0001](adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md)'s provable-lite
tier instead of the template's Rust-first defaults. **License switched MIT-only → dual MIT OR
Apache-2.0** ([ADR-0014](adr/0014-dual-license-mit-or-apache-2-0.md)) — checked directly that
this doesn't cost the fork-friendliness the original MIT pick was for, since "OR" lets a forker
comply with either. **CI restructured** from one `deploy.yml` job into the template's
`detect`/`ts-gates`/`ts-supply-chain`/`sbom`/`osv-scan`/`deploy` split (functionally what the
old workflow already did, just organized to match the template and ready for a Rust job to
attach without edits if one's ever added). ⚠️ **Not yet done: the `DEPLOY_PAGES` repo variable.**
The template's `deploy` job is opt-in behind `vars.DEPLOY_PAGES == 'true'`; the old `deploy.yml`
deployed unconditionally. Confirmed via `gh variable list` that it isn't set — **the live site
stops deploying on the next push to `main` until `gh variable set DEPLOY_PAGES --body true -R
randallard/cycle-in` is run.** Deliberately left for Ryan rather than set silently, since it's a
live GitHub setting change, not a file. `python3 scripts/docs-hygiene.py` runs clean locally.

**Status (2026-07-08, scaffolding era — superseded by the entries below):** Repo scaffolded,
pushed, and **confirmed live**: https://randallard.github.io/cycle-in/
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

### 🔗 Possible fourth item source: compiled skill-resource documents (noted 2026-07-30)

Item sources today are the branching-video bundle, custom reminder lists, and YouTube
playlists. A fourth shape surfaced from a **different effort** and is worth knowing about
before the item-source interface hardens: a **compiled markdown document** — online resources
for a skill, gathered, summarized, and indexed — where the document's indexed sections map
onto practice items more or less directly.

The motivating example was *"exercises for building bow strength for playing the cello,"*
which is not a coincidence: **cello is this project's own example of a newly cycled-in
skill**, piano its example of one being kept from atrophying. So the example query and this
app's core use case are the same thing.

This is TCSearch's "documentation-building search" idea, tracked in
`~/Development/work/kiss-ai/PROGRESS.md` (Track 2) with
the narrative in `kiss-ai/journal/2026-07-30.md`.
**One of Ryan's projects would emit what this one ingests** — worth not designing either half
in isolation.

**Nothing is committed to here.** No scope change, no dependency on kiss-ai, which is early
and blocked on its own migration step. The actionable part is narrow: when the item-source
interface gets designed, **don't assume every source is a feed of discrete items** — a source
may be one document that has to be *decomposed* into items. Designing for that case costs
little now and is awkward to retrofit.

**2026-09-18: a second worked example, and a gap named around it.** A second
documentation-building-search case (ACL injury prevention) surfaced the same way the cello one
did, and Ryan named a bigger flow it sits inside: notice something → research it (TCSearch) →
decide whether to build it into daily life → set a long-term plan → **weigh it against
everything else already claiming time, deliberately.** That last step isn't in this app today
— category rollups answer "how did time actually split" after the fact; nothing answers "what
would adding this cost, against what it's meant to serve" at the moment of deciding to cycle
something new in. Not designed, not scoped. Full note:
[`journal/2026-09-18-1-a-finite-time-flow-around-the-fourth-item-source.md`](journal/2026-09-18-1-a-finite-time-flow-around-the-fourth-item-source.md).

**2026-07-10 (later): the export/import event bundle is built** — `src/core/bundle.ts`
(serialize deterministic and diff-clean, envelope-validated parse that imports
newer-version events losslessly, union by event id) plus Export/Import buttons on the demo
page. Manual cross-device sync now actually works end to end; 42 tests passing. With this,
worklist #6 (event-log data model) is fully closed.

**2026-07-10 (evening): the choices page is real.** Two design mockups live in
`prototypes/` (dev-server-only pages, per Ryan's preference — no Artifacts); Ryan picked
**direction B ("balance board") completely**. `src/ui/` now implements it against the live
event store: balance bar, pinned & timed strip, per-category panels with day/week/month
attention, all action verbs (done / start / hold / release / not-today / bump / change
cadence / archive / log time at item and category level), add-item form, hash-routed
category focus, first-run empty state, impressions recording, export/import in the top bar,
and a Planning panel with an empty state until YouTube lands. Demo seeding removed. Category
colors are a CVD-validated palette with the warm band reserved for overdue-orange.

**2026-07-12 session: tags + the history view.** Scenario that drove it (Ryan): "bucked
bales for a few hours — mark it exercise *and* farm work, and see time by
category/sub-category over day/week/month/year(s)". Decision: **tags on `time-logged`**
(Ryan picked tags over double-logging) — an entry keeps its one category (what the balance
board weighs and selection balances) plus optional `tags: string[]` as extra lenses, so tag
totals may overlap; `[]` normalizes to absent, `log-corrected` can replace or clear the
list, and the bundle parser (envelope-only validation) already imports tagged events
losslessly. Core: `rollup.ts` gained the `year` period, `periodKey`/`periodStart`/
`periodStarts`, `minutesByTag`, and `minutesSeries` (last-N-periods buckets with a
filter+group callback — by category, by sub-category within one category, or by category
among entries carrying one tag); 49 tests passing including new properties (series buckets
partition the in-range total across all four periods; period starts round-trip their own
keys). UI: both "Log time…" forms take comma-separated tags; a **hash-routed `#history`
view** (from design mockup C in `prototypes/`, built on direction B's language) renders
stat tiles, a stacked-column SVG chart with hover/keyboard tooltips (day/week/month/year
switcher; show-filter for all categories / one category by sub-category / one tag by
category), by-category and by-tag breakdowns, and the raw entries table. Shared string
helpers moved to `src/ui/format.ts`. The category palette was validated programmatically
for CVD/contrast in both themes (passes; light mode's sub-3:1 hues are covered by the
table view). Verified end to end headlessly via a seeded-IndexedDB smoke page
(`prototypes/_smoke-history.html`, dev-only, seeds its own `smoke-history` DB — handy for
demoing the history view with data; delete freely).

**2026-07-17 session: planned the video-import → steps → intervals → reminders arc.**
Design only, no code. Ryan described his most-wanted next flow ("take a video I like, add it,
track which step I'm on, come up every 50 minutes, ding at me, let me snooze"); pulled apart
it's six flows, most already boned in the ADR-0003 model. Naming decided: list items are now
**"time-options"** (was the placeholder "items"). Two forks Ryan called: **reminders are
foreground-only for v1** (a static Pages PWA can't reliably ding when closed/locked — no push
server, wake-a-closed-PWA APIs are Android-only; foreground sound+notification while open is
honest and iPhone-safe), and **build order is import-first**. Written up as
[ADR-0004](adr/0004-branching-video-import-time-options-steps-check-ins.md) (import model:
BV `config.json` parser, time-options carrying step sequences, check-ins as `time-logged` +
`nodeId`) and [ADR-0005](adr/0005-interval-cadence-foreground-reminders-snooze.md) (an
`interval` cadence alongside the calendar kinds — amends ADR-0003's "no elapsed" stance for
this one explicit intent — plus a `snoozed` event and foreground reminders). Both **Proposed**:
model shapes await Ryan's local review. Full narrative:
[`journal/2026-07-17-1-video-import-steps-intervals-and-reminders.md`](journal/2026-07-17-1-video-import-steps-intervals-and-reminders.md).

**2026-07-17 (implementation): Phase 1 shipped (branching-video import + steps + check-ins).**
The whole import-first slice is built and green (104 tests, `pnpm build` clean; pending Ryan's
in-browser verification, uncommitted per his rule). See the
[2026-07-17-2 journal entry](journal/2026-07-17-2-phase-1-branching-video-import-steps-check-ins.md)
for the narrative.

**2026-07-18: Phase 1 driven in a browser — four fixes the tests couldn't catch.** Ran the whole
slice headlessly against `pnpm dev` (import both config shapes → pick/reorder → add → advance →
jump → check in → reload → export → wipe → re-import), plus the malformed-config and
wrong-file-type error paths. The slice held on the first drive; what driving it added was four
defects living in the gap between "the event was appended" and "the person can tell what
happened":
1. **Zero-step import dropped the video provenance** — the picker guarded the whole `bvSource`
   behind `steps.length > 0`, so unchecking every node produced a plain time-option with no
   record it came from a video. `bvSource` is now always committed; empty `steps: []` just means
   "no step sequence" (`stepProgress` already returns `undefined` for it).
2. **The board's `⋯` verb row collapsed on every advance** — `run()` calls `closeForms()`, so
   walking steps meant re-expanding each time. New `runKeepingVerbs` preserves `ui.openItem` for
   `advance`/`set-step` only. Matters for Phase 2, where the board *is* the every-50-minutes
   surface.
3. **A blocked link still rendered as an anchor** — `safeHref` neutralized `javascript:` to
   `href="#"`, but the link looked normal and silently went nowhere. New `isWebLink` predicate
   (which `safeHref` now delegates to); non-web links render inert, and the check-in form rejects
   them at capture (`pattern="https?://.*"` plus a JS guard — `type="url"` accepts `javascript:`).
4. **The status line was sticky and mostly unwritten** — a stale message next to a fresh action
   reads as confirmation of that action. `run(input, message)` now *requires* a confirmation, so
   a verb can't be added without one; every verb reports what it did. New `sayInPlace` updates
   the status without a re-render, for validation on an open (DOM-held) form.

104 → 113 tests. Full narrative:
[2026-07-18-1 journal entry](journal/2026-07-18-1-phase-1-browser-verification-and-fixes.md).
Also added `.claude/skills/verify/SKILL.md` — the launch/drive recipe (isolated port and
IndexedDB origin, `playwright-core` against the system Chromium, hash routes, the hidden
file-input trick) so the next in-browser pass skips the cold start.

**Next build steps — the import-first phased plan (ADR-0004, ADR-0005):**
- **Phase 1 — branching-video import + steps + check-ins — ✅ DONE.** The full "import a video,
  walk its steps, attach progress links" loop, on existing calendar cadences:
  - **Parser** (`src/core/bvimport.ts`) — tolerant read of BV's `config.json` node graph,
    separate from the event-bundle parser; handles both branching shows (default-choice spine)
    and the real flat single-video tutorial shape (file-order fallback); `stepsFromNodes`
    resolves each step's video coordinates.
  - **Picker** (`src/ui/picker.ts` + app.ts) — "Import video…" → file-picker → node picker with
    suggested steps preselected, toggle + reorder; commits one `item-added`.
  - **Model** — `BvStep`/`BvSource` in `types.ts`; `bvSource.steps[]`; reducer seeds
    `currentNodeId` at step 1 and `bv-node-advanced` moves it (legacy pre-`steps` bvSource
    tolerated).
  - **Advance verb** (`src/core/steps.ts` `stepProgress`) — `step k/n` chip on the board and a
    "now … · Advance to <next> →" control; a fresh/stale item's `next` is step 1 so advancing
    starts the sequence.
  - **Detail view** (`#item/<id>`, reached from the item name) — metadata, the ordered steps
    with jump ("go here") / advance, the management verbs (done / start / hold / log / cadence /
    archive / **unarchive** — closes UI-flow gap #4's unarchive), and the item's logged-time &
    check-in history.
  - **Check-ins** — `nodeId` on `time-logged` (+ `log-corrected` patch); a link-capture form on
    the detail view attaches a progress link to the current step; a link-only check-in logs no
    minutes (no rollup impact); links must be http(s) — enforced at capture (form `pattern` +
    a JS guard) and at render (`isWebLink`; non-web links show inert, never as a live anchor),
    with `safeHref` as the last line of defence for anything reaching an href.
- **Phase 2 — interval cadence + snooze + live list:** the `interval` cadence kind
  (`everyMinutes`); elapsed due-ness; the `snoozed {itemId, until}` event and its two verbs
  ("skip to next N" / "remind me in 25"); sub-day re-render (on load, on `visibilitychange`, on
  a minute tick) while keeping calendar items day-stable and selection pure. The
  cardistry-every-50-min loop works visually, no sound yet.
- **Phase 3 — foreground reminders + PWA:** manifest + service worker (worklist #5); a
  per-time-option reminder tone; Notification + audio ding on due / snooze-elapsed while the app
  is open.

**Deferred (not blocking the above):**
- **Rest of the item-management verbs** — the detail view now carries done / start / hold / log
  / cadence / archive / **unarchive**; **rename** and **recategorize** still have no UI (the
  `item-renamed` / `item-recategorized` events exist). The detail view is the home for them.
- **Recent-suggestions review** — impressions are being recorded already; the review screen that
  surfaces "shown but never marked" isn't built.
- **YouTube playlist integration** — playlist config, fetch, per-playlist not-yet-incorporated
  counts feeding the Planning section, and importing a video as a time-option (needs the
  API-access design decision below first).

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
   bumps, and backfill-with-"early". The IndexedDB event store and the export/import bundle
   both landed 2026-07-10 — this item is fully closed.

## UI-flow gaps (2026-07-08 second pass; core-level ones closed by ADR-0003 the same evening)

Found by re-walking the described flow against the docs and the then-current
`src/core/types.ts`. Status after the ADR-0003 core landed:

1. ~~**General promote/demote-cadence flow**~~ — `cadence-changed` event **and** the UI verb
   ("Change cadence…" inline form) both built.
2. ~~**"Bump priority for tomorrow" missing from the model**~~ — `priority-bumped` event,
   one-shot for `forDate`, expires with the day.
3. ~~**Calendar-day vs 24h-elapsed**~~ — strict calendar periods (daily / Monday-start week /
   calendar month); timed items due *at* their time. The drift is gone; tested.
4. **Item-management view** — mostly closed by the Phase-1 detail view (`#item/<id>`: done /
   start / hold / log / cadence / archive / **unarchive**); **rename** and **recategorize**
   verbs still unbuilt (their events exist).
5. **Category consistency** — partly addressed: add-item and the picker offer a category
   datalist (pick-from-existing + add-new). A `category-renamed`/`item-recategorized` merge UI
   is still unbuilt.
6. ~~**"Not today"**~~ — `dismissed-today` event; excluded from that day's selection only.
7. ~~**No edit/undo on log entries**~~ — `log-corrected` + `event-retracted` events.
8. ~~**Empty/first-run state**~~ — built with the choices page (2026-07-10): a first-run panel
   with Add / Import video / Import bundle.

## Open questions (deliberately unresolved)

- **Trade-off legibility when cycling something new in** (new 2026-09-18, see the journal entry
  above) — adding a time-option today just adds it; nothing surfaces what it would cost against
  existing categories/goals, or what it might already serve, at the moment of deciding. Whether
  this becomes UI (a cost preview on add-item), a config-level goal model, or stays a manual
  judgment call is unresolved — revisit when the add-item flow or item-source interface next
  gets real design attention.
- **No behavioural risk-heuristic tool wired in** (was ADR-0002 decision 9; recorded here rather
  than as an ADR, because "we haven't done this yet" is a gap, not a decision). Socket.dev or
  equivalent analyses what a *new* package version does — new network calls, filesystem access,
  obfuscation, maintainer changes — and is the only remaining thing that could flag an
  in-progress compromise on publication day, which advisory databases structurally cannot.
  Free for open-source projects. Deliberately deprioritised on 2026-07-18 after
  [ADR-0008](adr/0008-age-gate-dependency-admission.md)'s 14-day install-time quarantine
  closed most of the same window at zero added surface — a third-party GitHub app with repo
  read access is itself supply-chain surface. **Revisit if** the age-gate ever has to be
  shortened, or if a dependency lands that can't wait 14 days.
- **git-redundancy still tag-pins its Actions**, so the fleet is inconsistent with
  [ADR-0013](adr/0013-pin-actions-to-commit-shas.md). That project should adopt SHA pinning too.

- **Import/step model sub-questions** (from ADR-0004) — _resolved during Phase 1:_ `showId` is a
  slug of the show title (`slugify`); a check-in reuses `time-logged` + `nodeId` (no dedicated
  `check-in` event). _Still open:_ multi-video shows (per-node `videoId` vs one `masterVideoId`
  — the step shape carries both, works, but no UI showcases mixed videos yet); whether non-BV
  time-options should also expose ad-hoc steps (the model would allow it); and whether the
  flat-tutorial implied-`end` (from the next step's `start`) is worth surfacing in a player.
- **Interval/reminder sub-questions** (new 2026-07-17, from ADR-0005) — snooze boundary
  (relative `now + interval` for v1 vs clock-aligned :00/:50/…); quiet-hours so interval items
  don't ding overnight; whether interval items also honor an `atTime` window; the reminder-tone
  asset (a bundled set vs user-supplied). Cross-device: a snooze/interval clock is device-local
  by nature — syncing snoozes is probably unwanted (noted, not solved).
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

### 2026-07-10 (evening) — choices-page mockups, direction B chosen, real UI built

Two organization-level mockups (list-first "practice ledger" vs category-first "balance
board") as dev-server-only pages in `prototypes/` — Ryan rejected the Artifact route and
set the convention: prototypes live in the repo. He picked **B completely**. `src/ui/`
now implements the real choices page against the event store: balance bar, strip, category
panels, every verb, add-item, focus view, first-run state, impressions, Planning empty
state. Demo seeding removed from `main.ts`. UI-flow-gap items #4 (partially — archive verb
exists, management view pending), #8 (first-run) advanced. Full detail:
[`journal/2026-07-10-3-choices-page-ui-direction-b.md`](journal/2026-07-10-3-choices-page-ui-direction-b.md).

### 2026-07-10 (later) — export/import event bundle

`src/core/bundle.ts`: deterministic serialize (deduped, `(at, id)`-sorted — same event set,
byte-identical export), envelope-validated parse (newer-version events import losslessly;
malformed bundles get human-readable errors), `unionEvents`. Demo page grew Export/Import
buttons with an inline imported-N-of-M status. 42 tests (round-trip, determinism,
two-device-merge, and self-import-idempotence properties among the 11 new). Full detail:
[`journal/2026-07-10-2-export-import-event-bundle.md`](journal/2026-07-10-2-export-import-event-bundle.md).

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
