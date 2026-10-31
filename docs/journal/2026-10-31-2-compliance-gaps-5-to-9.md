# 2026-10-31 (2) — compliance gaps 5–9: ADRs recorded, standards inherited, a first stance review, a cast registry, and axe

Documents `71412f5` (gap 5), `82cd514` (gap 9), `30c1c19` (gap 7), `a6c7944` (gap 8) and
`d776cbb` (gap 6), on `compliance-gaps-5-9`, stacked on PR #3 (itself on #2).

## Gap 5: ADR-0004's amended block (`71412f5`)

The block held two decisions, so it became two ADRs: 0016 (a zero-step import still keeps its
`bvSource`) and 0017 (check-in links are http(s) only, checked at capture and at render). Each
claim was checked against the code first. ADR-0004 is untouched; my first attempt annotated its
Status line, and `docs-hygiene.py` rejected it (only a bare `Accepted` or `Superseded by …` is
valid), which is right: the main decision stands, so the pointer lives in the index row.

## Gap 9: the Rust jobs (`82cd514`)

Deleted. They could never run here; ADR-0001 is the project ADR that ADR-1004 asks for. A
comment says where to copy them back from if a Rust/WASM core arrives.

## Gap 7: inherited standards (`30c1c19`)

ADRs 1000–1017 copied in, byte-identical to the GitHub template's `main` (`12f6468`, the squash
of the local template's `dfb5918`), and indexed with the "two number ranges" convention. A
`template` remote now exists (local config, not in the repo). The `project-conventions` skill is
the template's current text, canonical per ADR-1001, with cycle-in's own content merged back
rather than lost: the core/shell map, provable-lite with no Rust (so the template's Rust-only
rules are dropped), the browser `verify` recipe, `-N` journal names, fork-friendliness. One stale
line corrected on the way: the package-manager age gate is pnpm's `minimumReleaseAge`, not
Renovate's. The stance-review skill is the template's (it adds the missing-1NNN and pnpm-major
checks).

## Gap 8: the first stance review (`a6c7944`)

[`docs/reviews/2026-10-31-stance-review.md`](../reviews/2026-10-31-stance-review.md). Sources were
pnpm's supply-chain page and the v12.0.0 release notes, both fetched. The pnpm 12 question was
answered by trying it rather than reading about it: on a throwaway `git archive` export, outside
the repo, scripts off, pnpm 12.16.1 (now a native binary fetched on first run) installed with no
unrecognised-setting error and lint/tests/build passed, but a frozen install can't change
`packageManager`, because in 12 that's a lockfile entry. So moving to 12 is its own PR. The trial
left a store at `/tmp/.pnpm-store`, removed after checking it was the trial's. `strictDepBuilds`
was the one baseline setting not stated; it is now (ADR-1016, no lockfile change). Two ADRs are
proposed and **not written**, since a stance change is Ryan's call: IndexedDB as the store ahead
of the sync decision (ADR-0003's "in-memory stub" sentence is stale), and moving to pnpm 12.

## Gap 6: Ryan's answers to ADR-1012 (`d776cbb`)

Asked with the facts: 0 `any`, 18 `as` by a regex count, plain-DOM UI, no browser suite. Ryan
chose yes to both.

**The registry (ADR-0018).** A regex count was wrong in both directions (comments, template
strings, `as unknown as` counted twice), so the check reads the TypeScript AST: 24 casts. Writing
a reason for each is the point of the exercise, and four had none: `str("kind") as
Cadence["kind"]` in three form handlers wrote an unchecked form value into the append-only log,
and `dataset["g"] as Period` did the same for a view setting. Those became core guards
(`isCadenceKind`, `isPeriod`, the latter beside a `PERIODS` list moved out of the UI), with
property tests whose `Record` fixtures fail to compile if a kind is added without updating the
list; a mutant guard that also accepted " Daily" failed the property. A test cast to `Weekday`
became a weekday generator. 19 casts remain, each with an inline reason checked by the script
and a registry row. square-one's registry had been missed by hand twice, which is why this one
has a check: it fails on a count mismatch or on a cast without its comment, and both failure
modes were tried. One reason I wrote was wrong (it said the `change` handler reads `checked`;
it reads `dataset`, `id`, `value` and `files`) and was fixed before commit.

`scripts/` joined the TS project so the check is linted like everything else; that needed
`@types/node`, and my first `pnpm add` took the latest major (26) because a version lookup came
back empty. Pinned to 24.19.2 to match the runtime, and `"types": []` keeps Node globals out of
`src/`.

**axe (ADR-0019).** Five views of the built site, WCAG 2.1 A/AA. The first run failed only on
contrast, on every view: `--ink-3` at 2.69–3.08:1 in light. The app is dark-first, so the suite
now runs both schemes, and dark failed too (3.09–3.85:1). The nearest passing shades were
computed against all three backgrounds each colour sits on: `#656e79` light, `#87929c` dark.
Reverting just the dark one fails all five dark checks. Chromium build 1248 was downloaded to
the user cache (branching-video's local install was still on Playwright 1.63, build 1243).

## Next

Merge #2, then #3, then this branch's PR. Ryan to decide the two proposed ADRs (IndexedDB ahead
of the sync decision; pnpm 12). Then the standing to-dos: `DEPLOY_PAGES`, install Renovate (its
config is valid now), Phase 2 (ADR-0005), whose board work is also when ADR-0019 wants a keyboard
walkthrough test and the picker view covered.
