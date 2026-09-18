---
name: project-conventions
description: House conventions for cycle-in — ADR and journal discipline, functional core / imperative shell, the provable-lite tier, supply-chain rules. Load before writing an ADR, a journal entry, or any code in the core.
---

# House conventions

Migrated onto `cr-ci-cd-rust-typescript-template`'s conventions (2026-09-18), though the repo
itself predates the template. These rules are opinionated on purpose. They're here so a cold
start — new machine, cleared context — lands on the same path as the last session.

## The shape: functional core / imperative shell

**Non-negotiable, and it's what makes everything else possible.**

- **Core** (`src/core/`) — pure. No IO, no network, no DOM, no clock reads, no randomness. The
  cadence/due-ness calculation, the next-5–10 ranking, the rollups, the BV-bundle mapping — the
  logic actually worth getting right — lives here. This is the target of the property tests.
- **Shell** (`src/ui/`, `src/shell/`) — imperative. IndexedDB, the DOM, file pickers, the export
  bundle's byte-level IO. Covered by integration/component tests, not properties.

If you can't property-test something, ask whether it's core logic tangled with shell concerns.
Usually it is, and untangling it is the fix.

## Provability tier: provable-lite (no Rust)

Decided in [ADR-0001](../../../docs/adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md)
— **read it before assuming this project should grow a Rust/WASM core.** Every sibling project
(git-redundancy, home-fleet) pairs "provable" with Rust; cycle-in deliberately doesn't, because
nothing here rises to a safety-critical invariant. That reasoning still has to hold — it isn't a
default, it's a standing decision with its own promotion condition (a real data-integrity
invariant showing up, most likely from whatever the sync model becomes).

- **TypeScript in `strict` mode** + `noUncheckedIndexedAccess`, ESLint `strictTypeChecked`, zero
  warnings — the compiler and linter as the first check, not memory.
- **`fast-check` property tests on the pure core** — the `proptest` analogue. Write real
  invariants ("an item's next-due date is never before today," "rollup totals across categories
  always sum to the ungrouped total"), not smoke tests.
- **No Kani, no formal proof.** If a genuinely safety-critical invariant emerges, that's a new
  ADR, not a silent retrofit.

## ADRs

Full conventions: `docs/adr/README.md` (cycle-in's own, already matches this pattern). The two
that get violated most:

1. **One decision per file.** ADR-0002 is this project's own cautionary tale — it bundled ten
   decisions and had to be split into 0006–0013 later. If you're writing a numbered list of
   decisions, split it before it lands.
2. **Immutable in substance.** To change a decision, write a *new* ADR and flip the old one's
   Status. **Never add an "amended" block to an accepted ADR** — that's a new decision wearing a
   hat, and it destroys the supersession trail.

Give every ADR a **promotion condition** where one exists. The monthly stance review reads those.

## Journal

`docs/journal/YYYY-MM-DD-N-kebab-title.md`, append-only. Correct mistakes in a later entry,
never by rewriting an old one — the one standing exception is a mechanical broken-link fix,
same as ADRs allow.

Write one when there's reasoning a future reader would have to reconstruct — especially
anything discovered by *running* the thing that tests didn't catch (see the 2026-07-18 Phase 1
browser pass: four real defects, zero of them caught by 104 green tests).

## Verification

Tests passing is not evidence a feature works. Before calling something done, run it in a
browser and watch it do the thing — `.claude/skills/verify/SKILL.md` has the launch/drive
recipe (isolated port and IndexedDB origin, the hidden file-input trick for BV import).

**Run what CI runs, not a hand-rolled approximation of it.** `pnpm build` is `tsc -b && vite
build`; `tsc --noEmit` alone is a different command that can pass while the gate fails.

**Before accepting a gate can't be run locally, try to run it.** `osv-scan` is a reusable
workflow that can't be invoked from a checkout directly, but the scanner it wraps is a public
container:

```
docker run --rm -v "$PWD:/src" -w /src ghcr.io/google/osv-scanner:v2.3.8 -r ./
```

## Reviewing changes to `.claude/` and `CLAUDE.md`

**These files are instructions, not documentation.** A change here changes what a future Claude
session *does*. Review changes to `.claude/`, `CLAUDE.md`, and `.github/workflows/` with the
same attention as executable code — `.github/CODEOWNERS` marks those paths so a review is
requested, though CODEOWNERS alone has no teeth without branch protection enabled, and none of
it is live on a solo repo with no outside contributors anyway.

## Supply chain

Full detail: ADR-0006 through 0013. The rules that matter day to day:

- Lockfile committed; CI installs frozen (`pnpm install --frozen-lockfile`).
- Install scripts blocked by default (`.npmrc`); exceptions individually reviewed in
  `pnpm-workspace.yaml`'s `allowBuilds`, never blanket-allowed.
- New releases age-gated at the package-manager level (Renovate's `minimumReleaseAge`), not just
  the update bot.
- Third-party CI actions pinned to full-length commit SHAs, not tags.
- Two independent advisory scanners (`pnpm audit`, `osv-scanner`) — each reads its own ignore
  config, neither reads the other's. An ignore records *why no patched version is usable*, not a
  quarantine wait, and names the condition that retires it.

## Fork-friendliness

Stated goal since 2026-07-10: anyone can fork this repo, adjust `src/core/config.ts`
(`CycleConfig`), and start using it on their own GitHub Pages. User-tunable preferences
accumulate there, never scattered. This is also why the license is dual **MIT OR Apache-2.0**
(ADR-0014) rather than the more common single-license personal-project default — a forker can
comply with either.

## Docs that must stay current

`README.md`, `docs/PROGRESS.md`, `docs/journal/`, `docs/adr/`. When you finish a chunk of work,
update whichever exist so the effort can be resumed from the docs alone after a cleared
context. `python3 scripts/docs-hygiene.py` checks the mechanical parts locally.
