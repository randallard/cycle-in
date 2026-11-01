# 2026-11-01 (1): the second compliance review, and its gaps

Ryan ran `gr sync` to bring in the template's ADR-1019 (HTTP APIs linted against a vendored
`api-standards` ruleset), then asked for compliance reviews of this repo and branching-video,
followed by fixes for the gaps.

## The review

[compliance/2026-11-01.md](../compliance/2026-11-01.md). All nine gaps from 2026-10-31 are fixed.
`main`'s OSV job (run 41233844550) read 307 packages, which answers the "confirm ~307" check left
open after the pnpm 12 move. Two new gaps were found: the template had added ADR-1018 (10-31) and
ADR-1019 (11-01) since the last inheritance, and ADR-0004's Status line didn't point at 0016/0017.

## The fixes

- **ADRs 1018 and 1019** (`9586dbd`) were copied in byte-identical with their index rows, along with
  the template's `stance-review` (new check 9, the HTTP API standard). `project-conventions`
  stays tailored to cycle-in. Its OSV paragraph now cites ADR-1018 beside ADR-0021, and it gains
  the template's "HTTP APIs" section. There's no `api-lint` job or `.spectral/`, because cycle-in
  has no OpenAPI document and calls no HTTP API (`fetch(` appears nowhere in `src/`).
- **ADR-0004's Status: gap withdrawn.** The proposed Status ("Accepted; the 2026-07-18 amended
  block is superseded by ADR-0016 and ADR-0017") fails docs-hygiene, whose status grammar is
  Proposed, Accepted, Deprecated or "Superseded by ADR-NNNN" and has no partial form. The repo
  already has a convention for partial supersession, the one ADR-0020 applies to ADR-0003:
  Status stays Accepted, and the pointer lives in the index row and in the superseding ADRs. ADR-0004
  already has both: `adr/README.md` reads "Accepted; amended block → 0016, 0017", and 0016/0017
  each say they record the block. The review should have checked the linter before proposing a
  Status change. If a reader of 0004 alone should see the pointer, the change belongs in the
  template's docs-hygiene (a "superseded in part by" status), not here.

## Next

Merge the PR, install the Renovate app, then Phase 2 (ADR-0005).
