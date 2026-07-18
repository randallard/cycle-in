# 2026-07-18 — Phase 1's in-browser pass: four fixes from actually driving it

Phase 1 (branching-video import → steps → check-ins) was built on 2026-07-17 and left
uncommitted pending an in-browser pass. This session was that pass: the whole slice driven
through a real browser (headless Chromium against `pnpm dev`), not just the test suite.

**The slice holds.** Import → pick/reorder steps → add → walk the steps → check in → reload →
export → re-import all worked on the first drive, including the two config shapes, the
tolerant-parse error paths, and `safeHref`. What driving it *added* over the tests was four
things no unit test was positioned to notice — three of them friction, one a quiet data loss.

## What the pass found, and what changed

**1. Zero steps silently dropped the video provenance.** Import a config, uncheck every node,
"Add to rotation" → you got a plain time-option with **no `bvSource` at all**. No `from <show>`
line on the detail view, no showId, nothing recording that this came from a video; the status
line just said `added "…"` as if you'd used the Add-item form. The picker's commit guarded the
whole `bvSource` behind `steps.length > 0`.

Fixed: `bvSource` is **always** committed on a picker import — an empty `steps: []` simply means
"no step sequence." `stepProgress` already returns `undefined` for an empty `steps`, so the step
chip and steps panel stay correctly absent with no extra guarding, and the reducer's
`(bvSource?.steps ?? [])[0]?.nodeId` already yields no `currentNodeId`. The status now says so
out loud: `added "…" — no steps chosen, so it has no step sequence`.

**2. The board's verb row collapsed on every advance.** Advancing from the board's `⋯` menu ran
through `run()`, which calls `closeForms()` — so walking three steps meant expand-advance,
expand-advance, expand-advance. Invisible to tests (the reducer was perfectly happy); obvious in
about four seconds of clicking. Given Phase 2 is *"come up every 50 minutes, advance, move on,"*
the board is exactly where this must not be annoying.

Fixed: a `runKeepingVerbs` sibling to `run` that restores `ui.openItem` after `closeForms()`,
wired to `advance` and `set-step` only. Every other verb still collapses the row as before.

**3. A blocked link still rendered as a clickable link.** `safeHref` did its job — a
`javascript:` link came out as `href="#"` — but the anchor was still *rendered*, so a poisoned
or malformed link looked identical to a working one and just silently went nowhere.

Fixed at both ends. `isWebLink` is now the predicate (`safeHref` delegates to it, kept as the
last line of defence for anything that reaches an href anyway); the log list emits an anchor
only when the link is a web address, and otherwise shows inert struck-through
`link (not a web address)` with the raw value in the `title`. At capture, the check-in form
gained `pattern="https?://.*"` (`type="url"` cheerfully accepts `javascript:`, `data:`,
`mailto:`) plus a JS guard behind it — so the junk never enters the log in the first place.
Verified both paths: freshly typed, and a bad link arriving in an imported bundle from another
device.

**4. The status line lied by omission.** It's shared and sticky, and most verbs never called
`say()` — so after logging 25 minutes the line still read `imported 3 new of 3 in bundle` from
several actions earlier. A stale message next to a fresh action reads as confirmation *of that
action*. The new check-in form (which does say "check-in saved") made the gap obvious by
contrast.

Fixed by making the confirmation non-optional: `run(input, message)` now **requires** a message,
so a verb can't be added without one, and every verb reports what it did in the item's own words
(`marked "X" done for today`, `holding "X" on the list until you release it`, `now on step 2/4 —
Chapter 1`, `logged 25m to X`, `"X" is now weekly`, …). The log / cadence / add form handlers set
`ui.status` before `dispatch` so it lands in a single render.

Also added: `sayInPlace`, which updates the status line **without** re-rendering. Validation
messages needed it — the forms are DOM-held by design (that's what keeps typed values alive
across the picker's targeted re-render), so a `say()` on a rejected check-in would have wiped
the note the user just typed. Confirmed: rejected link, note intact.

## What the tests couldn't have told us

Worth naming, because it's the argument for this step existing. All 104 tests passed before any
of these four fixes, and every one of them was *correct*. Fixes 1 and 3 were behaviours the
tests asserted (`bvSource` omitted when no steps; `safeHref` returns `#`) — the assertion was
right and the resulting UX was still wrong. Fixes 2 and 4 live entirely in the gap between
"the event was appended" and "the person can tell what happened."

## Housekeeping

- `.claude/skills/verify/SKILL.md` — new. Captures the launch recipe (`pnpm dev --port 5199
  --strictPort`, distinct port so it can't collide with Ryan's server *and* gets its own
  IndexedDB origin), driving via `playwright-core` against the system Chromium, the hash routes,
  the hidden-file-input trick for both importers, and the gotchas. Next session skips the cold
  start.
- Tests: 104 → 113 (`isWebLink`'s scheme table). `pnpm build` and lint clean.
- One thing that *looked* like a bug and isn't: **Hold** moves an item out of the category
  panel's list and up into the pinned choices section ("pinned until you release it"). Correct
  behaviour — noted here because it cost a couple of minutes to confirm.

## A supply-chain gap the session itself opened

Ryan asked, at the end: "we still have all the protections against supply-chain attacks?" The
repo's posture was untouched — `.npmrc`, `pnpm-workspace.yaml`, `package.json`, the lockfile and
all three CI jobs byte-identical to HEAD, `pnpm audit` clean, license allowlist exit 0. But the
question was better than the answer, because driving the browser had required
`npm i playwright-core` **in the scratch directory**, where `ignore-scripts=true` was not in
force. Nothing ran (`playwright-core@1.61.1` declares no scripts and has no dependencies), but
"it turned out fine" isn't "it was protected."

The first fix proposed — copy `.npmrc` into the scratch directory — **was wrong**, and only
turned out to be wrong because it got tested: npm reads a directory-local `.npmrc` only once
that directory is a *package root*, and a bare `npm i` in an empty directory creates
`package.json` during the install, after config resolution. A fixture package with a
`postinstall` settled it in about a minute — `.npmrc` alone: script **ran**; `--ignore-scripts`:
blocked; `package.json` seeded first: blocked.

Recorded as [ADR-0002](../adr/0002-npm-supply-chain-discipline.md) decision 10, with the recipe
in `.claude/skills/verify/SKILL.md`. The generalisable bit is in that ADR's consequences: a
control attached to a file in the repo stops at the repo boundary, and the work doesn't.

## Still open (unchanged by this pass)

Check-ins still require a link, so there's no way to record "did step 3, 20 minutes, no link"
against a step — `Log time…` doesn't attach a `nodeId`, though the model supports it. And
`showId` is a title slug, so importing the same show twice yields two items sharing one
`showId`; nothing depends on it yet. Both are ADR-0004 open questions, not regressions.
