# ADR-0015: The age gate is one day, not fourteen
- Status: Accepted
- Date: 2026-10-14
- Deciders: Ryan

## Context
Supersedes [ADR-0008](0008-age-gate-dependency-admission.md) on the number only. Its argument for
gating at the **package manager**, not just the update bot, and for matching the two, still holds.

ADR-0008 picked 14 days in the 2026-07-18 stance review. The projects that later looked at it
properly chose one day: `the-lot` and `square-one` both run `minimumReleaseAge: 1440`, which is
pnpm's own documented recommendation and its v11 default ("in most cases, malicious releases are
discovered and removed from the registry within an hour"). `the-lot` also found that a timed
ignore written to "wait out" a quarantine had been wrong: the real gate was one day and the fix
had already cleared it. `branching-video` made the same move in its ADR-0030 on 2026-10-14.

The 14-day number has had a recurring cost here. On 2026-09-18 it forced a six-entry dated
ignore list (in both `pnpm-workspace.yaml` and `osv-scanner.toml`); those dates expired on
2026-09-28/29 with nothing replacing them, and by 2026-10-14 `main` carried 20 advisories.

## Decision
Gate new releases for one day at both layers, still matched:

- `pnpm-workspace.yaml`: `minimumReleaseAge: 1440` (minutes).
- `renovate.json`: `minimumReleaseAge: "1 day"`.

`trustPolicy: no-downgrade` and `blockExoticSubdeps: true` are unchanged.

## Consequences
- A release can be adopted after a day. A compromise that takes longer than that to be noticed
  gets through; `pnpm audit`, OSV and `trustPolicy` are the other layers.
- The dated advisory ignores and `osv-scanner.toml` are removed. A legitimate ignore (no patched
  version exists at all) still goes in both scanners.
- Revisit if a package compromise slips through a one-day window.
