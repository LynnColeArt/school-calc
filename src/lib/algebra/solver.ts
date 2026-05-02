import type { MathStatement, SolveStep, SolveTrace } from "./types";

type Linear = {
  coefficient: Rational;
  constant: Rational;
};

type Polynomial = {
  squareCoefficient: Rational;
  coefficient: Rational;
  constant: Rational;
};

type RadicalTerm = {
  coefficient: number;
  radicand: number;
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
    "This version supports linear equations, square equations shaped like ax^2 + c = d, square-root equations with a linear radicand, and square-root simplification.",
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
        operation: bothSidesOperation(workingRight.coefficient.negate(), "x"),
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
        operation: bothSidesOperation(workingLeft.constant.negate()),
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
    const coefficient = workingLeft.coefficient;
    if (!coefficient.isOne()) {
      const after = statement(`x = ${solution.format()}`);
      steps.push({
        before: previous,
        after,
        operation: `${dividePhrase(coefficient)} on both sides`,
        reason:
          "Dividing both sides by the same nonzero number creates an equivalent equation.",
        rule: "linear.divideCoefficient",
        standardCodes: ["A1.REI.A.1"],
      });
    }

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
  if (!input.includes("=") || !input.includes("^2")) {
    return null;
  }

  const [leftRaw, rightRaw, extra] = input.split("=");
  if (extra !== undefined || leftRaw === undefined || rightRaw === undefined) {
    return null;
  }

  try {
    const left = parsePolynomial(leftRaw);
    const right = parsePolynomial(rightRaw);
    let workingLeft = left;
    let workingRight = right;
    const normalizedEquation = formatPolynomialEquation(workingLeft, workingRight);
    const needsSimplification = normalizeInput(normalizedEquation) !== input;
    const steps: SolveStep[] = [];
    let previous = statement(
      needsSimplification ? prettifyRawEquation(input) : normalizedEquation,
    );

    if (needsSimplification) {
      const after = statement(normalizedEquation);
      steps.push({
        before: previous,
        after,
        operation: "Simplify each side",
        reason:
          "Rewriting each side in equivalent simplified form keeps the same solution set.",
        rule: "square.simplify",
        standardCodes: ["A1.REI.A.1", "A1.SSE.A.2"],
      });
      previous = after;
    }

    if (!workingRight.squareCoefficient.isZero()) {
      const newLeft: Polynomial = {
        squareCoefficient: workingLeft.squareCoefficient.subtract(
          workingRight.squareCoefficient,
        ),
        coefficient: workingLeft.coefficient,
        constant: workingLeft.constant,
      };
      const newRight: Polynomial = {
        squareCoefficient: Rational.zero(),
        coefficient: workingRight.coefficient,
        constant: workingRight.constant,
      };
      const after = statement(formatPolynomialEquation(newLeft, newRight));
      steps.push({
        before: previous,
        after,
        operation: bothSidesOperation(
          workingRight.squareCoefficient.negate(),
          "x^2",
        ),
        reason:
          "Adding or subtracting the same square term on both sides creates an equivalent equation.",
        rule: "square.moveSquareTerms",
        standardCodes: ["A1.REI.A.1"],
      });
      workingLeft = newLeft;
      workingRight = newRight;
      previous = after;
    }

    const combinedLinearCoefficient = workingLeft.coefficient.subtract(
      workingRight.coefficient,
    );
    if (!combinedLinearCoefficient.isZero()) {
      return null;
    }

    if (!workingLeft.coefficient.isZero() || !workingRight.coefficient.isZero()) {
      return null;
    }

    if (!workingLeft.constant.isZero()) {
      const newLeft: Polynomial = {
        squareCoefficient: workingLeft.squareCoefficient,
        coefficient: Rational.zero(),
        constant: Rational.zero(),
      };
      const newRight: Polynomial = {
        squareCoefficient: Rational.zero(),
        coefficient: Rational.zero(),
        constant: workingRight.constant.subtract(workingLeft.constant),
      };
      const after = statement(formatPolynomialEquation(newLeft, newRight));
      steps.push({
        before: previous,
        after,
        operation: bothSidesOperation(workingLeft.constant.negate()),
        reason:
          "Adding or subtracting the same constant on both sides creates an equivalent equation.",
        rule: "square.moveConstants",
        standardCodes: ["A1.REI.A.1"],
      });
      workingLeft = newLeft;
      workingRight = newRight;
      previous = after;
    }

    if (workingLeft.squareCoefficient.isZero()) {
      return null;
    }

    if (!workingLeft.squareCoefficient.isOne()) {
      const newRight: Polynomial = {
        squareCoefficient: Rational.zero(),
        coefficient: Rational.zero(),
        constant: workingRight.constant.divide(workingLeft.squareCoefficient),
      };
      const newLeft: Polynomial = {
        squareCoefficient: Rational.one(),
        coefficient: Rational.zero(),
        constant: Rational.zero(),
      };
      const after = statement(formatPolynomialEquation(newLeft, newRight));
      steps.push({
        before: previous,
        after,
        operation: `${dividePhrase(workingLeft.squareCoefficient)} on both sides`,
        reason:
          "Dividing both sides by the same nonzero number creates an equivalent equation.",
        rule: "square.divideCoefficient",
        standardCodes: ["A1.REI.A.1"],
      });
      workingLeft = newLeft;
      workingRight = newRight;
      previous = after;
    }

    const radicand = workingRight.constant;
    if (radicand.denominator !== 1) {
      return null;
    }

    const squareRootSteps = buildSquareRootPropertySteps(
      previous,
      radicand.numerator,
    );

    return {
      input,
      title: "Square equation",
      topic: "Square root property",
      course: "algebra1",
      standardCodes: ["A1.REI.A.2", "A1.NQ.A.2"],
      steps: [...steps, ...squareRootSteps.steps],
      result: {
        kind: "solution",
        value: squareRootSteps.result,
      },
    };
  } catch {
    return null;
  }
}

