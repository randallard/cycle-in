# Stories

User stories for work that hasn't been built yet, grouped into epics. Each story has acceptance
criteria (the checks that say it's done). A story is **Proposed** until Ryan confirms it, then **Accepted**. Once
confirmed, a story is built on its own branch, and its status here changes to the PR that built
it. Decisions made along the way still go in [`adr/`](adr/README.md). This file is the list of
what's wanted.

## Words used here
These are pinned first, because two stories depend on "check-in" meaning more than it does in the
code today. When they're built, these definitions go into the user guide.

- **time-option**: a thing to spend time on, which cycle-in suggests by cadence (the code calls
  it an item).
- **step**: one part of an imported branching-video show (a node), which a time-option walks
  through in order.
- **visit**: opening or starting a time-option. cycle-in records the time of every visit itself,
  and the time range when it can tell when the visit ended.
- **check-in**: what a visit leaves in the history. It's a link, a note, both, or nothing but the
  visit's own time. In today's code it's a `time-logged` entry with a required link (`ui/app.ts`
  `checkinForm`).
- **loop**: playing one step of a show again and again until stopped.

## Epic C: practise a section of a show on a loop (cello)
Ryan, 2026-11-21: *"I'm practicing cello and I have a video that is the accompaniment and I want to
be able to play"* one section of it continuously, from a cycle-in task, *"each day I can attach a
link to a progress video"*, *"alternatively just add a note instead of a link"*, and *"the timestamp
or range should be collected by default for every possible task"*.

### C1. Loop one step of a show (branching-video): Accepted 2026-11-22
*As a cello learner, I want to loop one section of my accompaniment so I can practise it without
interruption.*
- Opening `player.html?config=…&loop=1#<nodeId>` plays that step from its start. When the step's
  segment ends, playback seeks back to the step's start instead of offering choices or routing on.
- The player shows that loop mode is on, and has a control to turn it off. Off means normal
  routing from the current step.
- In loop mode a segment end never changes the current step. That's a property test over the
  `playback.ts` reducer, including YouTube's spurious ENDED events (`endIsReal`).
- Without `loop=1`, nothing about today's playback changes. The existing e2e tests pass unchanged.

### C2. A looping step as a cycle-in task: Accepted 2026-11-22
*As a cello learner, I want a cycle-in time-option that opens my accompaniment section already
looping, so practice starts in one tap.*
- When importing a show, or on an imported time-option, a step can be marked "practise on a loop".
- Starting that time-option opens the C1 link for that step (`loop=1`) in a new tab.
- The time-option shows which step it loops. Changing the step is an event in the log, like other
  edits, not a rewrite.

### C3. Every visit records its time: Accepted 2026-11-22 (the base the others build on)
*As anyone cycling skills, I want each visit's time recorded without my doing anything, so my
history shows when I practised even when I didn't write anything down.*
- Starting or opening any time-option, imported or not, records the visit's time automatically.
- When the visit has an end the app can see (done, logged, or the next visit), the history shows
  the time range. Otherwise it shows the start time.
- Nothing about recording a visit asks a question or blocks the flow.
- It's stored as events, so it syncs and merges like everything else (union by event id).

### C4. A check-in's link is optional: Accepted 2026-11-22
*As a cello learner, I want to check in with a link to a progress video, a note, both, or nothing,
so writing something down is never the barrier.*
- The check-in form submits with any combination: link only, note only, both, or neither. Neither
  records a bare check-in, which is the visit's time.
