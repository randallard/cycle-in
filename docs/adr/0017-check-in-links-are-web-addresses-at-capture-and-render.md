# ADR-0017: Check-in links must be web addresses, checked at capture and at render
- Status: Accepted
- Date: 2026-10-31 (decided and built 2026-07-18; recorded here because ADR-0004 carried it as an amended block)
- Deciders: Ryan

## Context
[ADR-0004](0004-branching-video-import-time-options-steps-check-ins.md) added check-ins: a
time-logged entry carrying a step's `nodeId` and a link. The first in-browser pass, 2026-07-18,
found that `safeHref` blocked a `javascript:` link by emitting `href="#"`, but **still rendered the
anchor**, so a poisoned or malformed link looked identical to a working one and silently went
nowhere. The capture form used `type="url"`, which accepts `javascript:`, `data:` and `mailto:`
([journal 2026-07-18-1](../journal/2026-07-18-1-phase-1-browser-verification-and-fixes.md), finding 3).

The decision was written into ADR-0004 as an "Amended after the 2026-07-18 in-browser pass" block.
An accepted ADR is immutable in substance, so this records it properly, as its own decision. The
2026-10-31 compliance review found the block.

## Decision
A check-in link is **http(s) only**, enforced at both ends:
- **Capture:** the check-in form requires `https?://` (`pattern="https?://.*"` plus a JS guard),
  so other schemes never enter the log.
- **Render:** the log shows an anchor only when `isWebLink` holds. Anything else, such as a link
  arriving in a bundle imported from another device, is shown as inert struck-through text
  ("link (not a web address)") with the raw value in its `title`. `safeHref` stays as the last
  line of defence for anything that reaches an `href` anyway.

## Alternatives considered
- **Render-side only.** Bad links would still enter the append-only log, where they stay.
- **Capture-side only.** The log is merged from other devices' bundles, so render can't trust
  capture.

## Consequences
- A link that can't be followed is visible as such, never a dead anchor.
- `isWebLink` is the single predicate; changing what counts as followable is a change to it and to
  this ADR.
