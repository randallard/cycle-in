# 2026-10-14 — the age gate moves to one day; clearing twenty advisories

Ryan remembered the 14-day gate had been judged overkill elsewhere. It had: `the-lot` and
`square-one` run 1 day, pnpm's recommendation. [ADR-0015](../adr/0015-one-day-age-gate.md)
supersedes ADR-0008's number (the layering stays). Same decision as branching-video's ADR-0030.

Checking state before changing anything: the dated ignores from 2026-09-18 had expired on
09-28/29 and nothing replaced them, so `main` carried 20 advisories and CI would have been red.
With the 1-day gate every patched version installs. Fixed with overrides scoped to the major
already resolved (`undici` 6.28.1, `brace-expansion@5`, `ip-address`, `http-cache-semantics`,
`source-map-js`, `postcss-selector-parser@7`) plus a direct bump of `vitest` 4.1.8 → 4.1.11 for
the `@vitest/mocker` advisory. `osv-scanner.toml` and the `auditConfig` ignore list are gone.

Verified locally: `pnpm audit` (none), OSV scanner (none), lint, tsc, 113 tests, build,
docs-hygiene. Still open from before: the `DEPLOY_PAGES` repo variable (the live site is not
deploying until it is set) and Renovate not being installed on this repo.
