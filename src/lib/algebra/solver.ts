import type {
  GraphAnalysis,
  GraphFeature,
  GraphPoint,
  GeometryAnalysis,
  GeometryPoint,
  MathStatement,
  SequenceAnalysis,
  SolveStep,
  SolveTrace,
} from "./types";

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

type RootCandidate = {
  exact: string;
  approx: number;
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
    if (value.includes("/")) {
      const [numerator, denominator, extra] = value.split("/");
      if (
        extra === undefined &&
        numerator !== undefined &&
        denominator !== undefined
      ) {
        return new Rational(Number(numerator), Number(denominator));
      }
    }

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

  const quadraticTrace = trySolveQuadraticEquation(normalizedInput);
  if (quadraticTrace) {
    return quadraticTrace;
  }

  const linearTrace = trySolveLinearEquation(normalizedInput);
  if (linearTrace) {
    return linearTrace;
  }

  return unsupported(
    input,
    "This version supports linear equations, quadratics, square-root equations with a linear radicand, and square-root simplification.",
  );
}

export function analyzeGraph(input: string): GraphAnalysis | null {
  const normalizedInput = normalizeInput(input);
  const [leftRaw, rightRaw, extra] = normalizedInput.split("=");
  if (
    extra !== undefined ||
    leftRaw === undefined ||
    rightRaw === undefined ||
    leftRaw !== "y"
  ) {
    return null;
  }

  try {
    const expression = parsePolynomial(rightRaw);
    if (expression.squareCoefficient.isZero()) {
      return buildLinearGraphAnalysis(expression);
    }

    return buildQuadraticGraphAnalysis(expression);
  } catch {
    return null;
  }
}

export function analyzeSequence(input: string): SequenceAnalysis | null {
  const terms = parseSequenceTerms(input);
  if (terms !== null && terms.length >= 3) {
    const arithmeticDifference = terms[1]?.subtract(terms[0] as Rational);
    const isArithmetic =
      arithmeticDifference !== undefined &&
      terms.slice(1).every((term, index) =>
        term.subtract(terms[index] as Rational).equals(arithmeticDifference),
      );

    const geometricRatio = inferGeometricRatio(terms);
    const isGeometric =
      geometricRatio !== null &&
      terms.slice(1).every((term, index) =>
        term.equals((terms[index] as Rational).multiply(geometricRatio)),
      );

    if (isGeometric && geometricRatio) {
      return buildGeometricSequenceAnalysis(terms, geometricRatio);
    }

    if (isArithmetic && arithmeticDifference) {
      return buildArithmeticSequenceAnalysis(terms, arithmeticDifference);
    }
  }

  const recursiveSequence = parseRecursiveSequence(input);
  if (recursiveSequence !== null) {
    return buildRecursiveSequenceAnalysis(recursiveSequence);
  }

  return null;
}

