# 2026-09-18-2 — migrate onto cr-ci-cd-rust-typescript-template's conventions

Docs/CI only, no application code. Commit(s): none yet — Ryan reviews locally first, per his
standing rule for anything that ships.

Prompted by an earlier conversation today asking how big a lift this would be. The honest
answer, checked rather than guessed: small. Ran the template's actual
`scripts/docs-hygiene.py` against this repo as-is before changing anything, and everything
except a handful of cross-links to `work/kiss-ai` was already clean — this project predates the
template (started 2026-07-08, the template's earliest commit is 2026-07-18) and converged on
almost the same shape independently, not by luck: ADR-0001's own reasoning already cites
git-redundancy and home-fleet as the precedent this project follows the shape of.

## What actually moved

- **`scripts/docs-hygiene.py` + `.github/workflows/docs-hygiene.yml`**, copied verbatim. Now
  gates CI on ADR index accuracy, resolvable supersession links, valid journal filenames, and
  relative links that resolve inside the repo. Running it first surfaced 5 real errors: three
  links into `../../work/kiss-ai/...` that "escape the repo" (sibling checkouts aren't
  guaranteed to exist — the rule exists because exactly that kind of link broke CI on a
  different project in this fleet before), and one anchor link I'd mistyped relative to the
  wrong directory in yesterday's new journal entry. `work/kiss-ai` has no public remote, so
  those became inline-code paths (`` `~/Development/work/kiss-ai/...` ``) rather than URLs, per
  the checker's own stated escape hatch. Clean run after.
- **`.github/workflows/stance-review.yml` + `docs/reviews/` + `.claude/skills/stance-review/`**,
  copied verbatim — genuinely new, this monthly habit didn't exist here. First run will nag
  immediately (no review recorded yet), which is correct, expected behavior for a fresh install.
- **`.github/CODEOWNERS`**, copied verbatim — already defaults to `@randallard`, needed no edit.
- **`CLAUDE.md` + `.claude/skills/project-conventions/SKILL.md`**, adapted rather than copied.
  The template's version leads with Rust (`#![forbid(unsafe_code)]`, Kani) as the default tier;
  cycle-in has neither and has an ADR explaining why (ADR-0001), so a verbatim copy would have
  actively contradicted a standing decision. Rewrote the provability section to point at
  ADR-0001 instead, kept everything else (functional core/shell, ADR/journal discipline,
  verification, supply chain) close to the source since it already matched this project's own
  practice almost word for word.
- **License: MIT-only → dual MIT OR Apache-2.0** ([ADR-0014](../adr/0014-dual-license-mit-or-apache-2-0.md)).
  This one got checked with Ryan first, in conversation, before touching anything: the license
  was originally picked in an earlier session specifically *for* fork-friendliness, so silently
  swapping it without re-confirming that reasoning still held would have been the wrong kind of
  fast. `MIT OR Apache-2.0` turns out to be a choice grammar, not a conjunction — a forker can
  comply with MIT alone, unchanged from today — so the switch costs one extra file
  (`LICENSE-APACHE`) and nothing else. `LICENSE` renamed to `LICENSE-MIT`, `package.json`'s
  `license` field and the README's "Fork it" section updated to match.
- **CI restructured**: `deploy.yml`'s one `build` job became the template's
  `detect`/`rust-*`/`ts-gates`/`ts-supply-chain`/`sbom`/`osv-scan`/`deploy` split, copied
  verbatim (the `rust-*` jobs self-skip — no `Cargo.toml` here, and none expected per
  ADR-0001). Functionally the same checks that were already running, just organized to match
  the template and ready for a Rust job to attach with no edits if this project's tier ever
  changes.

## What's deliberately left undone

**`DEPLOY_PAGES` repo variable isn't set.** The template's `deploy` job requires
`vars.DEPLOY_PAGES == 'true'`; the old `deploy.yml` deployed unconditionally on every push to
`main`. Checked with `gh variable list -R randallard/cycle-in` — it's unset. Left that way on
purpose: it's a live GitHub setting, not a file in this diff, and setting it silently would mean
the actual behavior of the next push to `main` was decided by an edit nobody reviewed. Recorded
prominently in `docs/PROGRESS.md` with the exact command
(`gh variable set DEPLOY_PAGES --body true -R randallard/cycle-in`) for Ryan to run, or to ask
for explicitly. **Until it's set, merging this migration stops the live site
(https://randallard.github.io/cycle-in/) from redeploying.**

Nothing else changed. Phase 2 (`interval` cadence, snooze, per ADR-0005) is still the next real
work.
