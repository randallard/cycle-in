# 2026-09-18-4 — osv-scan fails on any severity, not just high

Ryan pushed the previous fix commit to GitHub and CI failed again — `ts supply chain` passed
this time (the 5-GHSA ignore worked), but `OSV scan` still failed, and **`deploy to Pages`
actually ran and succeeded anyway**, since the template's `deploy` job only depends on
`[ts-gates, ts-supply-chain]`, not `osv-scan`. So the site is live; the gate itself was still
red.

## What the previous local check actually proved, and what it didn't

I'd verified the fix with `docker run ... ghcr.io/google/osv-scanner:v2.3.8 -r ./` and gotten
exit 0, and read that as "the OSV gate will pass." Wrong comparison. That command runs the bare
scanner with no `--fail-on-vuln` flag, which doesn't fail on findings by itself — it just
reports them. The actual CI job (`google/osv-scanner-action`'s reusable workflow) runs a
*different* binary from a *different* image (`osv-reporter`, bundled only in
`osv-scanner-action`, not in the plain `osv-scanner` image scripts/docs-hygiene's sibling skill
names) with `--fail-on-vuln=true` explicitly set — confirmed by reading the actual job log's
`Inputs` block this time rather than assuming. That flag fails on **any** severity present in
the results, not just High/Critical. The 8 Medium findings I'd deliberately left alone last
entry ("none of this blocks the deploy") were the actual cause of the second failure — that
claim was wrong, checked against the wrong local reproduction.

Lesson worth keeping: "I ran a command with the same name" isn't the same as "I ran the gate."
`project-conventions/SKILL.md` already says this ("run what CI runs, not a hand-rolled
approximation") — I'd followed the letter of it and missed that the specific image/flags matter
as much as the command name.

## The actual fix

Re-checked each of the 8 Medium findings' patch age against the 14-day gate, same method as
before (`npm view <pkg>@<version> time.modified`):

- **postcss (8.5.18 → 8.5.23)** — the version I'd just bumped to already had a *newer* advisory
  (GHSA-fxqj-rqcc-2cmp) with a patch published 2026-09-03, already 15 days old. Bumped again.
- **undici (6.27.0 → 6.28.0)** — transitive via `license-checker-rseidelsohn`'s chain, same
  reason a plain update wouldn't reach it as postcss/tar. Patch published 2026-09-04, clears 14
  days by a few hours as of today. Added an override.
- **nanoid — needed nothing.** `pnpm why nanoid` after the postcss bump showed it resolving to
  `3.3.18` already: postcss@8.5.23's own dependency range picks it up as a side effect. Checked
  rather than assumed — removed the two now-unused nanoid ignore entries `osv-scanner` itself
  flagged ("has unused ignores") rather than leaving dead config around.
- **ip-address (two more, older, Medium: GHSA-22jq-vg5j-6vgg, GHSA-4xrf-jv44-h6hh) and
  vitest/@vitest/mocker (GHSA-82fw-gwwq-j7x9)** — patches published 2026-09-15, still inside the
  14-day window. Added to the ignore list in both files, same `ignoreUntil` discipline as
  before.

Verified this time against the actual failure condition: the plain scanner run now reports **"No
issues found"** with zero unused-ignore warnings, and `pnpm audit --audit-level=high` still
exits 0 (3 high / 4 moderate, all accounted for by the ignore list).

## Where this leaves things

`osv-scanner.toml` now carries 6 dated, self-expiring ignores (down from an initial 5, after the
nanoid pair dropped out and 3 more Medium findings got added): the last one clears 2026-09-29.
Nothing here is a standing decision — it's a quarantine with a known end date, same shape as
ADR-0008 anticipated, just exercised for real for the first time. Renovate installation remains
the actual fix for "this keeps happening quietly"; noted again, not re-argued.
