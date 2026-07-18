/**
 * Parser for a branching-video `config.json` node graph (ADR-0004, Phase 1).
 *
 * Deliberately separate from `bundle.ts`: that reads cycle-in's own event
 * bundle; this reads the *other* project's export format
 * (`{ title, startNode, masterVideoId, nodes[] }` — see
 * `~/Development/branching-video/config.example.json`). The file carries no
 * format tag of its own, so we identify it structurally (a `nodes` array) and
 * give a pointed error if the user picked a cycle-in event bundle by mistake.
 *
 * Tolerant in the spirit of `parseBundle`: the essential envelope is validated
 * (it must be an object with a non-empty `nodes` array, each node a
 * uniquely-`id`'d object), and everything else is best-effort — missing titles
 * fall back to ids, unknown fields (branching-video's `_`-prefixed notes,
 * `style`, `endScreen`, …) are ignored, malformed choices are skipped. A
 * newer branching-video config must import rather than be rejected.
 */

import type { BvStep } from "./types";

export interface BvChoice {
  label: string;
  target: string;
  /** branching-video marks one choice per node `default: true` — it auto-fires
   * after the countdown and so forms the main viewing line. */
  isDefault: boolean;
}

export interface BvNode {
  id: string;
  title: string;
  /** Node-level override; falls back to the show's `masterVideoId`. */
  videoId?: string;
  start?: number;
  end?: number;
  /** `isAside` or `defaultAside` — a deep dive off the main line. */
  isAside: boolean;
  /** Where this node routes when it ends with no default choice (asides use
   * it to return to the main line). */
  returnTo?: string;
  choices: BvChoice[];
}

export interface BvShow {
  title: string;
  startNode?: string;
  masterVideoId?: string;
  nodes: BvNode[];
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Include `key` only when `value` is defined — satisfies
 * `exactOptionalPropertyTypes` (an explicit `undefined` is not allowed). */
function opt<K extends string, V>(
  key: K,
  value: V | undefined
): Partial<Record<K, V>> {
  return value === undefined ? {} : ({ [key]: value } as Record<K, V>);
}

function parseChoices(raw: readonly unknown[]): BvChoice[] {
  const out: BvChoice[] = [];
  for (const c of raw) {
    if (typeof c !== "object" || c === null) continue;
    const cc = c as Record<string, unknown>;
    const target = asString(cc["target"]);
    if (target === undefined || target === "") continue; // unnavigable, skip
    out.push({
      label: asString(cc["label"]) ?? "",
      target,
      isDefault: cc["default"] === true,
    });
  }
  return out;
}

function parseNode(raw: unknown, i: number): BvNode {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error(`node ${String(i)} is not an object`);
  }
  const n = raw as Record<string, unknown>;
  const id = asString(n["id"]);
  if (id === undefined || id === "") {
    throw new Error(`node ${String(i)} has no id`);
  }
  const choicesRaw = n["choices"];
  return {
    id,
    title: asString(n["title"]) ?? id,
    isAside: n["isAside"] === true || n["defaultAside"] === true,
    choices: Array.isArray(choicesRaw) ? parseChoices(choicesRaw) : [],
    ...opt("videoId", asString(n["videoId"])),
    ...opt("start", asNumber(n["start"])),
    ...opt("end", asNumber(n["end"])),
    ...opt("returnTo", asString(n["returnTo"])),
  };
}

/** Parse config JSON into a normalized show, or throw with a human-readable
 * reason. Envelope-deep only — node payloads beyond id/title are best-effort. */
export function parseBvConfig(text: string): BvShow {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("not valid JSON");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("not a branching-video config (expected a JSON object)");
  }
  const c = raw as Record<string, unknown>;
  if (c["format"] === "cycle-in-events") {
    throw new Error(
      "that's a cycle-in event bundle, not a branching-video config — " +
        "use Import bundle for that"
    );
  }
  const nodesRaw = c["nodes"];
  if (!Array.isArray(nodesRaw)) {
    throw new Error("not a branching-video config (no nodes array)");
  }
  if (nodesRaw.length === 0) {
    throw new Error("config has no nodes");
  }
  const nodes = nodesRaw.map(parseNode);
  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.id)) throw new Error(`duplicate node id "${n.id}"`);
    seen.add(n.id);
  }
  return {
    title: asString(c["title"]) ?? "Untitled show",
    nodes,
    ...opt("startNode", asString(c["startNode"])),
    ...opt("masterVideoId", asString(c["masterVideoId"])),
  };
}

/** The main viewing line: from `startNode`, follow each node's default choice
 * (or its `returnTo` when a default aside has no choices) until it terminates.
 * Cycle-guarded, so a graph with a back-edge still returns a finite path.
 * Empty when there's no usable `startNode`. */
export function defaultSpine(show: BvShow): string[] {
  if (show.startNode === undefined) return [];
  const byId = new Map(show.nodes.map((n) => [n.id, n]));
  const spine: string[] = [];
  const seen = new Set<string>();
  let cur: string | undefined = show.startNode;
  while (cur !== undefined && !seen.has(cur)) {
    const node = byId.get(cur);
    if (node === undefined) break;
    seen.add(cur);
    spine.push(cur);
    cur = node.choices.find((ch) => ch.isDefault)?.target ?? node.returnTo;
  }
  return spine;
}

/** The node-picker's default step preselection, minus asides (ADR-0004 —
 * asides off by default).
 *
 * Two real config shapes exist. A *branching* show (config.example.json,
 * big-buck-bunny.json) wires nodes with choices — its steps are the
 * default-choice main line. A *flat tutorial* (the real single-video configs,
 * e.g. the cardistry one) has `choices: []` on every node and is just an
 * ordered list of timestamped segments — there the nodes *are* the steps, in
 * file order. We use the spine when it actually spans the show and fall back to
 * file order otherwise. */
export function suggestedSteps(show: BvShow): string[] {
  const byId = new Map(show.nodes.map((n) => [n.id, n]));
  const spine = defaultSpine(show);
  const ordered = spine.length > 1 ? spine : show.nodes.map((n) => n.id);
  return ordered.filter((id) => byId.get(id)?.isAside !== true);
}

/** Map chosen node ids (in the given order) to steps, resolving each step's
 * video id (node override, else the show's master). Unknown ids are skipped. */
export function stepsFromNodes(
  show: BvShow,
  nodeIds: readonly string[]
): BvStep[] {
  const byId = new Map(show.nodes.map((n) => [n.id, n]));
  const steps: BvStep[] = [];
  for (const id of nodeIds) {
    const node = byId.get(id);
    if (node === undefined) continue;
    steps.push({
      nodeId: node.id,
      title: node.title,
      ...opt("videoId", node.videoId ?? show.masterVideoId),
      ...opt("start", node.start),
      ...opt("end", node.end),
    });
  }
  return steps;
}
