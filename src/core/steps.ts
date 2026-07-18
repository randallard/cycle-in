/** Step progress for a branching-video-sourced time-option (ADR-0004). Pure
 * derivation over `ItemState.bvSource.steps` + `currentNodeId`; the UI reads it
 * to show "now on step k of n" and to compute the target of an
 * "advance to next step" (`bv-node-advanced`). */

import type { BvStep, ItemState } from "./types";

export interface StepProgress {
  steps: BvStep[];
  /** Zero-based index of the current step; -1 when `currentNodeId` is unset or
   * not found (e.g. a fresh item before its first advance — though the reducer
   * seeds it at step 0 — or steps reordered out from under it). */
  index: number;
  total: number;
  /** The current step (absent when `index` is -1). */
  current?: BvStep;
  /** The step an "advance" would move to; absent only at the final step. When
   * `index` is -1 this is the first step, so advancing starts the sequence. */
  next?: BvStep;
}

export function stepProgress(item: ItemState): StepProgress | undefined {
  const bv = item.bvSource;
  if (bv === undefined || bv.steps.length === 0) return undefined;
  const steps = bv.steps;
  const index =
    item.currentNodeId !== undefined
      ? steps.findIndex((s) => s.nodeId === item.currentNodeId)
      : -1;
  const current = index >= 0 ? steps[index] : undefined;
  const next = steps[index + 1]; // index -1 → steps[0]; last → undefined
  return {
    steps,
    index,
    total: steps.length,
    ...(current !== undefined ? { current } : {}),
    ...(next !== undefined ? { next } : {}),
  };
}
