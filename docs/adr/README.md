# Architecture Decision Records (ADRs)

This directory records the significant decisions for **cycle-in**, one file per decision, with
the context and consequences — so the *why* survives, not just the *what*. Same form and
conventions as the companion [git-redundancy](https://github.com/randallard/git-redundancy),
[home-fleet](https://github.com/randallard/home-fleet), and
[branching-video](https://github.com/randallard/branching-video) projects' ADRs.

## What this is

The recognized practice is the **ADR — Architecture Decision Record** (Michael Nygard, 2011),
commonly written with the **MADR** (Markdown Any Decision Records) template. We use a
MADR-lite form below.

## Conventions

- Files: `NNNN-kebab-title.md`, zero-padded, monotonically increasing.
- **Two number ranges.** `0001`–`0999` are this project's own decisions. **`1000` and up ("1NNN")
  are inherited standards ADRs** from `cr-ci-cd-rust-typescript-template`
  ([ADR-1000](1000-template-standards-adrs-are-inherited.md)). The same number means the same
  decision in every project built from the template. Copied in, never edited here; a deviation is
  a project ADR that cites the 1NNN it departs from.
- Status values: `Proposed` · `Accepted` · `Superseded` · `Deprecated`.

### One decision per file

An ADR records **one** decision. A numbered list of decisions means you've written a policy
document, not an ADR — split it.

The test: **if you can't supersede one part of it, it's too big.** ADR-0002 is the cautionary
example: it bundled ten decisions, so no single one could ever be superseded, and when the
stance moved the only available move was editing it in place. That's how bloat quietly
destroys immutability — the two aren't separate failures, the first causes the second. It was
split into ADR-0006 … 0013 on 2026-07-18.

### Immutable in substance

To change a decision, write a *new* ADR that supersedes the old one and flip the old one's
status to `Superseded by ADR-XXXX`. Don't rewrite history.

| Part of the file | Mutable? |
|---|---|
| The `- Status:` line | ✅ that's what it's for |
| The index table below | ✅ it's an index |
| Typo / broken-link fixes | ✅ |
| `## Context`, `## Decision`, `## Consequences` | ❌ **frozen once Accepted** |
| Adding a new decision to an existing ADR | ❌ **write a new ADR** |
| "Amended on `<date>`" blocks | ❌ that's an edit wearing a hat |

If you're writing "amended" inside an accepted ADR, stop — what you have is a new decision, and
it deserves its own number and a supersession link.

When superseding, say in the new ADR's Context **why the old reasoning stopped holding**.
That's the valuable part, and it's exactly what an in-place edit destroys.

## Template

```markdown
# ADR-NNNN: <title>
- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD
- Deciders: <names>

## Context
<forces at play, constraints, what makes this non-obvious>

## Decision
<what we chose, stated plainly>

## Consequences
<results, good and bad; what this commits us to>
```

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0000](0000-record-architecture-decisions.md) | Record architecture decisions (use ADRs) | Accepted |
| [0001](0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md) | Provable-lite — strict TypeScript + property tests, no Rust/WASM core | Accepted |
| [0002](0002-npm-supply-chain-discipline.md) | npm-ecosystem supply-chain discipline | Superseded by 0006–0013 |
| [0003](0003-append-only-event-log-core.md) | Append-only event log core, calendar-period cadences, category-balanced selection | Accepted |
| [0004](0004-branching-video-import-time-options-steps-check-ins.md) | Branching-video import — time-options, step sequences, and check-ins | Accepted; amended block → 0016, 0017 |
| [0005](0005-interval-cadence-foreground-reminders-snooze.md) | Interval/session cadence, foreground reminders, and snooze (amends ADR-0003) | Proposed |
| [0006](0006-block-install-time-scripts.md) | Block install-time script execution | Accepted |
| [0007](0007-pin-exact-versions-restrict-registry.md) | Pin exact versions and restrict the registry | Accepted |
| [0008](0008-age-gate-dependency-admission.md) | Age-gate dependency admission at the package manager, not just the update bot | Superseded by 0015 |
| [0009](0009-ci-vulnerability-scanning.md) | CI vulnerability scanning — two advisory sources plus signature verification | Accepted |
| [0010](0010-sbom-via-syft.md) | SBOM via Syft (an Action), not an npm package | Accepted |
| [0011](0011-license-allowlist.md) | License allowlist for transitive dependencies | Accepted |
| [0012](0012-protect-tooling-installed-beside-the-repo.md) | Tooling installed beside the repo passes `--ignore-scripts` explicitly | Accepted |
| [0013](0013-pin-actions-to-commit-shas.md) | Pin third-party GitHub Actions to full commit SHAs | Accepted |
| [0014](0014-dual-license-mit-or-apache-2-0.md) | Dual-license MIT OR Apache-2.0, replacing MIT-only | Accepted |
| [0015](0015-one-day-age-gate.md) | The age gate is one day, not fourteen | Accepted |
| [0016](0016-an-import-with-no-steps-keeps-its-video-provenance.md) | A branching-video import with no steps chosen still records where it came from | Accepted |
| [0017](0017-check-in-links-are-web-addresses-at-capture-and-render.md) | Check-in links must be web addresses, checked at capture and at render | Accepted |
| [0018](0018-every-cast-is-registered.md) | Every `any` and type assertion is registered, with its reason, and CI checks it | Accepted |
| [0019](0019-accessibility-checks-with-axe.md) | Accessibility is checked with axe against every view, in light and dark, in CI | Accepted |
| [1000](1000-template-standards-adrs-are-inherited.md) | Template standards ADRs are inherited, numbered 1000 and up | Accepted |
| [1001](1001-project-conventions-is-the-canonical-standard.md) | project-conventions is the canonical provable-code standard | Accepted |
| [1002](1002-provable-is-a-four-rung-ladder.md) | "Provable" means a four-rung ladder, and a project claims only the rungs CI enforces | Accepted |
| [1003](1003-provable-plus-tier-verus-for-named-invariants.md) | Opt-in provable+ tier: Verus for named invariants, with a human-reviewed spec | Accepted |
| [1004](1004-kani-job-fails-without-harnesses.md) | The Kani CI job fails when there are no proof harnesses | Accepted |
| [1005](1005-every-ci-job-has-a-timeout.md) | Every CI job has a timeout: 30 minutes for proofs, 15 for the rest | Accepted |
| [1006](1006-cargo-runs-locked-in-ci.md) | Cargo runs with `--locked` in CI | Accepted |
| [1007](1007-one-day-crate-cooldown-via-cargo-min-publish-age.md) | New crate versions wait one day, via Cargo's native `min-publish-age` | Accepted |
| [1008](1008-build-scripts-are-the-rust-attack-surface.md) | Build scripts and proc-macros are treated as the Rust attack surface | Accepted |
| [1009](1009-miri-runs-without-secrets-or-shared-target-cache.md) | Miri runs without secrets and without a shared `target/` cache | Accepted |
| [1010](1010-typescript-stays-on-6-until-the-lint-gate-supports-7.md) | TypeScript stays on 6.x until the type-aware lint gate supports 7 | Accepted |
| [1011](1011-typescript-strictness-bar.md) | The TypeScript strictness bar matches what the repos already run | Accepted |
| [1012](1012-strictness-extras-offered-at-project-start.md) | Engineering-Strategy's TS extras are offered as an opt-in at every project start | Accepted |
| [1013](1013-node-24-lts-in-ci.md) | CI runs Node 24 LTS | Accepted |
| [1014](1014-npm-trusted-publishing-hygiene.md) | npm trusted publishing: bind by repository ID, never from comment- or fork-triggered workflows | Accepted |
| [1015](1015-logic-beyond-provable-lite-moves-to-a-rust-core.md) | UI logic that needs more than provable-lite moves into a Rust core compiled to WASM | Accepted |
| [1016](1016-pnpm-supply-chain-settings-stay-explicit.md) | pnpm supply-chain settings stay explicit, and major pnpm bumps are evaluated first | Accepted |
| [1017](1017-state-is-managed-facts-managed-position-derived-values.md) | State is managed facts, managed position and derived values, and a screen's transitions go through one pure, property-tested reducer | Accepted |
