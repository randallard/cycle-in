# 2026-07-18 (3) — Splitting ADR-0002, and where the standard is going

Ryan asked two questions that turned out to be one question: *"did the ADRs get a little
bloated?"* and *"I thought they were supposed to be immutable but we've been making changes."*

They're the same problem, and this repo is where it happened.

## The diagnosis

Measured against git-redundancy, which has 23 ADRs at a ~700-word median with 0–3 numbered
decisions each and a real supersession chain (0003 → 0010):

| | git-redundancy | cycle-in (before) |
|---|---|---|
| ADRs | 23 | 6 |
| Numbered decisions per file | 0–3 | **ADR-0002 had 10** |
| Supersessions | 1 real chain | none, ever |

ADR-0002 wasn't an ADR. It was a policy document wearing an ADR header — "our whole
supply-chain posture," which reads well as a document and fails completely as a decision record.

**The bloat caused the immutability violation.** Because 0002 bundled ten decisions, there was
no way to supersede just the Socket.dev stance: a new ADR replacing 0002 would have thrown out
nine decisions that were fine. So the only available move was editing in place, and that's what
happened — twice in one session, plus an "Amended" block added to ADR-0004. Three violations of
a convention stated plainly in `docs/adr/README.md`, which had been read that same morning.

The memorable form of the test: **if you can't supersede one part of it, it's too big.**

## The fix

ADR-0002 → **ADR-0006 through 0013**, one decision per file:

| New | Carries |
|---|---|
| 0006 | Block install-time scripts |
| 0007 | Pin exact versions, restrict registry |
| 0008 | Age-gate dependency admission (+ the pnpm install-time gates) |
| 0009 | CI vulnerability scanning (+ signature verification) |
| 0010 | SBOM via Syft |
| 0011 | License allowlist |
| 0012 | Protect tooling installed beside the repo |
| 0013 | **Pin Actions to commit SHAs — reverses decision 8** |

Only 0013 changes anything. The rest are re-homed unchanged, each now independently
supersedable, which is the whole point.

**ADR-0002's body is left exactly as committed — including the amendment.** Reverting it was
briefly possible and would have been wrong: the amendment is committed history now, and
rewriting it to hide a convention violation would compound the error while destroying the
evidence. Its Status line points at the eight successors and a blockquote explains what
happened. A cautionary example that stays visible is worth more than a clean record.

The conventions in `docs/adr/README.md` gained the two rules that were missing: one decision
per file with the supersession test, and a table of exactly what's mutable (Status line, index,
typos) versus frozen (Context, Decision, Consequences — and no "amended" blocks, ever).

## Implementation caught up to the ADRs

ADR-0013 would have been aspirational if the workflow still used tags, so `deploy.yml` now
SHA-pins all 11 action references. The reasoning is in the ADR: the tj-actions/changed-files
compromise (CVE-2025-30066) worked by **repointing existing version tags**, and
`pnpm/action-setup` runs in the job that builds `dist/`, which auto-deploys to Pages.

Socket.dev moved out of the ADRs entirely and into PROGRESS open questions — "we haven't done
this yet" is a gap, not a decision, and filing it as one was part of what made 0002 sprawl.

## The template

Most of this session went into `cr-ci-cd-rust-typescript-template` — the standard, extracted so
the next project starts here instead of arriving at it. It ships the ADR/journal conventions,
a `docs-hygiene` lint (mechanical, gates), a monthly stance-review workflow (judgment, opens an
issue, never gates), and a self-contained `.claude/` so a fresh machine needs nothing else.

The lint was written against this repo as its test corpus and **found two of its own bugs that
way**: it flagged example links inside code spans, and it counted numbered *forces* in ADR-0004's
Context as if they were decisions. Both would have trained people to write worse docs — thinner
Context, fewer examples — which is the opposite of the point. Its word-count threshold is now
calibrated above the largest healthy ADRs in the fleet (~1390 words) rather than a number I made
up.

Run against cycle-in before the split, it independently flagged exactly the two files identified
by hand. After: clean.

---

_Documents commit `4c3b978` (the ADR split). The template lives at
[cr-ci-cd-rust-typescript-template](https://github.com/randallard/cr-ci-cd-rust-typescript-template)._
