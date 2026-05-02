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

  it("accepts two-point input without the points keyword", () => {
    const geometry = analyzeCoordinateGeometry("A = (1, 2), B = (5, 10)");

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Slope", value: "2" },
        { label: "Midpoint", value: "(3, 6)" },
        { label: "Distance", value: "4sqrt(5)" },
        { label: "Slope-intercept form", value: "y = 2x" },
      ]),
    );
    expect(geometry?.points[0]?.label).toBe("A(1, 2)");
    expect(geometry?.points[1]?.label).toBe("B(5, 10)");
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

  it("builds a parallel line through a point", () => {
    const geometry = analyzeCoordinateGeometry(
      "parallel through P(3, 4) to y = 2x + 1",
    );

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Relationship", value: "parallel" },
        { label: "Given line", value: "y = 2x + 1" },
        { label: "Given slope", value: "2" },
        { label: "New slope", value: "2" },
        { label: "Point-slope form", value: "y - 4 = 2(x - 3)" },
        { label: "Slope-intercept form", value: "y = 2x - 2" },
      ]),
    );
    expect(geometry?.referenceLineLabel).toBe("y = 2x + 1");
  });

  it("accepts the line relationship when the line comes first", () => {
    const geometry = analyzeCoordinateGeometry(
      "parallel to y = 2x + 1 through P(3, 4)",
    );

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Relationship", value: "parallel" },
        { label: "Given line", value: "y = 2x + 1" },
        { label: "New slope", value: "2" },
        { label: "Slope-intercept form", value: "y = 2x - 2" },
      ]),
    );
  });

  it("builds a perpendicular line through a point", () => {
    const geometry = analyzeCoordinateGeometry(
      "perpendicular through P(3, 4) to y = 2x + 1",
    );

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Relationship", value: "perpendicular" },
        { label: "New slope", value: "-1/2" },
        { label: "Point-slope form", value: "y - 4 = (-1/2)(x - 3)" },
        { label: "Slope-intercept form", value: "y = -1/2x + 11/2" },
      ]),
    );
  });

  it("handles a perpendicular line to a vertical line", () => {
    const geometry = analyzeCoordinateGeometry(
      "perpendicular through P(1, -2) to x = 3",
    );

    expect(geometry?.features).toEqual(
      expect.arrayContaining([
        { label: "Relationship", value: "perpendicular" },
        { label: "Given slope", value: "undefined" },
        { label: "New slope", value: "0" },
        { label: "New line", value: "y = -2" },
      ]),
    );
  });

  it("ignores non-geometry input", () => {
    expect(analyzeCoordinateGeometry("2, 6, 18, 54")).toBeNull();
  });
});