function buildSquareRootPropertySteps(
  previous: MathStatement,
  value: number,
): { steps: SolveStep[]; result: string } {
  if (value === 0) {
    const after = statement("x = 0");
    return {
      steps: [
        {
          before: previous,
          after,
          operation: "Take the square root of both sides",
          reason: "Zero has only one square root, so x equals 0.",
          rule: "square.zeroRoot",
          standardCodes: ["A1.REI.A.2"],
        },
      ],
      result: "x = 0",
    };
  }

  if (value < 0) {
    return {
      steps: [
        {
          before: previous,
          after: statement("no real solution"),
          operation: "Compare to squares of real numbers",
          reason:
            "A real number squared cannot be negative, so there is no real solution.",
          rule: "square.noRealSolution",
          standardCodes: ["A1.REI.A.2"],
        },
      ],
      result: "no real solution",
    };
  }

  const first = statement(`x = +/-sqrt(${value})`);
  const steps: SolveStep[] = [
    {
      before: previous,
      after: first,
      operation: "Take the square root of both sides",
      reason:
        "The square root property gives two possible real values when x squared equals a positive number.",
      rule: "square.squareRootProperty",
      standardCodes: ["A1.REI.A.2"],
    },
  ];

  const simplified = simplifySquareRoot(value);
  let current = first;
  if (simplified !== `sqrt(${value})`) {
    const second = statement(`x = +/-${simplified}`);
    steps.push({
      before: first,
      after: second,
      operation: "Simplify the square root",
      reason: "Rewrite the radical using perfect-square factors when possible.",
      rule: "radical.simplify",
      standardCodes: ["A1.NQ.A.2"],
    });
    current = second;
  }

  const finalValue = `x = ${simplified} or x = -${simplified}`;
  steps.push({
    before: current,
    after: statement(finalValue),
    operation: "Write both solutions",
    reason: "Both the positive and negative values square to the same number.",
    rule: "square.writeSolutions",
    standardCodes: ["A1.REI.A.2"],
  });

  return { steps, result: finalValue };
}

function trySolveSquareRootEquation(input: string): SolveTrace | null {
  if (!input.includes("=")) {
    return null;
  }

  const [leftRaw, rightRaw, extra] = input.split("=");
  if (extra !== undefined || leftRaw === undefined || rightRaw === undefined) {
    return null;
  }

  const radicandRaw = extractSquareRootContent(leftRaw);
  if (radicandRaw === null) {
    return null;
  }

  try {
    const radicand = parseLinear(radicandRaw);
    const right = parseLinear(rightRaw);

    if (right.coefficient.isZero()) {
      return solveSquareRootEqualsConstant(input, radicand, right.constant);
    }

    if (!right.coefficient.abs().isOne()) {
      return null;
    }

    return solveSquareRootEqualsLinear(input, radicand, right);
  } catch {
    return null;
  }
}

