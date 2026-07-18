import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  defaultSpine,
  parseBvConfig,
  stepsFromNodes,
  suggestedSteps,
} from "./bvimport";

/** A show exercising every shape: default-choice main line, an optional aside
 * off a secondary choice, a Pattern-B default aside on the main line, a node
 * with no title, a node-level videoId override, and stray unknown fields. */
const CONFIG = JSON.stringify({
  title: "Cardistry Drills",
  startNode: "intro",
  masterVideoId: "MASTER",
  choiceDisplaySeconds: 8,
  nodes: [
    {
      id: "intro",
      title: "Intro",
      start: 0,
      end: 30,
      choices: [{ label: "Go", target: "step-1", default: true }],
    },
    {
      _note: "ignored by both player and us",
      id: "step-1",
      title: "Step 1",
      start: 30,
      end: 90,
      showChoicesAt: 80,
      choices: [
        { label: "Deep dive", target: "aside", style: "secondary" },
        { label: "Continue", target: "step-2", default: true, style: "primary" },
      ],
    },
    {
      id: "aside",
      title: "Deep dive",
      videoId: "ASIDE_VID",
      isAside: true,
      returnTo: "step-2",
      choices: [],
    },
    {
      // no title — falls back to id
      id: "step-2",
      start: 90,
      end: 150,
      choices: [{ label: "Continue", target: "default-aside", default: true }],
    },
    {
      id: "default-aside",
      title: "Everyone sees this",
      isAside: true,
      defaultAside: true,
      returnTo: "outro",
      choices: [],
    },
    {
      id: "outro",
      title: "Outro",
      start: 150,
      end: 180,
      choices: [],
      endScreen: { heading: "Done", links: [{ label: "x", url: "y" }] },
    },
  ],
});

describe("parseBvConfig", () => {
  it("reads the show envelope", () => {
    const show = parseBvConfig(CONFIG);
    expect(show.title).toBe("Cardistry Drills");
    expect(show.startNode).toBe("intro");
    expect(show.masterVideoId).toBe("MASTER");
    expect(show.nodes).toHaveLength(6);
  });

  it("normalizes nodes: title fallback, aside flags, videoId, unknown fields dropped", () => {
    const byId = new Map(parseBvConfig(CONFIG).nodes.map((n) => [n.id, n]));
    expect(byId.get("step-2")?.title).toBe("step-2"); // fell back to id
    expect(byId.get("aside")?.isAside).toBe(true);
    expect(byId.get("aside")?.videoId).toBe("ASIDE_VID");
    expect(byId.get("default-aside")?.isAside).toBe(true); // via defaultAside
    expect(byId.get("intro")?.videoId).toBeUndefined();
    expect(byId.get("outro")?.start).toBe(150);
  });

  it("keeps choice order and marks the default", () => {
    const step1 = parseBvConfig(CONFIG).nodes.find((n) => n.id === "step-1");
    expect(step1?.choices.map((c) => c.target)).toEqual(["aside", "step-2"]);
    expect(step1?.choices.map((c) => c.isDefault)).toEqual([false, true]);
  });

  it("tolerates a missing title and startNode", () => {
    const show = parseBvConfig(
      JSON.stringify({ nodes: [{ id: "only" }] })
    );
    expect(show.title).toBe("Untitled show");
    expect(show.startNode).toBeUndefined();
    expect(defaultSpine(show)).toEqual([]);
  });

  it.each([
    ["not JSON at all", "not json {"],
    ["a JSON array", "[]"],
    ["no nodes array", '{"title":"x"}'],
    ["empty nodes", '{"nodes":[]}'],
    ["a node without id", '{"nodes":[{"title":"x"}]}'],
    ["duplicate node ids", '{"nodes":[{"id":"a"},{"id":"a"}]}'],
    [
      "a cycle-in event bundle",
      '{"format":"cycle-in-events","bundleVersion":1,"events":[]}',
    ],
  ])("rejects %s", (_label, text) => {
    expect(() => parseBvConfig(text)).toThrow();
  });
});

