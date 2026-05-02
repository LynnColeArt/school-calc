import type { MathStatement, SolveStep, SolveTrace } from "./types";

type Linear = {
  coefficient: Rational;
  constant: Rational;
};

type Token =
  | { type: "number"; value: string }
  | { type: "variable"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "paren"; value: "(" | ")" };

class Rational {
  readonly numerator: number;
  readonly denominator: number;

  constructor(numerator: number, denominator = 1) {
    if (denominator === 0) {
      throw new Error("Cannot divide by zero.");
    }

    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
    this.numerator = (sign * numerator) / divisor;
    this.denominator = Math.abs(denominator) / divisor;
  }

  static zero() {
    return new Rational(0);
  }

  static one() {
    return new Rational(1);
  }

  static fromString(value: string) {
    if (value.includes(".")) {
      const [whole, decimal] = value.split(".");
      const scale = 10 ** (decimal?.length ?? 0);
      return new Rational(Number(`${whole}${decimal}`), scale);
    }

    return new Rational(Number(value));
  }

  add(other: Rational) {
    return new Rational(
      this.numerator * other.denominator + other.numerator * this.denominator,
      this.denominator * other.denominator,
    );
  }

  subtract(other: Rational) {
    return this.add(other.negate());
  }

  multiply(other: Rational) {
    return new Rational(
      this.numerator * other.numerator,
      this.denominator * other.denominator,
    );
  }

  divide(other: Rational) {
    return new Rational(
      this.numerator * other.denominator,
      this.denominator * other.numerator,
    );
  }

  negate() {
    return new Rational(-this.numerator, this.denominator);
  }

  abs() {
    return new Rational(Math.abs(this.numerator), this.denominator);
  }

  isZero() {
    return this.numerator === 0;
  }

  isOne() {
    return this.numerator === this.denominator;
  }

  isNegativeOne() {
    return this.numerator === -this.denominator;
  }

  isNegative() {
    return this.numerator < 0;
  }

  equals(other: Rational) {
    return (
      this.numerator === other.numerator && this.denominator === other.denominator
    );
  }

  format() {
    if (this.denominator === 1) {
      return String(this.numerator);
    }

    return `${this.numerator}/${this.denominator}`;
  }
}

export function solveAlgebra(input: string): SolveTrace {
  const normalizedInput = normalizeInput(input);

  if (!normalizedInput) {
    return unsupported(input, "Enter an algebra problem.");
  }

  const radicalTrace = trySolveRadicalSimplification(normalizedInput);
  if (radicalTrace) {
    return radicalTrace;
  }

  const squareRootEquationTrace =
    trySolveSquareRootEquation(normalizedInput);
  if (squareRootEquationTrace) {
    return squareRootEquationTrace;
  }

  const squareEquationTrace = trySolveSquareEquation(normalizedInput);
  if (squareEquationTrace) {
    return squareEquationTrace;
  }

  const linearTrace = trySolveLinearEquation(normalizedInput);
  if (linearTrace) {
    return linearTrace;
  }

  return unsupported(
    input,
    "This first version supports linear equations, x^2 = a, sqrt(x) = a, and sqrt(n) simplification.",
  );
}