- A link, when given, is still limited to `http`/`https` (today's `safeHref` rule). Any video
  service works.
- Existing check-ins with links read and display as before.

### C5. History shows each check-in as what it is: Accepted 2026-11-22
*As a cello learner looking back, I want each check-in shown as its link, its note, or just its
time, so the history reads at a glance.*
- A check-in with a link shows the link. One with a note shows the note. One with both shows both.
  One with neither shows its time, or time range, alone.
- Check-ins on a looping step (C2) group under that step, as branching-video check-ins already do
  (ADR-0004).

**Order:** words above → C3 → C4 → C5 → C1 → C2. C3 changes what every time-option records, so
it goes first. C1 is in branching-video and can be built in parallel.

## Epic B: a backlog, concerns and due dates
Ryan, 2026-11-22: *"do I have a place to store skills I want to start - like a backlog? Also maybe
concerns I want to put time into - also items I need to remember with a deadline"*. Until these are
built, the list lives in `~/Development/work/personal-backlog/` (its ADR-0001). These stories move it
here.

### B1. A "not started" stage for skills: Accepted 2026-11-22
*As someone noticing new skills, I want to capture a skill I might start without it entering
rotation, so I can research it and decide later.*
- A time-option can be added as **not started**: it's never on the board, and it has no cadence yet.
- It can carry notes and links from research.
- **Start cycling** gives it a cadence and puts it into rotation. It's an event, so the history shows
  when it was decided.
- The not-started list is its own view, separate from archived items.

### B2. Concerns as goals: Accepted 2026-11-22
*As Ryan, I want to keep concerns as goals that lead to research, shows and repos, and see which of my
time-options serve each one, so I can tell whether a concern is being covered.*
- Ryan's first concern (2026-11-22): *"stay on top of things that go wrong by getting older and can
  be prevented with tasks"*.
- **What a concern is** (Ryan, 2026-11-22: *"concerns are like goals and lead to research that leads
  to branching videos or repos and repos contain docs, tasks and branching videos that link to and
  from cycle-in"*):
  - **A concern is a goal.** It isn't a task to tick off. It leads to **research**.
  - Research produces **branching-video shows** or **repos**. A repo holds docs, tasks and shows.
  - Those **link both ways with cycle-in**: a concern's research, shows and repos link from it, and
    the time-options they produce link back to the concern.
- Acceptance:
  - A concern can be added with a name and a description, and it's never on the board itself.
  - A concern can hold links to its research, shows and repos (any `http`/`https` URL, as check-in
    links are limited today).
  - A time-option, imported or not, can name the concern it serves. The concern's view lists those
    time-options, and the time spent on them in a chosen period.
  - A concern with no time-options linked, or with none visited in a chosen period, is marked so. That
    answers "am I covering this?"
  - It's all stored as events (`concern-added`, a link to a concern, and so on), so it syncs and
    merges like everything else.
  - **Linking back from a repo or show** (a repo doc or a show pointing at its concern in cycle-in)
    needs a stable concern id in a URL. That URL contract is part of this story. Making other repos
    *use* it is their own work.

### B3. Due dates on one-off time-options: Accepted 2026-11-22
*As someone with things that must happen by a date, I want a one-off time-option to have a due date,
so it rises to the top as the date nears and stands out once it's overdue.*
- A one-off time-option takes an optional due date.
- The board orders due items by date, ahead of cadence suggestions as the date nears. An overdue
  item is marked as overdue, the way a passed time-of-day shows orange today.
- Done clears it, as one-off items clear today.

### B4. A reminder for due items: Accepted 2026-11-22 (after ADR-0005's reminders)
*As someone who forgets, I want my phone to remind me when a due item is close.*
- It uses the reminder mechanism ADR-0005 plans for interval cadences. Nothing separate is built
  for due dates.
- **Open question:** a static site can only remind while it's open (ADR-0005's foreground reminders).
  Is that enough, or does this need a push service?

### B5. Bring the personal-backlog list over: Accepted 2026-11-22
*As Ryan, I want the items captured in `work/personal-backlog` moved into cycle-in once B1 and B3
exist.*
- Each skill becomes a not-started time-option (B1), and each deadline a one-off with its due date
  (B3). That's done through the existing import, which merges events, or by hand.
- Each item moved is struck in `personal-backlog/PROGRESS.md` with a pointer here.
