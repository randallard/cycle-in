# 2026-07-08 (later still) — CI fixes, confirmed live

Documents `69b87ba` (initial scaffold), `b0d7bc5`, and `01b69af`.

The initial push (`69b87ba`) failed before any job even ran — GitHub's own validation error,
fetched directly from the Actions UI rather than guessed at: the OSV-Scanner reusable-workflow
job needed `actions: read` + `security-events: write`, but the workflow's top-level
`permissions: contents: read` denies everything not explicitly listed once set at all. Fixed
(`b0d7bc5`) by granting those two plus `contents: read` on just that job.

The next push actually ran jobs, but `build + test` and `supply-chain` both failed at
`actions/setup-node@v6`: pnpm 11.5.3 requires Node ≥22.13, and the workflow had Node 20 pinned
— an error (`ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`) that never surfaced locally, since this
machine runs Node 24. Fixed (`01b69af`) by bumping both jobs to Node 22 and correcting
`package.json`'s `engines.node` (`>=20.0.0` → `>=22.13.0`), which had been quietly wrong.

Also configured GitHub Pages itself via the API (`gh api -X POST repos/randallard/cycle-in/
pages -f build_type=workflow`) rather than needing a manual dashboard click, since the repo had
never had Pages enabled before.

Third push: all four jobs green — build/test, supply-chain, OSV-Scanner, deploy. Confirmed the
site is actually live, not just "deploy step succeeded": `curl`'d
`https://randallard.github.io/cycle-in/` (HTTP 200, `<title>cycle-in</title>` present) and its
JS bundle (HTTP 200) directly, rather than trusting the green checkmark alone.