function trySolveLinearEquation(input: string): SolveTrace | null {
  if (!input.includes("=") || /sqrt|√|\^/.test(input)) {
    return null;
  }

  const [leftRaw, rightRaw, extra] = input.split("=");
  if (extra !== undefined || leftRaw === undefined || rightRaw === undefined) {
    return null;
  }

  try {
    const left = parseLinear(leftRaw);
    const right = parseLinear(rightRaw);
    const normalizedEquation = formatEquation(left, right);
    const needsSimplification = normalizeInput(normalizedEquation) !== input;
    const steps: SolveStep[] = [];
    let workingLeft = left;
    let workingRight = right;
    let previous = statement(
      needsSimplification ? prettifyRawEquation(input) : normalizedEquation,
    );

    if (needsSimplification) {
      const after = statement(normalizedEquation);
      steps.push({
        before: previous,
        after,
        operation: "Distribute and combine like terms",
        reason:
          "Rewriting each side in equivalent simplified form keeps the same solution set.",
        rule: "linear.simplify",
        standardCodes: ["A1.REI.A.1", "A1.SSE.A.2"],
      });
      previous = after;
    }

    if (!workingRight.coefficient.isZero()) {
      const newLeft: Linear = {
        coefficient: workingLeft.coefficient.subtract(workingRight.coefficient),
        constant: workingLeft.constant,
      };
      const newRight: Linear = {
        coefficient: Rational.zero(),
        constant: workingRight.constant,
      };
      const after = statement(formatEquation(newLeft, newRight));
      steps.push({
        before: previous,
        after,
        operation: `${operationPhrase(workingRight.coefficient.negate(), "x")} from both sides`,
        reason:
          "Adding or subtracting the same variable term on both sides creates an equivalent equation.",
        rule: "linear.moveVariableTerms",
        standardCodes: ["A1.REI.A.1"],
      });
      workingLeft = newLeft;
      workingRight = newRight;
      previous = after;
    }

    if (!workingLeft.constant.isZero()) {
      const newLeft: Linear = {
        coefficient: workingLeft.coefficient,
        constant: Rational.zero(),
      };
      const newRight: Linear = {
        coefficient: Rational.zero(),
        constant: workingRight.constant.subtract(workingLeft.constant),
      };
      const after = statement(formatEquation(newLeft, newRight));
      steps.push({
        before: previous,
        after,
        operation: `${operationPhrase(workingLeft.constant.negate())} from both sides`,
        reason:
          "Adding or subtracting the same constant on both sides creates an equivalent equation.",
        rule: "linear.moveConstants",
        standardCodes: ["A1.REI.A.1"],
      });
      workingLeft = newLeft;
      workingRight = newRight;
      previous = after;
    }

    if (workingLeft.coefficient.isZero()) {
      const sameConstant = workingLeft.constant.equals(workingRight.constant);
      return {
        input,
        title: "Linear equation",
        topic: "Equivalent equations",
        course: "algebra1",
        standardCodes: ["A1.REI.A.1"],
        steps,
        result: {
          kind: sameConstant ? "identity" : "contradiction",
          value: sameConstant ? "all real numbers" : "no solution",
        },
      };
    }

    const solution = workingRight.constant.divide(workingLeft.coefficient);
    const after = statement(`x = ${solution.format()}`);
    const coefficient = workingLeft.coefficient;
    steps.push({
      before: previous,
      after,
      operation: `${dividePhrase(coefficient)} on both sides`,
      reason:
        "Dividing both sides by the same nonzero number creates an equivalent equation.",
      rule: "linear.divideCoefficient",
      standardCodes: ["A1.REI.A.1"],
    });

    return {
      input,
      title: "Linear equation",
      topic: "Equivalent equations",
      course: "algebra1",
      standardCodes: ["A1.REI.A.1"],
      steps,
      result: {
        kind: "solution",
        value: `x = ${solution.format()}`,
      },
    };
  } catch {
    return null;
  }
}

