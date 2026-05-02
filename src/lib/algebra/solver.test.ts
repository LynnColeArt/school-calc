import { describe, expect, it } from "vitest";
import { renderTrace } from "./render";
import { solveAlgebra } from "./solver";

describe("solveAlgebra", () => {
  it("solves a one-variable linear equation with reversible steps", () => {
    const trace = solveAlgebra("3x + 5 = 26");

    expect(trace.result.value).toBe("x = 7");
    expect(trace.standardCodes).toContain("A1.REI.A.1");
    expect(trace.steps.map((step) => step.after.text)).toEqual([
      "3x = 21",
      "x = 7",
    ]);
  });

  it("records a simplify step for distributive form", () => {
    const trace = solveAlgebra("2(x + 3) = 14");

    expect(trace.result.value).toBe("x = 4");
    expect(trace.steps[0]?.operation).toBe("Distribute and combine like terms");
    expect(trace.steps.map((step) => step.after.text)).toContain("2x + 6 = 14");
  });

  it("solves a square equation with the square root property", () => {
    const trace = solveAlgebra("x^2 = 49");

    expect(trace.result.value).toBe("x = 7 or x = -7");
    expect(trace.standardCodes).toContain("A1.REI.A.2");
  });

  it("solves a simple square-root equation with a check step", () => {
    const trace = solveAlgebra("sqrt(x) = 5");

    expect(trace.result.value).toBe("x = 25");
    expect(trace.steps.at(-1)?.after.text).toBe("sqrt(25) = 5");
  });

  it("simplifies a radical by factoring out a perfect square", () => {
    const trace = solveAlgebra("sqrt(18)");

    expect(trace.result.value).toBe("3sqrt(2)");
    expect(trace.steps.map((step) => step.after.text)).toEqual([
      "sqrt(9 * 2)",
      "sqrt(9) * sqrt(2)",
      "3sqrt(2)",
    ]);
  });

  it("renders a homework trace", () => {
    const trace = solveAlgebra("3x + 5 = 26");
    const rendered = renderTrace(trace, "homework");

    expect(rendered.lines.map((line) => line.math)).toEqual([
      "3x + 5 = 26",
      "3x = 21",
      "x = 7",
    ]);
  });
});