function solveSquareRootEqualsConstant(
  input: string,
  radicand: Linear,
  value: Rational,
): SolveTrace | null {
  if (value.denominator !== 1) {
    return null;
  }

  if (value.isNegative()) {
    return noRealSquareRootSolution(input);
  }

  const squared = new Rational(value.numerator * value.numerator);
  const radicandText = formatLinear(radicand);
  const first = statement(`${radicandText} = ${squared.format()}`);
  const steps: SolveStep[] = [
    {
      before: statement(input),
      after: first,
      operation: "Square both sides",
      reason:
        "Squaring both sides undoes the square root, but the solution should be checked.",
      rule: "sqrt.squareBothSides",
      standardCodes: ["A1.REI.A.1", "A1.NQ.A.2"],
    },
  ];

  const linearTrace = trySolveLinearEquation(`${radicandText}=${squared.format()}`);
  if (linearTrace?.result.kind !== "solution" || linearTrace.result.value === undefined) {
    return null;
  }

  steps.push(...linearTrace.steps);

  const solution = extractSingleVariableSolution(linearTrace.result.value);
  if (solution === null) {
    return null;
  }

  steps.push(buildSolutionCheckStep(radicand, solution, rightConstantStatement(value)));

  return {
    input,
    title: "Square-root equation",
    topic: "Square both sides",
    course: "algebra1",
    standardCodes: ["A1.NQ.A.2", "A1.REI.A.1"],
    steps,
    result: {
      kind: "solution",
      value: linearTrace.result.value,
    },
  };
}

function solveSquareRootEqualsLinear(
  input: string,
  left: Linear,
  right: Linear,
): SolveTrace | null {
  const squaredRight = squareLinear(right);
  const leftAsPolynomial = linearToPolynomial(left);
  const standardPolynomial = subtractPolynomial(squaredRight, leftAsPolynomial);

  if (!standardPolynomial.squareCoefficient.isOne()) {
    return null;
  }

  const factors = factorMonicPolynomial(standardPolynomial);
  if (factors === null) {
    return null;
  }

  const steps: SolveStep[] = [];
  const squaredStatement = statement(
    `${formatLinear(left)} = ${formatPolynomial(squaredRight)}`,
  );
  steps.push({
    before: statement(input),
    after: squaredStatement,
    operation: "Square both sides",
    reason:
      "Squaring both sides removes the square root, but any resulting solutions must be checked.",
    rule: "sqrt.squareBothSidesLinear",
    standardCodes: ["A1.REI.A.1", "A1.NQ.A.2"],
  });

  const standardForm = `${formatPolynomial(standardPolynomial)} = 0`;
  steps.push({
    before: squaredStatement,
    after: statement(standardForm),
    operation: "Move all terms to one side",
    reason:
      "Writing the equation in standard quadratic form makes it easier to solve.",
    rule: "sqrt.standardForm",
    standardCodes: ["A1.REI.A.1", "A1.REI.A.2"],
  });

  const factoredForm = `${formatBinomialFactor(factors.left)}${formatBinomialFactor(
    factors.right,
  )} = 0`;
  steps.push({
    before: statement(standardForm),
    after: statement(factoredForm),
    operation: "Factor the quadratic",
    reason:
      "Two numbers whose sum is the x-coefficient and whose product is the constant term give the factorization.",
    rule: "quadratic.factor",
    standardCodes: ["A1.SSE.A.2", "A1.REI.A.2"],
  });

  const candidates = uniqueRationals([
    new Rational(-factors.left),
    new Rational(-factors.right),
  ]);
  const candidateStatement = formatSolutionSet(candidates);
  steps.push({
    before: statement(factoredForm),
    after: statement(candidateStatement),
    operation: "Use the zero product property",
    reason:
      "If a product is zero, then at least one factor must be zero.",
    rule: "quadratic.zeroProduct",
    standardCodes: ["A1.REI.A.2"],
  });

  const validSolutions: Rational[] = [];
  let previous = statement(candidateStatement);
  for (const candidate of candidates) {
    const checkText = formatSquareRootEquationCheck(left, right, candidate);
    const valid = isValidSquareRootSolution(left, right, candidate);
    const afterText = valid
      ? `check ${formatCandidate(candidate)}: ${checkText} works`
      : `check ${formatCandidate(candidate)}: ${checkText} is false, so reject it`;
    const after = statement(afterText);
    steps.push({
      before: previous,
      after,
      operation: "Check the candidate",
      reason:
        "Squaring can introduce extraneous solutions, so each candidate must satisfy the original equation.",
      rule: "sqrt.checkCandidate",
      standardCodes: ["A1.REI.A.1"],
    });
    if (valid) {
      validSolutions.push(candidate);
    }
    previous = after;
  }

  const finalValue =
    validSolutions.length > 0 ? formatSolutionSet(validSolutions) : "no real solution";
  steps.push({
    before: previous,
    after: statement(finalValue),
    operation: "Keep only the valid solution",
    reason:
      validSolutions.length > 0
        ? "Only values that make the original square-root equation true remain."
        : "Every candidate failed the original equation, so no real solution remains.",
    rule: "sqrt.finalize",
    standardCodes: ["A1.REI.A.1"],
  });

  return {
    input,
    title: "Square-root equation",
    topic: "Extraneous solution check",
    course: "algebra1",
    standardCodes: ["A1.NQ.A.2", "A1.REI.A.1", "A1.REI.A.2"],
    steps,
    result: {
      kind: "solution",
      value: finalValue,
    },
  };
}