function trySolveSquareEquation(input: string): SolveTrace | null {
  const match = input.match(/^x\^2=(-?\d+)$/);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const steps: SolveStep[] = [];

  if (value < 0) {
    return {
      input,
      title: "Square equation",
      topic: "Square root property",
      course: "algebra1",
      standardCodes: ["A1.REI.A.2"],
      steps: [
        {
          before: statement(input),
          after: statement("no real solution"),
          operation: "Compare to squares of real numbers",
          reason:
            "A real number squared cannot be negative, so there is no real solution.",
          rule: "square.noRealSolution",
          standardCodes: ["A1.REI.A.2"],
        },
      ],
      result: {
        kind: "solution",
        value: "no real solution",
      },
    };
  }

  const first = statement(`x = +/-sqrt(${value})`);
  steps.push({
    before: statement(input),
    after: first,
    operation: "Take the square root of both sides",
    reason:
      "The square root property gives two possible real values when x squared equals a positive number.",
    rule: "square.squareRootProperty",
    standardCodes: ["A1.REI.A.2"],
  });

  const simplified = simplifySquareRoot(value);
  const second = statement(`x = +/-${simplified}`);
  steps.push({
    before: first,
    after: second,
    operation: "Simplify the square root",
    reason: "Rewrite the radical using perfect-square factors when possible.",
    rule: "radical.simplify",
    standardCodes: ["A1.NQ.A.2"],
  });

  const finalValue =
    simplified.match(/^\d+$/) !== null
      ? `x = ${simplified} or x = -${simplified}`
      : `x = ${simplified} or x = -${simplified}`;
  steps.push({
    before: second,
    after: statement(finalValue),
    operation: "Write both solutions",
    reason: "Both the positive and negative values square to the same number.",
    rule: "square.writeSolutions",
    standardCodes: ["A1.REI.A.2"],
  });

  return {
    input,
    title: "Square equation",
    topic: "Square root property",
    course: "algebra1",
    standardCodes: ["A1.REI.A.2", "A1.NQ.A.2"],
    steps,
    result: {
      kind: "solution",
      value: finalValue,
    },
  };
}

function trySolveSquareRootEquation(input: string): SolveTrace | null {
  const match = input.match(/^(?:sqrt\((x)\)|√x)=(-?\d+)$/);
  if (!match) {
    return null;
  }

  const value = Number(match[2]);
  if (value < 0) {
    return {
      input,
      title: "Square-root equation",
      topic: "Square both sides",
      course: "algebra1",
      standardCodes: ["A1.NQ.A.2", "A1.REI.A.1"],
      steps: [
        {
          before: statement(input),
          after: statement("no real solution"),
          operation: "Use the range of the square-root function",
          reason:
            "The principal square root is never negative, so this equation has no real solution.",
          rule: "sqrt.range",
          standardCodes: ["A1.NQ.A.2"],
        },
      ],
      result: {
        kind: "solution",
        value: "no real solution",
      },
    };
  }

  const squared = value * value;
  const first = statement(`x = ${squared}`);
  const check = statement(`sqrt(${squared}) = ${value}`);

  return {
    input,
    title: "Square-root equation",
    topic: "Square both sides",
    course: "algebra1",
    standardCodes: ["A1.NQ.A.2", "A1.REI.A.1"],
    steps: [
      {
        before: statement(input),
        after: first,
        operation: "Square both sides",
        reason:
          "Squaring both sides undoes the square root, but the solution should be checked.",
        rule: "sqrt.squareBothSides",
        standardCodes: ["A1.REI.A.1", "A1.NQ.A.2"],
      },
      {
        before: first,
        after: check,
        operation: "Check the solution",
        reason:
          "Substituting the value back into the original equation confirms it works.",
        rule: "sqrt.checkSolution",
        standardCodes: ["A1.REI.A.1"],
      },
    ],
    result: {
      kind: "solution",
      value: `x = ${squared}`,
    },
  };
}

function trySolveRadicalSimplification(input: string): SolveTrace | null {
  const match = input.match(/^(?:sqrt\((\d+)\)|√(\d+))$/);
  if (!match) {
    return null;
  }

  const radicand = Number(match[1] ?? match[2]);
  const factor = largestPerfectSquareFactor(radicand);
  const remaining = radicand / factor;

  if (factor === 1) {
    return {
      input,
      title: "Square-root simplification",
      topic: "Radicals",
      course: "algebra1",
      standardCodes: ["A1.NQ.A.2"],
      steps: [],
      result: {
        kind: "solution",
        value: `sqrt(${radicand})`,
      },
    };
  }

  const rootFactor = Math.sqrt(factor);
  const finalValue =
    remaining === 1 ? String(rootFactor) : `${rootFactor}sqrt(${remaining})`;

  const first = statement(`sqrt(${factor} * ${remaining})`);
  const second = statement(`sqrt(${factor}) * sqrt(${remaining})`);
  const third = statement(finalValue);

  return {
    input,
    title: "Square-root simplification",
    topic: "Radicals",
    course: "algebra1",
    standardCodes: ["A1.NQ.A.2"],
    steps: [
      {
        before: statement(input),
        after: first,
        operation: "Factor out a perfect square",
        reason:
          "A square-root expression can be simplified when the radicand has a perfect-square factor.",
        rule: "radical.factorPerfectSquare",
        standardCodes: ["A1.NQ.A.2"],
      },
      {
        before: first,
        after: second,
        operation: "Use the product property of square roots",
        reason:
          "The square root of a product can be rewritten as the product of square roots for nonnegative factors.",
        rule: "radical.productProperty",
        standardCodes: ["A1.NQ.A.2"],
      },
      {
        before: second,
        after: third,
        operation: "Simplify the perfect square",
        reason: `sqrt(${factor}) equals ${rootFactor}.`,
        rule: "radical.simplifyPerfectSquare",
        standardCodes: ["A1.NQ.A.2"],
      },
    ],
    result: {
      kind: "solution",
      value: finalValue,
    },
  };
}

