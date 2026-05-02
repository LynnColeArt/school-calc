export type Course = "algebra1" | "geometry" | "algebra2";

export type OutputMode = "homework" | "annotated" | "hint";

export type MathStatement = {
  text: string;
  latex: string;
};

export type SolveStep = {
  before: MathStatement;
  after: MathStatement;
  rule: string;
  reason: string;
  operation: string;
  standardCodes: string[];
};

export type SolveResult = {
  kind: "solution" | "identity" | "contradiction" | "unsupported";
  value?: string;
  explanation?: string;
};

export type SolveTrace = {
  input: string;
  title: string;
  topic: string;
  course: Course;
  standardCodes: string[];
  steps: SolveStep[];
  result: SolveResult;
};

export type RenderedLine = {
  math: string;
  note: string;
};

export type RenderedTrace = {
  lines: RenderedLine[];
};

export type GraphFeature = {
  label: string;
  value: string;
};

export type GraphPoint = {
  x: number;
  y: number;
  label: string;
  role: "sample" | "intercept" | "vertex";
};

export type GraphTableRow = {
  x: string;
  y: string;
};

export type GraphWindow = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type GraphAnalysis = {
  kind: "linear" | "quadratic";
  title: string;
  topic: string;
  equation: string;
  summary: string;
  standardCodes: string[];
  features: GraphFeature[];
  table: GraphTableRow[];
  highlightedPoints: GraphPoint[];
  coefficients: {
    a: number;
    b: number;
    c: number;
  };
  window: GraphWindow;
};

export type SequenceKind = "arithmetic" | "geometric" | "recursive";

export type SequenceTableRow = {
  n: string;
  value: string;
  projected: boolean;
};

export type SequencePoint = {
  n: number;
  value: number;
  projected: boolean;
  label: string;
};

export type SequenceAnalysis = {
  kind: SequenceKind;
  title: string;
  topic: string;
  summary: string;
  standardCodes: string[];
  features: GraphFeature[];
  steps: RenderedLine[];
  table: SequenceTableRow[];
  points: SequencePoint[];
  window: GraphWindow;
};

export type GeometryPoint = {
  x: number;
  y: number;
  label: string;
  role: "point" | "midpoint";
};

export type GeometryLine =
  | {
      kind: "regular";
      slope: number;
      intercept: number;
    }
  | {
      kind: "vertical";
      x: number;
    };

export type GeometryAnalysis = {
  title: string;
  topic: string;
  summary: string;
  standardCodes: string[];
  features: GraphFeature[];
  steps: RenderedLine[];
  points: GeometryPoint[];
  line: GeometryLine;
  lineLabel?: string;
  referenceLine?: GeometryLine;
  referenceLineLabel?: string;
  window: GraphWindow;
};