export function analyzeCoordinateGeometry(input: string): GeometryAnalysis | null {
  const parsed = parseGeometryPoints(input);
  if (parsed === null) {
    return null;
  }

  const [pointA, pointB] = parsed;
  if (!pointA || !pointB) {
    return null;
  }

  const deltaX = pointB.x.subtract(pointA.x);
  const deltaY = pointB.y.subtract(pointA.y);
  const midpointX = pointA.x.add(pointB.x).divide(new Rational(2));
  const midpointY = pointA.y.add(pointB.y).divide(new Rational(2));
  const squaredDistance = deltaX.multiply(deltaX).add(deltaY.multiply(deltaY));
  const distance = formatPositiveSquareRoot(squaredDistance);
  const points: GeometryPoint[] = [
    {
      x: rationalToNumber(pointA.x),
      y: rationalToNumber(pointA.y),
      label: `${pointA.label}${formatCoordinate(pointA.x.format(), pointA.y.format())}`,
      role: "point",
    },
    {
      x: rationalToNumber(pointB.x),
      y: rationalToNumber(pointB.y),
      label: `${pointB.label}${formatCoordinate(pointB.x.format(), pointB.y.format())}`,
      role: "point",
    },
    {
      x: rationalToNumber(midpointX),
      y: rationalToNumber(midpointY),
      label: `M${formatCoordinate(midpointX.format(), midpointY.format())}`,
      role: "midpoint",
    },
  ];
  const steps = [
    {
      math: `${pointA.label}${formatCoordinate(pointA.x.format(), pointA.y.format())}, ${pointB.label}${formatCoordinate(pointB.x.format(), pointB.y.format())}`,
      note: "Start with the two given points.",
    },
    {
      math: `delta x = ${pointB.x.format()} - ${pointA.x.format()} = ${deltaX.format()}, delta y = ${pointB.y.format()} - ${pointA.y.format()} = ${deltaY.format()}`,
      note: "Find the horizontal and vertical changes between the points.",
    },
  ];

  if (deltaX.isZero()) {
    const lineEquation = `x = ${pointA.x.format()}`;
    steps.push(
      {
        math: `${pointA.x.format()} = ${pointB.x.format()}`,
        note: "The x-coordinates match, so the line is vertical and the slope is undefined.",
      },
      {
        math: `M = ${formatCoordinate(midpointX.format(), midpointY.format())}`,
        note: "Average the x-coordinates and y-coordinates to find the midpoint.",
      },
      {
        math: `d = sqrt((${deltaX.format()})^2 + (${deltaY.format()})^2) = ${distance}`,
        note: "Use the distance formula.",
      },
      {
        math: lineEquation,
        note: "A vertical line through both points has a constant x-value.",
      },
    );

    return {
      title: "Coordinate geometry",
      topic: "Two-point geometry",
      summary: "Slope, midpoint, distance, and the line through two points",
      standardCodes: ["G.GPE.B.5", "G.GPE.B.6", "G.GPE.B.7"],
      features: [
        {
          label: "Slope",
          value: "undefined",
        },
        {
          label: "Midpoint",
          value: formatCoordinate(midpointX.format(), midpointY.format()),
        },
        {
          label: "Distance",
          value: distance,
        },
        {
          label: "Line equation",
          value: lineEquation,
        },
      ],
      steps,
      points,
      line: {
        kind: "vertical",
        x: rationalToNumber(pointA.x),
      },
      window: buildPointWindow(points),
    };
  }

  const slope = deltaY.divide(deltaX);
  const intercept = pointA.y.subtract(slope.multiply(pointA.x));
  const pointSlopeForm = formatPointSlopeEquation(pointA.y, slope, pointA.x);
  const slopeInterceptForm = `y = ${formatLinear({
    coefficient: slope,
    constant: intercept,
  })}`;
  steps.push(
    {
      math: `m = (${pointB.y.format()} - ${pointA.y.format()}) / (${pointB.x.format()} - ${pointA.x.format()}) = ${deltaY.format()}/${deltaX.format()} = ${slope.format()}`,
      note: "Use rise over run to find the slope.",
    },
    {
      math: `M = ${formatCoordinate(midpointX.format(), midpointY.format())}`,
      note: "Average the x-coordinates and y-coordinates to find the midpoint.",
    },
    {
      math: `d = sqrt((${deltaX.format()})^2 + (${deltaY.format()})^2) = ${distance}`,
      note: "Use the distance formula.",
    },
    {
      math: pointSlopeForm,
      note: "Write the line in point-slope form using one point and the slope.",
    },
    {
      math: slopeInterceptForm,
      note: "Rewrite the line in slope-intercept form.",
    },
  );

  return {
    title: "Coordinate geometry",
    topic: "Two-point geometry",
    summary: "Slope, midpoint, distance, and the line through two points",
    standardCodes: ["G.GPE.B.5", "G.GPE.B.6", "G.GPE.B.7"],
    features: [
      {
        label: "Slope",
        value: slope.format(),
      },
      {
        label: "Midpoint",
        value: formatCoordinate(midpointX.format(), midpointY.format()),
      },
      {
        label: "Distance",
        value: distance,
      },
      {
        label: "Point-slope form",
        value: pointSlopeForm,
      },
      {
        label: "Slope-intercept form",
        value: slopeInterceptForm,
      },
    ],
    steps,
    points,
    line: {
      kind: "regular",
      slope: rationalToNumber(slope),
      intercept: rationalToNumber(intercept),
    },
    window: buildPointWindow(points),
  };
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

function buildLinearGraphAnalysis(expression: Polynomial): GraphAnalysis {
  const slope = expression.coefficient;
  const yIntercept = expression.constant;
  const yText = formatPolynomial(expression);
  const features: GraphFeature[] = [
    { label: "Slope", value: slope.format() },
    { label: "y-intercept", value: formatCoordinate("0", yIntercept.format()) },
  ];

  const highlightedPoints: GraphPoint[] = [
    {
      x: 0,
      y: rationalToNumber(yIntercept),
      label: formatCoordinate("0", yIntercept.format()),
      role: "intercept",
    },
  ];

  if (slope.isZero()) {
    features.push({ label: "x-intercept", value: "none" });
    features.push({ label: "Domain", value: "all real numbers" });
    features.push({ label: "Range", value: `y = ${yIntercept.format()}` });
  } else {
    const xIntercept = yIntercept.negate().divide(slope);
    features.push({
      label: "x-intercept",
      value: formatCoordinate(xIntercept.format(), "0"),
    });
    features.push({ label: "Domain", value: "all real numbers" });
    features.push({ label: "Range", value: "all real numbers" });
    highlightedPoints.push({
      x: rationalToNumber(xIntercept),
      y: 0,
      label: formatCoordinate(xIntercept.format(), "0"),
      role: "intercept",
    });
  }

  const tableInputs = [new Rational(-2), Rational.zero(), new Rational(2)];
  const table = tableInputs.map((xValue) => ({
    x: xValue.format(),
    y: evaluatePolynomialAtRational(expression, xValue).format(),
  }));

  const window = buildGraphWindow(
    highlightedPoints,
    tableInputs.map((xValue) => ({
      x: rationalToNumber(xValue),
      y: rationalToNumber(evaluatePolynomialAtRational(expression, xValue)),
      label: formatCoordinate(
        xValue.format(),
        evaluatePolynomialAtRational(expression, xValue).format(),
      ),
      role: "sample" as const,
    })),
  );

  return {
    kind: "linear",
    title: "Linear function",
    topic: "Graphing",
    equation: `y = ${yText}`,
    summary: "Slope, intercepts, and a value table",
    standardCodes: ["A1.FIF.B.4", "A1.FIF.B.6"],
    features,
    table,
    highlightedPoints,
    coefficients: {
      a: 0,
      b: rationalToNumber(slope),
      c: rationalToNumber(yIntercept),
    },
    window,
  };
}

function buildQuadraticGraphAnalysis(expression: Polynomial): GraphAnalysis {
  const vertexX = expression.coefficient
    .negate()
    .divide(expression.squareCoefficient.multiply(new Rational(2)));
  const vertexY = evaluatePolynomialAtRational(expression, vertexX);
  const integerForm = toIntegerQuadratic(expression);
  const discriminant =
    integerForm.b * integerForm.b - 4 * integerForm.a * integerForm.c;
  const rootCandidates =
    discriminant < 0
      ? []
      : buildQuadraticFormulaCandidates(
          integerForm.a,
          integerForm.b,
          discriminant,
        );
  const features: GraphFeature[] = [
    { label: "Vertex", value: formatCoordinate(vertexX.format(), vertexY.format()) },
    { label: "Axis of symmetry", value: `x = ${vertexX.format()}` },
    {
      label: "Opening",
      value: expression.squareCoefficient.isNegative() ? "down" : "up",
    },
    {
      label: "y-intercept",
      value: formatCoordinate("0", expression.constant.format()),
    },
  ];

  if (rootCandidates.length === 0) {
    features.push({ label: "x-intercepts", value: "no real intercepts" });
  } else if (rootCandidates.length === 1) {
    features.push({
      label: "x-intercept",
      value: formatCoordinate(rootCandidates[0].exact, "0"),
    });
  } else {
    features.push({
      label: "x-intercepts",
      value: rootCandidates
        .map((candidate) => formatCoordinate(candidate.exact, "0"))
        .join(", "),
    });
  }

  features.push({ label: "Domain", value: "all real numbers" });
  features.push({
    label: "Range",
    value: expression.squareCoefficient.isNegative()
      ? `y <= ${vertexY.format()}`
      : `y >= ${vertexY.format()}`,
  });

  const highlightedPoints: GraphPoint[] = dedupeGraphPoints([
    {
      x: rationalToNumber(vertexX),
      y: rationalToNumber(vertexY),
      label: formatCoordinate(vertexX.format(), vertexY.format()),
      role: "vertex",
    },
    {
      x: 0,
      y: rationalToNumber(expression.constant),
      label: formatCoordinate("0", expression.constant.format()),
      role: "intercept",
    },
    ...rootCandidates.map((candidate) => ({
      x: candidate.approx,
      y: 0,
      label: formatCoordinate(candidate.exact, "0"),
      role: "intercept" as const,
    })),
  ]);

  const tableInputs = [
    vertexX.subtract(new Rational(2)),
    vertexX.subtract(new Rational(1)),
    vertexX,
    vertexX.add(new Rational(1)),
    vertexX.add(new Rational(2)),
  ];
  const table = tableInputs.map((xValue) => ({
    x: xValue.format(),
    y: evaluatePolynomialAtRational(expression, xValue).format(),
  }));

  const window = buildGraphWindow(
    highlightedPoints,
    tableInputs.map((xValue) => ({
      x: rationalToNumber(xValue),
      y: rationalToNumber(evaluatePolynomialAtRational(expression, xValue)),
      label: formatCoordinate(
        xValue.format(),
        evaluatePolynomialAtRational(expression, xValue).format(),
      ),
      role: "sample" as const,
    })),
  );

  return {
    kind: "quadratic",
    title: "Quadratic function",
    topic: "Graphing",
    equation: `y = ${formatPolynomial(expression)}`,
    summary: "Vertex, intercepts, axis of symmetry, and a value table",
    standardCodes: ["A1.FIF.B.4", "A1.FIF.B.6"],
    features,
    table,
    highlightedPoints,
    coefficients: {
      a: rationalToNumber(expression.squareCoefficient),
      b: rationalToNumber(expression.coefficient),
      c: rationalToNumber(expression.constant),
    },
    window,
  };
}

function buildArithmeticSequenceAnalysis(
  terms: Rational[],
  difference: Rational,
): SequenceAnalysis {
  const firstTerm = terms[0] as Rational;
  const recursiveRule = formatArithmeticRecursiveRule(firstTerm, difference);
  const explicitRule = formatArithmeticExplicitRule(firstTerm, difference);
  const steps = [
    {
      math: formatSequenceTerms(terms),
      note: "Start with the given terms.",
    },
    {
      math: formatArithmeticDifferences(terms),
      note: "Compare consecutive terms by subtraction.",
    },
    {
      math: `common difference = ${difference.format()}`,
      note: "The difference stays constant, so the sequence is arithmetic.",
    },
    {
      math: recursiveRule,
      note: "Write the recursive rule using the common difference.",
    },
    {
      math: explicitRule,
      note: "Write the explicit rule from the first term and common difference.",
    },
  ];

  return {
    kind: "arithmetic",
    title: "Arithmetic sequence",
    topic: "Sequences",
    summary: "Recursive rule, explicit rule, and next terms",
    standardCodes: ["A1.LQE.A", "A1.LQE.B"],
    features: [
      { label: "Type", value: "arithmetic" },
      { label: "Common difference", value: difference.format() },
      { label: "Recursive rule", value: recursiveRule },
      { label: "Explicit rule", value: explicitRule },
    ],
    steps,
    table: buildSequenceTable(terms, (current) => current.add(difference)),
  };
}

function buildGeometricSequenceAnalysis(
  terms: Rational[],
  ratio: Rational,
): SequenceAnalysis {
  const firstTerm = terms[0] as Rational;
  const recursiveRule = formatGeometricRecursiveRule(firstTerm, ratio);
  const explicitRule = formatGeometricExplicitRule(firstTerm, ratio);
  const steps = [
    {
      math: formatSequenceTerms(terms),
      note: "Start with the given terms.",
    },
    {
      math: formatGeometricRatios(terms),
      note: "Compare consecutive terms by division.",
    },
    {
      math: `common ratio = ${ratio.format()}`,
      note: "The ratio stays constant, so the sequence is geometric.",
    },
    {
      math: recursiveRule,
      note: "Write the recursive rule using the common ratio.",
    },
    {
      math: explicitRule,
      note: "Write the explicit rule from the first term and common ratio.",
    },
  ];

  return {
    kind: "geometric",
    title: "Geometric sequence",
    topic: "Sequences",
    summary: "Recursive rule, explicit rule, and next terms",
    standardCodes: ["A1.LQE.A", "A1.LQE.B"],
    features: [
      { label: "Type", value: "geometric" },
      { label: "Common ratio", value: ratio.format() },
      { label: "Recursive rule", value: recursiveRule },
      { label: "Explicit rule", value: explicitRule },
    ],
    steps,
    table: buildSequenceTable(terms, (current) => current.multiply(ratio)),
  };
}

function buildRecursiveSequenceAnalysis(recursive: {
  coefficient: Rational;
  constant: Rational;
  firstTerm: Rational;
}): SequenceAnalysis {
  const terms = buildRecursiveSequenceTerms(
    recursive.firstTerm,
    recursive.coefficient,
    recursive.constant,
    7,
  );
  const recursiveRule = formatRecursiveSequenceRule(
    recursive.coefficient,
    recursive.constant,
    recursive.firstTerm,
  );
  const steps = [
    {
      math: recursiveRule,
      note: "Start with the recursive rule and initial term.",
    },
    ...terms.slice(1, 4).map((term, index) => ({
      math: formatRecursiveSequenceStep(
        index + 2,
        terms[index] as Rational,
        recursive.coefficient,
        recursive.constant,
        term,
      ),
      note: "Use the previous term in the recursive rule.",
    })),
  ];

  if (recursive.coefficient.isOne()) {
    return {
      kind: "arithmetic",
      title: "Arithmetic sequence",
      topic: "Sequences",
      summary: "Recursive rule, explicit rule, and generated terms",
      standardCodes: ["A1.LQE.A", "A1.LQE.B"],
      features: [
        { label: "Type", value: "arithmetic" },
        { label: "Common difference", value: recursive.constant.format() },
        { label: "Recursive rule", value: recursiveRule },
        {
          label: "Explicit rule",
          value: formatArithmeticExplicitRule(
            recursive.firstTerm,
            recursive.constant,
          ),
        },
      ],
      steps: [
        ...steps,
        {
          math: formatArithmeticExplicitRule(
            recursive.firstTerm,
            recursive.constant,
          ),
          note: "This recursive arithmetic sequence also has an explicit rule.",
        },
      ],
      table: buildSequenceTableFromTerms(terms, 1),
    };
  }

  if (recursive.constant.isZero()) {
    return {
      kind: "geometric",
      title: "Geometric sequence",
      topic: "Sequences",
      summary: "Recursive rule, explicit rule, and generated terms",
      standardCodes: ["A1.LQE.A", "A1.LQE.B"],
      features: [
        { label: "Type", value: "geometric" },
        { label: "Common ratio", value: recursive.coefficient.format() },
        { label: "Recursive rule", value: recursiveRule },
        {
          label: "Explicit rule",
          value: formatGeometricExplicitRule(
            recursive.firstTerm,
            recursive.coefficient,
          ),
        },
      ],
      steps: [
        ...steps,
        {
          math: formatGeometricExplicitRule(
            recursive.firstTerm,
            recursive.coefficient,
          ),
          note: "This recursive geometric sequence also has an explicit rule.",
        },
      ],
      table: buildSequenceTableFromTerms(terms, 1),
    };
  }

  return {
    kind: "recursive",
    title: "Recursive sequence",
    topic: "Sequences",
    summary: "Recursive rule and generated terms",
    standardCodes: ["A1.LQE.A", "A1.LQE.B"],
    features: [
      { label: "Type", value: "recursive" },
      { label: "Recursive rule", value: recursiveRule },
      { label: "Multiplier", value: recursive.coefficient.format() },
      { label: "Constant change", value: recursive.constant.format() },
    ],
    steps,
    table: buildSequenceTableFromTerms(terms, 1),
  };
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

function trySolveQuadraticEquation(input: string): SolveTrace | null {
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
    const normalizedEquation = formatPolynomialEquation(left, right);
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
        rule: "quadratic.simplify",
        standardCodes: ["A1.REI.A.1", "A1.SSE.A.2"],
      });
      previous = after;
    }

    let standard = subtractPolynomial(left, right);
    if (standard.squareCoefficient.isZero()) {
      return null;
    }

    if (standard.coefficient.isZero()) {
      return null;
    }

    if (standard.squareCoefficient.isNegative()) {
      standard = negatePolynomial(standard);
      const after = statement(`${formatPolynomial(standard)} = 0`);
      steps.push({
        before: previous,
        after,
        operation: "Multiply both sides by -1",
        reason:
          "Multiplying both sides by -1 keeps the same solution set and makes the leading coefficient positive.",
        rule: "quadratic.normalizeLeadingCoefficient",
        standardCodes: ["A1.REI.A.1"],
      });
      previous = after;
    } else {
      const standardText = `${formatPolynomial(standard)} = 0`;
      if (previous.text !== standardText) {
        const after = statement(standardText);
        steps.push({
          before: previous,
          after,
          operation: "Move all terms to one side",
          reason:
            "Writing the equation in standard quadratic form makes it easier to solve.",
          rule: "quadratic.standardForm",
          standardCodes: ["A1.REI.A.1", "A1.REI.A.2"],
        });
        previous = after;
      }
    }

    const resolution = buildQuadraticResolution(previous, standard);
    if (resolution === null) {
      return null;
    }

    return {
      input,
      title: "Quadratic equation",
      topic: resolution.method,
      course: "algebra1",
      standardCodes: resolution.standardCodes,
      steps: [...steps, ...resolution.steps],
      result: {
        kind: "solution",
        value: resolution.result,
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

  const resolution = buildQuadraticResolution(statement(standardForm), standardPolynomial);
  if (resolution === null) {
    return null;
  }

  steps.push(...resolution.steps);

  const validSolutions: RootCandidate[] = [];
  let previous = statement(resolution.result);
  for (const candidate of resolution.candidates) {
    const valid = isValidSquareRootSolution(left, right, candidate.approx);
    const afterText = valid
      ? `check x = ${candidate.exact}: substituting into the original equation works`
      : `check x = ${candidate.exact}: substituting into the original equation is false, so reject it`;
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
    validSolutions.length > 0
      ? formatRootCandidates(validSolutions)
      : "no real solution";
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

function evaluatePolynomialAtRational(value: Polynomial, x: Rational) {
  return value.squareCoefficient
    .multiply(x.multiply(x))
    .add(value.coefficient.multiply(x))
    .add(value.constant);
}

function rationalToNumber(value: Rational) {
  return value.numerator / value.denominator;
}

function formatCoordinate(x: string, y: string) {
  return `(${x}, ${y})`;
}

function dedupeGraphPoints(points: GraphPoint[]) {
  const unique: GraphPoint[] = [];
  for (const point of points) {
    if (
      !unique.some(
        (existing) =>
          Math.abs(existing.x - point.x) < 1e-9 &&
          Math.abs(existing.y - point.y) < 1e-9,
      )
    ) {
      unique.push(point);
    }
  }
  return unique;
}

function buildGraphWindow(
  highlightedPoints: GraphPoint[],
  samplePoints: GraphPoint[],
) {
  const allPoints = [...highlightedPoints, ...samplePoints];
  const xValues = allPoints.map((point) => point.x);
  const yValues = allPoints.map((point) => point.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xPadding = Math.max(2, (xMax - xMin) * 0.25 || 2);
  const yPadding = Math.max(2, (yMax - yMin) * 0.25 || 2);

  return {
    xMin: Math.floor(xMin - xPadding),
    xMax: Math.ceil(xMax + xPadding),
    yMin: Math.floor(yMin - yPadding),
    yMax: Math.ceil(yMax + yPadding),
  };
}

function parseSequenceTerms(input: string) {
  if (input.includes("=") || input.includes("sqrt") || input.includes("√")) {
    return null;
  }

  const parts = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (parts.length < 3) {
    return null;
  }

  try {
    return parts.map((part) => Rational.fromString(part));
  } catch {
    return null;
  }
}

function parseRecursiveSequence(input: string) {
  const normalized = normalizeInput(input);
  const match = normalized.match(/^a_n=(.+),a_1=(.+)$/);
  if (!match?.[1] || !match[2]) {
    return null;
  }

  const recurrence = match[1];
  const initial = stripWrappingParens(match[2]);
  const anchor = "a_(n-1)";
  const anchorIndex = recurrence.indexOf(anchor);
  if (anchorIndex === -1) {
    return null;
  }

  const prefix = recurrence.slice(0, anchorIndex);
  const suffix = recurrence.slice(anchorIndex + anchor.length);

  try {
    const coefficient = parseRecursiveCoefficient(prefix);
    const constant = parseRecursiveConstant(suffix);
    return {
      coefficient,
      constant,
      firstTerm: Rational.fromString(initial),
    };
  } catch {
    return null;
  }
}

function inferGeometricRatio(terms: Rational[]) {
  const first = terms[0];
  const second = terms[1];
  if (!first || !second) {
    return null;
  }

  if (first.isZero()) {
    return terms.every((term) => term.isZero()) ? Rational.zero() : null;
  }

  return second.divide(first);
}

function buildSequenceTable(
  givenTerms: Rational[],
  nextTerm: (current: Rational) => Rational,
) {
  const rows = givenTerms.map((term, index) => ({
    n: String(index + 1),
    value: term.format(),
    projected: false,
  }));

  let current = givenTerms[givenTerms.length - 1] as Rational;
  for (let index = 0; index < 3; index += 1) {
    current = nextTerm(current);
    rows.push({
      n: String(givenTerms.length + index + 1),
      value: current.format(),
      projected: true,
    });
  }

  return rows;
}

function buildSequenceTableFromTerms(terms: Rational[], givenCount: number) {
  return terms.map((term, index) => ({
    n: String(index + 1),
    value: term.format(),
    projected: index >= givenCount,
  }));
}

function buildRecursiveSequenceTerms(
  firstTerm: Rational,
  coefficient: Rational,
  constant: Rational,
  count: number,
) {
  const terms = [firstTerm];
  let current = firstTerm;

  for (let index = 1; index < count; index += 1) {
    current = current.multiply(coefficient).add(constant);
    terms.push(current);
  }

  return terms;
}

function parseGeometryPoints(input: string) {
  const trimmed = input.trim();
  if (!trimmed.toLowerCase().startsWith("points")) {
    return null;
  }

  const matches = Array.from(
    trimmed.matchAll(
      /([A-Za-z])?\s*\((-?\d+(?:\/\d+)?(?:\.\d+)?),\s*(-?\d+(?:\/\d+)?(?:\.\d+)?)\)/g,
    ),
  );
  if (matches.length !== 2) {
    return null;
  }

  try {
    return matches.map((match, index) => ({
      label: match[1] ?? String.fromCharCode(65 + index),
      x: Rational.fromString(match[2] ?? "0"),
      y: Rational.fromString(match[3] ?? "0"),
    }));
  } catch {
    return null;
  }
}

function buildPointWindow(points: GeometryPoint[]) {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xPadding = Math.max(2, (xMax - xMin) * 0.4 || 2);
  const yPadding = Math.max(2, (yMax - yMin) * 0.4 || 2);

  return {
    xMin: Math.floor(xMin - xPadding),
    xMax: Math.ceil(xMax + xPadding),
    yMin: Math.floor(yMin - yPadding),
    yMax: Math.ceil(yMax + yPadding),
  };
}

function formatSequenceTerms(terms: Rational[]) {
  return terms.map((term) => term.format()).join(", ");
}

function formatRecursiveSequenceRule(
  coefficient: Rational,
  constant: Rational,
  firstTerm: Rational,
) {
  const coefficientText = formatRecursiveMultiplier(coefficient);
  const constantText = formatRecursiveConstant(constant);
  return `a_n = ${coefficientText}a_(n - 1)${constantText}, a_1 = ${firstTerm.format()}`;
}

function formatRecursiveSequenceStep(
  index: number,
  previous: Rational,
  coefficient: Rational,
  constant: Rational,
  current: Rational,
) {
  const coefficientValue = formatRecursivePreviousValue(coefficient, previous);
  const constantText = formatRecursiveConstant(constant);
  return `a_${index} = ${coefficientValue}${constantText} = ${current.format()}`;
}

function formatArithmeticDifferences(terms: Rational[]) {
  const parts: string[] = [];
  for (let index = 1; index < terms.length; index += 1) {
    const current = terms[index] as Rational;
    const previous = terms[index - 1] as Rational;
    parts.push(
      `${current.format()} - ${previous.format()} = ${current
        .subtract(previous)
        .format()}`,
    );
  }
  return parts.join(", ");
}

function formatGeometricRatios(terms: Rational[]) {
  const parts: string[] = [];
  for (let index = 1; index < terms.length; index += 1) {
    const current = terms[index] as Rational;
    const previous = terms[index - 1] as Rational;
    if (previous.isZero()) {
      parts.push(`${current.format()}/${previous.format()} is undefined`);
    } else {
      parts.push(
        `${current.format()}/${previous.format()} = ${current
          .divide(previous)
          .format()}`,
      );
    }
  }
  return parts.join(", ");
}

function formatArithmeticRecursiveRule(firstTerm: Rational, difference: Rational) {
  if (difference.isZero()) {
    return `a_n = a_(n - 1), a_1 = ${firstTerm.format()}`;
  }

  if (difference.isNegative()) {
    return `a_n = a_(n - 1) - ${difference.abs().format()}, a_1 = ${firstTerm.format()}`;
  }

  return `a_n = a_(n - 1) + ${difference.format()}, a_1 = ${firstTerm.format()}`;
}

function formatArithmeticExplicitRule(firstTerm: Rational, difference: Rational) {
  if (difference.isZero()) {
    return `a_n = ${firstTerm.format()}`;
  }

  if (difference.isNegative()) {
    return `a_n = ${firstTerm.format()} - ${difference.abs().format()}(n - 1)`;
  }

  return `a_n = ${firstTerm.format()} + ${difference.format()}(n - 1)`;
}

function formatGeometricRecursiveRule(firstTerm: Rational, ratio: Rational) {
  const multiplier = formatRecursiveMultiplier(ratio);
  return `a_n = ${multiplier}a_(n - 1), a_1 = ${firstTerm.format()}`;
}

function formatGeometricExplicitRule(firstTerm: Rational, ratio: Rational) {
  if (ratio.isOne()) {
    return `a_n = ${firstTerm.format()}`;
  }

  return `a_n = ${firstTerm.format()}(${ratio.format()})^(n - 1)`;
}

function formatRecursiveMultiplier(value: Rational) {
  if (value.isOne()) {
    return "";
  }

  if (value.isNegativeOne()) {
    return "-";
  }

  if (value.denominator !== 1 || value.isNegative()) {
    return `(${value.format()})`;
  }

  return value.format();
}

function formatRecursiveConstant(value: Rational) {
  if (value.isZero()) {
    return "";
  }

  if (value.isNegative()) {
    return ` - ${value.abs().format()}`;
  }

  return ` + ${value.format()}`;
}

function parseRecursiveCoefficient(value: string) {
  const normalized = stripWrappingParens(value);
  if (!normalized) {
    return Rational.one();
  }

  if (normalized === "-") {
    return new Rational(-1);
  }

  return Rational.fromString(normalized);
}

function parseRecursiveConstant(value: string) {
  if (!value) {
    return Rational.zero();
  }

  const match = value.match(/^([+-])(.+)$/);
  if (!match?.[1] || !match[2]) {
    throw new Error("Unsupported recursive constant.");
  }

  const constant = Rational.fromString(stripWrappingParens(match[2]));
  return match[1] === "-" ? constant.negate() : constant;
}

function stripWrappingParens(value: string) {
  if (value.startsWith("(") && value.endsWith(")")) {
    return value.slice(1, -1);
  }

  return value;
}

function formatRecursivePreviousValue(coefficient: Rational, previous: Rational) {
  if (coefficient.isOne()) {
    return previous.format();
  }

  if (coefficient.isNegativeOne()) {
    return `-(${previous.format()})`;
  }

  const coefficientText =
    coefficient.denominator === 1 && !coefficient.isNegative()
      ? coefficient.format()
      : `(${coefficient.format()})`;
  return `${coefficientText}(${previous.format()})`;
}

function formatPointSlopeEquation(yValue: Rational, slope: Rational, xValue: Rational) {
  const left =
    yValue.isZero()
      ? "y"
      : yValue.isNegative()
        ? `y + ${yValue.abs().format()}`
        : `y - ${yValue.format()}`;
  const rightInner =
    xValue.isZero()
      ? "x"
      : xValue.isNegative()
        ? `x + ${xValue.abs().format()}`
        : `x - ${xValue.format()}`;

  if (slope.isOne()) {
    return `${left} = ${rightInner === "x" ? "x" : `(${rightInner})`}`;
  }

  if (slope.isNegativeOne()) {
    return `${left} = -${rightInner === "x" ? "x" : `(${rightInner})`}`;
  }

  const coefficient =
    slope.denominator === 1 && !slope.isNegative()
      ? slope.format()
      : `(${slope.format()})`;
  const factor = rightInner === "x" ? "x" : `(${rightInner})`;
  return `${left} = ${coefficient}${factor}`;
}

function formatPositiveSquareRoot(value: Rational) {
  if (value.isZero()) {
    return "0";
  }

  const simplified = simplifyRadicalFraction(
    0,
    value.numerator * value.denominator,
    value.denominator,
  );

  if (simplified.sqrtCoefficient === 0) {
    return new Rational(simplified.constant, simplified.denominator).format();
  }

  if (simplified.radicand === 1) {
    return new Rational(simplified.sqrtCoefficient, simplified.denominator).format();
  }

  const radical = formatRadicalPart(
    simplified.sqrtCoefficient,
    simplified.radicand,
  );
  if (simplified.denominator === 1) {
    return radical;
  }

  return `${radical}/${simplified.denominator}`;
}

function formatCandidate(value: Rational) {
  return `x = ${value.format()}`;
}

function formatRootCandidates(values: RootCandidate[]) {
  if (values.length === 0) {
    return "no real solution";
  }

  if (values.length === 1) {
    return `x = ${values[0].exact}`;
  }

  return values.map((value) => `x = ${value.exact}`).join(" or ");
}

function buildQuadraticResolution(
  previous: MathStatement,
  polynomial: Polynomial,
): {
  steps: SolveStep[];
  candidates: RootCandidate[];
  result: string;
  method: string;
  standardCodes: string[];
} | null {
  const integer = toIntegerQuadratic(polynomial);
  if (integer === null) {
    return null;
  }

  const factors = factorIntegerQuadratic(integer);
  if (factors !== null) {
    const factoredForm = `${formatGeneralBinomialFactor(
      factors.left,
    )}${formatGeneralBinomialFactor(factors.right)} = 0`;
    const candidates = uniqueRootCandidates([
      rationalRootCandidate(factors.left),
      rationalRootCandidate(factors.right),
    ]);
    const result = formatRootCandidates(candidates);

    return {
      steps: [
        {
          before: previous,
          after: statement(factoredForm),
          operation: "Factor the quadratic",
          reason:
            "The quadratic can be rewritten as a product of two binomials with the same solutions.",
          rule: "quadratic.factor",
          standardCodes: ["A1.SSE.A.2", "A1.REI.A.2"],
        },
        {
          before: statement(factoredForm),
          after: statement(result),
          operation: "Use the zero product property",
          reason:
            "If a product is zero, then at least one factor must be zero.",
          rule: "quadratic.zeroProduct",
          standardCodes: ["A1.REI.A.2"],
        },
      ],
      candidates,
      result,
      method: "Factoring",
      standardCodes: ["A1.SSE.A.2", "A1.REI.A.2"],
    };
  }

  if (isCompletingSquareCandidate(polynomial, integer)) {
    return buildCompletingSquareResolution(previous, polynomial, integer);
  }

  return buildQuadraticFormulaResolution(previous, integer);
}

function isCompletingSquareCandidate(
  polynomial: Polynomial,
  integer: { a: number; b: number; c: number },
) {
  return (
    integer.a === 1 &&
    polynomial.squareCoefficient.isOne() &&
    polynomial.coefficient.denominator === 1 &&
    polynomial.constant.denominator === 1
  );
}

function buildCompletingSquareResolution(
  previous: MathStatement,
  polynomial: Polynomial,
  integer: { a: number; b: number; c: number },
): {
  steps: SolveStep[];
  candidates: RootCandidate[];
  result: string;
  method: string;
  standardCodes: string[];
} {
  const halfCoefficient = polynomial.coefficient.divide(new Rational(2));
  const completingTerm = halfCoefficient.multiply(halfCoefficient);
  const isolatedRight = polynomial.constant.negate();
  const completedRight = isolatedRight.add(completingTerm);
  const xExpression: Linear = {
    coefficient: Rational.one(),
    constant: halfCoefficient,
  };
  const isolatedLeft: Polynomial = {
    squareCoefficient: Rational.one(),
    coefficient: polynomial.coefficient,
    constant: Rational.zero(),
  };
  const completedLeft: Polynomial = {
    squareCoefficient: Rational.one(),
    coefficient: polynomial.coefficient,
    constant: completingTerm,
  };
  const isolatedEquation = statement(
    `${formatPolynomial(isolatedLeft)} = ${isolatedRight.format()}`,
  );
  const completedEquation = statement(
    `${formatPolynomial(completedLeft)} = ${completedRight.format()}`,
  );
  const squaredEquation = statement(
    `(${formatLinear(xExpression)})^2 = ${completedRight.format()}`,
  );
  const steps: SolveStep[] = [
    {
      before: previous,
      after: isolatedEquation,
      operation: bothSidesOperation(polynomial.constant.negate()),
      reason:
        "Isolating the x terms makes it possible to build a perfect-square trinomial.",
      rule: "quadratic.isolateConstant",
      standardCodes: ["A1.REI.A.1"],
    },
    {
      before: isolatedEquation,
      after: completedEquation,
      operation: bothSidesOperation(completingTerm),
      reason:
        "Adding the square of half the x coefficient creates a perfect-square trinomial.",
      rule: "quadratic.completeSquareAdd",
      standardCodes: ["A1.REI.A.1", "A1.SSE.A.2"],
    },
    {
      before: completedEquation,
      after: squaredEquation,
      operation: "Rewrite as a perfect square",
      reason:
        "x^2 + bx + (b/2)^2 rewrites as a squared binomial with the same value.",
      rule: "quadratic.completeSquareRewrite",
      standardCodes: ["A1.SSE.A.2"],
    },
  ];

  if (completedRight.isNegative()) {
    steps.push({
      before: squaredEquation,
      after: statement("no real solution"),
      operation: "Compare to squares of real numbers",
      reason:
        "A real number squared cannot equal a negative number, so there is no real solution.",
      rule: "quadratic.completeSquareNoRealSolution",
      standardCodes: ["A1.REI.A.2"],
    });

    return {
      steps,
      candidates: [],
      result: "no real solution",
      method: "Completing the square",
      standardCodes: ["A1.REI.A.1", "A1.SSE.A.2", "A1.REI.A.2"],
    };
  }

  const discriminant = integer.b * integer.b - 4 * integer.a * integer.c;
  const squareRootEquation = statement(
    `${formatLinear(xExpression)} = ${formatPlusMinusSquareRoot(completedRight)}`,
  );
  const solutionDisplay = formatQuadraticFormulaValue(
    integer.a,
    integer.b,
    discriminant,
  );
  const isolatedSolution = statement(`x = ${solutionDisplay}`);
  const candidates = buildQuadraticFormulaCandidates(
    integer.a,
    integer.b,
    discriminant,
  );
  const result = formatRootCandidates(candidates);

  steps.push(
    {
      before: squaredEquation,
      after: squareRootEquation,
      operation: "Take the square root of both sides",
      reason:
        "Once the left side is a square, the square root property gives the possible real values.",
      rule: "quadratic.completeSquareRoot",
      standardCodes: ["A1.REI.A.2", "A1.NQ.A.2"],
    },
    {
      before: squareRootEquation,
      after: isolatedSolution,
      operation: bothSidesOperation(halfCoefficient.negate()),
      reason:
        "Adding or subtracting the same number on both sides isolates x.",
      rule: "quadratic.completeSquareIsolate",
      standardCodes: ["A1.REI.A.1"],
    },
  );

  if (isolatedSolution.text !== result) {
    steps.push({
      before: isolatedSolution,
      after: statement(result),
      operation: "Write each solution",
      reason:
        "The plus-minus symbol represents two solution values when the radicand is positive.",
      rule: "quadratic.completeSquareSplit",
      standardCodes: ["A1.REI.A.2"],
    });
  }

  return {
    steps,
    candidates,
    result,
    method: "Completing the square",
    standardCodes: ["A1.REI.A.1", "A1.SSE.A.2", "A1.REI.A.2", "A1.NQ.A.2"],
  };
}

function buildQuadraticFormulaResolution(
  previous: MathStatement,
  value: { a: number; b: number; c: number },
): {
  steps: SolveStep[];
  candidates: RootCandidate[];
  result: string;
  method: string;
  standardCodes: string[];
} {
  const discriminant = value.b * value.b - 4 * value.a * value.c;
  const template = statement(
    `x = (-(${value.b}) +/- sqrt((${value.b})^2 - 4(${value.a})(${value.c}))) / (2(${value.a}))`,
  );
  const steps: SolveStep[] = [
    {
      before: previous,
      after: template,
      operation: "Use the quadratic formula",
      reason:
        "When the quadratic does not factor cleanly, the quadratic formula gives all real solutions.",
      rule: "quadratic.formula",
      standardCodes: ["A1.REI.A.2"],
    },
  ];

  if (discriminant < 0) {
    steps.push({
      before: template,
      after: statement("no real solution"),
      operation: "Evaluate the discriminant",
      reason:
        "A negative discriminant means the equation has no real solutions.",
      rule: "quadratic.discriminantNegative",
      standardCodes: ["A1.REI.A.2"],
    });

    return {
      steps,
      candidates: [],
      result: "no real solution",
      method: "Quadratic formula",
      standardCodes: ["A1.REI.A.2"],
    };
  }

  const formulaDisplay = formatQuadraticFormulaValue(value.a, value.b, discriminant);
  steps.push({
    before: template,
    after: statement(`x = ${formulaDisplay}`),
    operation: "Substitute and simplify",
    reason:
      "Substituting the coefficient values into the formula and simplifying gives the solution values.",
    rule: "quadratic.formulaSubstitute",
    standardCodes: ["A1.REI.A.2", "A1.NQ.A.2"],
  });

  const candidates = buildQuadraticFormulaCandidates(value.a, value.b, discriminant);
  const result = formatRootCandidates(candidates);
  if (`x = ${formulaDisplay}` !== result) {
    steps.push({
      before: statement(`x = ${formulaDisplay}`),
      after: statement(result),
      operation: "Write each solution",
      reason:
        "The plus-minus symbol represents two solution values when the discriminant is positive.",
      rule: "quadratic.formulaSplit",
      standardCodes: ["A1.REI.A.2"],
    });
  }

  return {
    steps,
    candidates,
    result,
    method: "Quadratic formula",
    standardCodes: ["A1.REI.A.2", "A1.NQ.A.2"],
  };
}

function toIntegerQuadratic(value: Polynomial) {
  const denominators = [
    value.squareCoefficient.denominator,
    value.coefficient.denominator,
    value.constant.denominator,
  ];
  const scale = denominators.reduce((current, denominator) => lcm(current, denominator), 1);
  let a = value.squareCoefficient.numerator * (scale / value.squareCoefficient.denominator);
  let b = value.coefficient.numerator * (scale / value.coefficient.denominator);
  let c = value.constant.numerator * (scale / value.constant.denominator);

  const divisor = gcdMany([a, b, c]);
  a /= divisor;
  b /= divisor;
  c /= divisor;

  if (a < 0) {
    a *= -1;
    b *= -1;
    c *= -1;
  }

  return { a, b, c };
}

function factorIntegerQuadratic(value: { a: number; b: number; c: number }) {
  const divisorsOfA = signedDivisors(value.a);
  const divisorsOfC = signedDivisors(value.c === 0 ? 1 : value.c);

  for (const leftCoeff of divisorsOfA) {
    const rightCoeff = value.a / leftCoeff;
    for (const leftConstant of divisorsOfC) {
      const rightConstant =
        value.c === 0 ? 0 : value.c / leftConstant;
      if (
        leftCoeff * rightConstant + leftConstant * rightCoeff === value.b &&
        leftCoeff * rightCoeff === value.a &&
        leftConstant * rightConstant === value.c
      ) {
        return {
          left: { xCoeff: leftCoeff, constant: leftConstant },
          right: { xCoeff: rightCoeff, constant: rightConstant },
        };
      }
    }
  }

  return null;
}

function rationalRootCandidate(value: { xCoeff: number; constant: number }): RootCandidate {
  const rational = new Rational(-value.constant, value.xCoeff);
  return {
    exact: rational.format(),
    approx: rational.numerator / rational.denominator,
  };
}

function formatGeneralBinomialFactor(value: { xCoeff: number; constant: number }) {
  const coefficient = value.xCoeff === 1 ? "x" : value.xCoeff === -1 ? "-x" : `${value.xCoeff}x`;
  if (value.constant === 0) {
    return `(${coefficient})`;
  }

  if (value.constant > 0) {
    return `(${coefficient} + ${value.constant})`;
  }

  return `(${coefficient} - ${Math.abs(value.constant)})`;
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

function formatPlusMinusSquareRoot(value: Rational) {
  if (value.isZero()) {
    return "0";
  }

  const simplified = simplifyRadicalFraction(
    0,
    value.numerator * value.denominator,
    value.denominator,
  );

  return formatPlusMinusRoot(simplified);
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

function buildQuadraticFormulaCandidates(a: number, b: number, discriminant: number) {
  if (discriminant === 0) {
    const root = new Rational(-b, 2 * a);
    return [
      {
        exact: root.format(),
        approx: root.numerator / root.denominator,
      },
    ];
  }

  return [
    buildQuadraticFormulaCandidate(a, b, discriminant, 1),
    buildQuadraticFormulaCandidate(a, b, discriminant, -1),
  ];
}

function buildQuadraticFormulaCandidate(
  a: number,
  b: number,
  discriminant: number,
  sign: 1 | -1,
): RootCandidate {
  const simplified = simplifyRadicalFraction(-b, discriminant, 2 * a);
  return {
    exact: formatSimplifiedRoot(simplified, sign),
    approx:
      (simplified.constant +
        sign * simplified.sqrtCoefficient * Math.sqrt(simplified.radicand)) /
      simplified.denominator,
  };
}

function formatQuadraticFormulaValue(a: number, b: number, discriminant: number) {
  const simplified = simplifyRadicalFraction(-b, discriminant, 2 * a);
  return formatPlusMinusRoot(simplified);
}

function simplifyRadicalFraction(
  constant: number,
  discriminant: number,
  denominator: number,
) {
  if (discriminant < 0) {
    throw new Error("Only real discriminants are supported.");
  }

  if (discriminant === 0) {
    const rational = new Rational(constant, denominator);
    return {
      constant: rational.numerator,
      sqrtCoefficient: 0,
      radicand: 0,
      denominator: rational.denominator,
    };
  }

  const perfectSquare = largestPerfectSquareFactor(discriminant);
  const sqrtCoefficient = Math.sqrt(perfectSquare);
  const radicand = discriminant / perfectSquare;
  const divisor = gcdMany([constant, sqrtCoefficient, denominator]);

  const normalized = {
    constant: constant / divisor,
    sqrtCoefficient: sqrtCoefficient / divisor,
    radicand,
    denominator: denominator / divisor,
  };

  if (normalized.denominator < 0) {
    normalized.constant *= -1;
    normalized.sqrtCoefficient *= -1;
    normalized.denominator *= -1;
  }

  return normalized;
}

function formatPlusMinusRoot(value: {
  constant: number;
  sqrtCoefficient: number;
  radicand: number;
  denominator: number;
}) {
  if (value.sqrtCoefficient === 0) {
    return new Rational(value.constant, value.denominator).format();
  }

  const radical = formatRadicalPart(value.sqrtCoefficient, value.radicand);
  if (value.denominator === 1) {
    if (value.constant === 0) {
      return `+/-${radical}`;
    }

    return `${value.constant} +/- ${radical}`;
  }

  if (value.constant === 0) {
    return `+/-${radical}/${value.denominator}`;
  }

  return `(${value.constant} +/- ${radical})/${value.denominator}`;
}

function formatSimplifiedRoot(
  value: {
    constant: number;
    sqrtCoefficient: number;
    radicand: number;
    denominator: number;
  },
  sign: 1 | -1,
) {
  if (value.sqrtCoefficient === 0) {
    return new Rational(value.constant, value.denominator).format();
  }

  if (value.radicand === 1) {
    return new Rational(
      value.constant + sign * value.sqrtCoefficient,
      value.denominator,
    ).format();
  }

  const radical = formatRadicalPart(value.sqrtCoefficient, value.radicand);
  if (value.denominator === 1) {
    if (value.constant === 0) {
      return sign === 1 ? radical : `-${radical}`;
    }

    return sign === 1
      ? `${value.constant} + ${radical}`
      : `${value.constant} - ${radical}`;
  }

  if (value.constant === 0) {
    return sign === 1
      ? `${radical}/${value.denominator}`
      : `-${radical}/${value.denominator}`;
  }

  return sign === 1
    ? `(${value.constant} + ${radical})/${value.denominator}`
    : `(${value.constant} - ${radical})/${value.denominator}`;
}

function formatRadicalPart(coefficient: number, radicand: number) {
  if (radicand === 1) {
    return String(coefficient);
  }

  if (coefficient === 1) {
    return `sqrt(${radicand})`;
  }

  return `${coefficient}sqrt(${radicand})`;
}

function uniqueRootCandidates(values: RootCandidate[]) {
  const unique: RootCandidate[] = [];
  for (const value of values) {
    if (!unique.some((candidate) => candidate.exact === value.exact)) {
      unique.push(value);
    }
  }
  return unique;
}

function signedDivisors(value: number) {
  if (value === 0) {
    return [1, -1];
  }

  const absolute = Math.abs(value);
  const divisors = new Set<number>();
  for (let candidate = 1; candidate <= absolute; candidate += 1) {
    if (absolute % candidate === 0) {
      divisors.add(candidate);
      divisors.add(-candidate);
    }
  }
  return Array.from(divisors);
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

function isValidSquareRootSolution(left: Linear, right: Linear, value: number) {
  const leftValue =
    (left.coefficient.numerator / left.coefficient.denominator) * value +
    left.constant.numerator / left.constant.denominator;
  const rightValue =
    (right.coefficient.numerator / right.coefficient.denominator) * value +
    right.constant.numerator / right.constant.denominator;

  if (leftValue < 0) {
    return false;
  }

  return Math.abs(Math.sqrt(leftValue) - rightValue) < 1e-9;
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

function gcdMany(values: number[]) {
  const nonZero = values.map((value) => Math.abs(value)).filter((value) => value !== 0);
  if (nonZero.length === 0) {
    return 1;
  }

  return nonZero.reduce((current, value) => gcd(current, value));
}

function lcm(a: number, b: number) {
  return Math.abs(a * b) / gcd(a, b);
}
