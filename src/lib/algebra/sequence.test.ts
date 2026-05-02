import { describe, expect, it } from "vitest";
import { analyzeSequence } from "./solver";

describe("analyzeSequence", () => {
  it("extracts recursive and explicit rules for a geometric sequence", () => {
    const sequence = analyzeSequence("2, 6, 18, 54");

    expect(sequence?.kind).toBe("geometric");
    expect(sequence?.features).toEqual(
      expect.arrayContaining([
        { label: "Common ratio", value: "3" },
        { label: "Recursive rule", value: "a_n = 3a_(n - 1), a_1 = 2" },
        { label: "Explicit rule", value: "a_n = 2(3)^(n - 1)" },
      ]),
    );
    expect(sequence?.table.slice(-3)).toEqual([
      { n: "5", value: "162", projected: true },
      { n: "6", value: "486", projected: true },
      { n: "7", value: "1458", projected: true },
    ]);
  });

  it("extracts recursive and explicit rules for an arithmetic sequence", () => {
    const sequence = analyzeSequence("4, 10, 16, 22");

    expect(sequence?.kind).toBe("arithmetic");
    expect(sequence?.features).toEqual(
      expect.arrayContaining([
        { label: "Common difference", value: "6" },
        { label: "Recursive rule", value: "a_n = a_(n - 1) + 6, a_1 = 4" },
        { label: "Explicit rule", value: "a_n = 4 + 6(n - 1)" },
      ]),
    );
    expect(sequence?.table.slice(-3)).toEqual([
      { n: "5", value: "28", projected: true },
      { n: "6", value: "34", projected: true },
      { n: "7", value: "40", projected: true },
    ]);
  });

  it("handles a geometric sequence with a fractional ratio", () => {
    const sequence = analyzeSequence("8, 4, 2, 1");

    expect(sequence?.kind).toBe("geometric");
    expect(sequence?.features).toEqual(
      expect.arrayContaining([
        { label: "Common ratio", value: "1/2" },
        { label: "Recursive rule", value: "a_n = (1/2)a_(n - 1), a_1 = 8" },
        { label: "Explicit rule", value: "a_n = 8(1/2)^(n - 1)" },
      ]),
    );
  });

  it("ignores non-sequence algebra input", () => {
    expect(analyzeSequence("3x + 5 = 26")).toBeNull();
  });
});
