/** The branching-video import picker (ADR-0004, Phase 1). Pure rendering +
 * state helpers; the interaction (file load, toggle/reorder, commit) is wired
 * in app.ts, mirroring how history.ts renders and app.ts drives it.
 *
 * Transient by design: nothing here is durable until "Add to rotation" appends
 * an `item-added`. The metadata fields (name/category/cadence) live in the DOM
 * form so re-rendering the node list on toggle/reorder never clobbers them —
 * only `order` and `selected` live in this state. */

import type { BvNode, BvShow } from "../core/bvimport";
import { stepsFromNodes, suggestedSteps } from "../core/bvimport";
import type { BvStep } from "../core/types";
import { esc } from "./format";

export interface PickerState {
  show: BvShow;
  /** Every node id in display / step order (reorderable); suggested steps
   * first, then the rest (asides, off-spine nodes). */
  order: string[];
  /** Which ordered nodes are marked as steps. */
  selected: Set<string>;
}

export function initPicker(show: BvShow): PickerState {
  const suggested = suggestedSteps(show);
  const suggestedSet = new Set(suggested);
  const rest = show.nodes
    .map((n) => n.id)
    .filter((id) => !suggestedSet.has(id));
  return { show, order: [...suggested, ...rest], selected: new Set(suggested) };
}

/** The chosen steps, in order — exactly what the import commits. */
export function pickerSteps(p: PickerState): BvStep[] {
  return stepsFromNodes(
    p.show,
    p.order.filter((id) => p.selected.has(id))
  );
}

export function selectedCount(p: PickerState): number {
  return p.order.filter((id) => p.selected.has(id)).length;
}

export function toggleNode(p: PickerState, nodeId: string): void {
  if (p.selected.has(nodeId)) p.selected.delete(nodeId);
  else p.selected.add(nodeId);
}

/** Swap a node with its neighbour in display order; a no-op at the ends. */
export function moveNode(p: PickerState, nodeId: string, dir: -1 | 1): void {
  const i = p.order.indexOf(nodeId);
  const j = i + dir;
  const a = p.order[i];
  const b = p.order[j];
  if (i < 0 || a === undefined || b === undefined) return;
  p.order[i] = b;
  p.order[j] = a;
}

/** A best-effort show id until ADR-0004's `showId` question is settled. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "show"
  );
}

function secs(s: number): string {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m)}:${String(r).padStart(2, "0")}`;
}

function coordsOf(n: BvNode): string {
  if (n.start === undefined) return "";
  return n.end !== undefined
    ? `${secs(n.start)}–${secs(n.end)}`
    : `from ${secs(n.start)}`;
}

/** Just the `<li>` rows — re-rendered on its own into `#picknodes` when a
 * toggle or reorder changes `order`/`selected` (leaves the form untouched). */
export function pickNodesHtml(p: PickerState): string {
  const byId = new Map(p.show.nodes.map((n) => [n.id, n]));
  const last = p.order.length - 1;
  let stepNo = 0;
  return p.order
    .map((id, i) => {
      const n = byId.get(id);
      if (n === undefined) return "";
      const on = p.selected.has(id);
      if (on) stepNo++;
      const meta = [coordsOf(n), n.isAside ? "aside" : ""]
        .filter((x) => x !== "")
        .join(" · ");
      return `
        <li class="picknode${on ? " on" : ""}">
          <label class="pick">
            <input type="checkbox" data-action="pick-toggle" data-node="${esc(id)}"${on ? " checked" : ""} />
            <span class="stepno mono">${on ? String(stepNo) : "·"}</span>
          </label>
          <span class="name"><b>${esc(n.title)}</b>${meta !== "" ? `<small>${esc(meta)}</small>` : ""}</span>
          <span class="reorder">
            <button type="button" class="more" data-action="pick-up" data-node="${esc(id)}"${i === 0 ? " disabled" : ""} aria-label="Move ${esc(n.title)} up">↑</button>
            <button type="button" class="more" data-action="pick-down" data-node="${esc(id)}"${i === last ? " disabled" : ""} aria-label="Move ${esc(n.title)} down">↓</button>
          </span>
        </li>`;
    })
    .join("");
}

/** The whole picker section: metadata form + the ordered node list. */
export function pickerHtml(p: PickerState, cats: readonly string[]): string {
  const datalist = cats
    .map((c) => `<option value="${esc(c)}"></option>`)
    .join("");
  return `
    <section class="balance picker">
      <div class="head">
        <span class="micro">Import from branching-video</span>
        <p><b>${esc(p.show.title)}</b> · ${String(p.show.nodes.length)} nodes · <span id="pickcount">${String(selectedCount(p))}</span> as steps</p>
      </div>
      <form class="inline-form" data-form="picker">
        <label>name <input type="text" name="name" required maxlength="120" value="${esc(p.show.title)}" /></label>
        <label>category <input type="text" name="category" list="picker-cats" required maxlength="60" /></label>
        <datalist id="picker-cats">${datalist}</datalist>
        <label>sub-category <input type="text" name="subCategory" maxlength="60" /></label>
        <label>cadence <select name="kind">
          <option value="daily">daily</option>
          <option value="weekly">weekly</option>
          <option value="monthly">monthly</option>
          <option value="one-off">one-off</option>
        </select></label>
        <label>at <input type="time" name="time" /></label>
        <button class="do" type="submit">Add to rotation</button>
        <button class="do" type="button" data-action="close-picker">Cancel</button>
      </form>
      <ol class="picknodes" id="picknodes">${pickNodesHtml(p)}</ol>
      <p class="pickhint micro">Checked nodes become ordered steps — step 1 shows until you advance. Reorder with ↑ ↓.</p>
    </section>`;
}
