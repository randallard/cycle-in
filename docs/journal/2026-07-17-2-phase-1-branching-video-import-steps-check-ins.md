# 2026-07-17 (implementation) — Phase 1: branching-video import, steps, check-ins

Built the whole import-first slice from [ADR-0004](../adr/0004-branching-video-import-time-options-steps-check-ins.md)
in one sitting, in the order Ryan picked (parser → picker → model → advance → detail →
check-ins). Uncommitted, pending his in-browser pass (standing rule). 104 tests, `pnpm build`
and lint clean.

> **Follow-up:** that in-browser pass happened on 2026-07-18. The slice held on the first drive,
> and turned up four fixes no test was positioned to catch — see
> [2026-07-18-1](2026-07-18-1-phase-1-browser-verification-and-fixes.md). Two details below are
> superseded there: `bvSource` is now committed even when no steps are chosen, and check-in links
> are http(s)-enforced at capture and rendered inert (not as dead anchors) when they aren't.

## The load-bearing discovery: two config shapes
The `config.example.json` and `big-buck-bunny.json` are **branching** shows — nodes wired by
`choices`, main line = the `default: true` spine. But the real single-video tutorials in
`branching-video/live/` — including Ryan's actual **cardistry** file
(`cards-hummingbird-and-flutter.json`) — are a different shape entirely: a **flat, ordered list
of timestamped segments**, `choices: []` on every node, `start` but no `end`; the nodes *are*
the steps ("Step 1: Pull Apart" @38s, …). The first parser cut followed the choice-spine and
would have preselected just `["intro"]` for that file. Fixed: `suggestedSteps` uses the spine
when it spans the show and **falls back to file order** otherwise. Verified against all three
real files (cardistry → 7 ordered steps; Big Buck Bunny → its 4-node main line, asides dropped).

## What landed
- **Parser** (`src/core/bvimport.ts`) — tolerant, separate from the event-bundle parser;
  `parseBvConfig`, `defaultSpine`, `suggestedSteps`, `stepsFromNodes`. Rejects the wrong file
  with a pointed message ("that's a cycle-in event bundle, not a branching-video config").
- **Picker** (`src/ui/picker.ts` + app.ts) — "Import video…" → file-picker → a focused screen
  with suggested steps preselected, per-node toggle + ↑/↓ reorder (targeted re-render of just
  the node list so the metadata form's typed values survive), commits one `item-added`.
- **Model widening** (`types.ts`) — `BvStep`/`BvSource` now live in the core model (so
  `bvimport` depends on the model, not vice versa); `bvSource.steps[]`; the reducer seeds
  `currentNodeId` at step 1 (`(bvSource?.steps ?? [])[0]?.nodeId`, which also tolerates a
  pre-widening bvSource that has no `steps`).
- **Advance verb** (`src/core/steps.ts`) — `stepProgress(item)` → `{ steps, index, total,
  current?, next? }`; a fresh/stale item's `next` is step 1 so advancing *starts* the sequence,
  and the final step has no `next`. Board shows a `step k/n` chip; expanded verbs show
  "now … · Advance to <next> →", dispatching `bv-node-advanced`.
- **Detail view** (`#item/<id>`, reached by clicking an item's name) — metadata header, the
  ordered steps with jump ("go here") / advance, the management verbs (done / start / hold / log
  / cadence / archive / **unarchive** — closes UI-flow-gap #4's unarchive), and the item's
  logged-time & check-in history.
- **Check-ins** — `nodeId` on `time-logged` (and on the `log-corrected` patch); a link-capture
  form on the detail view attaches a progress link to the current step. A link-only check-in
  logs no minutes (zero rollup impact, per the ADR). Links are http(s)-sanitized (`safeHref`
  blocks `javascript:`/`data:`), covered by tests.

## Decisions resolved along the way (were ADR-0004 open sub-questions)
- **`showId`** = a slug of the show title (`slugify`) — enough until a collision matters.
- **Check-in** = `time-logged` + `nodeId`, not a dedicated event — keeps one code path for
  everything logged against a skill, so rollups are untouched.

Still open (noted in ADR-0004 / PROGRESS): multi-video shows, the flat-tutorial implied-`end`,
and whether non-BV time-options should expose ad-hoc steps.

## Tests
101 → 104 across the session: `bvimport.test.ts` (20, incl. the real cardistry/branching shapes
+ an XSS-escape), `picker.test.ts` (11), `steps.test.ts` (7), `format.test.ts` (12, incl.
`safeHref` scheme-blocking), and reducer tests for the widened `bvSource` (starts at step 1,
advances, legacy-tolerant) and the `nodeId` check-in path (carried, link-only = no minutes,
`log-corrected` can reassign the step).
