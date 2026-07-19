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
| [0004](0004-branching-video-import-time-options-steps-check-ins.md) | Branching-video import — time-options, step sequences, and check-ins | Accepted |
| [0005](0005-interval-cadence-foreground-reminders-snooze.md) | Interval/session cadence, foreground reminders, and snooze (amends ADR-0003) | Proposed |
| [0006](0006-block-install-time-scripts.md) | Block install-time script execution | Accepted |
| [0007](0007-pin-exact-versions-restrict-registry.md) | Pin exact versions and restrict the registry | Accepted |
| [0008](0008-age-gate-dependency-admission.md) | Age-gate dependency admission at the package manager, not just the update bot | Accepted |
| [0009](0009-ci-vulnerability-scanning.md) | CI vulnerability scanning — two advisory sources plus signature verification | Accepted |
| [0010](0010-sbom-via-syft.md) | SBOM via Syft (an Action), not an npm package | Accepted |
| [0011](0011-license-allowlist.md) | License allowlist for transitive dependencies | Accepted |
| [0012](0012-protect-tooling-installed-beside-the-repo.md) | Tooling installed beside the repo passes `--ignore-scripts` explicitly | Accepted |
| [0013](0013-pin-actions-to-commit-shas.md) | Pin third-party GitHub Actions to full commit SHAs | Accepted |
