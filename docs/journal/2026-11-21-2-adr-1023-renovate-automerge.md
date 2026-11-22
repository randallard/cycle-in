# 2026-11-21 (2): template ADR-1023, Renovate automerge

The afternoon's backlog (journal 1) took hours, and most of that was waiting on rebases. Ryan:
*"I do want to add the automerge ADR but I think it is the type of update we should consider for
the template as well"*. It went into the template as **ADR-1023**, synced to GitHub as
`04a73e3`, and this repo inherits it here.

- `docs/adr/1023-…`, copied byte-identical, plus its index row.
- `renovate.json` gets the template's two rules. Minor and patch updates of 1.0+ packages
  automerge once every check passes and the age gate clears. So do digest, pin and
  lockfile-maintenance updates. Majors and 0.x minors stay manual. The rules already here are
  unchanged. `renovate-config-validator` passes.

**Branch protection added** to `main` the same day (there was none): 8 required checks (`detect languages`, `docs hygiene`, `ts fast gates`, `ts supply chain`, `SBOM`, `OSV scan / osv-scan`, `e2e (playwright + axe)`, `secret scan`), branches must be up to date, a PR is required (0 approvals), conversations must be resolved, no force-pushes or deletions. Admins aren't bound by it. This matches branching-video's settings, plus `secret scan`.

Not tested yet: the first automerged PR shows it working. The open lockfile PR should be the
first one after its age gate clears.
