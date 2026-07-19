# ADR-0008: Age-gate dependency admission at the package manager, not just the update bot
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
Supersedes decisions 3 and 7 of [ADR-0002](0002-npm-supply-chain-discipline.md) and carries
forward the pnpm install-time gates adopted 2026-07-18. See
[ADR-0006](0006-block-install-time-scripts.md) for why 0002 is being split.

Advisory scanners (`pnpm audit`, OSV — [ADR-0009](0009-ci-vulnerability-scanning.md)) are
**lookup** tools: they answer "is this version on a known-bad list." Their coverage is a
function of *disclosure*, and disclosure lags compromise. In the window between a malicious
version being published and an advisory existing, every scanner returns clean and is working
correctly.

What actually covers that window is **waiting**. Historically npm compromises are caught within
hours to days — event-stream, ua-parser-js, node-ipc, coa/rc. A quarantine period means you
essentially never pull the bad version.

The 2026-07-18 stance review found the existing age-gate was weaker than it read: it lived only
in `renovate.json`, where it paces *Renovate's own PRs* and does nothing for a manual `pnpm
add`. It looked like a control and wasn't one.

## Decision
Age-gate at **both** layers, matched at 14 days:

| Where | Setting | Gates |
|---|---|---|
| `pnpm-workspace.yaml` | `minimumReleaseAge: 20160` | every install, including manual `pnpm add` |
| `renovate.json` | `minimumReleaseAge: "14 days"` | Renovate's PRs |

Plus two related pnpm install-time gates from the same recommended baseline:

- **`trustPolicy: no-downgrade`** — fail when a package's trust evidence *decreases* versus
  prior releases. This is the closest native signal to "does this specific version look wrong
  right now," which advisory databases cannot give until something is disclosed.
- **`blockExoticSubdeps: true`** — transitive dependencies must resolve from the registry; no
  git URLs or arbitrary tarballs smuggled in by a sub-dependency.

Initial pins were age-gated the same way at scaffold time (2026-07-08), verified against the
live registry — the newest *stable* release at least ~30 days old, skipping anything newer,
prerelease, or a suspiciously fresh major bump.

## Consequences
- The duplication between `pnpm-workspace.yaml` and `renovate.json` is deliberate, not
  redundant: they gate different paths, and only the pnpm one is a real control.
- New releases can't be adopted for two weeks. Accepted — urgency is the attacker's advantage,
  and `minimumReleaseAgeExclude` exists for a genuine emergency.
- pnpm 11 defaults `minimumReleaseAge` to 1440 (one day); the explicit setting is what makes it
  14 and what makes the intent visible.
- Verified rather than assumed: `pnpm install --frozen-lockfile` passes the verification pass
  over all 283 lockfile entries, and the gate provably bites — `@types/node@22.20.1`, published
  ten days prior, is refused with a pointer to `minimumReleaseAgeExclude`.
