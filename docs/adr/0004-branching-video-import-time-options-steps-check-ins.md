# ADR-0004: Branching-video import — time-options, step sequences, and check-ins
- Status: Accepted
- Date: 2026-07-17 (proposed and implemented same day — Phase 1)
- Deciders: Ryan (design direction); shapes marked _(proposed)_ below were implemented as
  described and verified end to end against the real `branching-video/live/` configs, then
  driven in a browser on 2026-07-18 — pending Ryan's own look.

> **Implemented (2026-07-17, uncommitted):** `src/core/bvimport.ts` (parser), `src/ui/picker.ts`
> + app.ts (picker), `BvStep`/`BvSource` in `types.ts` with reducer support, `src/core/steps.ts`
> (`stepProgress` / advance verb), the `#item/<id>` detail view, and `nodeId` on `time-logged`
> for check-ins. The `showId` and check-in-event sub-questions below were resolved in the build;
> the rest stay open.
>
> **Amended after the 2026-07-18 in-browser pass:** an import with **no** steps chosen still
> carries its `bvSource` (with `steps: []`) — the provenance is part of what the import is for,
> and an empty step list is a meaningful state rather than a reason to discard the origin. And
> check-in links are **http(s)-only, enforced at capture as well as at render**: a link that
> can't be followed is shown as inert text, never as an anchor that silently goes nowhere. See
> [journal 2026-07-18-1](../journal/2026-07-18-1-phase-1-browser-verification-and-fixes.md).

## Context
The README's third item source — "imported from branching-video's bookmarked-video export
bundle, with a dedicated review/onboarding screen and an 'advance to next node' action" — was
scaffolded in the core (`bvSource`, `currentNodeId`, the `bv-node-advanced` event) but never
built end to end. This session pinned down the actual flow Ryan wants and the real export
format on the other side.

Forces:

1. **The real branching-video export is its `config.json`** (verified against
   `~/Development/branching-video/config.example.json`), a node graph:
   `{ title, startNode, masterVideoId, choiceDisplaySeconds, nodes[] }`, where each node is
   `{ id, title, videoId?, start?, end?, choices[]{ label, target, default?, style? }, isAside?,
   defaultAside?, returnTo?, endScreen? }`. There is **no separate "Export-All bundle"** feature
   in branching-video — earlier cycle-in notes assumed one; the config *is* the graph. A user
   picks one show's config and imports it.
2. **A video with steps is one skill that advances, not many items.** Ryan's cardistry example:
   a hard video whose nodes he's authored as ordered steps — the list should show *step 1* until
   he says "move on to step 2," then *step 2*. That is a single tracked skill with a moving
   pointer, which matches the existing `currentNodeId` far better than one-item-per-node.
3. **Progress is a link, saved per step.** He wants to attach a "check-in" — typically a YouTube
   link to his own attempt — as progress on the current step, and see those check-ins
   accumulate for that skill. `time-logged` already carries `link`, `notes`, and `itemId`; it
   lacks only a node pointer.
4. **Naming.** Ryan named the list items **"time-options"** this session (previously the
   undecided "items"). The user-facing term is now "time-option"; code identifiers can migrate
   incrementally.

## Decision

### Terminology
List items are **time-options** in all user-facing language and new docs. Existing core
identifiers (`ItemState`, `item-added`, …) are not renamed in a flag-day; they migrate as files
are touched, with "time-option" as the term the UI shows.

### A new tolerant parser for the branching-video graph _(proposed)_
`src/core/bvimport.ts` (name TBD) parses branching-video's `config.json` into a normalized
shape, **separate from** the event-bundle parser in `bundle.ts` (different format, different
job). Envelope-validated and tolerant in the same spirit as `parseBundle`: unknown fields
preserved/ignored, human-readable errors on malformed input, no throw into the UI. No new
dependency — hand-rolled, per ADR-0001/0002.

### Import produces one time-option carrying an ordered step sequence _(proposed)_
Import appends a single `item-added` whose `bvSource` is widened from `{ slug, nodeId }` to
carry the chosen steps:

