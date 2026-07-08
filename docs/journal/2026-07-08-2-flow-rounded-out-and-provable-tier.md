# 2026-07-08 (later) — flow rounded out, provability tier decided

Follow-up to the effort-opened entry — Ryan wanted to make sure the flow was fully rounded out
before any building started, plus wanted "provable" (a standard he's applied elsewhere)
tracked down and considered for `cycle-in` specifically.

## Flow

Reorganized what had been a single "items" concept into three: **items** (the cyclable things,
with cadence + hold state + optional BV source), **log entries** (time actually spent —
duration/reps/notes/link, independent of whether it maps to a scheduled item), and
**impressions** (a record that an item was suggested, so something that cycled off before being
marked can still be found and retroactively logged). That split fell out of trying to model "I
want to log time spent on drawing/music/programming/exercise and see how it's fitting in" —
that's a rollup over log entries, not necessarily over completed items.

New pieces added to the item lifecycle: **hold/release** (pin an item on the list regardless of
cadence-due-ness, then release it back to normal scheduling), **archiving** as a distinct
end-state from a normal cadence cycle-off (retired vs. "comes back later"), and **start** as its
own explicit action separate from done (so "I began this but haven't finished" has somewhere to
live, and completion doesn't have to happen in the same sitting).

The branching-video integration got two real flows, not just an import: an **onboarding/review
screen** (see everything imported from a BV bundle, which is already a `cycle-in` item vs. not
yet pulled in) and an **"advance to next node"** action — when Ryan is ready to move past the
BV node/video currently driving an item's regular appearance, browse that bookmark's own node
graph (parsed from the imported `configs[slug]`) and pick the next one. That means `cycle-in`
has to actually understand BV's node structure, not just store an opaque link to it.

## The sync question

Raised as the one thing that could reshape the whole architecture: phone + other devices both
need to see the same item list and log history, and `localStorage` (branching-video's whole
model) doesn't sync. Asked Ryan directly — **left explicitly open** rather than assumed. It's
now the blocking next step in `PROGRESS.md`, ahead of any data-model or ranking-algorithm work,
because the answer changes what "the pure core" even needs to account for.

## Provable

Grepped `~/Development` for "provable" per Ryan's ask (he guessed judicial-institute-notebook-
cms). Found it actually originates in **git-redundancy** (ADR-0001/0002: Rust, functional
core/imperative shell, `proptest`, Kani for safety-critical invariants) and is explicitly
inherited by **home-fleet** (ADR-0001, same table, adds a strict-TS tier for UI but still
prefers a Rust core). judicial-institute-notebook-cms's `Engineering-Strategy.md` is the
TS+React-heavy variant — Rust backend, strict TS frontend. All three pair "provable" with Rust
somewhere; none of them cover a zero-backend static JS/TS site, which is `cycle-in`'s shape.

Presented that as a real fork rather than assuming either "obviously use Rust" or "obviously
skip it." Decided: **provable-lite** — strict TypeScript + ESLint + property tests (`fast-check`)
on a pure core (cadence/ranking/rollups/BV-mapping), Vitest on the rest, no Rust/WASM, no Kani.
Written up as [`adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md`](../adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md)
— cycle-in's first real decision, and a new tier alongside the two existing Rust-based ones.

## Where this leaves things

Still nothing built at the time of this entry — deliberately. The sync-model question stayed
the next thing to resolve before any scaffolding. (Ryan came back and scaffolded the repo
anyway, stubbing the data layer instead of waiting on that decision — see the next entry.)
