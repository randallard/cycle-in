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
- **Immutable in substance:** to change a decision, write a *new* ADR that supersedes the old
  one and flip the old one's status to `Superseded by ADR-XXXX`. Don't rewrite history.
- Status values: `Proposed` · `Accepted` · `Superseded` · `Deprecated`.

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
| [0002](0002-npm-supply-chain-discipline.md) | npm-ecosystem supply-chain discipline | Accepted |
