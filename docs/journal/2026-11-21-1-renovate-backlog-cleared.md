# 2026-11-21: the Renovate backlog, cleared

Three weeks of Renovate PRs (16 open) merged at Ryan's ask: *"I do want you to go ahead with the
easy PR's"*. Also a correction: **Renovate is installed.** It has been opening and rebasing PRs since
2026-11-02 (#17 onward). The "install the Renovate app" item carried in PROGRESS since July is done.

## Merged (squash), `main` CI green after the last

#17 checkout v7.0.1 (merged 11-02), #18 deploy-pages 5.0.1, #19 upload-artifact 7.0.2, #20
sbom-action 0.24.3, #21 fake-indexeddb 6.2.8, #23 eslint 10.15.0, #24 fast-check 4.10.3, #25
typescript-eslint 8.73.0, #26 vite 8.3.8, #27 pnpm/action-setup 6.1.1, #28 setup-node v7.1.0
(major; branching-video already runs it), #29 vitest 5 (major; green, unit and e2e), #31
osv-scanner-action 2.7.1 (ADR-1018's floor is 2.7.0), #32 @playwright/test 1.65.1.

Closed as duplicates: #13, #15, #22 (Renovate, once the version PRs for the same actions landed),
#16 (by hand, since its digest `73e4699` was already on `main` through #27).

## Two things learned

- **#25's red CI was a withdrawn advisory.** GHSA-fc5q-39xc-vjpf (picomatch ReDoS, no patched
  version) failed `ts supply chain` and OSV on 11-18 02:30; GitHub withdrew it at 15:38 the same
  day. A re-run passed. When an advisory has no patched version, check `withdrawn_at` before
  writing an override or an ignore.
- **The `gh` token can't merge a stale PR that touches `.github/workflows/`.** It lacks the
  `workflow` scope, so GitHub refuses to write the new `ci.yml` a squash onto a moved `main` needs.
  Workflow PRs merged one per Renovate rebase (ticking the rebase checkbox). `gh auth refresh -s
  workflow` removes the limit, and Renovate automerge removes the need.

## Left

- #30 lockfile maintenance: every check green, held by `renovate/stability-days` (the one-day age
  gate, ADR-0015). Merge once it clears.
- Proposed to Ryan, not decided: an ADR for Renovate automerge of green non-major updates, grouped
  weekly, with majors and the ADR-pinned packages staying manual.
- `docs/SETUP.md`'s prerequisites are stale (Node 22.13 and pnpm 11.5.3; now Node 26 and pnpm 12).
