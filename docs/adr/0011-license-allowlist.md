# ADR-0011: License allowlist for transitive dependencies
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
Supersedes decision 6 of [ADR-0002](0002-npm-supply-chain-discipline.md), unchanged in
substance. See [ADR-0006](0006-block-install-time-scripts.md) for why 0002 is being split.

cycle-in is MIT-licensed and meant to be forked. A copyleft or otherwise incompatible license
arriving five levels deep in the dependency tree is the kind of problem that's cheap to prevent
and expensive to discover late.

git-redundancy enforces the equivalent through `deny.toml`'s `[licenses]` block; this is the
npm-ecosystem counterpart.

## Decision
Enforce an allowlist in CI via `license-checker-rseidelsohn`, with
`--excludePrivatePackages`. Anything outside the list fails the build.

Current list, each entry added only after confirming what pulled it in with `pnpm why`:

`MIT` · `Apache-2.0` · `BSD-2-Clause` · `BSD-3-Clause` · `ISC` · `0BSD` · `CC0-1.0` ·
`Python-2.0` · `BlueOak-1.0.0` · `MPL-2.0` · `CC-BY-3.0`

Three needed growing beyond git-redundancy's Rust-crate list, and were checked individually:

- **`Python-2.0`** — `argparse`, via `js-yaml`
- **`BlueOak-1.0.0`** — `chownr` and similar isaacs-maintained packages
- **`CC-BY-3.0`** — `spdx-exceptions`; metadata, not executable code

## Consequences
- A license problem surfaces at the PR that introduces it, when it's one revert away.
- The list grows over time, and each addition is a small deliberate act — that friction is the
  feature. Adding an entry without running `pnpm why` first defeats the purpose.
- Only covers *declared* licenses. A package that misdeclares isn't caught here, and nothing
  in this posture catches that.
