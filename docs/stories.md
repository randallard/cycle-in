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
    needs a stable concern id in a URL. That URL contract is part of this story. The link always
    points at **the reader's own cycle-in**, with a reference to the original where there is one
    (Ryan, 2026-11-22: *"the linking between repos would only be to their own user's cycle-in web,
    with maybe a reference to the original"*). Making other repos *use* it is Epic D.

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

## Epic D: concern repos people can read, fork and take on as their own
Ryan, 2026-11-22: *"I do want doc repos to contain tasks and shows … the story is for people to be able
to take a look or for me to review the docs I have on a concern or goal and see tasks and branching
videos I have from that repo, then be able to, as a different user, fork it and take it on as my own,
incorporating the tasks into my cycle-in"*. And: *"maybe that means it should be a template, and there
should be an easy way to copy tasks, goals, and whatnot from other people's shared repos"*.

A **concern repo** holds one concern's (or goal's) research docs, its tasks, and its branching-video
shows (B2's "repos contain docs, tasks and branching videos").

**The one design point these stories share:** what a concern repo shares is a **recipe**, the concern
plus its task seeds (name, category, cadence, show links), *not* a cycle-in event bundle. A bundle
(`core/bundle.ts`) carries its owner's whole history, and importing it unions someone else's event
ids into your log. Adopting a recipe instead mints new ids in *your* cycle-in and records where each
piece came from.

### D1. A template for concern repos: Accepted 2026-11-22
*As someone starting on a concern, I want a template repo that already has a place for docs, a task
recipe and shows, so mine is shareable from the start.*
- A GitHub template repo: `docs/` (the research), a recipe file (concern plus task seeds, versioned
  like the bundle format: `format`, `version`), and a `shows/` directory of branching-video
  `config.json` files.
- The recipe validates in CI against cycle-in's seed rules (cadence kinds, categories), so a broken
  recipe can't be merged.
- It holds docs, a recipe and shows, and never progress: no export bundles, no logs (D5's rule).
- One setting says *whose* cycle-in it links to (D4). A fresh copy has none set, so its links offer
  to use the reader's own.

### D2. Read a concern repo: Accepted 2026-11-22
*As Ryan reviewing a concern, or anyone looking at it, I want its docs, tasks and shows on one page.*
- The repo publishes a page (GitHub Pages) that shows the docs and lists the recipe's tasks, each
  with its cadence and category, and the shows, each with a **play** link.
- Each task and show has an **add to my cycle-in** link (D3).

### D3. Take a concern on as my own: Accepted 2026-11-22
*As a different user, I want to fork someone's concern repo, or just copy from it, and bring its
concern and tasks into my cycle-in.*
- From a concern repo's page, or a recipe URL pasted into cycle-in, cycle-in shows what will be
  added: the concern, each task, each show. Then it adds the ones I pick.
- Everything added gets **new ids in my log**. The concern records its source (the recipe URL, and
  the original repo when the source is a fork).
- Adding the same recipe again doesn't duplicate anything. It offers only what's new or changed.
- No one else's history comes with it. Only recipe content is added.
- It works the same whether I forked the repo or only read it.

### D4. Links go to the reader's own cycle-in: Accepted 2026-11-22
*As a forker, I want my copy's links to go to my cycle-in, with credit to where it came from.*
- A concern repo's links (B2's link back, D2's "add to my cycle-in") point at the cycle-in URL set in
  that repo's setting (D1). With none set, they ask the reader for theirs.
- A fork keeps an "originally from <repo>" reference, and never links into the original owner's
  cycle-in.

### D5. Forking cycle-in starts clean: Accepted 2026-11-22
*As a new user, I want my own cycle-in by forking Ryan's, starting with none of his progress, and still
able to pull his later fixes.*

Ryan, 2026-11-22: *"keep fork as an option too - I think the fork should be the default - maybe we
don't need the template option … we do need a way for users to fork without the other user's
progress"*. Fork is the route, and a template isn't needed. That's because **progress is never in
the repo**: it lives in each user's browser (IndexedDB, `shell/storage.ts`), and a fork's Pages site
is its own origin (`<user>.github.io`), so its storage is separate even on the same device. The only
personal choices in the repo are the defaults in `core/config.ts`.

- `docs/SETUP.md` starts from **Fork**, and says how to pull upstream fixes later (GitHub's "Sync
  fork"). Its Node and pnpm versions match the repo (today it says 22.13 and 11.5.3, where the repo
  needs 26 and 12).
- A fork deploys to its own Pages, and changes only `core/config.ts` and the steps `SETUP.md` lists.
  It opens empty.
- **CI keeps progress out of the repo:** a committed file in the export format
  (`"format": "cycle-in-events"`) fails the build, apart from test fixtures under `src/`.
- The same rule holds for concern repos (D1): they hold docs, recipes and shows, and **never
  progress**. A fork of a concern repo brings the owner's research and tasks, not their history.

**Order:** D5 can go any time, since it's mostly docs and one CI check. D1 → D2 → D3 → D4 come after B2 (concerns
exist in cycle-in) and B1 (not-started tasks).
