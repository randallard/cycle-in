# ADR-0010: SBOM via Syft (an Action), not an npm package
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
Supersedes decision 5 of [ADR-0002](0002-npm-supply-chain-discipline.md), unchanged in
substance. See [ADR-0006](0006-block-install-time-scripts.md) for why 0002 is being split.

The initial design assumed a direct analogue to git-redundancy's `cargo-cyclonedx` — an npm
package that generates the SBOM. Two candidates failed against the real project:

- **`@cyclonedx/cyclonedx-npm`** shells out to `npm ls` internally, which doesn't understand
  pnpm's non-hoisted `node_modules` layout. Fails outright
  (`ERR_PNPM_VERIFY_DEPS_BEFORE_RUN` / `npm-ls exited with errors`), no SBOM produced.
- **`@cyclonedx/cdxgen`**, tried as the fix, turned out to be a far heavier multi-language
  tool — it downloads a platform-specific native binary
  (`@cdxgen/cdxgen-plugins-bin-linux-amd64`) and a Java-based deep-analysis component
  (`@appthreat/atom`). That download timed out repeatedly. Bigger attack surface than a small
  static site's SBOM warrants, and still unreliable.

Both were reverted after real failures observed in actual install/build runs, not predicted
from documentation.

## Decision
Generate the SBOM with **`anchore/sbom-action`** (wrapping Syft — a single static Go binary,
industry standard) as a GitHub Action, in CycloneDX JSON format, uploaded as a build artifact.

It scans the project directly, with **no npm devDependency at all**.

## Consequences
- Sidesteps the entire class of package-manager-layout problem, because nothing about it goes
  through npm or pnpm.
- One less dependency in the tree, which is its own supply-chain win — the SBOM tool is not
  itself part of the software it describes.
- The tool ended up being the *opposite* of what the plan assumed: an external Action rather
  than an npm devDependency. Worth remembering that "match the other ecosystem's tool" is a
  hypothesis, not a design.
