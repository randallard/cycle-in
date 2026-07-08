# 2026-07-08 — cycle-in opened

Ryan wants a personal system to cycle in new skills (e.g. cello) regularly and keep old ones
(e.g. piano) from atrophying at a lower frequency, plus a catch-all for occasional reminders he
just wants to remember every so often.

He already curates instructional videos by bookmarking them, and does that today via
`~/Development/branching-video` — a zero-build static HTML / GitHub Pages video player he
built for choose-your-own-path video content. That repo just gained (today, ADR-0001) an
"Export All" bulk-backup feature: it dumps every local draft (the `bvp:index` list plus each
draft's `bvp:config:<slug>`) as one JSON bundle (`{ type: 'bvp-backup', version, exportedAt,
index, configs }`), because there was previously no way to get all local drafts out of a
browser at once. That bundle is the natural seed for `cycle-in`'s item list — a static site
can't read the browser's actual bookmarks directly anyway (sandboxing), so import-a-bundle is
the right shape rather than trying to reach into bookmarks live. Confirmed this with Ryan
directly before settling on it.

Concept as described: a `cycle-in` repo, same style as branching-video (static HTML, GitHub
Pages, no backend). Its main "use" page shows the next 5 suggested things to do, factoring in
each item's cadence and — for time-of-day-linked items — flagging ones in orange whose window
already passed today. Items get marked done-for-today or bumped in priority for tomorrow.
Items are categorized and sub-categorized (piano vs. cello, or by skill domain) so
category-level gaps ("haven't touched piano in weeks") are visible over time, not just
per-item staleness.

Decided scope for today: **planning docs only** (this was written under
`~/Development/work/cycle-in/` at the time — since migrated into this repo's own `docs/`, see
the 2026-07-08 scaffolding-session entry). The actual repo, its data model (item shape,
cadence representation, where state persists), and the ranking algorithm for "next 5" were
open design work at the time — captured as open questions in `PROGRESS.md` rather than guessed
at.
