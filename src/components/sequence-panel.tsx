import type { SequenceAnalysis } from "../lib/algebra/types";

const viewBoxWidth = 720;
const viewBoxHeight = 420;
const padding = { top: 28, right: 28, bottom: 34, left: 48 };

export function SequencePanel({ sequence }: { sequence: SequenceAnalysis }) {
  const xTicks = buildIntegerTicks(sequence.window.xMin, sequence.window.xMax);
  const yTicks = buildTicks(
    sequence.window.yMin,
    sequence.window.yMax,
    niceStep(sequence.window.yMax - sequence.window.yMin),
  );
  const path = buildSequencePath(sequence);

  return (
    <section className="sequence-section" aria-label="Sequence analysis">
      <div className="sequence-heading">
        <div>
          <h3>Sequence Pattern</h3>
          <p>{sequence.summary}</p>
        </div>
        <div className="sequence-kind">{sequence.kind}</div>
      </div>

      <div className="sequence-top">
        <div className="graph-stage">
          <svg
            aria-label="Sequence graph"
            className="graph-canvas"
            role="img"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          >
            {xTicks.map((tick) => {
              const x = scaleX(tick, sequence);
              return (
                <g key={`x-${tick}`}>
                  <line
                    className="graph-grid-line"
                    x1={x}
                    x2={x}
                    y1={padding.top}
                    y2={viewBoxHeight - padding.bottom}
                  />
                  <text
                    className="graph-axis-label"
                    textAnchor="middle"
                    x={x}
                    y={viewBoxHeight - 10}
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {yTicks.map((tick) => {
              const y = scaleY(tick, sequence);
              return (
                <g key={`y-${tick}`}>
                  <line
                    className="graph-grid-line"
                    x1={padding.left}
                    x2={viewBoxWidth - padding.right}
                    y1={y}
                    y2={y}
                  />
                  <text
                    className="graph-axis-label"
                    textAnchor="end"
                    x={padding.left - 10}
                    y={y + 4}
                  >
                    {formatTick(tick)}
                  </text>
                </g>
              );
            })}

            {sequence.window.yMin <= 0 && sequence.window.yMax >= 0 && (
              <line
                className="graph-axis"
                x1={padding.left}
                x2={viewBoxWidth - padding.right}
                y1={scaleY(0, sequence)}
                y2={scaleY(0, sequence)}
              />
            )}

            <path className="sequence-path" d={path} />

            {sequence.points.map((point) => (
              <g key={`${point.n}-${point.value}-${point.projected}`}>
                <line
                  className="sequence-stem"
                  x1={scaleX(point.n, sequence)}
                  x2={scaleX(point.n, sequence)}
                  y1={scaleY(point.value, sequence)}
                  y2={viewBoxHeight - padding.bottom}
                />
                <circle
                  className={`sequence-point ${
                    point.projected
                      ? "sequence-point-projected"
                      : "sequence-point-given"
                  }`}
                  cx={scaleX(point.n, sequence)}
                  cy={scaleY(point.value, sequence)}
                  r={5}
                />
                <text
                  className="graph-point-label"
                  x={scaleX(point.n, sequence) + 8}
                  y={scaleY(point.value, sequence) - 10}
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
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

      <div className="sequence-steps">
        {sequence.steps.map((step, index) => (
          <div className="sequence-step" key={`${step.math}-${index}`}>
            <div className="math-line">{step.math}</div>
            <div className="reason">{step.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildSequencePath(sequence: SequenceAnalysis) {
  const commands: string[] = [];
  for (const [index, point] of sequence.points.entries()) {
    const command = index === 0 ? "M" : "L";
    commands.push(
      `${command}${scaleX(point.n, sequence)} ${scaleY(point.value, sequence)}`,
    );
  }
  return commands.join(" ");
}

function buildIntegerTicks(min: number, max: number) {
  const ticks: number[] = [];
  const start = Math.ceil(min);
  const end = Math.floor(max);

  for (let value = start; value <= end; value += 1) {
    ticks.push(value);
  }

  return ticks;
}

function buildTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;

  for (let value = start; value <= max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  return ticks;
}

function scaleX(value: number, sequence: SequenceAnalysis) {
  const drawableWidth = viewBoxWidth - padding.left - padding.right;
  return (
    padding.left +
    ((value - sequence.window.xMin) / (sequence.window.xMax - sequence.window.xMin)) *
      drawableWidth
  );
}

function scaleY(value: number, sequence: SequenceAnalysis) {
  const drawableHeight = viewBoxHeight - padding.top - padding.bottom;
  return (
    viewBoxHeight -
    padding.bottom -
    ((value - sequence.window.yMin) / (sequence.window.yMax - sequence.window.yMin)) *
      drawableHeight
  );
}

function niceStep(span: number) {
  const rough = Math.max(span / 8, 1);
  const power = 10 ** Math.floor(Math.log10(rough));
  const normalized = rough / power;

  if (normalized <= 1.5) {
    return power;
  }

  if (normalized <= 3.5) {
    return 2 * power;
  }

  if (normalized <= 7.5) {
    return 5 * power;
  }

  return 10 * power;
}

function formatTick(value: number) {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
