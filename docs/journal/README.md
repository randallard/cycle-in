# Dev journal

A dated, narrative worklog — the *story over time* that the other docs don't capture:
commit messages are per-commit, [`../adr/`](../adr/README.md) is per-decision, a changelog
would be per-release. This is the running "what we did and why, in order."

## Convention

- One file per entry: `YYYY-MM-DD-kebab-title.md`. Multiple entries in a day get a `-2`, `-3`
  suffix.
- Each entry names the **commit(s) it documents** by short hash once one exists. Entries are
  append-only; correct mistakes in a later entry, don't rewrite old ones.

Same convention as the companion git-redundancy and branching-video projects.