function parseLinear(input: string): Linear {
  const parser = new LinearParser(tokenize(input));
  return parser.parse();
}

class LinearParser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Linear {
    const expression = this.parseExpression();
    if (this.peek()) {
      throw new Error("Unexpected token.");
    }
    return expression;
  }

  private parseExpression(): Linear {
    let left = this.parseTerm();

    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left =
        operator === "+"
          ? addLinear(left, right)
          : subtractLinear(left, right);
    }

    return left;
  }

  private parseTerm(): Linear {
    let left = this.parseFactor();

    while (true) {
      let operator: "*" | "/" | undefined;
      if (this.matchOperator("*")) {
        operator = "*";
      } else if (this.matchOperator("/")) {
        operator = "/";
      } else if (this.startsImplicitMultiplication()) {
        operator = "*";
      } else {
        break;
      }

      const right = this.parseFactor();
      left = operator === "/" ? divideLinear(left, right) : multiplyLinear(left, right);
    }

    return left;
  }

  private parseFactor(): Linear {
    if (this.matchOperator("+")) {
      return this.parseFactor();
    }

    if (this.matchOperator("-")) {
      return negateLinear(this.parseFactor());
    }

    if (this.matchParen("(")) {
      const expression = this.parseExpression();
      this.consumeParen(")");
      return expression;
    }

    const token = this.advance();
    if (!token) {
      throw new Error("Expected a value.");
    }

    if (token.type === "number") {
      return {
        coefficient: Rational.zero(),
        constant: Rational.fromString(token.value),
      };
    }

    if (token.type === "variable" && token.value === "x") {
      return {
        coefficient: Rational.one(),
        constant: Rational.zero(),
      };
    }

    throw new Error("Unsupported token.");
  }

  private startsImplicitMultiplication() {
    const token = this.peek();
    return (
      token?.type === "number" ||
      token?.type === "variable" ||
      (token?.type === "paren" && token.value === "(")
    );
  }

  private matchOperator(value: Extract<Token, { type: "operator" }>["value"]) {
    const token = this.peek();
    if (token?.type === "operator" && token.value === value) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private matchParen(value: "(" | ")") {
    const token = this.peek();
    if (token?.type === "paren" && token.value === value) {
      this.index += 1;
      return true;
    }
    return false;
  }

  private consumeParen(value: "(" | ")") {
    if (!this.matchParen(value)) {
      throw new Error(`Expected ${value}.`);
    }
  }

  private previous() {
    return this.tokens[this.index - 1] as Token & { type: "operator" };
  }

  private peek() {
    return this.tokens[this.index];
  }

  private advance() {
    const token = this.peek();
    this.index += 1;
    return token;
  }
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (char === undefined) {
      break;
    }

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/\d|\./.test(char)) {
      let value = char;
      index += 1;
      while (index < input.length && /[\d.]/.test(input[index] ?? "")) {
        value += input[index];
        index += 1;
      }
      tokens.push({ type: "number", value });
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      tokens.push({ type: "variable", value: char });
      index += 1;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      index += 1;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ type: "operator", value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported character ${char}.`);
  }

  return tokens;
}

function addLinear(left: Linear, right: Linear): Linear {
  return {
    coefficient: left.coefficient.add(right.coefficient),
    constant: left.constant.add(right.constant),
  };
}

function subtractLinear(left: Linear, right: Linear): Linear {
  return {
    coefficient: left.coefficient.subtract(right.coefficient),
    constant: left.constant.subtract(right.constant),
  };
}

function negateLinear(value: Linear): Linear {
  return {
    coefficient: value.coefficient.negate(),
    constant: value.constant.negate(),
  };
}

function multiplyLinear(left: Linear, right: Linear): Linear {
  if (isConstant(left)) {
    return scaleLinear(right, left.constant);
  }

  if (isConstant(right)) {
    return scaleLinear(left, right.constant);
  }

  throw new Error("Nonlinear multiplication is not supported.");
}

function divideLinear(left: Linear, right: Linear): Linear {
  if (!isConstant(right)) {
    throw new Error("Can only divide by a constant.");
  }

  return scaleLinear(left, Rational.one().divide(right.constant));
}

function scaleLinear(value: Linear, scalar: Rational): Linear {
  return {
    coefficient: value.coefficient.multiply(scalar),
    constant: value.constant.multiply(scalar),
  };
}

function isConstant(value: Linear) {
  return value.coefficient.isZero();
}

function formatEquation(left: Linear, right: Linear) {
  return `${formatLinear(left)} = ${formatLinear(right)}`;
}

function formatLinear(value: Linear) {
  const coefficient = value.coefficient;
  const constant = value.constant;
  const parts: string[] = [];

  if (!coefficient.isZero()) {
    if (coefficient.isOne()) {
      parts.push("x");
    } else if (coefficient.isNegativeOne()) {
      parts.push("-x");
    } else {
      parts.push(`${coefficient.format()}x`);
    }
  }

  if (!constant.isZero()) {
    if (parts.length === 0) {
      parts.push(constant.format());
    } else if (constant.isNegative()) {
      parts.push(`- ${constant.abs().format()}`);
    } else {
      parts.push(`+ ${constant.format()}`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "0";
}

function operationPhrase(value: Rational, suffix = "") {
  const formatted = `${value.abs().format()}${suffix}`;
  if (value.isNegative()) {
    return `Subtract ${formatted}`;
  }
  return `Add ${formatted}`;
}

function dividePhrase(value: Rational) {
  if (value.isOne()) {
    return "Divide by 1";
  }

  return `Divide by ${value.format()}`;
}

function simplifySquareRoot(value: number) {
  const factor = largestPerfectSquareFactor(value);
  const remaining = value / factor;
  const rootFactor = Math.sqrt(factor);

  if (remaining === 1) {
    return String(rootFactor);
  }

  if (factor === 1) {
    return `sqrt(${value})`;
  }

  return `${rootFactor}sqrt(${remaining})`;
}

function largestPerfectSquareFactor(value: number) {
  for (let candidate = Math.floor(Math.sqrt(value)); candidate >= 1; candidate -= 1) {
    const square = candidate * candidate;
    if (value % square === 0) {
      return square;
    }
  }

  return 1;
}

function normalizeInput(input: string) {
  return input
    .trim()
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/²/g, "^2");
}

function prettifyRawEquation(input: string) {
  return input.replace("=", " = ");
}

function statement(text: string): MathStatement {
  return {
    text: text.replace(/\+\/-/g, "+/-"),
    latex: text,
  };
}

function unsupported(input: string, explanation: string): SolveTrace {
  return {
    input,
    title: "Unsupported problem",
    topic: "Not yet implemented",
    course: "algebra1",
    standardCodes: [],
    steps: [],
    result: {
      kind: "unsupported",
      explanation,
    },
  };
}

function gcd(a: number, b: number): number {
  let left = a;
  let right = b;
  while (right !== 0) {
    const next = left % right;
    left = right;
    right = next;
  }
  return left || 1;
}
