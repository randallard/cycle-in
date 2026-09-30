# 2026-09-19-1 — sustainable pacing: what the habit-formation research actually says

Docs-only note. No code, no scope commitment — same status as the 2026-09-18 finite-time-flow
entry this one extends.

Ryan asked two concrete questions about cycling new things in sustainably, plus a design
instinct: is starting several small habits at once (his example: 3 new things at ~5 min/day)
actually workable, is there good research on it; what should happen when a planned disruption
(a vacation) breaks the schedule and the user wants to build back up, since jumping straight
back to full load probably isn't sustainable; and since all of this plausibly varies per person,
maybe the right move is to make it *observable* rather than prescribe an answer. Extends
[`journal/2026-09-18-1`](2026-09-18-1-a-finite-time-flow-around-the-fourth-item-source.md)'s
trade-off-legibility question, not a new one.

Checked the actual literature rather than trusting the popular "one habit at a time" folk
wisdom, which turns out to overstate what the research shows.

## What's actually in the research

**Lally et al. 2010** (*European Journal of Social Psychology*, "How are habits formed:
Modelling habit formation in the real world") is the source of the misquoted "66 days" rule.
The real number is an average across a **range of 18–254 days** — the variability *is* the
finding, not the mean. Two things from it matter directly here:

1. **Missing a single day did not materially affect habit formation.** The habit curve is
   negatively-accelerating — most of the gain is already banked well before day 66 — so one
   lapse doesn't reset progress. Directly bears on the vacation-return question: the evidence
   doesn't support treating a gap as "back to zero."
2. It's a **per-person, per-behavior** range wide enough that a fixed number would be false
   precision. Supports the "make it observable, let the user judge for themselves" instinct
   directly — that's not a hedge, it's what a systematic review below also concludes.

**On simultaneous vs. sequential habit-building** — the popular advice ("always one at a time")
does not hold up as a blanket rule:

- A systematic review of RCTs comparing simultaneous vs. sequential multi-behavior-change
  interventions (PubMed 27311332) found **no consistent winner** — outcomes split by behavior
  and by person, and the reviewers' own conclusion is that it depends on those specifics rather
  than favoring one approach universally.
- Dalton & Spiller 2012 (*Journal of Consumer Research*, "Too Much of a Good Thing: The
  Benefits of Implementation Intentions Depend on the Number of Goals") found detailed
  if-then plans help a *single* goal but can backfire across *multiple* — because juggling
  several makes the difficulty more salient, undercutting commitment — **unless the multi-goal
  pursuit is explicitly framed as manageable.** That's a framing effect, not a hard cap on
  count. This is the closest thing in the literature to an actual mechanism, and it argues for
  *how* new items get introduced (grouped, visibly small) rather than *how many*.
- BJ Fogg's Tiny Habits work (Stanford Behavior Design Lab) argues the opposite direction from
  "one at a time" specifically *because* the actions are tiny: something that barely taxes
  attention or time doesn't compete with other tiny things the way a large behavior change
  would. This is applied/practitioner research (20 years, Fogg Behavior Model, 2009), not a
  single controlled trial, but it directly supports "3 small things" over "1 big thing" as the
  more sustainable shape.
- **Checked and ruled out:** "willpower depletion" (ego depletion) as an explanation for why
  multiple habits might compete. A 2016 pre-registered multi-lab replication (*Perspectives on
  Psychological Science*, k=23 labs, N=2,141) found the effect size indistinguishable from zero
  (d=0.04, 95% CI crossing zero). Any design reasoning that assumes a "limited willpower pool"
  is standing on a result that didn't replicate — worth not building on.

**On restarting after a disruption** — Dai, Milkman & Riis 2014 (*Management Science*, "The
Fresh Start Effect: Temporal Landmarks Motivate Aspirational Behavior") found that temporal
landmarks — new week, new month, a birthday, and plausibly a return from vacation — measurably
*increase* motivation to re-engage with goals (gym visits and diet-related search volume both
spike right after these markers). Combined with Lally's finding that lapses don't erase
progress, the research points toward treating a return-from-break as a **good** re-entry moment
worth leaning into, not a fragile one to tiptoe around.

## What this suggests for cycle-in, not yet designed

None of this is scoped or committed — recording it here because it sharpens the existing
[trade-off-legibility open question](../PROGRESS.md#open-questions-deliberately-unresolved) with
actual evidence rather than intuition, and because "should new items start small, several at
once" and "what happens on return from a gap" are both live design surfaces (add-item flow,
the eventual snooze/interval work) that would be awkward to design without this in view first.

- **No fixed limit is evidence-backed** — "start with 3" or "one at a time" are both false
  precision against an 18–254-day, highly individual range. If cycle-in ever suggests a
  default, it should be a *starting point to observe and adjust*, not a rule — which is exactly
  what the balance board / history rollups already exist to make visible. This is really the
  trade-off-legibility question's other half: legibility at the moment of *adding*, and
  legibility of *how it's actually going* once added, are the same design problem.
- **New items starting tiny (Fogg-scale — minutes, not the categories' full ambition) plausibly
  matters more than how many get added at once** — the mechanism in the literature is
  difficulty/salience, not raw count. Something for the add-item flow to lean toward if it ever
  nudges defaults (e.g. a duration/cadence suggestion), not enforce.
- **A gap shouldn't read as a broken streak.** Nothing today models "time away" at all —
  worth remembering when the interval/snooze work (ADR-0005, Phase 2) gets real design
  attention, since that's exactly where a "you've been gone N days" moment would surface. The
  research argues for treating it as a light, deliberately-easy re-entry (maybe fewer
  suggestions for the first few days back) rather than either silently resuming full load or
  showing a guilt-inducing backlog.

Status otherwise unchanged — Phase 2 is still next, this doesn't touch it.
