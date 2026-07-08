# 2026-07-08 (evening) — ranked worklist, UI-gap pass, and a stray fleet home

Post-scaffold review session. Three things happened.

## Ranked worklist

Ryan asked to rank the review suggestions by difficulty and work through them in order — the
list now lives in `PROGRESS.md` ("Ranked worklist"). Highlights: Renovate's config is inert
until the GitHub App is installed (Ryan-only action); the event-log data model is the big
item, deliberately designed so the still-open sync decision stops being load-bearing.

## UI-flow gap pass

Second deliberate walk of the described flow against the docs and `src/core/types.ts` — found
eight gaps, now recorded in `PROGRESS.md` ("UI-flow gaps"). The two that matter most: the
general promote/demote-cadence flow (the literal "cycle" of cycle-in) was never specced beyond
the BV "advance to next node" case, and "bump priority for tomorrow" exists in the README but
has no field in the data model. Also flagged: `isDue`'s elapsed-time semantics drift for
"daily" items (done at 11pm → not due until 11pm tomorrow); calendar-day semantics are almost
certainly the intent.

## The stray `cycle-in.git` home — a second face of the nesting foot-gun

Worklist item 1 (fleet backup via `gr create`) failed: "a home named `cycle-in` already exists
on the server." Investigation, with the audit log as the evidence trail:

- The existing home contained the **`work` repo's** history (`0459ec3`, `3621807` — the
  work-tracking repo, complete with `case_number_requests/` etc.), no merge-base with the real
  cycle-in at all.
- `~/.local/state/git-redundancy/audit.log` shows `action=push repo=cycle-in ... result=created`
  at 2026-07-08T18:57:39Z — while `work/cycle-in/` was still a docs directory *inside* the
  work repo. A `gr create` run from that subdirectory did it.
- Root cause is a real `gr` UX trap, confirmed in its source (`lifecycle.rs::run_create`): the
  home is named after **cwd's basename**, but the git commands run `git -C cwd`, which resolves
  to the **enclosing repo** when cwd is a subdirectory. Result: a home named after the
  subdirectory, containing the parent repo's history. Same hazard class as the morning's
  "never `git init` inside `work/`" finding, via a different door.

Cleanup, verified lossless before deleting anything: the stray home's content was a strict
duplicate of `work@0459ec3`, and `work.git` (the proper home) already held that commit —
`gr status` showed work `ok`. With Ryan's explicit go-ahead, deleted `/data/git/cycle-in.git`
on both acer and tenx over SSH, then re-ran `gr create` from the real `~/Development/cycle-in`.

Follow-up owed to **git-redundancy** (not this repo): record the subdirectory foot-gun as a
known issue — `gr create` should probably refuse (or warn) when cwd is not the repo toplevel,
or derive the default name from the toplevel instead of cwd.
