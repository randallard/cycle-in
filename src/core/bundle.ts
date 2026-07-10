import type { CycleEvent } from "./events";
import { compareEvents } from "./events";

/**
 * Export/import event bundle (ADR-0003's "BV-style manual sync"): a JSON file
 * carrying the full event set. Because the log is append-only and the reducer
 * is a function of the event *set*, merging two devices is just union by
 * event id — importing a bundle can never conflict, only add. Any future
 * transport (or none: AirDrop, email-to-self, a USB stick) works.
 */
export const BUNDLE_FORMAT = "cycle-in-events";
export const BUNDLE_VERSION = 1;

export interface EventBundle {
  format: typeof BUNDLE_FORMAT;
  /** Envelope version — distinct from each event's own `v`. */
  bundleVersion: typeof BUNDLE_VERSION;
  exportedAt: string;
  events: CycleEvent[];
}

/** Union by event id, first occurrence wins (events are immutable, so any
 * duplicate id is the same event), sorted by the (at, id) total order. */
export function unionEvents(
  ...sets: readonly (readonly CycleEvent[])[]
): CycleEvent[] {
  const byId = new Map<string, CycleEvent>();
  for (const set of sets) {
    for (const e of set) {
      if (!byId.has(e.id)) byId.set(e.id, e);
    }
  }
  return [...byId.values()].sort(compareEvents);
}

/** Serialize to bundle JSON. Deterministic for a given (event set,
 * exportedAt): events are deduped and sorted, so two exports of the same set
 * diff clean. `exportedAt` is injected by the caller (core never reads the
 * clock). */
export function serializeBundle(
  events: readonly CycleEvent[],
  exportedAt: string
): string {
  const bundle: EventBundle = {
    format: BUNDLE_FORMAT,
    bundleVersion: BUNDLE_VERSION,
    exportedAt,
    events: unionEvents(events),
  };
  return JSON.stringify(bundle, null, 2);
}

/**
 * Parse and validate bundle JSON, returning its events (deduped, sorted).
 * Throws an Error with a human-readable reason on anything malformed.
 *
 * Validation is envelope-deep only: each event must have the common shape
 * (string `id`, string `at`, string `kind`, numeric `v`), but kind-specific
 * payloads are not schema-checked — the reducer is already defensive
 * (unknown kinds counted and skipped, missing targets ignored), and a bundle
 * from a *newer* app version must import losslessly rather than be rejected.
 */
export function parseBundle(text: string): CycleEvent[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("not valid JSON");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("not a bundle object");
  }
  const b = raw as Record<string, unknown>;
  if (b["format"] !== BUNDLE_FORMAT) {
    throw new Error(`not a ${BUNDLE_FORMAT} bundle`);
  }
  if (b["bundleVersion"] !== BUNDLE_VERSION) {
    throw new Error(
      `bundle version ${String(b["bundleVersion"])} not supported ` +
        `(this app understands ${String(BUNDLE_VERSION)})`
    );
  }
  const events = b["events"];
  if (!Array.isArray(events)) {
    throw new Error("bundle has no events array");
  }
  events.forEach((e: unknown, i: number) => {
    if (typeof e !== "object" || e === null) {
      throw new Error(`event ${String(i)} is not an object`);
    }
    const ev = e as Record<string, unknown>;
    if (typeof ev["id"] !== "string" || ev["id"] === "") {
      throw new Error(`event ${String(i)} has no id`);
    }
    if (typeof ev["at"] !== "string") {
      throw new Error(`event ${String(i)} has no at timestamp`);
    }
    if (typeof ev["kind"] !== "string") {
      throw new Error(`event ${String(i)} has no kind`);
    }
    if (typeof ev["v"] !== "number") {
      throw new Error(`event ${String(i)} has no schema version`);
    }
  });
  // Envelope validated above; payloads are the reducer's job to tolerate.
  return unionEvents(events as CycleEvent[]);
}
