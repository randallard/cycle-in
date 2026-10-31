# ADR-0020: IndexedDB is the event store now, ahead of the sync decision
- Status: Accepted
- Date: 2026-10-31 (built 2026-07-10; recorded here because ADR-0003 still describes a stub)
- Deciders: Ryan

## Context
[ADR-0003](0003-append-only-event-log-core.md)'s "Storage direction" paragraph said the log
*will* live in IndexedDB, and that "the current in-memory stub stays until the sync decision
lands". The first half happened, and the second didn't: on 2026-07-10 the IndexedDB store was
built as the first next step
([journal 2026-07-10-1](../journal/2026-07-10-1-week-config-license-idb-store-and-youtube-scope.md)),
while the sync model was, and still is, undecided. The decision lived only in that journal. The
2026-10-31 [stance review](../reviews/2026-10-31-stance-review.md) found ADR-0003's sentence
stale, and Ryan asked for it recorded.

Why waiting for sync stopped making sense: an in-memory store loses everything on reload, which
makes the app unusable for its one real user. And the sync decision, whatever it is, doesn't
depend on the store: ADR-0003 already demoted sync to "any mechanism that can union two event
sets", and a store whose append is idempotent by event id is exactly what such a union needs.

## Decision
The event log is stored in **IndexedDB** (`src/shell/storage.ts`, database `cycle-in`, object
store `events` keyed by event `id`), behind the async `EventStore` interface, through a
hand-rolled thin wrapper with no runtime dependency. It does append and read-all only, with no
semantics: `append` is a `put` by id, so replaying any bundle or sync payload is harmless.

The in-memory store keeps the same contract, and is used only where `indexedDB` doesn't exist
(`src/main.ts`) and in tests.

The sync transport remains open, and is not decided here.

## Alternatives considered
- **Keep the in-memory stub until sync is decided** (ADR-0003's original wording). Lost: the app
  forgets everything on reload, so it can't be used day to day while sync stays open.
- **localStorage.** ADR-0003's own arithmetic: ~3.6 MB a year of events against a ~5 MB cap.
- **An IndexedDB library** (idb, Dexie). Append and read-all don't need one, and each dependency
  is a supply-chain surface (ADR-0006 to 0013).

## Consequences
- ADR-0003's storage paragraph is superseded by this one; the rest of ADR-0003 stands. Its index
  row says so (ADR-0003's own Status stays Accepted, since its main decision is unchanged).
- Data lives per browser origin. A user's events exist on one device until a sync transport or a
  manual bundle export/import moves them. The bundle (ADR-0003) is that manual path today.
- The browser can evict IndexedDB under storage pressure unless the origin is granted persistent
  storage. Not requested today.
- Promotion condition: revisit when the sync decision lands, if the chosen transport wants a
  different local store (one it manages itself, say). Ask for persistent storage
  (`navigator.storage.persist()`) if a real eviction is ever seen.
