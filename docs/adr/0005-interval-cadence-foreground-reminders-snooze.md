# ADR-0005: Interval/session cadence, foreground reminders, and snooze — amends ADR-0003
- Status: Proposed
- Date: 2026-07-17
- Deciders: Ryan (reminder posture decided this session; cadence/snooze shapes _(proposed)_ await local review)

## Context
[ADR-0003](0003-append-only-event-log-core.md) chose **strict calendar periods** for cadence and
explicitly **rejected elapsed-interval cadences** — because a *daily-intended* item done at 11pm
should be due again the next calendar day, not 24h later, which "drifts later every day." That
reasoning is sound for calendar-intended items.

But Ryan's cardistry case is a different intent: "have this skill come up **every 50 minutes**,
so I can either work on it and mark it, or set it aside to come up again in an amount of time I
choose — skip to the next 50 minutes, or remind me in 25." That is a genuine **elapsed/session**
cadence: the intent *is* "N minutes after I last touched it," so elapsed timing is correct here,
not a bug. Two more forces come with it:

1. **The list must recompute within a day.** ADR-0003's selection is a pure function of
   `(state, calendar-day, config)` and is deliberately **stable across refreshes within a day**.
   An interval item that recurs every 50 minutes cannot be expressed by a once-per-day list —
   selection has to be live to `now` at minute granularity for the interval slice. Ryan also
   wants the list to refresh on its own: "when I unlock my phone and bring up the list it shows
   me what my options are for this bit of time."
2. **Reminders need to be actionable but the site is static.** Ryan wants the phone to "ding at
   me with a set tone." A static GitHub Pages PWA has **no server to push from**, and the browser
   APIs that can wake a *closed* PWA (Notification Triggers) are experimental and Android/Chrome
   only — not iPhone. Decided this session (Ryan): **foreground-only v1** — honest, works on
   every device, matches the "unlock, open it, see/hear what's due" flow.

## Decision

### A new `interval` cadence kind, alongside — not replacing — calendar cadences _(proposed)_
`Cadence.kind` gains `"interval"` with `everyMinutes: number` (50 for cardistry). ADR-0003's
calendar kinds (`daily`/`weekly`/`monthly`/`one-off`) are unchanged and stay the default. The
ADR-0003 objection was about calendar-intended items misusing elapsed logic; an interval item's
intent *is* elapsed, so elapsed due-ness is correct — this **amends** ADR-0003's cadence section
(ADR-0003 stays Accepted), it does not reopen the calendar decision.

### Interval due-ness is elapsed since last touch _(proposed)_
An interval time-option is **due when `now − lastTouched ≥ everyMinutes`**, where `lastTouched`
is the latest of its `item-done` / `item-started` / an active snooze's `until`. Between touches
it is suppressed. "Mark it" (done/started) resets the clock; so does a snooze.

### Snooze: a new `snoozed` event _(proposed)_
`{ kind: "snoozed"; itemId; until: ISO }`, folded into a `snoozes` slice like `dismissals`.
An item with an active snooze (`until > now`) is excluded from selection until then.
- **"Skip to the next 50 minutes"** → snooze `until = now + everyMinutes` (v1: relative to now;
  clock-aligned boundaries noted as a tunable below).
- **"Remind me in 25 minutes"** → snooze `until = now + 25m`, and, foreground, schedule the ding
  for that moment.
Snooze is per-occurrence and expires by time — distinct from `dismissed-today` (whole calendar
day) and `priority-bumped` (surfaces tomorrow), both of which stay for calendar items.

### The list re-evaluates sub-day, staying pure _(proposed)_
`selectOptions` remains a pure function of `(state, now, config)`; what changes is that the UI
**re-renders on a cadence**: on load, on `visibilitychange` (the "unlock and open" case), and on
a periodic tick (e.g. once a minute) so interval due-ness and the timed-item orange transition
land without a manual refresh. Calendar items remain day-stable (day-seeded shuffle unchanged);
only interval/timed/snooze evaluation is `now`-live. Determinism for tests holds — pass a fixed
`now`.

### Reminders are foreground-only, with a per-time-option tone _(Ryan, decided)_
While cycle-in is open, a timer fires a **Notification + plays a chosen sound** when an interval
or timed item comes due, or when a snooze's `until` elapses. No background wake, no push — a
**known, documented limitation** (a closed/locked PWA won't ding; you get the ding when you open
it, which is the intended flow). A per-time-option "reminder sound" setting picks the tone; the
audio ships bundled (asset source is an open sub-question). Notification permission is requested
lazily, only when the user first enables a sound.

## Consequences
- Partially reverses ADR-0003's "no elapsed cadences," **scoped to one new explicit kind** — the
  calendar model and its drift-avoidance are untouched for calendar items.
- Selection gains `now`-sensitivity for interval/snooze items; property tests extend (interval
  due-ness monotonic in elapsed time; a snoozed item never appears before `until`; calendar
  items still day-stable given a fixed day). The reducer gains a `snoozes` slice and the
  `snoozed` kind; unknown-kind tolerance means older app versions ignore snoozes safely.
- This is the first feature to need **PWA plumbing** (manifest + service worker, worklist #5) and
  the Notifications/Audio APIs — foreground-only keeps that plumbing minimal and iPhone-safe.
- **Open sub-questions**: snooze boundary — relative `now + interval` (v1) vs clock-aligned
  (:00/:50/…); quiet-hours so interval items don't ding overnight; whether interval items also
  honor an `atTime` window; the reminder-tone asset (bundled set vs user-supplied). Cross-device:
  a snooze/interval clock is device-local by nature — syncing snoozes across devices is likely
  unwanted (note, don't solve now).

## Alternatives considered
- **Approximate with a timed daily** — rejected: a once-a-day `atTime` item can't recur every 50
  minutes; it's the wrong shape for the cardistry loop.
- **Background/push notifications** — rejected for v1: needs a server (breaks static hosting) or
  experimental Android-only APIs (no iPhone); foreground-only is honest and universal.
- **Making the whole list `now`-live** — unnecessary: only interval/timed/snooze items need
  sub-day evaluation; keeping calendar items day-stable preserves ADR-0003's refresh-stability
  property where it still applies.
