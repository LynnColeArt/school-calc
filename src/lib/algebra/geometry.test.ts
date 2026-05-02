import { describe, expect, it } from "vitest";
import { analyzeCoordinateGeometry } from "./solver";

describe("analyzeCoordinateGeometry", () => {
  it("extracts slope, midpoint, distance, and line forms from two points", () => {
    const geometry = analyzeCoordinateGeometry("points A(1, 2) B(5, 10)");

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Slope", value: "2" },
        { label: "Midpoint", value: "(3, 6)" },
        { label: "Distance", value: "4sqrt(5)" },
        { label: "Point-slope form", value: "y - 2 = 2(x - 1)" },
        { label: "Slope-intercept form", value: "y = 2x" },
      ]),
    );
    expect(geometry?.steps.some((step) => step.math.includes("m ="))).toBe(true);
  });

  it("handles a vertical line", () => {
    const geometry = analyzeCoordinateGeometry("points A(3, -1) B(3, 5)");

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Slope", value: "undefined" },
        { label: "Midpoint", value: "(3, 2)" },
        { label: "Distance", value: "6" },
        { label: "Line equation", value: "x = 3" },
      ]),
    );
    expect(geometry?.line.kind).toBe("vertical");
  });

  it("ignores non-geometry input", () => {
    expect(analyzeCoordinateGeometry("2, 6, 18, 54")).toBeNull();
  });
});
