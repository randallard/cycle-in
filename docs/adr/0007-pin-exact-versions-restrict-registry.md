# ADR-0007: Pin exact versions and restrict the registry
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
Supersedes decision 2 of [ADR-0002](0002-npm-supply-chain-discipline.md), unchanged in
substance. See [ADR-0006](0006-block-install-time-scripts.md) for why 0002 is being split.

A version range means the dependency you audited is not necessarily the dependency you install
tomorrow. An unrestricted registry means a lookup can be redirected somewhere you didn't
choose.

## Decision
- **No `^`/`~` ranges in `package.json`.** Exact versions only.
- **`.npmrc`: `registry=https://registry.npmjs.org/`** — resolution comes from one known source.
- **`pnpm-lock.yaml` is committed**, and CI installs with `--frozen-lockfile` so a build can
  never silently resolve something the lockfile didn't record.

## Consequences
- What was reviewed is what gets installed, on every machine and in CI.
- Updates become deliberate acts with a diff to read, rather than ambient drift. That cost is
  the point — it's what makes [ADR-0008](0008-age-gate-dependency-admission.md)'s age-gating
  meaningful, since there's a specific moment where a new version is admitted.
- Requires an update mechanism to avoid rotting; that's Renovate, covered in ADR-0008.
