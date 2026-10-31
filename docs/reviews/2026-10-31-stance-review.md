# Stance review — 2026-10-31
- Reviewer: Claude (Opus 5.5), for Ryan, as gap 8 of the [2026-10-31 compliance review](../compliance/2026-10-31.md)
- Previous: first

## Checked

Against the template's current checklist (`.claude/skills/stance-review/SKILL.md`, brought up to
the template's version in this same change).

1. **Every ADR read; promotion conditions.**
   - ADR-0001 (provable-lite, no Rust): revisit on a real safety-critical or data-integrity
     invariant, most likely from the sync model. The sync model is still undecided (PROGRESS),
     and the core has gained no such invariant. **Checked, unchanged.**
   - ADR-0003: log compaction "deferred until it matters". No size problem reported. **Unchanged.**
   - ADR-0004: "revisit if check-ins need fields time logs shouldn't have". None has. **Unchanged.**
   - ADR-0005: still **Proposed** since 2026-07-17; it is Phase 2, the next feature. Not stale,
     but not decided either.
   - ADR-0015: revisit if a compromise slips through a one-day window. None known. **Unchanged.**
2. **"Not yet / revisit later" claims, against current sources.**
   - ADR-0003 line 72: "The current in-memory stub stays until the sync decision lands." **Stale.**
     The IndexedDB store was built on 2026-07-10 (`src/shell/storage.ts:52`,
     [journal 2026-07-10-1](../journal/2026-07-10-1-week-config-license-idb-store-and-youtube-scope.md))
     without the sync decision. That choice is recorded in the journal, not an ADR.
   - ADR-0009: a behaviour-analysing risk tool (Socket.dev or equivalent) "remains unwired",
     tracked as a gap rather than a decision. Still unwired.
   - ADR-0013: git-redundancy "should adopt the same change; until it does, the fleet is
     inconsistent". Still true: 16 `uses:` lines in `~/Development/git-redundancy/.github/workflows/ci.yml`
     are not SHA-pinned. Outside this repo; noted only.
3. **Config against the package manager's current baseline.** Source:
   https://pnpm.io/supply-chain-security, read 2026-10-31. Its baseline is `allowBuilds`,
   `strictDepBuilds` (on by default), `blockExoticSubdeps`, `minimumReleaseAge` (1440),
   `trustPolicy: no-downgrade`, plus `trustPolicyExclude`, `trustPolicyIgnoreAfter` and
   `namedRegistries` for special cases. We set all of the baseline explicitly except
   **`strictDepBuilds`**, which ADR-1016 says to state even at its default. **Fixed in this
   change** (`pnpm-workspace.yaml`, no lockfile change). The special-case settings aren't needed.
4. **Advisories.** Cleared the same day in PR #2 (14 since 2026-10-14, incl. the glob/minimatch
   pair). `pnpm audit`: none; the OSV container: no issues. **Unchanged after that fix.**
5. **Rigor tier.** The core's last substantive change predates this review by weeks; nothing in it
   wants a proof over a property test. **Unchanged.**
6. **Template drift.** No `template` remote until today; added
   (`https://github.com/randallard/cr-ci-cd-rust-typescript-template.git`, `main` at `12f6468`).
   cycle-in shares no history with the template, so `HEAD..template/main` lists the template's
   whole history; the meaningful check is the inherited ADRs. `docs/adr/1000`–`1017` were all
   missing; **copied in by this change**, byte-identical to `template/main`. None newer exists.
7. **Last review's deferrals.** First review.
8. **Package-manager majors (ADR-1016).** **pnpm 12 is out** (12.0.0 on 2026-08-26, latest
   12.16.1); we pin `pnpm@11.5.3` (2026-06-10; latest 11.x is 11.28.9). Source: the v12.0.0
   release notes, https://github.com/pnpm/pnpm/releases/tag/v12.0.0, read 2026-10-31. Nothing in
   them renames or removes a setting we use; the one that could bite (unrecognised workspace
   settings now fail) didn't. **Tried, not adopted:** pnpm 12.16.1 on a throwaway `git archive`
   export, outside the repo, scripts off (ADR-0012). It ships as a native binary fetched on first
   run. A `--frozen-lockfile` install fails, because changing `packageManager` is itself a
   lockfile change in 12 (`packageManagerDependencies`). Unfrozen, it installs with no
   unrecognised-setting errors, and lint, 113 tests and the build pass; the lockfile loses its
   `settings:` block and gains the package-manager entry.

## Findings

1. **ADR-0003's storage sentence is stale**: IndexedDB was adopted ahead of the sync decision and
   recorded only in a journal.
2. **pnpm 12** is viable here but means a regenerated lockfile and a `packageManager` bump: a
   deliberate move, not a Renovate bump.
3. **`strictDepBuilds`** wasn't stated (fixed).
4. **A behaviour-analysing risk tool** is still unwired (ADR-0009's acknowledged gap).

## Actions

- **Done here:** `strictDepBuilds: true`; the inherited ADRs, a `template` remote, and the
  current stance-review and project-conventions skills.
- **Proposed ADRs, waiting on Ryan** (a stance change is his call):
  - a new ADR recording IndexedDB as the store ahead of the sync decision, superseding ADR-0003's
    storage paragraph;
  - an ADR to move to pnpm 12, with the lockfile regenerated in its own PR.
- **Deferred:** the risk-heuristic tool. Next look: if a compromise reaches a dependency we use
  within the one-day gate, or at the next stance review, whichever comes first.
- **Noted for elsewhere:** git-redundancy's unpinned actions (ADR-0013's consequence).
