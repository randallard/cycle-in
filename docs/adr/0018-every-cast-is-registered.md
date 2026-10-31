# ADR-0018: Every `any` and type assertion is registered, with its reason, and CI checks it
- Status: Accepted
- Date: 2026-10-31
- Deciders: Ryan

## Context
[ADR-1012](1012-strictness-extras-offered-at-project-start.md) offers two extras that every
project answers yes or no in an ADR; this is the first, the `any` registry (the second is
[ADR-0019](0019-accessibility-checks-with-axe.md)). The 2026-10-31 compliance review found the
question unanswered.

The baseline lint (`strictTypeChecked`, `no-explicit-any`) already keeps out `any`; there are
none. So the registry mostly polices `as`. At the time there were 24: most narrow untrusted
input (imported bundles, branching-video configs, IndexedDB rows) right after a guard, which is
where a stated reason earns its keep. Writing the reasons found four that couldn't be justified:
a form value cast to a cadence kind and written to the append-only log unchecked (three
places), and a DOM attribute cast to a history period.

square-one adopted the same registry (its ADR-0027) and twice found casts that its hand sweeps
had missed. That is the argument for a mechanical check rather than a list kept by hand.

## Decision
Every `any`, and every type assertion other than `as const`, in `src/` (tests included):
- carries a `// cast (any-registry): <why it's sound>` comment directly above it;
- is listed in [`docs/any-registry.md`](../any-registry.md), with a per-file count;
- and `scripts/any-registry-check.ts` (`pnpm casts`) fails CI when a file's count and the
  registry disagree, or a cast has no comment. It reads the TypeScript syntax tree, so text in
  comments and strings doesn't count, and `x as unknown as T` counts once.

A cast whose reason can't be written is replaced with a check, not registered.

## Alternatives considered
- **No registry.** Lint already forbids `any`; but it can't tell a narrowing after a guard from a
  form value trusted blindly, and the four unjustifiable casts were the latter.
- **A registry without a check.** square-one's experience: missed twice by hand.
- **Lint rule `consistent-type-assertions: never`.** Would ban the sound ones too (`e.target`
  in a delegated listener has no non-cast spelling that's any clearer).

## Consequences
- Adding a cast costs a comment and a registry row; that friction is intended.
- `scripts/` is now part of the TypeScript project (strict, linted), with `@types/node` pinned at
  24.19.2 for it alone: `tsconfig.json` sets `"types": []`, so `src/` doesn't see Node globals,
  and the script opts in with a reference directive.
- Promotion condition: none; revisit if the count grows past what a reviewer reads in one pass
  (say 50), which would mean the core's parsing wants a schema-validation layer instead.
