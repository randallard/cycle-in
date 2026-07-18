import { describe, expect, it } from "vitest";
import { parseBvConfig } from "../core/bvimport";
import {
  initPicker,
  moveNode,
  pickNodesHtml,
  pickerHtml,
  pickerSteps,
  selectedCount,
  slugify,
  toggleNode,
} from "./picker";

/** Flat tutorial (the real cardistry shape): ordered timestamped segments,
 * no choices, no asides. */
const FLAT = JSON.stringify({
  title: "Cardistry | Hummingbird",
  startNode: "intro",
  masterVideoId: "VID",
  nodes: [
    { id: "intro", title: "Intro", start: 0, choices: [] },
    { id: "s1", title: "Step 1", start: 38, choices: [] },
    { id: "s2", title: "Step 2", start: 61, choices: [] },
  ],
});

/** Branching show: a default-choice spine plus an optional aside. */
const BRANCHING = JSON.stringify({
  title: "AI Talk",
  startNode: "intro",
  masterVideoId: "M",
  nodes: [
    { id: "intro", title: "Intro", choices: [{ target: "c1", default: true }] },
    {
      id: "c1",
      title: "Chapter 1",
      choices: [
        { target: "aside", style: "secondary" },
        { target: "c2", default: true },
      ],
    },
    { id: "aside", title: "Deep dive", isAside: true, returnTo: "c2", choices: [] },
    { id: "c2", title: "Chapter 2", choices: [] },
  ],
});

describe("initPicker", () => {
  it("preselects the suggested steps in order (flat tutorial = all nodes)", () => {
    const p = initPicker(parseBvConfig(FLAT));
    expect(p.order).toEqual(["intro", "s1", "s2"]);
    expect([...p.selected]).toEqual(["intro", "s1", "s2"]);
    expect(selectedCount(p)).toBe(3);
  });

  it("puts suggested steps first, asides last and unselected (branching)", () => {
    const p = initPicker(parseBvConfig(BRANCHING));
    // spine = intro, c1, c2; aside is off-spine → appended, not selected.
    expect(p.order).toEqual(["intro", "c1", "c2", "aside"]);
    expect([...p.selected].sort()).toEqual(["c1", "c2", "intro"]);
    expect(p.selected.has("aside")).toBe(false);
  });
});

describe("toggleNode / selectedCount", () => {
  it("adds and removes a node from the step set", () => {
    const p = initPicker(parseBvConfig(BRANCHING));
    toggleNode(p, "aside"); // include the aside
    expect(p.selected.has("aside")).toBe(true);
    expect(selectedCount(p)).toBe(4);
    toggleNode(p, "intro"); // drop the intro
    expect(p.selected.has("intro")).toBe(false);
    expect(selectedCount(p)).toBe(3);
  });
});

describe("moveNode", () => {
  it("reorders within bounds and no-ops at the ends", () => {
    const p = initPicker(parseBvConfig(FLAT));
    moveNode(p, "s2", -1);
    expect(p.order).toEqual(["intro", "s2", "s1"]);
    moveNode(p, "intro", -1); // already first — no-op
    expect(p.order).toEqual(["intro", "s2", "s1"]);
    moveNode(p, "s1", 1); // already last — no-op
    expect(p.order).toEqual(["intro", "s2", "s1"]);
  });

  it("reordering changes the committed step order", () => {
    const p = initPicker(parseBvConfig(FLAT));
    moveNode(p, "s2", -1);
    expect(pickerSteps(p).map((s) => s.nodeId)).toEqual(["intro", "s2", "s1"]);
  });
});

describe("pickerSteps", () => {
  it("returns only selected nodes, in display order, video-resolved", () => {
    const p = initPicker(parseBvConfig(FLAT));
    toggleNode(p, "intro"); // drop intro
    const steps = pickerSteps(p);
    expect(steps.map((s) => s.nodeId)).toEqual(["s1", "s2"]);
    expect(steps.every((s) => s.videoId === "VID")).toBe(true);
    expect(steps[0]).toEqual({
      nodeId: "s1",
      title: "Step 1",
      videoId: "VID",
      start: 38,
    });
  });
});

describe("slugify", () => {
  it.each([
    ["Cardistry | Hummingbird", "cardistry-hummingbird"],
    ["  AI: Terrible & Wonderful  ", "ai-terrible-wonderful"],
    ["!!!", "show"],
  ])("%s → %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("html", () => {
  it("renders a checkbox per node, numbers only the selected, escapes text", () => {
    const p = initPicker(parseBvConfig(BRANCHING));
    const rows = pickNodesHtml(p);
    expect((rows.match(/type="checkbox"/g) ?? []).length).toBe(4);
    expect(rows).toContain('data-node="aside"');
    // aside is unselected → bullet, not a number
    expect(rows).toContain(">·</span>");
    const full = pickerHtml(p, ["music", "cardistry"]);
    expect(full).toContain('data-form="picker"');
    expect(full).toContain('id="pickcount"');
    expect(full).toContain("AI Talk");
  });

  it("escapes a malicious node title", () => {
    const evil = JSON.stringify({
      title: "x",
      startNode: "a",
      nodes: [{ id: "a", title: "<img src=x onerror=alert(1)>", choices: [] }],
    });
    const rows = pickNodesHtml(initPicker(parseBvConfig(evil)));
    expect(rows).not.toContain("<img src=x");
    expect(rows).toContain("&lt;img src=x");
  });
});