describe("defaultSpine", () => {
  it("follows default choices and returnTo through a default aside", () => {
    expect(defaultSpine(parseBvConfig(CONFIG))).toEqual([
      "intro",
      "step-1",
      "step-2",
      "default-aside",
      "outro",
    ]);
  });

  it("guards against cycles in the default path", () => {
    const show = parseBvConfig(
      JSON.stringify({
        startNode: "a",
        nodes: [
          { id: "a", choices: [{ target: "b", default: true }] },
          { id: "b", choices: [{ target: "a", default: true }] },
        ],
      })
    );
    expect(defaultSpine(show)).toEqual(["a", "b"]);
  });

  it("PROPERTY: a linear default-choice chain is the whole spine, in order", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), (n) => {
        const nodes = Array.from({ length: n }, (_, i) => ({
          id: `n${String(i)}`,
          choices:
            i < n - 1
              ? [{ label: "next", target: `n${String(i + 1)}`, default: true }]
              : [],
        }));
        const show = parseBvConfig(
          JSON.stringify({ startNode: "n0", nodes })
        );
        expect(defaultSpine(show)).toEqual(nodes.map((x) => x.id));
      })
    );
  });
});

/** The real single-video tutorial shape (mirrors
 * live/cards-hummingbird-and-flutter.json): a flat, ordered list of
 * timestamped segments, `choices: []` everywhere, no `end`. */
const FLAT_CONFIG = JSON.stringify({
  title: "Cardistry | Hummingbird Tutorial",
  startNode: "intro",
  masterVideoId: "mod4T6O0P6A",
  nodes: [
    { id: "intro", title: "Intro", start: 0, showChoicesAt: 0, choices: [] },
    { id: "01-pull-apart", title: "Step 1: Pull Apart", start: 38, choices: [] },
    { id: "02-first-flip", title: "Step 2: Flip #1", start: 61, choices: [] },
    { id: "03-push-through", title: "Step 3: Push Through", start: 71, choices: [] },
  ],
});

describe("suggestedSteps", () => {
  it("is the main line with asides removed (branching show)", () => {
    expect(suggestedSteps(parseBvConfig(CONFIG))).toEqual([
      "intro",
      "step-1",
      "step-2",
      "outro",
    ]);
  });

  it("falls back to file order for a flat tutorial (no navigable spine)", () => {
    const show = parseBvConfig(FLAT_CONFIG);
    expect(defaultSpine(show)).toEqual(["intro"]); // no choices to follow
    expect(suggestedSteps(show)).toEqual([
      "intro",
      "01-pull-apart",
      "02-first-flip",
      "03-push-through",
    ]);
  });

  it("maps a flat tutorial's steps to the master video with start-only coords", () => {
    const show = parseBvConfig(FLAT_CONFIG);
    const steps = stepsFromNodes(show, suggestedSteps(show));
    expect(steps.map((s) => s.videoId)).toEqual(Array(4).fill("mod4T6O0P6A"));
    expect(steps.every((s) => s.end === undefined)).toBe(true);
    expect(steps[1]).toEqual({
      nodeId: "01-pull-apart",
      title: "Step 1: Pull Apart",
      videoId: "mod4T6O0P6A",
      start: 38,
    });
  });
});

describe("stepsFromNodes", () => {
  it("resolves videoId (node override, else master) and carries coordinates", () => {
    const show = parseBvConfig(CONFIG);
    const steps = stepsFromNodes(show, suggestedSteps(show));
    expect(steps.map((s) => s.nodeId)).toEqual([
      "intro",
      "step-1",
      "step-2",
      "outro",
    ]);
    expect(steps.every((s) => s.videoId === "MASTER")).toBe(true);
    expect(steps.find((s) => s.nodeId === "step-2")).toMatchObject({
      title: "step-2",
      start: 90,
      end: 150,
    });
  });

  it("uses the node-level videoId override when present", () => {
    const show = parseBvConfig(CONFIG);
    expect(stepsFromNodes(show, ["aside"])[0]?.videoId).toBe("ASIDE_VID");
  });

  it("skips unknown node ids, preserving requested order", () => {
    const show = parseBvConfig(CONFIG);
    expect(stepsFromNodes(show, ["nope", "outro", "gone"])).toEqual([
      { nodeId: "outro", title: "Outro", videoId: "MASTER", start: 150, end: 180 },
    ]);
  });
});
