# 2026-07-10 (evening) — two mockups, one decision, and the real choices page

## Mockups first, in the repo

Ryan asked for "a couple mockups of the choices page." First attempt published them as
claude.ai Artifacts — rejected: he wants **example pages in the project he can `pnpm dev`
and see**. So: `prototypes/` at the repo root, an index plus two standalone HTML pages,
served by the dev server at `/cycle-in/prototypes/`, deliberately absent from the
production build (only the root `index.html` is a Vite input).

The two directions differed in organization, not skin:

- **A — practice ledger**: one calm single-column list, serif names, paper-and-moss; a
  per-item *cadence ring* (period progress; full = due) as the signature.
- **B — balance board**: category-first, graphite instrument panel; the signature is a
  *balance bar* — today's minutes stacked by category against even-split ticks — with
  per-category panels carrying their own day/week/month stats and items.

Category identity colors in both are the dataviz-skill validated set (blue/aqua/violet),
chosen deliberately so the **warm band stays reserved for the overdue-orange status**; the
palette was machine-validated (CVD ΔE, lightness band, contrast) against both surfaces, not
eyeballed.

**Ryan: "completely B."**

## Then the real thing

`src/ui/` now holds the actual choices page, direction B, wired to the IndexedDB event
store end to end — every verb appends a real event and re-reduces:

- `style.css` — B's token system, dark-first with light via `prefers-color-scheme`.
- `app.ts` — render-from-`State` with one delegated listener each for click/change/submit.
  Balance bar (`minutesByCategory` day vs even-split ticks), pinned & timed strip
  (held + due-timed selection entries, orange treatment), category panels (day/week/month
  stats, selected items with reason chips, per-item and per-category **Log time** inline
  forms), all verbs (**Done, Start, Hold/Release, Not today, Bump for tomorrow, Change
  cadence, Archive**), an **Add item** form (name/category-with-datalist/sub-category/
  cadence/optional time), hash-routed **category focus** (`#focus/<cat>`), export/import in
  the top bar, a **first-run empty state**, and a **Planning panel** with an honest empty
  state (YouTube integration is still roadmap). Impressions are recorded per shown item per
  day, deduped against state before appending. All user text is HTML-escaped.
- `main.ts` shrank to bootstrap; **demo seeding is gone** — first run is the empty state.
  (Ryan's browser DB still has the five demo events from the IndexedDB session; they now
  render as real, actionable items — convenient for verification.)

Transient view state (open forms, focus) lives in a small `ui` object; everything durable
is events. The strict gates caught four real slips on the first lint (a non-exhaustive
switch over `SelectionReason` being the interesting one — the same class of bug the event
union's exhaustiveness check exists to catch).

## Verification

42 tests still passing (core untouched); lint (strictTypeChecked) and build clean; dev
server serves and transforms the new modules (checked directly). Browser-level verification
is Ryan's — the working tree is left **uncommitted** per his standing rule.
