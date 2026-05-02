"use client";

import { FormEvent, useMemo, useState } from "react";
import { GraphPanel } from "../src/components/graph-panel";
import { SequencePanel } from "../src/components/sequence-panel";
import { EXAMPLE_PROBLEMS } from "../src/lib/algebra/examples";
import { renderTrace } from "../src/lib/algebra/render";
import {
  analyzeGraph,
  analyzeSequence,
  solveAlgebra,
} from "../src/lib/algebra/solver";
import type { OutputMode } from "../src/lib/algebra/types";

const modeLabels: Array<{ mode: OutputMode; label: string }> = [
  { mode: "homework", label: "Homework" },
  { mode: "annotated", label: "Annotated" },
  { mode: "hint", label: "Hint" },
];

const graphExamples = EXAMPLE_PROBLEMS.filter((example) =>
  example.input.startsWith("y = "),
);

const solveExamples = EXAMPLE_PROBLEMS.filter(
  (example) => !example.input.startsWith("y = ") && !example.input.includes(","),
);

const sequenceExamples = EXAMPLE_PROBLEMS.filter((example) =>
  example.input.includes(","),
);

export default function Home() {
  const [problem, setProblem] = useState("3x + 5 = 26");
  const [mode, setMode] = useState<OutputMode>("homework");
  const [submitted, setSubmitted] = useState(problem);

  const trace = useMemo(() => solveAlgebra(submitted), [submitted]);
  const graph = useMemo(() => analyzeGraph(submitted), [submitted]);
  const sequence = useMemo(() => analyzeSequence(submitted), [submitted]);
  const rendered = useMemo(() => renderTrace(trace, mode), [trace, mode]);
  const showWork = trace.result.kind !== "unsupported";
  const displayTitle = !showWork
    ? graph
      ? graph.title
      : sequence
        ? sequence.title
        : trace.title
    : trace.title;
  const displayTopic = !showWork
    ? graph
      ? graph.topic
      : sequence
        ? sequence.topic
        : trace.topic
    : trace.topic;
  const displayStandards = !showWork
    ? graph
      ? graph.standardCodes
      : sequence
        ? sequence.standardCodes
        : trace.standardCodes
    : trace.standardCodes;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(problem.trim());
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand">
          <h1>School Calc</h1>
          <span>Algebra process notation</span>
        </div>
        <div className="standard-pill">Missouri Algebra 1</div>
      </header>

      <div className="workspace">
        <aside className="input-panel">
          <h2 className="section-title">Problem</h2>
          <form className="problem-form" onSubmit={handleSubmit}>
            <input
              aria-label="Math problem"
              className="problem-input"
              onChange={(event) => setProblem(event.target.value)}
              placeholder="Solve 3x + 5 = 26, graph y = x^2 - 4x + 3, or enter 2, 6, 18, 54"
              spellCheck={false}
              value={problem}
            />
            <div className="entry-hint">
              <strong>More than equations.</strong>
              <span>Use y = ... for graphs or comma-separated terms for sequences.</span>
            </div>
            <div className="mode-row" aria-label="Output mode">
              {modeLabels.map((item) => (
                <button
                  aria-pressed={mode === item.mode}
                  key={item.mode}
                  onClick={() => setMode(item.mode)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button className="solve-button" type="submit">
              Show Result
            </button>
          </form>

          <div className="example-group" aria-label="Graph examples">
            <h2 className="section-title">Graph a function</h2>
            <p className="section-note">
              Lines and parabolas will open the graph panel on the right.
            </p>
            <div className="example-list">
              {graphExamples.map((example) => (
                <button
                  className="example-button example-button-graph"
                  key={example.input}
                  onClick={() => {
                    setProblem(example.input);
                    setSubmitted(example.input);
                  }}
                  type="button"
                >
                  <code>{example.input}</code>
                  <span>{example.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="example-group" aria-label="Sequence examples">
            <h2 className="section-title">Sequence rules</h2>
            <p className="section-note">
              Enter comma-separated terms to build recursive and explicit rules.
            </p>
            <div className="example-list">
              {sequenceExamples.map((example) => (
                <button
                  className="example-button example-button-sequence"
                  key={example.input}
                  onClick={() => {
                    setProblem(example.input);
                    setSubmitted(example.input);
                  }}
                  type="button"
                >
                  <code>{example.input}</code>
                  <span>{example.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="example-list" aria-label="Examples">
            <h2 className="section-title">Solve examples</h2>
            {solveExamples.map((example) => (
              <button
                className="example-button"
                key={example.input}
                onClick={() => {
                  setProblem(example.input);
                  setSubmitted(example.input);
                }}
                type="button"
              >
                <code>{example.input}</code>
                <span>{example.label}</span>
              </button>
            ))}
          </div>

          <p className="notes">
            First slice: equation solving, radicals, and graphing for lines and
            parabolas written in function form.
          </p>
        </aside>

        <section className="solution-panel" aria-live="polite">
          <div className="solution-header">
            <div>
              <h2>{displayTitle}</h2>
              <p>{displayStandards.join(", ")}</p>
            </div>
            <div className="topic-tag">{displayTopic}</div>
          </div>

          <div className="solution-body">
            <div
              className={`solution-layout ${
                graph ? "solution-layout-graph" : ""
              } ${sequence ? "solution-layout-sequence" : ""} ${
                showWork ? "solution-layout-work" : ""
              }`.trim()}
            >
              {showWork && (
                <div className="work-section">
                  {mode === "homework" && (
                    <table className="step-table">
                      <tbody>
                        {rendered.lines.map((line, index) => (
                          <tr key={`${line.math}-${index}`}>
                            <td className="math-line">{line.math}</td>
                            <td className="operation">{line.note}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {mode === "annotated" && (
                    <div>
                      {rendered.lines.map((line, index) => (
                        <div className="annotated-step" key={`${line.math}-${index}`}>
                          <div className="math-line">{line.math}</div>
                          <div className="reason">{line.note}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {mode === "hint" && (
                    <div className="hint-box">
                      <h3>Next step</h3>
                      <div className="math-line">{rendered.lines[0]?.math}</div>
                      <p className="reason">{rendered.lines[0]?.note}</p>
                    </div>
                  )}

                  <div className="result-row">
                    <span>Result</span>
                    <strong>{trace.result.value}</strong>
                  </div>
                </div>
              )}

              {!showWork && !graph && !sequence && (
                <div className="unsupported">{trace.result.explanation}</div>
              )}

              {graph && <GraphPanel graph={graph} />}
              {sequence && <SequencePanel sequence={sequence} />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
