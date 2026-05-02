# School Calc

School Calc is a homework-oriented math helper for families. The goal is simple: help parents support their teenagers with high school math homework without turning the app into a black-box answer machine.

Instead of only returning a final answer, School Calc focuses on showing process. It is built to produce the kind of step-by-step work a student is expected to write on paper, with support for compact homework output, more explicit annotations, and gentle hints.

The current version is centered on Missouri Algebra 1 style work and also includes graphing, coordinate geometry, and sequence pattern support.

## Why This Exists

Parents often know when an answer looks wrong but do not always know how to walk a student through the next algebra step in the notation the class expects. School Calc is meant to help with that gap.

Use it when you want to:

- check a teenager's algebra work without doing the entire assignment for them
- model how to show each transformation clearly
- turn a confusing graph, sequence, or coordinate-geometry prompt into something easier to talk through together
- give a student a hint instead of immediately giving them the full solution

## Current Features

School Calc currently supports:

- linear equation solving with step-by-step transformations
- quadratic equation work, including square-root-property style problems
- square-root and radical simplification
- basic square-root equations with result checking
- graph analysis for lines and parabolas entered as `y = ...`
- coordinate geometry from two points or from parallel/perpendicular line prompts
- arithmetic, geometric, and recursive sequence analysis
- `Homework` mode for compact work a student could copy into notes
- `Annotated` mode for step output with extra explanation
- `Hint` mode for the next useful move without giving away the whole chain at once

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Vitest for math-core tests
- ESLint for linting

## Installation

### Prerequisites

Install a recent version of Node.js and npm first. A current LTS release of Node.js is a good default for local development.

### 1. Clone the repository

```bash
git clone https://github.com/LynnColeArt/school-calc.git
cd school-calc
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

By default, Next.js will start the app at:

```text
http://localhost:3000
```

Open that address in your browser.

## Available Scripts

### Run the development app

```bash
npm run dev
```

Starts the local Next.js development server.

### Run tests

```bash
npm test
```

Runs the Vitest suite for the algebra and analysis engine.

### Run tests in watch mode

```bash
npm run test:watch
```

Useful while changing solver behavior locally.

### Run linting

```bash
npm run lint
```

Checks the project with ESLint.

### Build for production

```bash
npm run build
```

Creates a production build of the app.

## How To Use The App

When the app opens, you will see a single problem input at the left and the solution workspace on the right.

### 1. Enter a problem

Type a supported math prompt into the input field, then choose `Show Result`.

The app understands several kinds of input.

#### Algebra examples

```text
3x + 5 = 26
2(x + 3) = 14
x^2 = 49
sqrt(x + 4) = 7
sqrt(50) + sqrt(8)
```

#### Graphing examples

```text
y = 2x + 1
y = x^2 - 4x + 3
```

#### Coordinate geometry examples

```text
points A(1, 2) B(5, 10)
parallel through P(3, 4) to y = 2x + 1
perpendicular through P(3, 4) to y = 2x + 1
```

#### Sequence examples

```text
2, 6, 18, 54
4, 10, 16, 22
a_n = 3a_(n - 1), a_1 = 2
```

### 2. Choose the kind of help you want

Use the mode buttons above the `Show Result` button:

- `Homework` for compact step-by-step work
- `Annotated` for extra explanation
- `Hint` when you want to nudge a student without fully solving everything for them

This is especially useful for parent-student conversations. You can start with `Hint`, let the student try the next step on paper, and only move to `Homework` or `Annotated` if they are still stuck.

### 3. Use the example buttons

The left panel also includes example buttons grouped by topic:

- graph a function
- coordinate geometry
- sequence rules
- solve examples

These are helpful both for demos and for seeing the exact input shapes the current parser accepts.

### 4. Read the result panel

Depending on the problem type, the right side may show:

- a worked solution table
- a graph with labeled features
- a coordinate geometry diagram with steps
- a sequence chart, projected terms, and rule summary

The app also labels the problem with topic and standards metadata so the output stays tied to the classroom target instead of becoming a generic calculator dump.

## Suggested Parent Workflow

One practical way to use School Calc with a teenager:

1. Ask the student to enter the exact problem from the worksheet.
2. Start in `Hint` mode so they still do the next step themselves.
3. Compare the app's next move with the student's notebook work.
4. Switch to `Homework` or `Annotated` mode if they need to see the whole process.
5. Have the student rewrite the final solution in their own class format instead of copying blindly.

That keeps the tool supportive without letting it replace the learning part of homework.

## Project Scope Notes

School Calc is not trying to be a full computer algebra system. It is intentionally narrower and more classroom-shaped.

Current focus:

- process notation over raw answer generation
- Algebra 1 style problems first
- clear supported-input patterns
- deterministic math traces rather than freeform AI explanations

## Repository Notes

Helpful project files:

- `app/page.tsx`: main interface
- `src/lib/algebra/solver.ts`: core solving and analysis logic
- `src/lib/algebra/*.test.ts`: solver and analysis tests
- `docs/project-plan.md`: product and architecture plan
- `docs/missouri-high-school-math-research.md`: research baseline

## Limitations

This is still an early version. A few important caveats:

- input needs to follow the supported text patterns fairly closely
- the solver does not cover every high school math topic
- unsupported problems are rejected instead of being guessed at
- the product is aimed at helping with homework process, not replacing a teacher

## Development

If you are extending the app, the math engine is designed to stay testable outside the UI. The long-term shape is a symbolic, standards-aware homework engine whose renderers can adapt the same math trace into different classroom-friendly formats.

## License

No license has been added yet. If you plan to share or reuse the project outside this repository, add a license first.
