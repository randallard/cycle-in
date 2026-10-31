# 2026-10-31 (3) — correction: `DEPLOY_PAGES` was never owed

Corrects [2026-10-31](2026-10-31-compliance-review-and-first-four-gaps.md) and
[2026-10-31 (2)](2026-10-31-2-compliance-gaps-5-to-9.md), whose "Next" sections both listed
setting the `DEPLOY_PAGES` repo variable as a standing to-do. It wasn't one.

When #4 merged, the `main` CI run's `deploy to Pages` job ran and succeeded, which it only does
when the variable is `true`. `gh variable list` shows `DEPLOY_PAGES true 2026-09-18T18:54:25Z`:
set the same day the 2026-09-18 PROGRESS note warned it wasn't, and never cleared from there. The
live site serves the same asset hashes as a local build of `c3341a2` (`index-BU_lo4uM.js`,
`index-QiMZYzU7.css`), last modified 2026-10-31 18:35 UTC.

How it carried forward: the 09-18 warning sat in PROGRESS, the 10-14 status line repeated it,
and both of today's entries copied it from PROGRESS without checking the setting itself. The
claim was cheap to verify and nobody did. PROGRESS now marks the warning resolved and its
top line says so.

The merges themselves: #2 (`03cfbed`), #3 (`db53e4e`), #4 (`c3341a2`), in that order. CI on
`main` passed every job, the secret scan and axe included. Local `main`, `data` and `data-lan`
all at `c3341a2`.

## Next

Ryan decides the stance review's two proposed ADRs; install the Renovate app; Phase 2 (ADR-0005).
