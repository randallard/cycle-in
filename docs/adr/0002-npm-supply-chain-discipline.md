# ADR-0002: npm-ecosystem supply-chain discipline
- Status: Superseded by [ADR-0006](0006-block-install-time-scripts.md),
  [0007](0007-pin-exact-versions-restrict-registry.md),
  [0008](0008-age-gate-dependency-admission.md), [0009](0009-ci-vulnerability-scanning.md),
  [0010](0010-sbom-via-syft.md), [0011](0011-license-allowlist.md),
  [0012](0012-protect-tooling-installed-beside-the-repo.md), and
  [0013](0013-pin-actions-to-commit-shas.md)
- Date: 2026-07-08 (amended 2026-07-18 — decision 10, the scope boundary of `ignore-scripts`)
- Deciders: Ryan

> **Split on 2026-07-18.** This file bundled ten decisions, which made none of them
> individually supersedable — so when the stance moved, the only available move was editing it
> in place, and that amendment (decision 10, and the header line above) is the violation of
> our own immutability convention that prompted the split. The body below is left exactly as
> it was committed, including the amendment, because rewriting it would compound the error.
> Every decision here is carried forward, one per file, in ADR-0006 through 0013. Only
> **0013 changes anything** — it reverses decision 8's tag-pinning in favour of commit SHAs.

## Context
Ryan asked directly, while scaffolding this repo: are we guarded against supply-chain
attacks — no install-time scripts running unreviewed, checking for recent compromises, and not
pinning packages that are suspiciously new? git-redundancy already has an answer for Rust
(`deny.toml` + CI: `cargo-deny` for advisories/licenses/bans/sources, `cargo-vet` for
human-reviewed trust, `cargo-cyclonedx` for an SBOM — see git-redundancy's ADR-0004 and
`deny.toml`). `cycle-in` has no Rust (ADR-0001), so this needed a from-scratch npm-ecosystem
equivalent, matched in spirit rather than copied line-for-line.

Two tools picked during initial design didn't survive contact with the real project:
- **`@cyclonedx/cyclonedx-npm`** (the direct `cargo-cyclonedx` analogue) shells out to `npm ls`
  internally, which doesn't understand pnpm's non-hoisted `node_modules` layout — it fails
  outright (`ERR_PNPM_VERIFY_DEPS_BEFORE_RUN` / `npm-ls exited with errors`), no SBOM produced.
- **`@cyclonedx/cdxgen`**, tried as the fix, turned out to be a much heavier multi-language tool
  than expected — it tries to download a platform-specific native binary
  (`@cdxgen/cdxgen-plugins-bin-linux-amd64`) and a Java-based deep-analysis component
  (`@appthreat/atom`); that download timed out repeatedly in practice. Bigger attack surface
  than warranted for a small static site's SBOM, and still unreliable.

Both were reverted after real (not hypothetical) failures — verified via actual `pnpm install`/
build runs, not assumed from documentation.

## Decision
1. **Block install-time scripts.** `.npmrc`: `ignore-scripts=true`. Additionally, pnpm's own
   native-build-script gate (a separate, newer mechanism from classic `ignore-scripts`) is
   configured explicitly in `pnpm-workspace.yaml` — **not** `package.json`'s `pnpm` field,
   which pnpm 11 silently ignores (confirmed via its own warning: `"pnpm" field in package.json
   is no longer read`). `allowBuilds` lists exactly one reviewed exception: `libxmljs2: false`
   — an optional peer of the (unused, replaced — see below) CycloneDX tooling, needed only for
   XML-format output we never asked for; deliberately left blocked, not silently skipped.
2. **Pin exact versions, restrict the source.** No `^`/`~` ranges in `package.json`. `.npmrc`:
   `registry=https://registry.npmjs.org/`. `pnpm-lock.yaml` committed; CI installs with
   `--frozen-lockfile`.
3. **Age-gated the initial pins**, verified against the live registry on 2026-07-08 — the
   newest *stable* release of each package that was at least ~30 days old, explicitly skipping
   anything newer, prerelease, or a suspiciously-fresh major bump (e.g. `typescript` pinned to
   `6.0.3`, 83 days old, while `7.0.x` had been published *that same day*):

   | Package | Pinned | Published | Age |
   |---|---|---|---|
   | `vite` | `8.0.16` | 2026-06-01 | 37d |
   | `typescript` | `6.0.3` | 2026-04-16 | 83d |
   | `vitest` | `4.1.8` | 2026-06-01 | 37d |
   | `fast-check` | `4.7.0` | 2026-04-17 | 82d |
   | `eslint` | `10.4.1` | 2026-05-29 | 40d |
   | `typescript-eslint` | `8.60.1` | 2026-06-01 | 37d |
   | `@eslint/js` | `10.0.1` | 2026-02-06 | 152d |
   | `license-checker-rseidelsohn` | `5.0.1` | 2026-05-27 | 42d |

