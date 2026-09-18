# Project instructions

Migrated onto `cr-ci-cd-rust-typescript-template`'s conventions (2026-09-18) — the repo itself
predates the template by ten days and converged on nearly the same shape independently; see
[ADR-0001](docs/adr/0001-provable-lite-strict-ts-and-property-tests-no-rust-core.md) for why
there's no Rust core here despite the template's default.

**Read `.claude/skills/project-conventions/SKILL.md` before writing an ADR, a journal entry, or
any code in `src/core/`.** It carries the house rules: functional core / imperative shell, the
provable-lite tier, ADR immutability, the supply-chain posture.

Quick reference for the things most often got wrong:

- **One decision per ADR.** If you're writing a numbered list of decisions, split the file.
- **Never edit an accepted ADR's body.** Changing your mind means a *new* ADR that supersedes
  it. No "amended" blocks.
- **The journal is append-only.** Correct in a later entry, don't rewrite an old one.
- **No IO in `src/core/`.** That's what makes the property tests possible.
- **Run the app in a browser before calling something done.** Tests passing is not evidence a
  feature works — see `.claude/skills/verify/SKILL.md`.
- **Update the docs when you finish a chunk of work** — README, PROGRESS, journal, ADRs — so
  the effort can be resumed from the docs alone after a cleared context.

Check the mechanical docs rules locally with `python3 scripts/docs-hygiene.py`.
