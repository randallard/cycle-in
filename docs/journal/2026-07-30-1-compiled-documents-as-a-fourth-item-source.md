# 2026-07-30-1 — compiled documents as a possible fourth item source

Docs-only note. No code, no scope commitment.

Came in sideways from `kiss-ai` (`~/Development/work/kiss-ai/`), which is unrelated work: Ryan
wanted **exercises for building bow strength on the cello** and asked for online resources
*compiled into a markdown document, summarized and indexed* — not a list of links. That's
TCSearch's "documentation-building search" idea.

The reason it matters here: **that output is an item source for this app.** An indexed
document's sections map onto practice items fairly directly. And the example isn't
incidental — **cello is this project's own stated example of a skill being cycled in**, piano
its example of one kept from atrophying. The query someone would type and the thing this app
exists to support are the same thing. One of Ryan's projects would emit what another ingests.

**What I did *not* do:** commit to it. kiss-ai is early and blocked on its own chat-export
migration, so treating this as a dependency would be premature. Recorded in
`docs/PROGRESS.md` under the scope section next to the other item sources, with links back
to kiss-ai's Track 2 write-up.

**The one thing worth acting on** is small and cheap now, awkward later: when the item-source
interface gets designed, **don't assume a source is a feed of discrete items.** BV bundles and
YouTube playlists both are, so the natural interface would bake that in. A compiled document
is one artifact that must be *decomposed* into items. Leaving room for a source that yields
items by decomposition costs almost nothing at design time and is a retrofit if missed.

Status otherwise unchanged — Phase 2 (`interval` cadence, snooze, live-refreshing list, per
ADR-0005) is still next.
