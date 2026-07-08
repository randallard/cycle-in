# ADR-0000: Record architecture decisions (use ADRs)
- Status: Accepted
- Date: 2026-07-08
- Deciders: Ryan

## Context
cycle-in is a small, single-maintainer app, but it already carries non-obvious choices
(provable-lite as a new provability tier with no Rust core, an explicitly-stubbed data layer
pending a cross-device sync decision, an npm-ecosystem supply-chain posture with no
`cargo-deny`/`cargo-vet` equivalent to lean on). Decided in conversation, the rationale would
be lost the next time context is cleared. Same need already addressed the same way in the
companion git-redundancy, home-fleet, and branching-video projects.

The recognized format is the **ADR** (Architecture Decision Record, Nygard 2011), commonly
written with the **MADR** Markdown template.

## Decision
Keep an ADR log under `docs/adr/`, one file per decision, MADR-lite template (see
`README.md`). ADRs are immutable in substance — supersede rather than rewrite.

## Consequences
- The *why* behind the provability tier, the data-layer stub, and the supply-chain setup is
  preserved and reviewable in-repo, alongside the code it governs.
- Small per-decision overhead; a supersession chain instead of edits.
