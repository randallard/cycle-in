# ADR-0012: Tooling installed beside the repo passes `--ignore-scripts` explicitly
- Status: Accepted
- Date: 2026-07-18
- Deciders: Ryan

## Context
Supersedes decision 10 of [ADR-0002](0002-npm-supply-chain-discipline.md), unchanged in
substance. See [ADR-0006](0006-block-install-time-scripts.md) for why 0002 is being split.

[ADR-0006](0006-block-install-time-scripts.md)'s `ignore-scripts=true` protects installs **into
this project**, and nothing else. Verification tooling — headless-browser drivers, one-off
analysis scripts — is deliberately installed *outside* the repo so it never enters
`package.json` or the lockfile. That same separation puts it outside `.npmrc`'s reach.

This surfaced concretely: a verification session ran `npm i playwright-core` in a scratch
directory with no protection in force. Nothing executed — that package declares no scripts and
has no dependencies — but the gap was real.

## Decision
Install throwaway tooling with `--ignore-scripts` passed **explicitly**:

```bash
cd "$SCRATCH"
printf '{"name":"scratch","private":true}\n' > package.json
cp "$REPO/.npmrc" .
npm i --ignore-scripts <tool>
```

**Copying `.npmrc` alone does not work.** npm honours a directory-local `.npmrc` only once
that directory is a *package root*; a bare `npm i` in an empty directory creates `package.json`
as part of the install, after config resolution — so `ignore-scripts=true` sitting right there
is never read.

Verified against a fixture package whose `postinstall` touches a file, rather than reasoned
from documentation (same standard as [ADR-0010](0010-sbom-via-syft.md)'s tool failures):

| Approach | `postinstall` |
|---|---|
| `.npmrc` copied into an empty dir, then `npm i` | **ran** |
| `npm i --ignore-scripts` | blocked |
| `package.json` seeded first, then `.npmrc`, then `npm i` | blocked |

The seeded `package.json` and `.npmrc` are still worth writing so any *later* install in that
directory is covered; the flag is the part that can't be defeated by ordering. The recipe lives
in `.claude/skills/verify/SKILL.md`, where the installs actually happen.

## Consequences
- Closes the gap without pulling disposable tooling into the lockfile, which would have traded
  one problem for a permanently larger dependency tree.
- **Generalises**: a control attached to a file *in the repo* stops at the repo boundary, and
  the work doesn't. Any new habit that installs something adjacent to the project needs its own
  answer, not an assumption that the project's answer travels with it.
- Depends on remembering a flag — weaker than a config file, and honestly so. If this is ever
  automated, the automation is where the flag belongs.
