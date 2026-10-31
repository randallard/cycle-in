---
name: project-conventions
description: House conventions for cycle-in — ADR and journal discipline, functional core / imperative shell, the provable-lite tier, supply-chain rules. Load before writing an ADR, a journal entry, or any code in the core.
---

# House conventions

Migrated onto `cr-ci-cd-rust-typescript-template`'s conventions (2026-09-18), though the repo
itself predates the template; reconciled with the template's 2026-10 standards batch on
2026-10-31. **This file is the canonical statement of the provable-code standard** for cycle-in
([ADR-1001](../../../docs/adr/1001-project-conventions-is-the-canonical-standard.md)). Every rule
that changed since the template's 2026-10 baseline points at the inherited `1NNN` ADR that made
the change. These rules are opinionated on purpose. They're here so a cold start — new machine,
cleared context — lands on the same path as the last session.

## The shape: functional core / imperative shell

**Non-negotiable, and it's what makes everything else possible.**

- **Core** (`src/core/`) — pure. No IO, no network, no DOM, no clock reads, no randomness. The
  cadence/due-ness calculation, the next-5–10 ranking, the rollups, the BV-bundle mapping — the
  logic actually worth getting right — lives here. This is the target of the property tests.
- **Shell** (`src/ui/`, `src/shell/`) — imperative. IndexedDB, the DOM, file pickers, the export
  bundle's byte-level IO. Covered by integration/component tests, not properties.

If you can't property-test something, ask whether it's core logic tangled with shell concerns.
Usually it is, and untangling it is the fix.

## State: managed facts, managed position, derived values

Every piece of state is one of three kinds, and each has exactly one owner
([ADR-1017](../../../docs/adr/1017-state-is-managed-facts-managed-position-derived-values.md)):

1. **Managed facts**: what the user made or the program recorded. Stored once, in the form it
   was made: an append-only event log where history or merging matters, a plain document
   otherwise. Never copied. Here that is the event log ([ADR-0003](../../../docs/adr/0003-append-only-event-log-core.md)).
2. **Managed position**: where the user is. The route, the screen, the step, the moment along a
   timeline, the selection. Always stored explicitly (in the URL when a link should reopen it,
   otherwise in the screen's reducer), **never derived from facts**, and never kept in two places.
3. **Derived values**: everything else, computed by pure functions of the two above. Never
   stored, so never stale.

A screen with more than a handful of managed values keeps them in **one pure reducer**
(`(state, action) → state`, with named actions, in its own module beside the screen). The
reducer is core, so it gets **property tests over arbitrary action sequences** (`fast-check`)
that assert the screen's invariants, for example "the round never exceeds the round count" or
"position has exactly one owner", not just example-based unit tests. A clock or canvas the screen
doesn't own is read into the reducer at defined moments (pause, seek), never mirrored
continuously. No state library until a genuinely graph-shaped flow earns one, recorded in an ADR.

Why: deriving *facts about the data* is safe. Deriving *where the user is* from the data, or
keeping a second copy of a fact, is where the bugs come from. If a reducer starts needing another
screen's state, the layers are wrong for that pair: decide a shared store in an ADR.

## What "provable" means here

A ladder, not a label ([ADR-1002](../../../docs/adr/1002-provable-is-a-four-rung-ladder.md)). Each rung is checked by a machine, not remembered by a reviewer:

1. **Memory safety by construction**: the compiler, and `#![forbid(unsafe_code)]`.
2. **Illegal states unrepresentable**: newtypes, enums and discriminated unions, no null, exhaustive matches.
3. **Properties hold across generated inputs**: `proptest` / `fast-check` on the pure core.
4. **Properties proven**: Kani (bounded) on the core; Verus (unbounded) for named invariants.

Tiers: **provable-lite** = rungs 1–3 (TS); **provable** = 1–4 with Kani (Rust); **provable+** =
adds Verus for named invariants ([ADR-1003](../../../docs/adr/1003-provable-plus-tier-verus-for-named-invariants.md)).

A project claims the highest rung its CI actually enforces, and no higher. Properties and proofs
cover the core; the shell gets integration tests. "Provable" is a claim about code, never a
compliance status (FISMA categorises systems, not code).

## Provability tier: provable-lite (no Rust)

Decided in [ADR-0001](../../../docs/adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md)
— **read it before assuming this project should grow a Rust/WASM core.** Every sibling project
(git-redundancy, home-fleet) pairs "provable" with Rust; cycle-in deliberately doesn't, because
nothing here rises to a safety-critical invariant. That reasoning still has to hold — it isn't a
default, it's a standing decision with its own promotion condition (a real data-integrity
invariant showing up, most likely from whatever the sync model becomes). The template's Rust
rules (ADR-1003, 1004, 1006–1009) don't apply while that holds, and the Rust CI jobs are
deleted rather than left skipping.

