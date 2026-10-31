# 2026-10-31 — first compliance review, and the first four gaps closed

Documents `a5da96a`, `e0256a3`, `0a9a806` (on PR #2, `age-gate-one-day`) and `d6c06a7`
(`ci-timeouts-node24-secret-scan`, stacked on #2).

## The review

Ryan asked for a compliance review before picking cycle-in back up; it's the first
([`docs/compliance/2026-10-31.md`](../compliance/2026-10-31.md)). The core and the supply-chain
gates hold up: no IO in `src/core`, reducer properties over generated event sets, strict tsconfig
and lint, exact pins, install scripts blocked, SHA-pinned actions. What lags is everything the
template has gained since cycle-in converged on it in September: none of the inherited
`1000`–`1017` ADRs, a `project-conventions` skill at 117 lines against 262, and the gaps below.
Nine in all; Ryan chose to fix 1 inside PR #2, then 2–4 as one CI change.

## Gap 1: PR #2 emptied `renovate.json` (`a5da96a`)

`c26f77b` (10-14) was meant to change Renovate's `minimumReleaseAge` from 14 days to 1 (ADR-0015).
Its stat shows `renovate.json | 8 --`: the file went to 0 bytes. #2 sat green for two weeks with
that in it, because nothing in CI reads the file and Renovate isn't installed yet. Merged, the
first thing Renovate would have met was an empty config. Restored with `"1 day"`, plus what
branching-video's config learned today: action digests pinned to semver, and a `packageRules`
entry that keeps Renovate off the override ranges and the `engines` floor (pinning `engines` to
the latest release is what failed branching-video's own "pin dependencies" PR). The validator
passes.

## Two weeks of advisories (`e0256a3`)

#2 had been green against the advisory databases of 10-14. Against today's: 14 more, the same
set branching-video cleared this morning (vite, `@vitest/mocker`, undici, glob, minimatch). Same
fix: vite 8.1.6, vitest 4.1.12, undici's override to 6.29.1, and the bounded cross-major
overrides for glob (13 → 14) and minimatch (10 → 11). Checked first that the lockfile has no
minimatch 3 (it doesn't), which is the thing that made the-lot and square-one ignore minimatch
instead. Every gate run locally, the OSV container included, and the built site loaded in
headless Chromium on a spare port: the board renders and the console has no errors.

## Gaps 2–4 (`d6c06a7`)

- **Timeouts (ADR-1005)** on every job, as the template sets them: 15 minutes, Kani 30.
  `osv-scan` calls a reusable workflow, where GitHub rejects `timeout-minutes`, so it gets the
  template's comment instead.
- **Node 24 (ADR-1013)** in both `setup-node` steps, and the `engines` floor to `>=24.0.0`.
- **Secret scan:** the template's job verbatim (gitleaks 8.30.1 fetched and checked against a
  pinned SHA-256, full history, `--redact`), and `deploy` now waits on it. Before adding a gate
  that could go red on day one, the same binary and checksum were run over all 28 commits
  locally: no leaks. `.env.example` says in one comment that the app needs no secrets.

actionlint is clean on the changes; its one note is a shellcheck *info* on `stance-review.yml`
that predates this.

## Also

#2 carries `e7b96fe` (09-30, "progress"), which was on `data` but never on GitHub. Merging #2
puts it there.

## Next

Merge #2, then the CI PR (rebased onto `main` once #2 lands). Then the remaining review gaps:
5 (ADR-0004's amended block becomes a superseding ADR), 6 (Ryan's answers on the strictness
extras, an `any` registry, and a11y lint), 7 (copy in the inherited ADRs and the current skill;
add a `template` remote), 8 (a first stance review), 9 (optional: drop the Rust jobs). The
standing to-dos stay as they were: the `DEPLOY_PAGES` variable, installing Renovate (its config
is now valid), then Phase 2 (ADR-0005).
