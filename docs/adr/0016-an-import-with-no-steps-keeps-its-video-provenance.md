# ADR-0016: A branching-video import with no steps chosen still records where it came from
- Status: Accepted
- Date: 2026-10-31 (decided and built 2026-07-18; recorded here because ADR-0004 carried it as an amended block)
- Deciders: Ryan

## Context
[ADR-0004](0004-branching-video-import-time-options-steps-check-ins.md) defined the
branching-video import: a picker over a show's nodes, committing a time-option item with a
`bvSource` (the show, and the step sequence chosen). The first in-browser pass, 2026-07-18, found
that unchecking every node and adding the item produced a plain time-option with **no `bvSource`
at all**: no "from <show>" line, no show id, nothing to say it came from a video. The picker had
guarded the whole `bvSource` behind `steps.length > 0`
([journal 2026-07-18-1](../journal/2026-07-18-1-phase-1-browser-verification-and-fixes.md), finding 1).

The decision was written into ADR-0004 as an "Amended after the 2026-07-18 in-browser pass" block.
An accepted ADR is immutable in substance, so this records it properly, as its own decision. The
2026-10-31 compliance review found the block.

## Decision
A picker import **always** commits its `bvSource`, including when no steps are chosen. An empty
`steps: []` means "no step sequence", not "no provenance". The provenance is part of what an
import is for.

## Alternatives considered
- **Keep the guard; a zero-step import is an ordinary item.** Loses the link to the video for the
  case where the user just wants the show in rotation without walking its steps, and makes the
  item indistinguishable from one typed in by hand.
- **Refuse an import with no steps.** Blocks a reasonable use for no gain.

## Consequences
- No extra guarding downstream: `stepProgress` already returns `undefined` for empty `steps`, so
  the step chip and panel stay absent, and the reducer's `(bvSource?.steps ?? [])[0]?.nodeId`
  yields no current node.
- The status line says it out loud: `added "…" — no steps chosen, so it has no step sequence`.
- A bundle from before this decision may hold zero-step imports without `bvSource`; the reducer
  tolerates both (`core.test.ts`, "tolerates a pre-widening bvSource with no steps").