**TypeScript**: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noImplicitReturns`, `noFallthroughCasesInSwitch`. ESLint `strictTypeChecked`, with
`no-non-null-assertion`, `switch-exhaustiveness-check` and `no-floating-promises` as errors,
and zero warnings ([ADR-1011](../../../docs/adr/1011-typescript-strictness-bar.md)). Relaxing any of it takes a project ADR.

- **Pin `typescript` to 6.0.x** until the type-aware lint gate runs on TS 7: typescript-eslint
  supports 7.x, or an oxlint + tsgolint trial passes
  ([ADR-1010](../../../docs/adr/1010-typescript-stays-on-6-until-the-lint-gate-supports-7.md)).
- **Opt-in extras**: an `any` registry (every `any`/`as` justified inline and listed in
  `docs/any-registry.md`) and accessibility lint (axe checks, since this is a non-JSX UI). Not
  baseline, but every project records an ADR saying yes or no
  ([ADR-1012](../../../docs/adr/1012-strictness-extras-offered-at-project-start.md)).
- **`fast-check` property tests on the pure core** — the `proptest` analogue. Write real
  invariants ("an item's next-due date is never before today," "rollup totals across categories
  always sum to the ungrouped total"), not smoke tests.
- **No Kani, no formal proof.** TypeScript's type system is *unsound* by design, and that's an
  accepted trade — the compiler is a first check, not a guarantee. If a genuinely
  safety-critical invariant emerges, that's an ADR, not a retrofit, and the logic moves into a
  **Rust crate compiled to WASM** called from the TS shell, held to the Rust tier
  ([ADR-1015](../../../docs/adr/1015-logic-beyond-provable-lite-moves-to-a-rust-core.md)). Don't
  bolt rigor tooling onto TS instead.

## ADRs

Full conventions: `docs/adr/README.md`. The two that get violated most:

1. **One decision per file.** ADR-0002 is this project's own cautionary tale — it bundled ten
   decisions and had to be split into 0006–0013 later. The test: *if you can't supersede one
   part of it, it's too big.*
2. **Immutable in substance.** To change a decision, write a new ADR and flip the old one's
   Status. The Status line and the index are mutable metadata; everything from `## Context`
   down is frozen. **Never add an "amended" block to an accepted ADR** — that's a new decision
   wearing a hat, and it destroys the supersession trail. (ADR-0004 has one, from before this
   rule was enforced; ADR-0016 and ADR-0017 record its two decisions properly.)

