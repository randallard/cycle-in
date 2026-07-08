# cycle-in

A personal skill-cycling tracker — surfaces **what to practice or revisit right now**, cycling
old skills back in (so they don't atrophy) and pulling new ones into regular rotation (so they
build momentum), instead of relying on memory or a stale mental list.

**Use it here:** https://randallard.github.io/cycle-in/ *(once the first deploy lands)*

> Status: early scaffolding — a minimal proof-of-life page exists (Vite + TypeScript + Vitest +
> `fast-check`, deployed via GitHub Actions to Pages), but the real data layer is still a stub.
> See [`docs/PROGRESS.md`](docs/PROGRESS.md) for exactly where things stand and what's next.

## What it does (the plan)

- The main page shows the **next 5–10 things** to do right now, factoring in each item's
  cadence (daily / weekly / monthly / a specific time of day / one-off) — items whose
  preferred time-of-day has already passed today show up **in orange**.
- **Mark an item done**, **start** one without finishing it yet, **hold** one on the list
  regardless of its normal schedule (and release the hold later), or **log time spent**
  (duration, reps, notes, a link) against a category/sub-category — whether or not it was ever
  on the suggested list at all.
- **Category/sub-category rollups** by day/week/month, so "how did drawing, music,
  programming, and exercise fit in this week" is answerable directly.
- Items can come from three places: imported from
  [branching-video](https://github.com/randallard/branching-video)'s bookmarked-video export
  bundle (with a dedicated review/onboarding screen and an "advance to next node" action once
  you're ready to move past the video currently driving an item), cycle-in's own item data, or
  a freeform custom list of reminders.

Full design, including what's still explicitly undecided (the cross-device sync model, most
notably): [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Development

```bash
pnpm install
pnpm dev      # local dev server
pnpm test     # vitest + fast-check property tests
pnpm lint     # eslint (typescript-eslint strictTypeChecked)
pnpm build    # tsc --noEmit then vite build → dist/
```

Install scripts are blocked by default (`.npmrc`); any dependency that genuinely needs a native
build step is reviewed and explicitly allowlisted in `pnpm-workspace.yaml`, never silently
allowed. See [`docs/adr/0002-npm-supply-chain-discipline.md`](docs/adr/0002-npm-supply-chain-discipline.md).

## Docs

- [`docs/PROGRESS.md`](docs/PROGRESS.md) — current status, immediate next steps, open questions.
- [`docs/adr/`](docs/adr/README.md) — Architecture Decision Records (the *why*).
- [`docs/journal/`](docs/journal/README.md) — dated narrative worklog.
