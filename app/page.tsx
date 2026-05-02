"use client";

import { FormEvent, useMemo, useState } from "react";
import { EXAMPLE_PROBLEMS } from "../src/lib/algebra/examples";
import { renderTrace } from "../src/lib/algebra/render";
import { solveAlgebra } from "../src/lib/algebra/solver";
import type { OutputMode } from "../src/lib/algebra/types";

const modeLabels: Array<{ mode: OutputMode; label: string }> = [
  { mode: "homework", label: "Homework" },
  { mode: "annotated", label: "Annotated" },
  { mode: "hint", label: "Hint" },
];

export default function Home() {
  const [problem, setProblem] = useState("3x + 5 = 26");
  const [mode, setMode] = useState<OutputMode>("homework");
  const [submitted, setSubmitted] = useState(problem);

  const trace = useMemo(() => solveAlgebra(submitted), [submitted]);
  const rendered = useMemo(() => renderTrace(trace, mode), [trace, mode]);

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
              spellCheck={false}
              value={problem}
            />
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
              Solve
            </button>
          </form>

          <div className="example-list" aria-label="Examples">
            <h2 className="section-title">Examples</h2>
            {EXAMPLE_PROBLEMS.map((example) => (
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
            First slice: linear equations, square equations, square-root
            equations, and square-root simplification.
          </p>
        </aside>

        <section className="solution-panel" aria-live="polite">
          <div className="solution-header">
            <div>
              <h2>{trace.title}</h2>
              <p>{trace.standardCodes.join(", ")}</p>
            </div>
            <div className="topic-tag">{trace.topic}</div>
          </div>

          <div className="solution-body">
            {trace.result.kind === "unsupported" ? (
              <div className="unsupported">{trace.result.explanation}</div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

