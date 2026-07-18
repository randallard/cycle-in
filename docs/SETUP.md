# Running cycle-in on your own machine

From nothing to a working local app, then (optionally) to your own deployed copy. Every command
below was run from a clean clone on 2026-07-18.

If you just want to *use* cycle-in, the deployed copy is at
https://randallard.github.io/cycle-in/ — no setup at all. This guide is for running it yourself,
which you'd want if you're changing it or hosting your own fork with your own data.

## Prerequisites

| | Version | Why |
|---|---|---|
| **Node** | ≥ 22.13.0 | `engines` in `package.json`; pnpm 11 itself requires it |
| **pnpm** | 11.5.3 | pinned via `packageManager` |

Node's own installer is fine; for pnpm, the least-surprising route is Corepack, which reads the
pinned version straight out of `package.json`:

```bash
corepack enable
corepack prepare --activate    # installs the pinned pnpm
```

Check both before continuing — a Node older than 22.13 fails in a confusing way (pnpm complains
about its *own* engine, not this project's):

```bash
node --version   # v22.13.0 or newer
pnpm --version   # 11.5.3
```

There is no database, no server, no API key, and no account. Your data lives in your browser.

## Clone and install

```bash
git clone https://github.com/randallard/cycle-in.git
cd cycle-in
pnpm install       # ~3s on a warm store
```

**Install scripts are blocked by default** (`ignore-scripts=true` in `.npmrc`) — that's
deliberate, not a misconfiguration. Any dependency needing a native build step gets reviewed and
explicitly allowlisted in `pnpm-workspace.yaml`. See
[ADR-0002](adr/0002-npm-supply-chain-discipline.md). If an install ever *seems* to need a script,
that's a decision to make, not a setting to flip.

## Run it

```bash
pnpm dev
```

Then open the URL it prints — **http://localhost:5173/cycle-in/**.

> ⚠️ **Mind the `/cycle-in/` path.** `vite.config.ts` sets `base: "/cycle-in/"` so the GitHub
> Pages build resolves its assets. The dev server honours the same base. Plain
> `http://localhost:5173/` redirects, but if you've bookmarked a bare-root URL from another
> project, that's the confusion. Renaming the repo in a fork? See [Deploying your own
> copy](#deploying-your-own-copy) — this is the one setting you must change.

First load shows the empty state — **Add an item…**, **Import a video…**, **Import bundle…**.
Add one item and it starts working; nothing else needs configuring.

### Running more than one copy at once

Handy when someone else already has the dev server going, or you want a scratch profile:

```bash
pnpm dev --port 5199 --strictPort
```

Each port is a **separate browser origin, and therefore a separate IndexedDB** — `:5199` cannot
see `:5173`'s items. That's an isolation feature when you want a clean slate, and a surprise if
you switch ports and think your data vanished. It didn't; go back to the original port.

## Where your data lives

Everything is an append-only event log in **IndexedDB, in that browser, on that machine**. There
is no sync and no server copy.

Consequences worth knowing before you rely on it:

- Different browser, different profile, or private window → different data.
- Clearing site data for `localhost` (or your Pages domain) **deletes your log.**
- Moving between machines is manual and deliberate: **Export events** writes a JSON bundle,
  **Import bundle…** merges one in. The merge is a union by event id, so importing the same
  bundle twice is harmless and two devices' logs combine cleanly in either direction.

Export is also your backup. There isn't another one.

## Importing a video

The **Import video…** flow reads a
[branching-video](https://github.com/randallard/branching-video) `config.json` — the node graph,
not a video file. Pick which nodes become ordered steps, and the result is one time-option you
walk step by step.

Two config shapes both work: a *branching* show (nodes wired by `choices`, whose main line is the
`default: true` spine) and a *flat tutorial* (`choices: []` on every node, an ordered list of
timestamped segments — the nodes are the steps). The picker preselects a sensible default for
each and lets you toggle and reorder before committing.

To try it without having a branching-video project, save this as `demo-config.json`:

```json
{
  "title": "Demo drill",
  "masterVideoId": "aqz-KE-bpKQ",
  "nodes": [
    { "id": "n1", "title": "Step one", "start": 0,  "end": 45, "choices": [] },
    { "id": "n2", "title": "Step two", "start": 45, "end": 120, "choices": [] },
    { "id": "n3", "title": "Step three", "start": 120, "choices": [] }
  ]
}
```

Import it, give it a name and category, and **Add to rotation**. Feeding it the wrong file is
safe — the parser rejects non-configs with a specific reason, and recognises a cycle-in event
bundle well enough to tell you to use **Import bundle…** instead.

## The other commands

```bash
pnpm test     # vitest + fast-check property tests
pnpm test:watch
pnpm lint     # eslint (typescript-eslint strictTypeChecked), zero-warnings
pnpm build    # tsc then vite build → dist/
pnpm preview  # serve the built dist/ — also at /cycle-in/
```

`pnpm preview` is worth a look before you deploy: it serves the real production build, so it
catches base-path and asset problems that `pnpm dev` papers over.

Design prototypes are served alongside the app at
**http://localhost:5173/cycle-in/prototypes/** — static HTML mockups, no build step. New UI
prototypes belong there rather than anywhere outside the repo.

## Deploying your own copy

The repo ships a GitHub Actions workflow (`.github/workflows/deploy.yml`) that lints, tests,
builds, runs the supply-chain checks, and publishes `dist/` to Pages on every push to `main`.

To host your own fork:

1. **Fork the repo.**
2. **Change the base path if your repo isn't named `cycle-in`.** In `vite.config.ts`, `base` must
   match your repository name exactly, with both slashes:
   ```ts
   base: "/your-repo-name/",
   ```
   Skip this and the deployed page loads but every asset 404s — a blank screen with console
   errors. It's the single most common fork mistake.
3. **Settings → Pages → Source: GitHub Actions.**
4. Push to `main`. The workflow builds and deploys; your copy lands at
   `https://<you>.github.io/<your-repo-name>/`.

Your fork's data is entirely your own — it's in your browser, not in the repo.

## Verifying a change

Tests and typecheck aren't enough for UI work: this codebase has had bugs that were *green in
every test* and obvious within seconds of clicking (see
[journal 2026-07-18-1](journal/2026-07-18-1-phase-1-browser-verification-and-fixes.md)). Run the
app and drive the thing you changed. `.claude/skills/verify/SKILL.md` has a repeatable headless
recipe if you want one.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Blank page at `http://localhost:5173/` | Missing base path — use `/cycle-in/` |
| Deployed page blank, assets 404 | `base` in `vite.config.ts` doesn't match the repo name |
| pnpm complains about the Node version | Node < 22.13 — pnpm 11's own requirement |
| "My items are gone" | Different port, browser, profile, or cleared site data — each is its own IndexedDB |
| Port 5173 already in use | Another copy is running; `pnpm dev --port 5199 --strictPort` |
| A dependency wants a postinstall script | Blocked on purpose — read [ADR-0002](adr/0002-npm-supply-chain-discipline.md) before allowlisting |