**Inherited standards ADRs (`1000`+) belong to the template** ([ADR-1000](../../../docs/adr/1000-template-standards-adrs-are-inherited.md)).
Don't edit them or flip their Status here. Copy in new ones when the template adds them (the
`template` remote shows what's new: `git fetch template && git log --oneline HEAD..template/main
-- docs/adr/`). To deviate, write your own `0NNN` ADR citing the `1NNN` you depart from. Project
ADRs use `0001`–`0999`.

Give every ADR a **promotion condition** where one exists ("no proofs today; revisit if X").
The monthly stance review reads those.

## Journal

`docs/journal/YYYY-MM-DD-N-kebab-title.md`, append-only. Correct mistakes in a later entry,
never by rewriting an old one — the one standing exception is a mechanical broken-link fix,
same as ADRs allow. A journal entry references the commit it documents and lands in a follow-up
commit — a commit can't contain its own hash.

Write one when there's reasoning a future reader would have to reconstruct — especially
anything discovered by *running* the thing that tests didn't catch (see the 2026-07-18 Phase 1
browser pass: four real defects, zero of them caught by 104 green tests).

## Verification

Tests passing is not evidence a feature works. Before calling something done, run it in a
browser and watch it do the thing — `.claude/skills/verify/SKILL.md` has the launch/drive
recipe (isolated port and IndexedDB origin, the hidden file-input trick for BV import).

**Run what CI runs, not a hand-rolled approximation of it.** `pnpm build` is `tsc && vite
build`; `tsc --noEmit` alone is a different command that can pass while the gate fails.

**And before accepting that a gate can't be run locally, try to run it.** A reusable workflow
can't be invoked from a checkout — but the *tool* it wraps usually can, and the tool is what
decides the job. `osv-scan` is `google/osv-scanner-action`, and its scanner is a public
container:

```
docker run --rm -v "$PWD:/src" -w /src ghcr.io/google/osv-scanner:v2.3.8 -r ./
```

Run it against a clean `git archive` export so a local `node_modules` can't change the answer.
An unrunnable gate is an untrustworthy one: a repo in this family had `osv-scan` failing on
*every run in its history* while every local check reported clean, because one sentence of
inherited belief said the job was unobservable.

## Reviewing changes to `.claude/` and `CLAUDE.md`

**These files are instructions, not documentation.** A change to `.claude/skills/*/SKILL.md` or
`CLAUDE.md` changes what a future Claude session *does* — which tools it reaches for, what it
treats as approved, what it skips. That's closer to changing CI configuration than to editing a
README.

The blind spot is that they *read* like documentation. A pull request touching a markdown file
full of prose invites lighter scrutiny than one touching a build script, and an instruction like
"the supply-chain checks are handled elsewhere, skip them" would sail through a skim. The same
property applies to any file the model reads as guidance — `CLAUDE.md`, docs, even code comments
— but `.claude/` is where it's most concentrated and most consequential.

So: **review changes to `.claude/`, `CLAUDE.md`, and `.github/workflows/` with the same
attention as executable code.** `.github/CODEOWNERS` marks those paths so a review is
automatically requested.

Two honest caveats:

- **CODEOWNERS alone has no teeth.** By itself it only *requests* a reviewer. It becomes a gate
  only with branch protection on `main` — "Require a pull request before merging" plus
  "Require review from Code Owners". Without that, it's a convention with a reminder attached.
- **None of this is live on a solo repo** with no external contributors, where you approve your
  own work anyway. It's cheap to set up before you need it, and awkward to remember on the day
  a first outside PR arrives.

## Secrets and configuration

cycle-in has none today: it is a static site whose data stays in the browser, and
`.env.example` says so. These rules hold the day that changes.

- **Secrets come from the environment**, one variable per secret, or from the platform's secret
  store. Never from committed code, config, scripts, docs, ADRs, journals or test fixtures.
- **Config files describe structure.** They may name the variable that holds a secret but never
  contain the secret. A connection string with credentials embedded counts as a secret.
- **Fail closed.** A missing required secret stops startup with an error naming the *variable*,
  not the value. No default, no generated stand-in.
- **`.env.example` is committed, `.env` is not.** Confirm `.gitignore` covers `.env` before
  creating one. Test code uses obviously fake values.
- **Never log or echo a secret**, or pass one on a command line where it lands in shell history.
- **CI scans history for secrets** (`secret scan` in `ci.yml`, a pinned gitleaks release with its
  checksum verified). A finding fails the build. Bump the version and checksum together,
  deliberately. A secret that was ever committed is exposed: rotate it, because deleting the line
  doesn't remove it from history.
- In a session, never ask for or accept a secret. Write the command so it reads the secret from
  the environment, and have the human run it.

## Supply chain

Full detail: ADR-0006 through 0013, and 0015. The rules that matter day to day:

- Lockfile committed; CI installs frozen (`pnpm install --frozen-lockfile`).
- Install scripts blocked by default (`.npmrc`); exceptions individually reviewed in
  `pnpm-workspace.yaml`'s `allowBuilds`, never blanket-allowed.
- Age-gate new releases at the **package manager** level, not just the update bot. A bot
  setting paces the bot's PRs and does nothing for a manual add. One day on both sides: pnpm
  `minimumReleaseAge: 1440` and Renovate's `"1 day"` ([ADR-0015](../../../docs/adr/0015-one-day-age-gate.md)).
- pnpm's supply-chain settings (`minimumReleaseAge`, `trustPolicy: no-downgrade`,
  `blockExoticSubdeps`, the build allowlist) are **set explicitly** even where they match the
  defaults, and a new pnpm *major* is evaluated in a stance review before `packageManager` moves
  ([ADR-1016](../../../docs/adr/1016-pnpm-supply-chain-settings-stay-explicit.md)).
- Third-party CI actions pinned to full-length commit SHAs, not tags. Tags are mutable.
- Every CI job has `timeout-minutes`: 15. The one exception is a job that calls a reusable
  workflow, where GitHub disallows it
  ([ADR-1005](../../../docs/adr/1005-every-ci-job-has-a-timeout.md)).
- Not published to npm (`"private": true`). If that changes: bind trusted publishing by
  repository ID, and never publish from `issue_comment` or `pull_request_target` workflows
  ([ADR-1014](../../../docs/adr/1014-npm-trusted-publishing-hygiene.md)).
- Throwaway tooling installed *beside* the repo needs its own protection; the project's config
  does not reach it ([ADR-0012](../../../docs/adr/0012-protect-tooling-installed-beside-the-repo.md)).
- **An advisory exception has to be written once per scanner, and that is not duplication.**
  `ci.yml` runs two: the package manager's own audit (`pnpm audit`, reading
  `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml`) and **osv-scanner**, which reads
  `osv-scanner.toml` and a different database, with `fail-on-vuln: true`. Neither reads the
  other's config. Consolidating them looks like tidying and silently disarms one gate — put
  the same ignore and the same reason in both, and make each file name the other so they are
  dropped together.
- An ignore records **why no patched version is usable**, never a quarantine wait or a
  severity opinion, and names the condition that retires it. An override that clears an
  advisory stays within the resolved major, unless no fix exists on that line; then a bounded
  cross-major override, measured against every gate, is preferred to an ignore (glob and
  minimatch, 2026-10-31).

## Fork-friendliness

Stated goal since 2026-07-10: anyone can fork this repo, adjust `src/core/config.ts`
(`CycleConfig`), and start using it on their own GitHub Pages. User-tunable preferences
accumulate there, never scattered. This is also why the license is dual **MIT OR Apache-2.0**
(ADR-0014) rather than the more common single-license personal-project default — a forker can
comply with either.

## Docs that must stay current

`README.md`, `docs/PROGRESS.md`, `docs/journal/`, `docs/adr/`. When you finish a chunk of work,
update whichever exist so the effort can be resumed from the docs alone after a cleared
context. `python3 scripts/docs-hygiene.py` checks the mechanical parts locally.
