# ADR-0001: Provable-lite — strict TypeScript + property tests, no Rust/WASM core
- Status: Accepted
- Date: 2026-07-08
- Deciders: Ryan

## Context
Ryan wants `cycle-in` held to the same "provable" bar he's applied elsewhere. Every existing
instance of that bar pairs it with Rust:

- **git-redundancy** (the origin — ADR-0001 `use-rust-for-the-cli`, ADR-0002
  `functional-core-imperative-shell`): Rust, `#![forbid(unsafe_code)]`, a pure functional core
  separated from an imperative shell, `proptest` on the pure logic, **Kani** (formal/model-
  checking proofs) on safety-critical invariants.
- **home-fleet** (ADR-0001, `assurance-standards-provable-rust-strict-ts-fisma-aligned`):
  explicitly inherits git-redundancy's bar "so tooling doesn't drift below the standard,"
  adding strict TypeScript (`strict` + `noUncheckedIndexedAccess`, ESLint, Vitest/Playwright)
  as the tier for *any UI*, but still preferring a Rust core (Tauri/WASM) over reimplementing
  logic in TS.
- **judicial-institute-notebook-cms** (`Engineering-Strategy.md`): Rust backend (`cargo test +
  proptest + Kani`) + strict TS/React frontend (`Vitest + Testing Library + axe-core`).

`cycle-in`, though, follows branching-video's shape: a static site meant to run straight from
GitHub Pages, usable from a phone, with no backend (the cross-device sync model is a separate,
still-open question — see `PROGRESS.md` — but even a synced backend doesn't imply Rust). There
is no precedent in any of Ryan's projects for "provable" applied to a pure client-side
JS/TS app with no Rust anywhere. Introducing a Rust/WASM core purely to keep the exact same
pattern would be a large lift for a personal skill-cycling tracker, and Kani-level formal
proof is aimed at safety-critical invariants (e.g. git-redundancy's "a push is only easy when
not behind") — `cycle-in` doesn't have an invariant of that character; its risk is closer to
"the ranking algorithm picks a stale or wrong item," not data loss or safety.

## Decision
A new tier, "provable-lite": the same *shape* of rigor (pure core, separated from IO/UI;
property-based testing; strict compiler discipline; no telemetry), implemented without Rust:

- **TypeScript in `strict` mode** (+ `noUncheckedIndexedAccess`), ESLint — the compiler and
  linter as the first check, not memory.
- **A pure core module** for the logic that's actually worth getting provably right: the
  cadence/due-ness calculation, the next-5–10 ranking, the category/sub-category rollups, and
  the BV-bundle-to-item mapping. No IO in this module — same functional-core/imperative-shell
  split as the Rust projects, just in TS.
- **Property-based tests** on that core via `fast-check` (the JS/TS analogue of `proptest`) —
  e.g. "an item's next-due date is never before today," "a held item is never dropped by the
  ranking regardless of cadence," "rollup totals across categories always sum to the ungrouped
  total." Vitest for everything else (component/integration tests).
- **No Kani, no formal proof.** Nothing in `cycle-in` currently rises to a safety-critical
  invariant; if one emerges (e.g. around data integrity in whatever sync model gets chosen),
  revisit via a new ADR rather than retrofitting Kani onto TS today.
- This needs a real build step (TypeScript compilation, a test runner) — a deliberate break
  from branching-video's zero-build vanilla-JS style, accepted as the cost of the higher bar.

## Alternatives considered
- **Full pattern: Rust/WASM core** — rejected for now as disproportionate to the app's actual
  risk profile; revisit if a real safety-critical invariant shows up (most likely candidate:
  whatever the eventual sync-model decision introduces around data integrity).
- **Branching-video-lite: plain vanilla JS, no formal layer** — rejected; it's a real step back
  from what was asked for, even though it's the precedent cycle-in is otherwise modeled on.

## Consequences
- `cycle-in` becomes the first project with a "provable" standard that has no Rust anywhere —
  a new tier to potentially reuse for future small client-only tools, alongside the Rust tier
  and the Rust+strict-TS tier that already exist.
- Real cost: a build step and test tooling that branching-video never needed.
- The pure core (cadence/ranking/rollups/BV-mapping) is the thing to design and test first,
  before any UI — matches `PROGRESS.md`'s stated next steps. Validated in practice during
  scaffolding (2026-07-08): a `fast-check` property test on the first pure function
  (`isDue`) immediately caught a real bug — not in the implementation, but in the test's own
  arbitrary (`fc.date()` can generate an `Invalid Date` unless `noInvalidDate: true` is set).
  Exactly the kind of edge case example-based tests tend to miss.
