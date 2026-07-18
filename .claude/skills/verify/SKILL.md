---
name: verify
description: Drive cycle-in in a real browser to observe a change working end to end (board, item detail, history, import/export).
---

# Verifying cycle-in

Single-page Vite app. The surface is **the browser** — hash-routed views over an
append-only event log in IndexedDB. Nothing here is observable from Node.

## Launch

Ryan owns the dev server on the default port. Start your own on a distinct port
so you get an isolated IndexedDB origin (`localhost:5199` ≠ `localhost:5173`) and
never fight his:

```bash
pnpm dev --port 5199 --strictPort   # serves at http://localhost:5199/cycle-in/
```

Note the `/cycle-in/` base path — the bare origin 404s.

## Driving it

No Playwright in the repo, but the browsers are already cached and
`playwright-core` installs in seconds into the scratchpad.

**Install it with `--ignore-scripts`, always:**

```bash
cd "$SCRATCHPAD"
printf '{"name":"scratch","private":true}\n' > package.json
cp "$REPO/.npmrc" .
npm i --ignore-scripts playwright-core
```

This tooling is disposable and stays out of the repo — that's deliberate
(ADR-0002 keeps the dependency tree small and every build script reviewed), but
it means the project's `.npmrc` doesn't cover it and you have to carry the
protection over by hand.

**Copying `.npmrc` alone does not work**, which is counterintuitive enough to
have been verified: npm honours a directory-local `.npmrc` only once that
directory is a *package root*. A bare `npm i` in an empty scratchpad creates
`package.json` as part of the install, and config is resolved before that — so
the copied `ignore-scripts=true` is silently ignored and postinstall scripts
run. Tested against a fixture package with a `postinstall`: `.npmrc` alone →
script **ran**; `--ignore-scripts` → blocked; seeding `package.json` first →
blocked.

Hence all three lines above: the seeded `package.json` and `.npmrc` make the
directory behave for any *later* installs, and the explicit flag is the part
that can't be defeated by ordering. If you only remember one thing, remember the
flag.

```js
import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
```

Attach `pageerror` + `console` listeners and assert they stayed empty — a
`favicon` 404 is the only expected console noise.

## Routes

| Route | View |
|---|---|
| `#` | the board (today's choices, balance, planning) |
| `#item/<id>` | time-option detail — verbs, steps, logged time & check-ins |
| `#history` | stacked-column rollups |
| `#focus/<category>` | board filtered to one category |

## Flows worth driving

- **Branching-video import:** `button[data-action="import-video"]` reveals a
  hidden `#video-file` input — `setInputFiles` it directly, don't click. Real
  fixtures live in `~/Development/branching-video/` (`config.json` is a
  branching show; write a `choices: []` / no-`startNode` one by hand to exercise
  the flat-tutorial file-order fallback). Then: toggle/reorder nodes, fill
  name+category, `Add to rotation`.
- **Steps:** `data-action="advance"` / `data-action="set-step"` on the detail
  view, and the `.stepctl` inside the board's `⋯` verbs.
- **Check-ins:** `Add check-in…` → `form[data-form="checkin"]`.
- **Import bundle:** hidden `#import-file` input, same `setInputFiles` trick.

## Gotchas

- **Wipe state between runs** — a fresh `newContext()` gets an empty IndexedDB,
  which is usually what you want. To wipe mid-run: `indexedDB.databases()` +
  `deleteDatabase`, then `page.reload()`.
- **`p.status` is now a real signal** — every verb sets a confirmation (`run`
  requires one), so reading it after an action is a legitimate check. It's still
  *sticky* between actions, though: it holds the last message until something
  replaces it, so make sure the text you read belongs to the step you just drove.
- **Held items move.** `Hold on list` pulls an item out of its category panel
  (`.item`) and up into the pinned choices section (`.card`). Locators scoped to
  `.item` go stale — use `.item, .card` when a flow crosses a hold.
- **Export is a real download** — `page.waitForEvent("download")` then `saveAs`.
  It's the cleanest way to inspect the event log a flow produced.
- Selection is day-seeded and stable until midnight, so the board's contents
  won't shuffle between steps of one run.
