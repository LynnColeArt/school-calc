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

  it("combines like terms in a polynomial expression and writes standard form", () => {
    const trace = solveAlgebra("2x + 3x - 4 + x^2");

    expect(trace.result.value).toBe("x^2 + 5x - 4");
    expect(trace.topic).toBe("Polynomial simplification");
    expect(trace.steps.map((step) => step.after.text)).toEqual(["x^2 + 5x - 4"]);
  });

  it("expands a product of binomials into a quadratic", () => {
    const trace = solveAlgebra("(x + 2)(x + 3)");

    expect(trace.result.value).toBe("x^2 + 5x + 6");
    expect(trace.topic).toBe("Polynomial simplification");
    expect(trace.steps.map((step) => step.after.text)).toEqual(["x^2 + 5x + 6"]);
  });

  it("factors a quadratic polynomial expression", () => {
    const trace = solveAlgebra("x^2 + 5x + 6");

    expect(trace.result.value).toBe("(x + 2)(x + 3)");
    expect(trace.topic).toBe("Factoring");
    expect(trace.steps.map((step) => step.after.text)).toEqual(["(x + 2)(x + 3)"]);
  });

  it("factors out a common factor when a quadratic does not split into binomials", () => {
    const trace = solveAlgebra("2x^2 + 4x + 6");

    expect(trace.result.value).toBe("2(x^2 + 2x + 3)");
    expect(trace.topic).toBe("Factoring");
    expect(trace.steps.map((step) => step.after.text)).toEqual(["2(x^2 + 2x + 3)"]);
  });

  it("solves a square equation with the square root property", () => {
    const trace = solveAlgebra("x^2 = 49");

    expect(trace.result.value).toBe("x = 7 or x = -7");
    expect(trace.standardCodes).toContain("A1.REI.A.2");
  });

  it("isolates a square term before using the square root property", () => {
    const trace = solveAlgebra("x^2 + 5 = 54");

    expect(trace.result.value).toBe("x = 7 or x = -7");
    expect(trace.steps.map((step) => step.after.text)).toContain("x^2 = 49");
  });

  it("divides a square coefficient before solving", () => {
    const trace = solveAlgebra("4x^2 = 100");

    expect(trace.result.value).toBe("x = 5 or x = -5");
    expect(trace.steps.map((step) => step.after.text)).toContain("x^2 = 25");
  });

  it("handles a difference-of-squares shape by isolating x squared", () => {
    const trace = solveAlgebra("x^2 - 9 = 0");

    expect(trace.result.value).toBe("x = 3 or x = -3");
    expect(trace.steps.map((step) => step.after.text)).toContain("x^2 = 9");
  });

  it("solves a zero square equation as one solution", () => {
    const trace = solveAlgebra("x^2 = 0");

    expect(trace.result.value).toBe("x = 0");
  });

  it("solves a monic non-factorable quadratic by completing the square", () => {
    const trace = solveAlgebra("x^2 + 6x + 2 = 0");

    expect(trace.result.value).toBe("x = -3 + sqrt(7) or x = -3 - sqrt(7)");
    expect(trace.topic).toBe("Completing the square");
    expect(trace.steps.map((step) => step.after.text)).toContain("(x + 3)^2 = 7");
  });

  it("uses the quadratic formula for a non-monic non-factorable quadratic", () => {
    const trace = solveAlgebra("2x^2 - 3x - 1 = 0");

    expect(trace.result.value).toBe("x = (3 + sqrt(17))/4 or x = (3 - sqrt(17))/4");
    expect(trace.steps.some((step) => step.operation === "Use the quadratic formula")).toBe(true);
  });

  it("solves a simple square-root equation with a check step", () => {
    const trace = solveAlgebra("sqrt(x) = 5");

    expect(trace.result.value).toBe("x = 25");
    expect(trace.steps.at(-1)?.after.text).toBe("sqrt(25) = 5");
  });

  it("solves a square-root equation with a linear radicand", () => {
    const trace = solveAlgebra("sqrt(x + 4) = 7");

    expect(trace.result.value).toBe("x = 45");
    expect(trace.steps.map((step) => step.after.text)).toContain("x = 45");
    expect(trace.steps.at(-1)?.after.text).toBe("sqrt(45 + 4) = 7");
  });

  it("rejects an extraneous root after squaring both sides", () => {
    const trace = solveAlgebra("sqrt(x + 12) = x");

    expect(trace.result.value).toBe("x = 4");
    expect(trace.steps.map((step) => step.after.text)).toContain(
      "x = -3 or x = 4",
    );
    expect(
      trace.steps.some((step) => step.after.text.includes("reject it")),
    ).toBe(true);
  });

  it("checks candidates after completing the square inside a square-root equation", () => {
    const trace = solveAlgebra("sqrt(x + 1) = x - 3");

    expect(trace.result.value).toBe("x = (7 + sqrt(17))/2");
    expect(trace.steps.map((step) => step.after.text)).toContain("(x - 7/2)^2 = 17/4");
    expect(
      trace.steps.some((step) => step.after.text.includes("reject it")),
    ).toBe(true);
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

  it("simplifies a radical with an outside coefficient", () => {
    const trace = solveAlgebra("2sqrt(8)");

    expect(trace.result.value).toBe("4sqrt(2)");
    expect(trace.steps.map((step) => step.after.text)).toEqual([
      "2sqrt(4 * 2)",
      "2 * sqrt(4) * sqrt(2)",
      "4sqrt(2)",
    ]);
  });

  it("combines like radicals after simplification", () => {
    const trace = solveAlgebra("sqrt(50) + sqrt(8)");

    expect(trace.result.value).toBe("7sqrt(2)");
    expect(trace.steps.map((step) => step.after.text)).toEqual([
      "5sqrt(2) + 2sqrt(2)",
      "7sqrt(2)",
    ]);
  });

  it("combines simplified radicals with subtraction", () => {
    const trace = solveAlgebra("3sqrt(12) - sqrt(27)");

    expect(trace.result.value).toBe("3sqrt(3)");
    expect(trace.steps.map((step) => step.after.text)).toEqual([
      "6sqrt(3) - 3sqrt(3)",
      "3sqrt(3)",
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
