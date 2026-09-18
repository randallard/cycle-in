The monthly stance review is due.

This does not block anything. Deferring is fine — but [record the deferral](../docs/reviews/README.md)
so the clock resets honestly and the reason ends up on the record.

**Run it:** `/stance-review` in Claude Code, or work the checklist in
[`docs/reviews/README.md`](../docs/reviews/README.md) by hand.

- [ ] **Promotion conditions** in each ADR — has any been met?
- [ ] **"No tool exists yet / not available / revisit later"** claims — still true? Check the
      tool's *current* docs, not memory. This is the one that goes stale silently.
- [ ] **Supply chain** — has the package manager or ecosystem shipped controls we don't use?
      Pinned versions still supported? New advisory classes in our dependency types?
- [ ] **Rigor tier** — has the core grown an invariant that deserves promotion from property
      tests to proofs?
- [ ] **Template drift** — has the upstream template moved on?
      `git fetch template && git log --oneline HEAD..template/main -- docs/ .github/`
- [ ] **Last review's deferrals** — did the thing they were waiting on land?

Close this by committing `docs/reviews/<today>-stance-review.md`.

Findings become **new ADRs**, never edits to old ones — that's what keeps this compatible with
ADR immutability instead of in tension with it.
