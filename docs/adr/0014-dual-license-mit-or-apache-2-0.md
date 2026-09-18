# ADR-0014: Dual-license MIT OR Apache-2.0, replacing MIT-only
- Status: Accepted
- Date: 2026-09-18
- Deciders: Ryan

## Context
On 2026-07-10, cycle-in picked MIT — recorded in `docs/PROGRESS.md`, not as its own ADR — with
fork-friendliness named explicitly as the criterion: anyone should be able to fork the repo,
adjust `src/core/config.ts`, and start using it on their own GitHub Pages with minimal friction.

Migrating onto `cr-ci-cd-rust-typescript-template`'s conventions (this same session) raised the
license question again, because the template's default is dual **MIT OR Apache-2.0** — Rust
ecosystem convention, chosen there for the patent grant Apache-2.0 adds on top of MIT's
permissiveness. cycle-in has no Rust and isn't distributed as a compiled artifact vendored into
other binaries, so the patent-grant motivation doesn't transfer directly. The question worth
answering deliberately: does adopting the template's dual license work against the
fork-friendliness goal that picked MIT in the first place?

Checked directly rather than assumed: `MIT OR Apache-2.0` is a *choice* grammar, not a
conjunction. A recipient may comply with either license's terms; MIT remains a fully valid way
to satisfy the license, unchanged from today. The extra cost is one more file in the repo root
(`LICENSE-APACHE` alongside `LICENSE-MIT`) and, only for someone who specifically opts into
Apache-2.0's terms instead of MIT's, an obligation to note changed files and a patent grant/
retaliation clause — neither forced on anyone, since MIT stays available.

## Decision
Switch from MIT-only to dual **MIT OR Apache-2.0**, matching the template's default:
`LICENSE` renamed to `LICENSE-MIT`; `LICENSE-APACHE` added verbatim from the template;
`package.json`'s `license` field becomes `"MIT OR Apache-2.0"`; `README.md`'s "Fork it" section
updated to name both and link both files.

## Alternatives considered
- **Keep MIT-only** — rejected: no real forking cost was found to justify diverging from the
  template's default once the "OR" semantics were checked directly rather than assumed, and
  staying aligned with the fleet's convention (branching-video already dual-licenses this way)
  has its own small value for consistency.
- **Apache-2.0-only** — rejected: strictly more friction than MIT for the common case (personal
  fork, no redistribution as a dependency), with no offsetting benefit here.

## Consequences
- Sibling projects going through the same template migration should default to this dual
  license too, unless a specific reason argues otherwise (this ADR is the reference case).
- `README.md`'s license line and `package.json`'s `license` field must be kept in sync with the
  two `LICENSE-*` files if either ever changes again — a future change here supersedes this ADR
  rather than editing it in place.
