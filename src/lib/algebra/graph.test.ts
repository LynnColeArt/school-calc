import { describe, expect, it } from "vitest";
import { analyzeGraph } from "./solver";

describe("analyzeGraph", () => {
  it("extracts linear graph features", () => {
    const graph = analyzeGraph("y = 2x + 1");

    expect(graph?.kind).toBe("linear");
    expect(graph?.equation).toBe("y = 2x + 1");
    expect(graph?.features).toEqual(
      expect.arrayContaining([
        { label: "Slope", value: "2" },
        { label: "y-intercept", value: "(0, 1)" },
        { label: "x-intercept", value: "(-1/2, 0)" },
      ]),
    );
    expect(graph?.table).toEqual([
      { x: "-2", y: "-3" },
      { x: "0", y: "1" },
      { x: "2", y: "5" },
    ]);
  });

  it("extracts quadratic graph features", () => {
    const graph = analyzeGraph("y = x^2 - 4x + 3");

    expect(graph?.kind).toBe("quadratic");
    expect(graph?.features).toEqual(
      expect.arrayContaining([
        { label: "Vertex", value: "(2, -1)" },
        { label: "Axis of symmetry", value: "x = 2" },
        { label: "y-intercept", value: "(0, 3)" },
        { label: "x-intercepts", value: "(3, 0), (1, 0)" },
      ]),
    );
    expect(graph?.table).toEqual([
      { x: "0", y: "3" },
      { x: "1", y: "0" },
      { x: "2", y: "-1" },
      { x: "3", y: "0" },
      { x: "4", y: "3" },
    ]);
  });

  it("ignores non-graph solving input", () => {
    expect(analyzeGraph("x^2 = 49")).toBeNull();
  });
});
