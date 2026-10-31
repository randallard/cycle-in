# `any` / `as` registry

Every `any`, and every type assertion other than `as const`, in `src/`, with why it's sound
([ADR-0018](adr/0018-every-cast-is-registered.md)). Each also carries the reason inline, as a
`// cast (any-registry): …` comment directly above it. A new cast without both doesn't merge.

`node scripts/any-registry-check.ts` checks the counts below against the code (it reads the
TypeScript syntax tree, so comments and strings don't count), and CI runs it.
`node scripts/any-registry-check.ts --list` prints every cast with its line.

## Counts (checked by CI)

| File | Casts |
|---|---|
| `src/core/bundle.ts` | 3 |
| `src/core/bvimport.ts` | 4 |
| `src/core/reduce.ts` | 1 |
| `src/shell/storage.ts` | 1 |
| `src/ui/app.ts` | 6 |
| `src/core/bundle.test.ts` | 2 |
| `src/core/core.test.ts` | 2 |

There are no `any`s.

## Each cast

| Where | Cast | Why it's sound |
|---|---|---|
| `src/core/bundle.ts`, `parseBundle` | `raw as Record<string, unknown>` | The line above rules out non-objects, `null` and arrays. Only named keys are read, each type-checked before use. |
| `src/core/bundle.ts`, `parseBundle` (per event) | `e as Record<string, unknown>` | Guarded just above (an object, not null). Each field is type-checked before it's trusted. |
| `src/core/bundle.ts`, `parseBundle` (return) | `events as CycleEvent[]` | Every event's envelope (`id`, `at`, `kind`, `v`) is validated above. Payloads are not, by design: the reducer tolerates unknown kinds and fields. |
| `src/core/bvimport.ts`, `opt` | `{ [key]: value } as Record<K, V>` | A computed key widens to `{ [x: string]: V }`. `key` is a `K`, so the object has exactly the one `K` key, and the function returns `Partial<Record<K, V>>`. |
| `src/core/bvimport.ts`, `parseChoices` | `c as Record<string, unknown>` | Guarded just above. Every field read goes through `asString` or a `===` check. |
| `src/core/bvimport.ts`, `parseNode` | `raw as Record<string, unknown>` | Guarded just above (object, not null, not an array). Reads go through `asString`/`asNumber` or `===`. |
| `src/core/bvimport.ts`, `parseBvConfig` | `raw as Record<string, unknown>` | Same guard and the same field discipline. |
| `src/core/reduce.ts`, `reduce` (default case) | `e as { kind: string }` | Statically unreachable: every known kind is handled, so `e` is `never` here. At runtime it's an event from a newer version, whose `kind` the bundle parser and the store validated as a string. |
| `src/shell/storage.ts`, `all` | `rows as CycleEvent[]` | The store's only writer is `append`, which stores `CycleEvent`s verbatim. Unknown kinds from newer versions are the reducer's job. |
| `src/ui/app.ts`, root `click` | `e.target as HTMLElement` | A listener on the app root: targets inside it are elements. `closest` null-checks the match. |
| `src/ui/app.ts`, root `change` | `e.target as HTMLInputElement` | `change` fires only on form controls, and every control under root is an `<input>` or `<select>` (no `<textarea>`). `dataset`, `id` and `value` exist on both; `files` is read only after `id` has identified a file input. |
| `src/ui/app.ts`, root `submit` | `e.target as HTMLFormElement` | `submit` fires only on `<form>` elements. |
| `src/ui/app.ts`, `pointerover` | `e.target as Element` | Pointer events on elements under root target elements. `closest` null-checks the match. |
| `src/ui/app.ts`, `pointerout` | `e.relatedTarget as Element \| null` | For pointer events on this tree, `relatedTarget` is an element or null, never a non-element `EventTarget`. Null is handled. |
| `src/ui/app.ts`, `focusin` | `e.target as Element` | Focus events target focusable elements. `closest` null-checks the match. |
| `src/core/bundle.test.ts`, the generated events | `{ …, kind: "from-a-newer-version" } as unknown as CycleEvent` | A deliberately unknown kind, to test that it's tolerated. It can't be typed as a `CycleEvent`; that's the point. |
| `src/core/bundle.test.ts`, "carries the envelope fields" | `JSON.parse(…) as Record<string, unknown>` | `JSON.parse` returns `any`. The test reads named keys and asserts their values, so a wrong shape fails the `expect`. |
| `src/core/core.test.ts`, "tolerates a pre-widening bvSource" | `{ slug, nodeId } as unknown as BvSource` | The shape from before `steps` existed, which the type no longer allows. The test is that the reducer still tolerates it. |
| `src/core/core.test.ts`, "unknown event kinds are counted" | `{ …, kind: "from-the-future" } as unknown as CycleEvent` | An event kind from a newer version, deliberately outside the union. The test is that it's counted, not fatal. |

## Removed rather than registered (2026-10-31)

Four casts couldn't be justified, so they were replaced with checks:

- `src/ui/app.ts`, the cadence, add and picker forms: `str("kind") as Cadence["kind"]` (×3). A form
  value went into a `cadence` written to the append-only log with nothing checking it. Now
  `isCadenceKind` (`src/core/types.ts`) narrows it, and an unknown value is reported instead of
  logged.
- `src/ui/app.ts`, the history granularity buttons: `dataset["g"] as Period | undefined`. Now
  `isPeriod` (`src/core/rollup.ts`).

And one in a test: `core.test.ts`'s `s as Weekday` became a generator of weekdays
(`fc.constantFrom<Weekday>(0, …, 6)`).
