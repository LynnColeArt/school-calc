# Project Plan

Date: 2026-05-02

## Project Thesis

Build a TypeScript/Next.js calculator for Missouri high school math that produces the kind of process notation a student is expected to show on homework. The product should not merely compute answers; it should generate standards-aligned chains of reasoning, with notation that can adapt to a teacher, district, or assignment style.

The research baseline is [Missouri High School Math Standards Research](./missouri-high-school-math-research.md).

## Product Principles

1. Correct answers are necessary but not sufficient.
2. Every generated step should have a mathematical reason.
3. The engine should preserve multiple valid solution paths.
4. Missouri standards should be first-class metadata, not prose buried in documentation.
5. Local notation style should be configurable without changing the underlying math trace.
6. The first release should help with real homework before it tries to cover every high school topic.

## Immediate Classroom Target

The current classroom target is algebra with square roots/radicals. That maps well to an Algebra 1-first product, especially:

- `A1.REI.A.1`: explain each equation or inequality transformation as an equivalent step.
- `A1.NQ.A.1`: explain rational exponents from integer exponent properties.
- `A1.NQ.A.2`: rewrite simple radical and rational exponent expressions.
- `A1.REI.A.2`: solve quadratic equations, including square root property and comparing solution methods.

This means the first useful version should not stop at `3x + 5 = 26`. It should also handle problems like:

```text
x^2 = 49
x = +/- 7
```

```text
sqrt(x) = 5
x = 25
check: sqrt(25) = 5
```

```text
sqrt(18)
sqrt(9 * 2)
3sqrt(2)
```

## Initial Scope

The first target is Algebra 1, centered on Missouri standard `A1.REI.A.1`: explaining how each equation or inequality transformation creates an equivalent statement with the same solution set.

The MVP should solve and render:

- One-variable linear equations.
- One-variable linear inequalities, including inequality direction changes.
- Multi-step equations with distribution and combining like terms.
- Basic literal equations solved for a specified variable.
- Basic square-root simplification.
- Basic equations involving squares and square roots.
- Rational exponent notation for simple square-root cases.
- Step annotations such as "subtract 5 from both sides", "divide both sides by 3", and "combine like terms".

The MVP should support three output modes:

- `homework`: compact line-by-line work.
- `annotated`: each step includes the operation and reasoning.
- `hint`: show only the next valid transformation.

## Non-Goals For MVP

- Full CAS behavior.
- Geometry proofs.
- Handwriting recognition.
- Camera/photo problem ingestion.
- AI-generated freeform explanations without symbolic validation.
- Full district curriculum modeling.
- Multi-course coverage beyond the first Algebra 1 slice.

## Architecture

### Web App

Next.js application for the calculator interface, examples, and rendered process output.

Expected areas:

- Problem input.
- Course/standard selection.
- Output mode selection.
- Step-by-step rendered solution.
- "Why this step?" detail expansion.
- Later: teacher/district notation profile selector.

### Math Core

A standalone TypeScript module that can be tested without the UI.

Core responsibilities:

- Parse expressions, equations, and inequalities into an AST.
- Apply explicit rewrite and solve rules.
- Produce a proof trace rather than only a final value.
- Preserve exact rational arithmetic where possible.
- Reject unsupported input clearly.

### Standards Catalog

A structured catalog of Missouri standards and local project capability mappings.

Example shape:

```ts
type StandardCapability = {
  course: "algebra1" | "geometry" | "algebra2";
  standardCode: string;
  problemTypes: string[];
  supported: "planned" | "partial" | "complete";
};
```

### Renderers

Renderers convert a validated proof trace into specific presentation formats.

Expected renderers:

- Plain text.
- LaTeX/math display.
- Homework notation.
- Annotated explanation.
- Hint-only.

### Style Profiles

Style profiles should affect wording and formatting, not math correctness.

Examples:

- Operation label position: right column, inline, or hidden.
- Equality alignment style.
- Whether to show inverse operation language.
- Whether to use fractions, decimals, or mixed forms.
- Whether to include a final check step.

## Data Model Sketch

```ts
type SolveTrace = {
  input: string;
  course: "algebra1";
  standardCodes: string[];
  steps: SolveStep[];
  result: SolveResult;
};

type SolveStep = {
  before: MathStatement;
  after: MathStatement;
  rule: string;
  reason: string;
  operation?: string;
};

type SolveResult = {
  kind: "solution" | "identity" | "contradiction" | "unsupported";
  value?: string;
  explanation?: string;
};
```

## Milestones

### Milestone 1: Repo And Planning Baseline

- Initialize git repository.
- Add standards research note.
- Add project plan.
- Add baseline ignore rules for a future Next.js/TypeScript app.

Exit criteria: repo has a clear source-of-truth plan and research baseline.

### Milestone 2: Next.js Skeleton

- Create Next.js app with TypeScript.
- Add test runner.
- Add formatting/linting.
- Add basic app shell for entering an equation and viewing output.

Exit criteria: app runs locally, tests run, and the UI can call a stub solver.

### Milestone 3: Linear Equation Engine

- Implement parser for numeric constants, variables, addition, subtraction, multiplication, division, parentheses, and equality.
- Implement rational arithmetic.
- Implement linear equation solving by explicit transformations.
- Record each transformation as a `SolveStep`.
- Add tests for common Algebra 1 homework cases.

Exit criteria: solver can produce valid step traces for representative `A1.REI.A.1` problems.

### Milestone 4: Process Renderers

- Implement homework renderer.
- Implement annotated renderer.
- Implement hint renderer.
- Add snapshot or golden-output tests for notation stability.

Exit criteria: the same trace can render in multiple useful homework-facing formats.

### Milestone 5: Square Roots And Radicals

- Simplify square roots with perfect-square factors.
- Convert between square-root and rational-exponent notation for simple cases.
- Solve equations of the form `x^2 = a` over real solutions.
- Solve equations of the form `sqrt(x) = a`.
- Include check steps when squaring both sides could introduce invalid or extraneous results.

Exit criteria: the app can help with current algebra/square-root homework without jumping into full Algebra 2 radical equations.

### Milestone 6: Inequalities And Literal Equations

- Add inequality parsing and solving.
- Handle inequality reversal when multiplying or dividing by a negative value.
- Add literal equation solving for one target variable.

Exit criteria: MVP covers the first practical Algebra 1 slice.

### Milestone 7: Real Homework Calibration

- Collect 10-20 anonymized examples from actual assignments.
- Record expected notation style.
- Add a first style profile based on those examples.
- Identify gaps between standards, district/course descriptions, and classroom notation.

Exit criteria: output resembles the real assignment style closely enough to be useful.

## Testing Strategy

- Unit tests for parser, AST normalization, rational arithmetic, and each solve rule.
- Golden-output tests for rendered process notation.
- Standards coverage tests that assert supported problem types are mapped to standard codes.
- UI tests once the app has meaningful interactions.

## Research Gates

Before broadening beyond the MVP, answer these:

- Which course is the immediate student target: Algebra 1, Geometry, Algebra 2, or another local sequence?
- What platform or textbook is the class using?
- What exact notation style does the teacher mark as correct?
- Does the teacher expect explanation sentences, operation labels, or only aligned symbolic work?
- Are graph/table representations part of current homework?

## Near-Term Next Step

Scaffold the Next.js/TypeScript app and implement a stubbed solver API that returns a hard-coded step trace for a linear equation. This will let the UI, renderer shape, and trace data model stabilize before the parser and symbolic rules become complex.
