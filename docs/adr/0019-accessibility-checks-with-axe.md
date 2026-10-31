# ADR-0019: Accessibility is checked with axe against every view, in light and dark, in CI
- Status: Accepted
- Date: 2026-10-31
- Deciders: Ryan

## Context
[ADR-1012](1012-strictness-extras-offered-at-project-start.md)'s second extra is accessibility
lint: jsx-a11y for JSX UIs, or axe checks for non-JSX ones. cycle-in's UI is template strings
over the DOM, so a lint plugin can't see it; the check has to run against the rendered page.
There was no browser test suite. The 2026-10-31 compliance review found the question unanswered,
and Ryan chose to adopt it.

The first run found one problem, on every view: the faintest text colour (`--ink-3`, captions,
table headers, the footer) failed WCAG AA contrast in **both** themes, 2.69–3.08:1 in light and
3.09–3.85:1 in dark, against the 4.5:1 that 12px text needs. Nothing else failed.

## Decision
- A Playwright suite (`e2e/a11y.e2e.ts`, `pnpm e2e`) runs `@axe-core/playwright` with the WCAG
  2.1 A and AA rule tags against the **built** site, on a spare port, in each view a person sees:
  the empty board, the add-item form, the board with an item (verbs closed and open), an item's
  detail view, and history.
- Every check runs **twice, in light and dark** (`colorScheme` projects), because the app follows
  the OS theme and the two palettes are separate.
- Any violation fails, listed with axe's rule, impact and selectors. CI runs it as the
  `e2e (playwright + axe)` job, and Pages deploy waits on it.
- `--ink-3` moves to the nearest shades that pass on every background they sit on: `#656e79`
  (light, worst 4.53:1) and `#87929c` (dark, worst 4.51:1).

## Alternatives considered
- **Say no** (the other answer ADR-1012 allows). Lost on the evidence: the first run found a
  real failure on every view, in both themes.
- **Lint-only (jsx-a11y).** No JSX here; it would check nothing.
- **Light mode only.** The dark run is not redundant: the dark palette failed too, and reverting
  just the dark colour fails all five dark checks.

## Consequences
- Dev dependencies `@playwright/test` 1.64.1 (as branching-video) and `@axe-core/playwright`
  4.14.0 (MPL-2.0, on the licence allowlist), exact-pinned; audit, signatures, licences and OSV
  pass. CI downloads one pinned Chromium build per run.
- The muted text tier sits closer to the secondary tier in light mode; that is the cost of AA.
- axe finds what can be found automatically, roughly a third to a half of WCAG. It doesn't judge
  keyboard flow, focus order, or how the app sounds in a screen reader. The branching-video
  import picker isn't covered yet (it needs a config fixture).
- Promotion condition: add a keyboard-only walkthrough test and the picker view when Phase 2
  touches the board, and do one manual screen-reader pass if the app gains users beyond Ryan.
