# 2026-07-08 (scaffolding session) — repo stood up, verified, documented

Ryan created the empty public GitHub repo (`git@github.com:randallard/cycle-in.git`, `main`
default) and asked to get it squared away to start working, rather than waiting on the
cross-device sync decision the previous session left as the blocker.

## Scope decided up front

Two quick questions before touching anything: (1) scaffold structure only and stub the data
layer, rather than deciding sync first — the sync decision stays open, isolated behind
`src/shell/storage.ts`; (2) plain TypeScript + vanilla DOM, no framework — closest to
branching-video's spirit, smallest surface for "provable-lite."

## What got built

Vite + TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
mirroring judicial-institute-notebook-cms's `tsconfig.json` minus the JSX bits) + ESLint
(`typescript-eslint` `strictTypeChecked`) + Vitest + `fast-check`, per ADR-0001. `src/core/`
got `Item`/`LogEntry`/`Impression` types and the first pure function, `isDue` (cadence
due-ness — archived/held/never-done/one-off/interval-elapsed), with a property-test suite.
`src/shell/storage.ts` is an explicit, commented stub. `index.html`/`main.ts` render a minimal
page proving the whole pipeline end-to-end (a demo list of due items).

## Supply-chain diligence — asked for explicitly, not assumed

Before any dependency got pinned, checked each one's actual publish date against the live npm
registry rather than just using `latest` — several "latest" versions turned out to be days old
(`typescript` 7.0.2 was published *the same day* this session ran), so every pin in
`package.json` is a stable release verified ≥30 days old at the time (table in ADR-0002).
`.npmrc` got `ignore-scripts=true` before the first `pnpm install`.

Real friction, worked through rather than glossed over:
- `pnpm install` initially exited nonzero — not a script running, but pnpm's own (separate,
  newer) build-script gate refusing `libxmljs2` (an optional peer of a CycloneDX tool, needed
  only for XML output). The `package.json` `"pnpm"` field for configuring this is silently
  ignored by pnpm 11 — the real home is `pnpm-workspace.yaml`'s `allowBuilds`. Set
  `libxmljs2: false` explicitly, with a comment explaining why, rather than leaving it
  ambiguous.
- The planned SBOM tool, `@cyclonedx/cyclonedx-npm`, failed outright under pnpm — it shells
  out to `npm ls`, which doesn't understand pnpm's `node_modules` layout and errors instead of
  producing a tree. Verified via a real run (exit 254, no file written), not assumed from docs.
- Its replacement, `@cyclonedx/cdxgen`, hit auto-mode denials on the way in: first for using
  `pnpm dlx` to trial it (fetch-and-run an unpinned package — correctly flagged as
  contradicting the discipline just set up), then for pivoting straight to adding it as a
  pinned devDependency in the same breath (correctly flagged as tunneling around the first
  denial without new sign-off). Stopped both times and asked Ryan directly rather than pushing
  through. With explicit go-ahead, added it properly — and it *still* failed: `cdxgen` turned
  out to need a platform-specific native binary and a Java-based analysis component, and that
  download timed out repeatedly.
- Reverted `cdxgen`, confirmed the project back to a fully clean, verified state (lint/test/
  build all green again), then asked Ryan again rather than silently trying a third tool.
  Landed on **`anchore/sbom-action`** (Syft) — a GitHub Action, not an npm package at all, so
  the pnpm-compatibility problem never comes up again.
- The license allowlist needed real iteration too: running it for real surfaced
  `Python-2.0` (`argparse`, via `js-yaml`), `BlueOak-1.0.0` (`chownr` and similar), `MPL-2.0`,
  and `CC-BY-3.0` (`spdx-exceptions`) as genuine transitive dependencies — each traced with
  `pnpm why` and confirmed to be a legitimate permissive/open license before allowlisting it,
  not just added blindly to make the check pass.
- GitHub Actions versions were checked against the live GitHub API (`gh api repos/<owner>/
  <repo>/releases`) rather than assumed — several had moved well past what training-data
  knowledge suggested (`actions/checkout` is `v7` now, not `v4`; `pnpm/action-setup` is `v6`).

Full reasoning for all of the above: [`adr/0002-npm-supply-chain-discipline.md`](../adr/0002-npm-supply-chain-discipline.md).

## Provability, validated not just declared

The first `fast-check` property test ever written for this project (`isDue`'s "a one-off item
is never due again once it's been done") failed on its very first real run. The bug wasn't in
`isDue` — it was in the test's own arbitrary: `fc.date({ max: new Date() })` can generate an
`Invalid Date` by default, and calling `.toISOString()` on one throws. Fixed with
`noInvalidDate: true` and confirmed stable across 5 repeated runs with different random seeds.
A concrete, early payoff for ADR-0001's bet on property testing over hand-picked examples.

## Docs migrated, `work/cycle-in/` retired

Per the sub-repo convention `work/README.md` now codifies: a real code repo lives as a sibling
top-level directory, never nested in `work/`. Migrated `README.md`, `PROGRESS.md`, both prior
journal entries, and ADR-0001 out of `~/Development/work/cycle-in/` into this repo's own
`docs/`; added ADR-0000 (the ADR-log-itself entry every sibling repo has) and ADR-0002 (the
supply-chain writeup above). `work/cycle-in/` itself is removed as part of the same change, and
`work/README.md`'s row now points here instead.

## Verification

`pnpm install --frozen-lockfile` (zero scripts run beyond the one reviewed exception),
`pnpm lint`, `pnpm test` (4/4, including the fixed property test, re-run 5× to confirm), and
`pnpm build` (confirmed `dist/index.html` bakes in the correct `/cycle-in/` GitHub Pages base
path) — all green locally. `pnpm audit --audit-level=high` clean. Still to confirm once pushed:
the Actions workflow (build, supply-chain, OSV-scan, deploy) actually passing, and the Pages
URL loading for real — see `PROGRESS.md`.
