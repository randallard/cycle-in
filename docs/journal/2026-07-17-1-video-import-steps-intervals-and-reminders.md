# 2026-07-17 — video-import → steps → intervals → reminders: planning the whole arc

Design session, no code yet. Ryan described the flow he most wants next — "take a video I like,
add it as an option, track which step I'm on, have it come up every 50 minutes, ding at me, and
let me snooze it" — as one continuous story. Pulled apart, it's **six flows**, and most already
have bones in the ADR-0003 event model. Two of them hit real forks; Ryan called both.

## The naming decision
List items are now **"time-options"** — Ryan named them this session (they'd been the
placeholder "items"). User-facing term going forward; core identifiers migrate incrementally.

## The six flows, mapped to what exists
1. **Import a video as a time-option** — freeform-text path already exists (the add-item form).
   The JSON path is new: branching-video exports its **`config.json` node graph** (checked
   against `~/Development/branching-video/config.example.json` — `{title, startNode,
   masterVideoId, nodes[]}`, nodes carry `id/title/videoId?/start?/end?/choices[]`, no separate
   "Export-All" bundle exists), so cycle-in needs its own tolerant parser for that format, plus a
   node-picker.
2. **Steps within a video** — bones exist (`bvSource`, `currentNodeId`, the `bv-node-advanced`
   event) but only hold one node, not an ordered sequence, and there's no UI verb. Plan: widen
   `bvSource` to carry the chosen `steps[]`, `currentNodeId` points at the current one,
   `bv-node-advanced` becomes "advance to next step."
3. **Check-ins (a progress link per step)** — `time-logged` already carries `link/notes/itemId`;
   add an optional `nodeId` and a per-time-option detail view listing check-ins by step.
   Link-only check-ins log no minutes, so rollups are undisturbed.
4. **"Every 50 minutes"** — the big one. ADR-0003 *rejected* elapsed cadences (calendar items
   shouldn't drift). But an interval item's intent *is* elapsed, so it's a new, correct cadence
   kind, not a regression — and it breaks the "list is stable for the whole calendar day"
   assumption, so the list has to go sub-day-live for that slice.
5. **Snooze ("skip to next 50" / "remind me in 25")** — no existing event fits; new `snoozed
   {itemId, until}`. Distinct from `dismissed-today` (whole day) and `priority-bumped`
   (tomorrow).
6. **Ding with a set tone + auto-refreshing list** — first feature to need PWA plumbing +
   Notifications/Audio.

## The two forks Ryan decided
- **Reminders posture** → **foreground-only v1.** A static Pages PWA can't reliably wake when
  closed/locked (no push server; the wake-a-closed-PWA API is Android/Chrome-only, no iPhone).
  Foreground dinging — sound + notification while the app is open — is honest, universal, and
  matches "unlock phone, open it, see/hear what's due." Background/push deferred.
- **Build order** → **JSON-import + steps first**, then the interval/snooze/reminder engine on
  top of the imported cardistry item.

## Written up as
- **[ADR-0004](../adr/0004-branching-video-import-time-options-steps-check-ins.md)** (Proposed) —
  the import model: the branching-video parser, time-options carrying step sequences, check-ins
  as `time-logged` + `nodeId`, the two-path "add" entry point, default-spine step detection.
- **[ADR-0005](../adr/0005-interval-cadence-foreground-reminders-snooze.md)** (Proposed, amends
  ADR-0003) — the `interval` cadence kind alongside the calendar kinds, elapsed due-ness, the
  `snoozed` event, sub-day-live-but-still-pure selection, and foreground-only reminders.
- **PROGRESS.md** — "Next build steps" replaced with the phased plan below; new open questions.

Both ADRs are **Proposed**: Ryan decided the reminder posture and the build order; the model
shapes are my proposals from his description and await his local review before code (his
standing "let me verify before you commit" rule).

## Phased plan (import-first)
- **Phase 1 — Import + steps (no timing yet):** BV `config.json` parser; the file-picker + node
  picker (default-spine preselected); widened `bvSource.steps[]`; "advance to next step" verb;
  per-time-option detail view; check-in-link form (`time-logged` + `nodeId`). Ships a usable
  "walk a video's steps and attach progress links" loop on the existing calendar cadences.
- **Phase 2 — Interval + snooze + live list:** `interval` cadence kind; elapsed due-ness; the
  `snoozed` event and its two verbs; sub-day re-render (load / `visibilitychange` / minute tick).
  The cardistry-every-50-min loop works, visually, no sound yet.
- **Phase 3 — Foreground reminders + PWA:** manifest + service worker (worklist #5); per-time-
  option reminder tone; Notification + audio on due/snooze-elapsed while open.
