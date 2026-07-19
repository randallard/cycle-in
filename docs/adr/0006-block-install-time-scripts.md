# ADR-0006: Block install-time script execution
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
Supersedes decision 1 of [ADR-0002](0002-npm-supply-chain-discipline.md), unchanged in
substance. ADR-0002 bundled eleven decisions into one file, which made it impossible to
supersede any single one of them — so when the supply-chain stance moved, the only available
move was editing that file in place, which is exactly what happened and exactly what the ADR
conventions forbid. This ADR and 0007–0013 split it so each decision can move independently.

Install-time scripts are the dominant execution vector for npm-ecosystem malware: a compromised
package runs arbitrary code the moment it lands, before anything imports it.

## Decision
Block install-time scripts by default.

- `.npmrc`: `ignore-scripts=true`.
- pnpm's own native-build-script gate — a separate, newer mechanism from classic
  `ignore-scripts` — configured explicitly in `pnpm-workspace.yaml`, **not** `package.json`'s
  `pnpm` field, which pnpm 11 silently ignores (confirmed via its own warning: `"pnpm" field in
  package.json is no longer read`).
- `allowBuilds` lists reviewed exceptions individually. Currently exactly one: `libxmljs2:
  false` — an optional peer of the CycloneDX tooling we no longer use (see
  [ADR-0010](0010-sbom-via-syft.md)), needed only for XML-format SBOM output we never asked
  for. Deliberately left blocked and documented, not silently skipped.

Any future exception is reviewed on its own merits before being added. Never blanket-approved.

## Consequences
- The most common malware vector is closed for anything installed into this project.
- A dependency that genuinely needs a native build step becomes a visible decision rather than
  an invisible default.
- **This protects installs into *this project* and nothing else** — tooling installed beside
  the repo is out of reach of `.npmrc` entirely. That gap is addressed separately in
  [ADR-0012](0012-protect-tooling-installed-beside-the-repo.md), because it turned out to need
  a different mechanism.
