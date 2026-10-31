# 2026-10-31 (5) — pnpm 12, and the scanner that read half a lockfile

Documents `b299c58` (branch `pnpm-12`): [ADR-0021](../adr/0021-move-to-pnpm-12.md) carried out.

## The move

pnpm 12.17.0 (published 2026-10-30 14:23 UTC, past the one-day gate), fetched into the scratchpad
with `npm pack --ignore-scripts` and run from there, never installed globally. `packageManager`
to `pnpm@12.17.0`, `engines.pnpm` from `>=9.0.0` to `>=12`, then `pnpm install
--no-frozen-lockfile`. pnpm said "Lockfile is up to date, resolution step is skipped", and a
diff of every `name@version` in the lockfile before and after showed **no dependency changed**.
The only additions are pnpm's own: `packageManagerDependencies` with `pnpm@12.17.0` and its 15
platform binaries (`@pnpm/exe.*`).

## The gate that would have lied

Every gate passed under pnpm 12, including OSV: "No issues found". But the line above it said
**"found 16 packages"**, where every earlier scan found around 296. pnpm 12's lockfile is two
YAML documents (`---` at lines 1 and 183): the package manager's entries, then the project's.
OSV-Scanner v2.3.8, the version CI pins, reads only the first, so it scanned pnpm and its
binaries and none of our dependencies. Merged as it was, the OSV job would have stayed green
indefinitely while checking nothing that matters.

v2.7.0 (the version Renovate had just moved branching-video to) reads both documents: 307
packages, the old lockfile's 291 plus pnpm's 16. So the reusable workflow moved to v2.7.0 in
the same commit, pinned to `b1d267a` (the annotated tag dereferenced to its commit, matching
branching-video's pin), with a comment saying why it can't go back. The conventions skill's
local OSV command moved to v2.7.0 too, and now says to read the package count, not just the
verdict.

The lesson is the one the skill already states about unrunnable gates, in a new form: a gate
can run, pass, and still be checking the wrong thing. The count is the tell.

## Corrections to ADR-0021

ADR-0021 is accepted, so corrections go here:

- Its consequence that the native binary is "a download outside the lockfile's integrity
  hashes" is **wrong** once the lockfile records it: each `@pnpm/exe.*` entry carries a `sha512`
  integrity hash.
- It didn't foresee the scanner problem. Its gate list ("OSV scan of the new lockfile") is what
  caught it, but only because the package count was read.

One oddity, not a problem for the repo: run from the scratchpad (no project), the pnpm 12
entry point printed 11.5.3. pnpm 12 follows the nearest project's pin, and outside one it
deferred to another installed pnpm. Inside the repo, with the pin at 12.17.0, it ran 12.17.0.

## For the other repos

Every repo built from the template pins OSV v2.3.8 (the template itself too) and will hit this
the day it moves to pnpm 12. branching-video is already on v2.7.0 via Renovate. The template
should move to v2.7.0 before any project does.

## Next

Merge this PR and watch the `main` run's OSV job report about 307 packages. Then install the
Renovate app; then Phase 2 (ADR-0005).
