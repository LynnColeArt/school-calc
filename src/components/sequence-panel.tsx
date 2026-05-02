import type { SequenceAnalysis } from "../lib/algebra/types";

export function SequencePanel({ sequence }: { sequence: SequenceAnalysis }) {
  return (
    <section className="sequence-section" aria-label="Sequence analysis">
      <div className="sequence-heading">
        <div>
          <h3>Sequence Pattern</h3>
          <p>{sequence.summary}</p>
        </div>
        <div className="sequence-kind">{sequence.kind}</div>
      </div>

      <div className="sequence-layout">
        <div className="sequence-steps">
          {sequence.steps.map((step, index) => (
            <div className="sequence-step" key={`${step.math}-${index}`}>
              <div className="math-line">{step.math}</div>
              <div className="reason">{step.note}</div>
            </div>
          ))}
        </div>

        <div className="sequence-sidebar">
          <dl className="graph-features">
            {sequence.features.map((feature) => (
              <div className="graph-feature-row" key={feature.label}>
                <dt>{feature.label}</dt>
                <dd>{feature.value}</dd>
              </div>
            ))}
          </dl>

          <table className="sequence-table">
            <thead>
              <tr>
                <th>n</th>
                <th>a_n</th>
                <th>Kind</th>
              </tr>
            </thead>
            <tbody>
              {sequence.table.map((row) => (
                <tr
                  className={row.projected ? "sequence-row-projected" : ""}
                  key={`${row.n}-${row.value}`}
                >
                  <td>{row.n}</td>
                  <td>{row.value}</td>
                  <td>{row.projected ? "next" : "given"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
