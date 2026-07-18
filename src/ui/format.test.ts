import { describe, expect, it } from "vitest";
import { esc, fmtClock, fmtMin, isWebLink, safeHref } from "./format";

describe("fmtMin", () => {
  it.each([
    [0, "0m"],
    [45, "45m"],
    [60, "1h00"],
    [95, "1h35"],
  ])("%d → %s", (input, expected) => {
    expect(fmtMin(input)).toBe(expected);
  });
});

describe("fmtClock", () => {
  it.each([
    [0, "0:00"],
    [38, "0:38"],
    [61, "1:01"],
    [3599, "59:59"],
  ])("%d → %s", (input, expected) => {
    expect(fmtClock(input)).toBe(expected);
  });

  it("floors fractional seconds and clamps negatives", () => {
    expect(fmtClock(38.9)).toBe("0:38");
    expect(fmtClock(-5)).toBe("0:00");
  });
});

describe("isWebLink", () => {
  it.each([
    ["https://youtu.be/abc", true],
    ["http://example.com", true],
    ["HTTPS://EXAMPLE.COM", true],
    ["javascript:alert(1)", false],
    ["data:text/html,<script>", false],
    ["mailto:a@b.c", false],
    ["/relative/path", false],
    ["example.com", false],
    ["", false],
  ])("%s → %s", (input, expected) => {
    expect(isWebLink(input)).toBe(expected);
  });
});

describe("safeHref", () => {
  it("passes http and https through", () => {
    expect(safeHref("https://youtu.be/abc")).toBe("https://youtu.be/abc");
    expect(safeHref("http://example.com")).toBe("http://example.com");
  });

  it("blocks script-bearing and other schemes", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("JavaScript:alert(1)")).toBe("#");
    expect(safeHref("data:text/html,<script>")).toBe("#");
    expect(safeHref("/relative/path")).toBe("#");
    expect(safeHref("")).toBe("#");
  });
});

describe("esc", () => {
  it("escapes all HTML-significant characters", () => {
    expect(esc(`<b>"x" & 'y'</b>`)).toBe(
      "&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;"
    );
  });
});
