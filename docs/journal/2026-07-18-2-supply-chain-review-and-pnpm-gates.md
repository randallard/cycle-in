# 2026-07-18 (2) — The Socket.dev question, and four pnpm controls we weren't using

Follow-on from [entry 1](2026-07-18-1-phase-1-browser-verification-and-fixes.md), which ended
with the `--ignore-scripts` scope gap. Ryan asked to hear more about the Socket.dev gap that
ADR-0002 decision 9 had flagged, and then — rightly — to **verify the answer with a web search**
rather than take it from memory. Two things fell out, and the second one mattered more.

## One claim was wrong

The tj-actions/changed-files compromise affected **"dozens of repositories"** per Wiz's
research, not the tens of thousands claimed from memory; the large number is repos *using* the
action, not repos that leaked. Worth recording as a correction rather than quietly fixing.

The mechanism held up, and it's the whole argument for SHA-pinning: a compromised bot PAT was
used to **repoint existing version tags** at a malicious commit, so every version went bad
simultaneously — CVE-2025-30066, with a CISA alert and a companion compromise in
`reviewdog/action-setup`.

## The recommendation was aimed at the wrong target

Checking pnpm's *current* [supply-chain guidance](https://pnpm.io/supply-chain-security) —
rather than reasoning from what pnpm could do when ADR-0002 was written ten days earlier — found
**four of its five recommended controls unset here**, all available in the pinned 11.5.3, all
belonging in a file the ADR already owned:

| Setting | Was | Now |
|---|---|---|
| `minimumReleaseAge` | unset (pnpm 11 default: 1 day) | `20160` (14 days) |
| `trustPolicy` | unset (default off) | `no-downgrade` |
| `blockExoticSubdeps` | unset | `true` |
| `pnpm audit signatures` | not in CI | CI step; 283/283 verify |

The sharpest detail: the repo's existing 14-day `minimumReleaseAge` lived in `renovate.json`,
where it paces **Renovate's own PRs** and does nothing for a manual `pnpm add`. It *reads* like
a control and isn't one. The pnpm-level setting is, and the gate was confirmed to bite —
`@types/node@22.20.1`, ten days old, refused with a pointer to `minimumReleaseAgeExclude`; an
older version installs clean.

So decision 9 named an external service as the missing piece while four settings sat unset in
`pnpm-workspace.yaml`. Socket.dev is now third on the list, not first, and moved out of the ADRs
into PROGRESS open questions — "we haven't done this yet" is a gap, not a decision, and filing
it as one was part of what made ADR-0002 sprawl.

## The lesson

Tooling moved in **ten days** — from ADR-0002 being written on 2026-07-08 to controls existing
that it said didn't. CI was green throughout; nothing was broken. Re-read the tooling's own docs
periodically, because the gap you wrote down may have been closed by someone else in the
meantime.

That observation is what produced the monthly stance-review workflow in
`cr-ci-cd-rust-typescript-template` — see
[entry 3](2026-07-18-3-adr-split-and-the-template.md).

## Largest remaining exposure

Third-party Actions were tag-pinned, and `pnpm/action-setup` runs in the job that builds
`dist/`, which auto-deploys to Pages. Addressed in
[ADR-0013](../adr/0013-pin-actions-to-commit-shas.md); all 11 action references in
`deploy.yml` are now full commit SHAs.

---

_Documents commit `79ed1fb` (pnpm gates, signature verification, SHA-pinned actions)._