```
bvSource: {
  showId: string;              // stable id for the imported show (from title/slug; TBD)
  showTitle: string;
  steps: {                     // ordered; empty ⇒ a plain single-node bookmark
    nodeId: string;
    title: string;
    videoId?: string;          // node override, else the show's masterVideoId
    start?: number; end?: number;
  }[];
}
```

`currentNodeId` (already in `ItemState`) points at the current step; it starts at `steps[0]`.
The existing **`bv-node-advanced` event becomes "advance to next step"** — it moves
`currentNodeId` to the next entry in `steps`. The selector shows only the current step's node
context for that time-option.

### Step selection defaults to the main line, with a flat-list fallback _(proposed)_
Two real config shapes exist (verified against `branching-video/live/`):
- **Branching shows** (`config.example.json`, `big-buck-bunny.json`) wire nodes with `choices`.
  The node-picker pre-selects the **default-choice spine** — walk `startNode` following each
  node's `default: true` choice (and a default aside's `returnTo` back to the line).
- **Flat tutorials** (the real single-video configs, e.g.
  `cards-hummingbird-and-flutter.json` — Ryan's actual cardistry file) have `choices: []` on
  every node and are just an **ordered list of timestamped segments** (`start` only, no `end`);
  the nodes *are* the steps. There is no navigable spine, so preselection **falls back to file
  order**.

`suggestedSteps` uses the spine when it spans the show and file order otherwise; either way
aside nodes (`isAside`/`defaultAside`) are off by default. Ryan can toggle any node in/out and
reorder. (Confirmed end to end: the cardistry file yields its 7 ordered steps; Big Buck Bunny
yields its 4-node main line with asides dropped.)

### Check-ins reuse `time-logged` with a node pointer _(proposed)_
A check-in is a `time-logged` event with the existing `link` (and optional `notes`), gaining
one new optional field **`nodeId?`** tying it to the step it documents. `minutes`/`reps` stay
optional, so a pure link-only check-in logs no time and doesn't distort rollups. A
per-time-option **detail view** lists check-ins grouped by step. `nodeId` absent = a normal
time log, unchanged.

### The import entry point
The "add a time-option" affordance offers two paths, per Ryan's description: **(a) type an
idea** → the existing add-item form (name / category / cadence), for a reminder that should just
recur; **(b) choose a JSON file** → parse the branching-video config, show its nodes, pick which
are steps, then create the time-option. Path (a) already exists; path (b) is the new build.

## Consequences
- `bvSource` and one `time-logged` field grow; the reducer, `emptyState`, and the bundle
  parser's envelope validation already tolerate additive event/field changes (newer events
  import losslessly), so this is backward/forward compatible by construction.
- Rollups are untouched: check-ins are still `time-logged`, so tag/category math is unchanged;
  link-only check-ins contribute zero minutes.
- A second external-format parser exists (`config.json` vs cycle-in's own bundle) — kept
  clearly separate to avoid conflating the two envelopes.
- **Resolved in the build:** `showId` is a slug of the show title (`slugify`, `src/ui/picker.ts`)
  — good enough until a collision matters; a check-in reuses `time-logged` with a new optional
  `nodeId` (no dedicated `check-in` event), so rollups stay one code path.
- **Still open:** multi-video shows (per-node `videoId` overrides vs a single `masterVideoId` —
  the step shape carries both and works, but no view yet showcases mixed videos); flat tutorials
  give `start` but no `end`, so a future player derives an implied end from the next same-video
  step's `start` (kept out of the parser, which stays faithful to the file); whether non-BV
  time-options should also expose ad-hoc steps (the model would allow it).

## Alternatives considered
- **One time-option per node** — rejected: loses the "show step 1 until I advance" pointer Ryan
  described, multiplies the list, and fights the existing `currentNodeId` design.
- **A dedicated `check-in` event** — deferred: `time-logged` already carries link/notes/itemId
  and feeds rollups; adding `nodeId` is smaller and keeps one code path for "things logged
  against a skill." Revisit if check-ins need fields time logs shouldn't have.
- **Reusing `parseBundle` for the config** — rejected: different envelope and semantics;
  overloading it would weaken both.
