# cycle-in

A personal skill-cycling tracker — surfaces **what to practice or revisit right now**, cycling
old skills back in (so they don't atrophy) and pulling new ones into regular rotation (so they
build momentum), instead of relying on memory or a stale mental list.

**Use it here:** https://randallard.github.io/cycle-in/ *(once the first deploy lands)*

> Status: working, still evolving. The board (what to do now, balanced by category), a
> stacked-column **history** view, an append-only event log persisted in IndexedDB, manual
> export/import sync, and **branching-video import** (bring in a video, track which step you're
> on, attach per-step progress links) are all built and driven end to end in a browser. Timed
> recurrence ("every 50 minutes"),
> snooze, and phone reminders are next. Built with Vite + TypeScript (strict) + Vitest +
> `fast-check`, deployed via GitHub Actions to Pages. See
> [`docs/PROGRESS.md`](docs/PROGRESS.md) for exactly where things stand and what's next.

## What it does

The list items are called **time-options**. Most of this is built; timed recurrence, snooze,
and reminders are the current work (see [`docs/PROGRESS.md`](docs/PROGRESS.md)).

- The main page shows the **next 5–10 things** to do right now, factoring in each time-option's
  cadence (daily / weekly / monthly / a specific time of day / one-off) — those whose
  preferred time-of-day has already passed today show up **in orange**. *(built)*
- **Mark one done**, **start** it without finishing yet, **hold** it on the list regardless of
  its normal schedule (and release later), or **log time spent** (duration, reps, notes, a link,
  tags) against a category/sub-category — whether or not it was ever on the suggested list.
  **Tags** are extra lenses beyond the one category: bucking bales can be *exercise* (what the
  balance weighs) tagged *farm work*. *(built)*
- **Category/sub-category/tag rollups** on a dedicated **history view** — stacked columns
  by day/week/month/year, drill into one category's sub-categories or one tag — so "how did
  drawing, music, programming, and exercise fit in this week" (or "how much farm work this
  summer") is answerable directly. *(built)*
- Time-options can come from three places: **imported from
  [branching-video](https://github.com/randallard/branching-video)** — pick a video's
  `config.json`, choose which nodes are steps, and it becomes one time-option you walk step by
  step (advance / jump), attaching a progress link to the current step as a **check-in** *(built)*;
  cycle-in's own added items *(built)*; or a freeform custom list of reminders.
- **Coming next:** an "every N minutes" cadence with **snooze** ("skip to the next 50" /
  "remind me in 25"), a self-refreshing list, and a phone **reminder ding** (see
  [ADR-0005](docs/adr/0005-interval-cadence-foreground-reminders-snooze.md)).

Full design, including what's still explicitly undecided (the cross-device sync model, most
notably): [`docs/PROGRESS.md`](docs/PROGRESS.md).

## Fork it

cycle-in is [MIT-licensed](LICENSE) and meant to be forked: the goal is that anyone can fork
this repo, adjust the config to their preferences, and start using it on their own GitHub
Pages — [`docs/SETUP.md`](docs/SETUP.md) walks through that end to end. User-tunable preferences live in one place — `src/core/config.ts` (`CycleConfig`):
the choices-list size (`maxOptions`, default 10) and the first day of the week
(`weekStartsOn`, default Monday) so far; new preferences accumulate there rather than being
scattered. A friendlier config surface (a settings file or in-app settings) comes with the
real UI.

## Development

**Full walkthrough — prerequisites, running it, where your data lives, deploying your own
fork: [`docs/SETUP.md`](docs/SETUP.md).** The short version:

```bash
pnpm install
pnpm dev      # local dev server → http://localhost:5173/cycle-in/
pnpm test     # vitest + fast-check property tests
pnpm lint     # eslint (typescript-eslint strictTypeChecked)
pnpm build    # tsc --noEmit then vite build → dist/
```

Note the **`/cycle-in/` path** — `vite.config.ts` sets `base` for GitHub Pages and the dev
server honours it. Forking under a different repo name means changing that one line.

Install scripts are blocked by default (`.npmrc`); any dependency that genuinely needs a native
build step is reviewed and explicitly allowlisted in `pnpm-workspace.yaml`, never silently
allowed. See [`docs/adr/0002-npm-supply-chain-discipline.md`](docs/adr/0002-npm-supply-chain-discipline.md).

## Docs

- [`docs/SETUP.md`](docs/SETUP.md) — set up, run, and deploy your own copy (start here).
- [`docs/PROGRESS.md`](docs/PROGRESS.md) — current status, immediate next steps, open questions.
- [`docs/adr/`](docs/adr/README.md) — Architecture Decision Records (the *why*).
- [`docs/journal/`](docs/journal/README.md) — dated narrative worklog.