4. **CI vulnerability scanning:** `pnpm audit --audit-level=high`, plus Google's OSV-Scanner
   reusable workflow (`google/osv-scanner-action/.github/workflows/osv-scanner-reusable.yml`) —
   different advisory sources (npm/GHSA vs. OSV.dev).
5. **SBOM via Syft, not an npm package.** After both CycloneDX npm tools failed in practice,
   switched to **`anchore/sbom-action`** (wraps Syft, a single static Go binary, industry-
   standard) as a GitHub Action — it scans the project directly with no npm devDependency at
   all, sidestepping the whole class of pnpm-compatibility problem.
6. **License allowlist**, mirroring `deny.toml`'s `[licenses]` block, via
   `license-checker-rseidelsohn`. Had to grow beyond git-redundancy's Rust-crate allowlist to
   cover real transitive npm dependencies, each checked individually: `Python-2.0` (`argparse`,
   via `js-yaml`), `BlueOak-1.0.0` (`chownr` and similar isaacs-maintained packages),
   `CC-BY-3.0` (`spdx-exceptions`, metadata not executable code) — all legitimate permissive/
   open licenses, added after confirming what pulled them in via `pnpm why`.
7. **Ongoing updates stay age-gated too:** `renovate.json` with `"minimumReleaseAge": "14
   days"` — the standing version of practice #3, not a one-time check at scaffold time.
8. **Third-party GitHub Actions pinned to major-version tags**, matching git-redundancy's own
   established convention exactly (`EmbarkStudios/cargo-deny-action@v2`,
   `taiki-e/install-action@v2`, etc. — not SHA-pinned). Versions verified against the real
   GitHub API at scaffold time (`gh api repos/<owner>/<repo>/releases`) rather than assumed from
   training-data knowledge, which was stale for several of them (e.g. `actions/checkout` is
   `v7`, not `v4`).
9. **No Socket.dev or equivalent risk-heuristic tool wired in yet** — flagged as worth adding
   (it's the piece that could catch an in-progress compromise, which audit/OSV can't, since
   they only know about already-disclosed CVEs), but not set up this round; revisit later.
10. **Throwaway tooling installed *beside* the repo must pass `--ignore-scripts` explicitly**
    (added 2026-07-18). Decision 1's `ignore-scripts=true` protects installs **into this
    project** and nothing else. Verification tooling — headless-browser drivers, one-off
    analysis scripts — is deliberately installed outside the repo so it never enters
    `package.json` or the lockfile, and that same separation puts it outside `.npmrc`'s reach.

    **Copying `.npmrc` into the scratch directory does not close this**, which is the part
    worth writing down, because it's the obvious move and it fails silently: npm honours a
    directory-local `.npmrc` only once that directory is a **package root**. A bare `npm i` in
    an empty directory creates `package.json` *as part of* the install, and config is resolved
    before that — so `ignore-scripts=true` sitting right there is never read.

    Verified against a fixture package whose `postinstall` touches a file, rather than reasoned
    from the docs (same standard as the tool failures above):

    | Approach | `postinstall` |
    |---|---|
    | `.npmrc` copied into an empty dir, then `npm i` | **ran** |
    | `npm i --ignore-scripts` | blocked |
    | `package.json` seeded first, then `.npmrc`, then `npm i` | blocked |

    So: pass the flag. Seeding `package.json` + `.npmrc` alongside it is worth doing so any
    *later* install in that directory is covered, but the flag is the part that can't be
    defeated by ordering. The recipe lives in `.claude/skills/verify/SKILL.md`, where the
    installs actually happen.

## Consequences
- Matches git-redundancy's supply-chain posture in spirit — advisories, licenses, sources,
  SBOM, age-gating — without pretending an npm-ecosystem tool exists for every Rust-ecosystem
  one it's modeled on.
- The SBOM tool ended up being the *opposite* of what the initial plan assumed (an external
  Action instead of an npm devDependency) — a reminder that "matches the other ecosystem's
  tool" isn't guaranteed to survive contact with a different package manager's layout.
- `pnpm-workspace.yaml`'s `allowBuilds`/`onlyBuiltDependencies` is the durable home for any
  future native-build-script exception — review each one individually before adding it, same
  bar as the license allowlist.
- Socket.dev (or equivalent) remains a real gap versus `cargo-vet`'s human-reviewed trust model
  — the closest thing to "is this specific package compromised right now," which nothing else
  here covers.
- **The posture has an edge, and it's where the tooling is, not where the code is.** Decision 10
  came from noticing after the fact that a verification session had run `npm i` in a scratch
  directory with no protection in force. Nothing executed (the package declares no scripts), but
  the gap was real, and the intuitive fix didn't work. Worth generalising: a control attached to
  a *file in the repo* stops at the repo boundary, while the work doesn't — so any new habit
  that installs something adjacent to the project needs its own answer, not an assumption that
  the project's answer travels with it.