function trySolveRadicalSimplification(input: string): SolveTrace | null {
  if (input.includes("=")) {
    return null;
  }

  const terms = parseRadicalTerms(input);
  if (terms === null) {
    return null;
  }

  if (terms.length === 1) {
    const singleTrace = trySolveSingleRadicalSimplification(input, terms[0]);
    if (singleTrace) {
      return singleTrace;
    }
  }

  const simplifiedTerms = terms.map(simplifyRadicalTerm);
  const simplifiedExpression = formatRadicalExpression(simplifiedTerms);
  const combinedTerms = combineRadicalTerms(simplifiedTerms);
  const combinedExpression = formatRadicalExpression(combinedTerms);
  const steps: SolveStep[] = [];
  let previous = statement(prettifyRadicalInput(input));

  if (simplifiedExpression !== previous.text) {
    const after = statement(simplifiedExpression);
    steps.push({
      before: previous,
      after,
      operation: "Simplify each radical",
      reason:
        "Factor out perfect squares so each radical is written in simplest form.",
      rule: "radical.simplifyTerms",
      standardCodes: ["A1.NQ.A.2"],
    });
    previous = after;
  }

  if (combinedExpression !== previous.text) {
    const after = statement(combinedExpression);
    steps.push({
      before: previous,
      after,
      operation: "Combine like radicals",
      reason:
        "Radicals with the same radicand act like like terms and their coefficients can be combined.",
      rule: "radical.combineLikeTerms",
      standardCodes: ["A1.NQ.A.2"],
    });
    previous = after;
  }

  return {
    input,
    title: "Square-root simplification",
    topic: "Radicals",
    course: "algebra1",
    standardCodes: ["A1.NQ.A.2"],
    steps,
    result: {
      kind: "solution",
      value: combinedExpression,
    },
  };
}

function trySolveSingleRadicalSimplification(
  input: string,
  term: RadicalTerm,
): SolveTrace | null {
  const factor = largestPerfectSquareFactor(term.radicand);
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
        value: formatRadicalExpression([term]),
      },
    };
  }

  const remaining = term.radicand / factor;
  const rootFactor = Math.sqrt(factor);
  const simplifiedTerm = simplifyRadicalTerm(term);
  const first = statement(
    `${formatRadicalCoefficient(term.coefficient)}sqrt(${factor} * ${remaining})`,
  );
  const second = statement(
    term.coefficient === 1
      ? `sqrt(${factor}) * sqrt(${remaining})`
      : `${term.coefficient} * sqrt(${factor}) * sqrt(${remaining})`,
  );
  const third = statement(formatRadicalExpression([simplifiedTerm]));

  return {
    input,
    title: "Square-root simplification",
    topic: "Radicals",
    course: "algebra1",
    standardCodes: ["A1.NQ.A.2"],
    steps: [
      {
        before: statement(prettifyRadicalInput(input)),
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
      value: third.text,
    },
  };
}

