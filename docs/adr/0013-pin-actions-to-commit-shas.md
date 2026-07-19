# ADR-0013: Pin third-party GitHub Actions to full commit SHAs
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
**Supersedes decision 8 of [ADR-0002](0002-npm-supply-chain-discipline.md), and reverses it.**
Unlike ADRs 0006–0012, which re-home decisions unchanged, this one changes the stance.

ADR-0002 decision 8 pinned third-party Actions to **major-version tags**
(`EmbarkStudios/cargo-deny-action@v2`, `actions/checkout@v7`), deliberately, to match
git-redundancy's established convention across the fleet. Consistency was the reason, and it
was a reasonable one.

**Why that reasoning stopped holding:** tags are mutable, and this is not theoretical. The
`tj-actions/changed-files` compromise (CVE-2025-30066, March 2025, with a CISA alert and a
companion compromise in `reviewdog/action-setup`) worked by compromising a bot's personal
access token and **repointing existing version tags at a malicious commit** — so every version
went bad simultaneously, including ones already "pinned." GitHub's own guidance is explicit
that a full-length commit SHA is *the only way* to use an action as an immutable release, and
since August 2025 there's a repository-level policy to enforce it.

The exposure here is concrete rather than abstract: `pnpm/action-setup` runs in the job that
builds `dist/`, and `dist/` auto-deploys to GitHub Pages. A compromised action in that job
poisons what users load in their browsers.

## Decision
Pin every third-party GitHub Action to a **full-length commit SHA**, with the human-readable
version in a trailing comment:

```yaml
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7
```

The comment is not decoration — a SHA alone tells a reader nothing about what version they're
on, so it must be kept accurate when bumping.

This applies to first-party `actions/*` too. They're lower risk, not no risk, and a rule with
an exception list is a rule people misapply.

`dtolnay/rust-toolchain@stable` deserves specific mention: `stable` is a **branch**, which
moves by design. Pinning matters most exactly where it feels least necessary.

## Consequences
- The deploy path can no longer be altered by anyone who gains write access to an action's tags.
- **Diverges from git-redundancy's convention**, which was decision 8's whole justification.
  That project should adopt the same change; until it does, the fleet is inconsistent, and
  this ADR is the reason why.
- SHAs are opaque. Updating is now a deliberate act requiring SHA resolution
  (`gh api repos/<owner>/<repo>/git/ref/tags/<tag>`). Renovate can maintain SHA pins and keep
  the version comments in sync — worth enabling rather than doing by hand.
- Adopted in `cr-ci-cd-rust-typescript-template` as the default for all new projects.
