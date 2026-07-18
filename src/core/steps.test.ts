import { describe, expect, it } from "vitest";
import { stepProgress } from "./steps";
import type { BvStep, ItemState } from "./types";

const STEPS: BvStep[] = [
  { nodeId: "s1", title: "Step 1", videoId: "V", start: 0 },
  { nodeId: "s2", title: "Step 2", videoId: "V", start: 38 },
  { nodeId: "s3", title: "Step 3", videoId: "V", start: 61 },
];

function bvItem(currentNodeId?: string, steps: BvStep[] = STEPS): ItemState {
  return {
    id: "cards",
    name: "Cardistry",
    category: "cardistry",
    cadence: { kind: "daily" },
    held: false,
    archived: false,
    bvSource: { showId: "c", showTitle: "Cardistry", steps },
    ...(currentNodeId !== undefined ? { currentNodeId } : {}),
  };
}

describe("stepProgress", () => {
  it("is undefined for a non-BV item", () => {
    const plain: ItemState = {
      id: "x",
      name: "x",
      category: "c",
      cadence: { kind: "daily" },
      held: false,
      archived: false,
    };
    expect(stepProgress(plain)).toBeUndefined();
  });

  it("is undefined when bvSource carries no steps", () => {
    expect(stepProgress(bvItem("s1", []))).toBeUndefined();
  });

  it("at step 1: current is step 1, next is step 2", () => {
    const p = stepProgress(bvItem("s1"));
    expect(p?.index).toBe(0);
    expect(p?.total).toBe(3);
    expect(p?.current?.nodeId).toBe("s1");
    expect(p?.next?.nodeId).toBe("s2");
  });

  it("in the middle: next points one further along", () => {
    const p = stepProgress(bvItem("s2"));
    expect(p?.index).toBe(1);
    expect(p?.next?.nodeId).toBe("s3");
  });

  it("at the final step: no next", () => {
    const p = stepProgress(bvItem("s3"));
    expect(p?.index).toBe(2);
    expect(p?.current?.nodeId).toBe("s3");
    expect(p?.next).toBeUndefined();
  });

  it("unset/unknown currentNodeId: index -1, next is the first step (so advance starts it)", () => {
    const unset = stepProgress(bvItem(undefined));
    expect(unset?.index).toBe(-1);
    expect(unset?.current).toBeUndefined();
    expect(unset?.next?.nodeId).toBe("s1");

    const stale = stepProgress(bvItem("gone"));
    expect(stale?.index).toBe(-1);
    expect(stale?.next?.nodeId).toBe("s1");
  });

  it("walking next across the whole sequence visits every step once, then stops", () => {
    const visited: string[] = [];
    let cur: string | undefined = "s1";
    while (cur !== undefined) {
      visited.push(cur);
      cur = stepProgress(bvItem(cur))?.next?.nodeId;
    }
    expect(visited).toEqual(["s1", "s2", "s3"]);
  });
});