function parseLinear(input: string): Linear {
  const polynomial = parsePolynomial(input);
  if (!polynomial.squareCoefficient.isZero()) {
    throw new Error("Expected a linear expression.");
  }

  return {
    coefficient: polynomial.coefficient,
    constant: polynomial.constant,
  };
}

function parsePolynomial(input: string): Polynomial {
  const parser = new PolynomialParser(tokenize(input));
  return parser.parse();
}

class PolynomialParser {
  private index = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): Polynomial {
    const expression = this.parseExpression();
    if (this.peek()) {
      throw new Error("Unexpected token.");
    }
    return expression;
  }

  private parseExpression(): Polynomial {
    let left = this.parseTerm();

    while (this.matchOperator("+") || this.matchOperator("-")) {
      const operator = this.previous().value;
      const right = this.parseTerm();
      left =
        operator === "+"
          ? addPolynomial(left, right)
          : subtractPolynomial(left, right);
    }

    return left;
  }

  private parseTerm(): Polynomial {
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
      left =
        operator === "/"
          ? dividePolynomial(left, right)
          : multiplyPolynomial(left, right);
    }

    return left;
  }

  private parseFactor(): Polynomial {
    if (this.matchOperator("+")) {
      return this.parseFactor();
    }

    if (this.matchOperator("-")) {
      return negatePolynomial(this.parseFactor());
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
        squareCoefficient: Rational.zero(),
        coefficient: Rational.zero(),
        constant: Rational.fromString(token.value),
      };
    }

    if (token.type === "variable" && token.value === "x") {
      if (this.matchOperator("^")) {
        const exponent = this.advance();
        if (exponent?.type !== "number" || exponent.value !== "2") {
          throw new Error("Only x^2 is supported.");
        }

        return {
          squareCoefficient: Rational.one(),
          coefficient: Rational.zero(),
          constant: Rational.zero(),
        };
      }

      return {
        squareCoefficient: Rational.zero(),
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

function addPolynomial(left: Polynomial, right: Polynomial): Polynomial {
  return {
    squareCoefficient: left.squareCoefficient.add(right.squareCoefficient),
    coefficient: left.coefficient.add(right.coefficient),
    constant: left.constant.add(right.constant),
  };
}

function subtractPolynomial(left: Polynomial, right: Polynomial): Polynomial {
  return {
    squareCoefficient: left.squareCoefficient.subtract(right.squareCoefficient),
    coefficient: left.coefficient.subtract(right.coefficient),
    constant: left.constant.subtract(right.constant),
  };
}

function negatePolynomial(value: Polynomial): Polynomial {
  return {
    squareCoefficient: value.squareCoefficient.negate(),
    coefficient: value.coefficient.negate(),
    constant: value.constant.negate(),
  };
}

function multiplyPolynomial(left: Polynomial, right: Polynomial): Polynomial {
  if (isConstantPolynomial(left)) {
    return scalePolynomial(right, left.constant);
  }

  if (isConstantPolynomial(right)) {
    return scalePolynomial(left, right.constant);
  }

  throw new Error("Nonlinear multiplication is not supported.");
}

function dividePolynomial(left: Polynomial, right: Polynomial): Polynomial {
  if (!isConstantPolynomial(right)) {
    throw new Error("Can only divide by a constant.");
  }

  return scalePolynomial(left, Rational.one().divide(right.constant));
}

function scalePolynomial(value: Polynomial, scalar: Rational): Polynomial {
  return {
    squareCoefficient: value.squareCoefficient.multiply(scalar),
    coefficient: value.coefficient.multiply(scalar),
    constant: value.constant.multiply(scalar),
  };
}

function isConstantPolynomial(value: Polynomial) {
  return value.squareCoefficient.isZero() && value.coefficient.isZero();
}

function linearToPolynomial(value: Linear): Polynomial {
  return {
    squareCoefficient: Rational.zero(),
    coefficient: value.coefficient,
    constant: value.constant,
  };
}

function squareLinear(value: Linear): Polynomial {
  const m = value.coefficient;
  const b = value.constant;
  return {
    squareCoefficient: m.multiply(m),
    coefficient: m.multiply(b).multiply(new Rational(2)),
    constant: b.multiply(b),
  };
}

function formatEquation(left: Linear, right: Linear) {
  return `${formatLinear(left)} = ${formatLinear(right)}`;
}

function formatPolynomialEquation(left: Polynomial, right: Polynomial) {
  return `${formatPolynomial(left)} = ${formatPolynomial(right)}`;
}

function formatPolynomial(value: Polynomial) {
  const squareCoefficient = value.squareCoefficient;
  const parts: string[] = [];

  if (!squareCoefficient.isZero()) {
    parts.push(formatTerm(squareCoefficient, "x^2", parts.length === 0));
  }

  if (!value.coefficient.isZero()) {
    parts.push(formatTerm(value.coefficient, "x", parts.length === 0));
  }

  if (!value.constant.isZero()) {
    parts.push(formatTerm(value.constant, "", parts.length === 0));
  }

  return parts.length > 0 ? parts.join(" ") : "0";
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

function formatTerm(value: Rational, variable: string, first: boolean) {
  const sign = value.isNegative() ? "-" : "+";
  const magnitude = value.abs();
  const body =
    variable && magnitude.isOne()
      ? variable
      : variable
        ? `${magnitude.format()}${variable}`
        : magnitude.format();

  if (first) {
    return value.isNegative() ? `-${body}` : body;
  }

  return `${sign} ${body}`;
}

function formatLinearSubstitution(expression: Linear, value: Rational) {
  const terms: string[] = [];

  if (!expression.coefficient.isZero()) {
    if (expression.coefficient.isOne()) {
      terms.push(value.format());
    } else if (expression.coefficient.isNegativeOne()) {
      terms.push(`-${value.format()}`);
    } else {
      terms.push(`${expression.coefficient.format()}(${value.format()})`);
    }
  }

  if (!expression.constant.isZero()) {
    terms.push(formatTerm(expression.constant, "", terms.length === 0));
  }

  return terms.join(" ") || "0";
}

function formatCandidate(value: Rational) {
  return `x = ${value.format()}`;
}

function formatSolutionSet(values: Rational[]) {
  if (values.length === 0) {
    return "no real solution";
  }

  if (values.length === 1) {
    return formatCandidate(values[0]);
  }

  return values.map(formatCandidate).join(" or ");
}

function factorMonicPolynomial(value: Polynomial) {
  if (
    !value.squareCoefficient.isOne() ||
    value.coefficient.denominator !== 1 ||
    value.constant.denominator !== 1
  ) {
    return null;
  }

  const linear = value.coefficient.numerator;
  const constant = value.constant.numerator;

  if (constant === 0) {
    return { left: 0, right: linear };
  }

  const limit = Math.abs(constant);
  for (let candidate = 1; candidate <= limit; candidate += 1) {
    for (const sign of [-1, 1]) {
      const left = candidate * sign;
      const right = constant / left;
      if (Number.isInteger(right) && left + right === linear) {
        return { left, right };
      }
    }
  }

  return null;
}

function formatBinomialFactor(constant: number) {
  if (constant === 0) {
    return "(x)";
  }

  if (constant > 0) {
    return `(x + ${constant})`;
  }

  return `(x - ${Math.abs(constant)})`;
}

function operationPhrase(value: Rational, suffix = "") {
  const formatted = `${value.abs().format()}${suffix}`;
  if (value.isNegative()) {
    return `Subtract ${formatted}`;
  }
  return `Add ${formatted}`;
}

function bothSidesOperation(value: Rational, suffix = "") {
  return `${operationPhrase(value, suffix)} ${
    value.isNegative() ? "from" : "to"
  } both sides`;
}

function dividePhrase(value: Rational) {
  if (value.isOne()) {
    return "Divide by 1";
  }

  return `Divide by ${value.format()}`;
}

function simplifySquareRoot(value: number) {
  if (value === 0) {
    return "0";
  }

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

function extractSquareRootContent(value: string) {
  const paren = value.match(/^sqrt\((.+)\)$/);
  if (paren?.[1] !== undefined) {
    return paren[1];
  }

  if (value === "√x") {
    return "x";
  }

  return null;
}

function noRealSquareRootSolution(input: string): SolveTrace {
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

function extractSingleVariableSolution(value: string) {
  const match = value.match(/^x = (-?\d+(?:\/\d+)?)$/);
  return match?.[1] ? Rational.fromString(match[1]) : null;
}

function rightConstantStatement(value: Rational) {
  return value.format();
}

function buildSolutionCheckStep(
  left: Linear,
  solution: Rational,
  rightText: string,
): SolveStep {
  return {
    before: statement(formatCandidate(solution)),
    after: statement(`sqrt(${formatLinearSubstitution(left, solution)}) = ${rightText}`),
    operation: "Check the solution",
    reason:
      "Substituting the value back into the original equation confirms it works.",
    rule: "sqrt.checkSolution",
    standardCodes: ["A1.REI.A.1"],
  };
}

function evaluateLinear(expression: Linear, value: Rational) {
  return expression.coefficient.multiply(value).add(expression.constant);
}

function isValidSquareRootSolution(left: Linear, right: Linear, value: Rational) {
  const leftValue = evaluateLinear(left, value);
  const rightValue = evaluateLinear(right, value);

  if (leftValue.denominator !== 1 || rightValue.denominator !== 1) {
    return false;
  }

  if (leftValue.numerator < 0) {
    return false;
  }

  const root = Math.sqrt(leftValue.numerator);
  if (!Number.isInteger(root)) {
    return false;
  }

  return root === rightValue.numerator;
}

function formatSquareRootEquationCheck(left: Linear, right: Linear, value: Rational) {
  return `sqrt(${formatLinearSubstitution(left, value)}) = ${formatLinearSubstitution(
    right,
    value,
  )}`;
}

function uniqueRationals(values: Rational[]) {
  const unique: Rational[] = [];
  for (const value of values) {
    if (!unique.some((candidate) => candidate.equals(value))) {
      unique.push(value);
    }
  }
  return unique;
}

function parseRadicalTerms(input: string) {
  const matches = input.match(/[+-]?[^+-]+/g);
  if (!matches) {
    return null;
  }

  const terms: RadicalTerm[] = [];
  for (const raw of matches) {
    const cleaned = raw.startsWith("+") ? raw.slice(1) : raw;
    const match = cleaned.match(/^(-?\d*)?(?:sqrt\((\d+)\)|√(\d+))$/);
    if (!match) {
      return null;
    }

    const coefficient = parseOptionalCoefficient(match[1] ?? "");
    const radicand = Number(match[2] ?? match[3]);
    if (Number.isNaN(coefficient) || Number.isNaN(radicand)) {
      return null;
    }

    terms.push({ coefficient, radicand });
  }

  return terms;
}

function simplifyRadicalTerm(term: RadicalTerm): RadicalTerm {
  const factor = largestPerfectSquareFactor(term.radicand);
  const remaining = term.radicand / factor;
  const rootFactor = Math.sqrt(factor);
  return {
    coefficient: term.coefficient * rootFactor,
    radicand: remaining,
  };
}

function combineRadicalTerms(terms: RadicalTerm[]) {
  const order: number[] = [];
  const coefficients = new Map<number, number>();

  for (const term of terms) {
    if (!coefficients.has(term.radicand)) {
      order.push(term.radicand);
      coefficients.set(term.radicand, 0);
    }
    coefficients.set(term.radicand, (coefficients.get(term.radicand) ?? 0) + term.coefficient);
  }

  return order
    .map((radicand) => ({
      coefficient: coefficients.get(radicand) ?? 0,
      radicand,
    }))
    .filter((term) => term.coefficient !== 0);
}

function formatRadicalExpression(terms: RadicalTerm[]) {
  if (terms.length === 0) {
    return "0";
  }

  return terms
    .map((term, index) => formatRadicalTerm(term, index === 0))
    .join(" ");
}

function formatRadicalTerm(term: RadicalTerm, first: boolean) {
  const coefficient = term.coefficient;
  const sign = coefficient < 0 ? "-" : "+";
  const absolute = Math.abs(coefficient);
  const body =
    term.radicand === 1
      ? String(absolute)
      : absolute === 1
        ? `sqrt(${term.radicand})`
        : `${absolute}sqrt(${term.radicand})`;

  if (first) {
    return coefficient < 0 ? `-${body}` : body;
  }

  return `${sign} ${body}`;
}

function prettifyRadicalInput(input: string) {
  return input
    .replace(/\+/g, " + ")
    .replace(/-/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOptionalCoefficient(value: string) {
  if (!value) {
    return 1;
  }

  if (value === "-") {
    return -1;
  }

  return Number(value);
}

function formatRadicalCoefficient(value: number) {
  if (value === 1) {
    return "";
  }

  if (value === -1) {
    return "-";
  }

  return String(value);
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
