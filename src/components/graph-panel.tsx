import type { GraphAnalysis, GraphPoint } from "../lib/algebra/types";

const viewBoxWidth = 720;
const viewBoxHeight = 420;
const padding = { top: 28, right: 28, bottom: 34, left: 48 };

export function GraphPanel({ graph }: { graph: GraphAnalysis }) {
  const tickStepX = niceStep(graph.window.xMax - graph.window.xMin);
  const tickStepY = niceStep(graph.window.yMax - graph.window.yMin);
  const xTicks = buildTicks(graph.window.xMin, graph.window.xMax, tickStepX);
  const yTicks = buildTicks(graph.window.yMin, graph.window.yMax, tickStepY);
  const curve = buildCurvePath(graph);

  return (
    <section className="graph-section" aria-label="Graph analysis">
      <div className="graph-heading">
        <div>
          <h3>Graph</h3>
          <p>{graph.summary}</p>
        </div>
        <div className="graph-equation">{graph.equation}</div>
      </div>

      <div className="graph-layout">
        <div className="graph-stage">
          <svg
            aria-label={graph.equation}
            className="graph-canvas"
            role="img"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          >
            {xTicks.map((tick) => {
              const x = scaleX(tick, graph);
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
                    {formatTick(tick)}
                  </text>
                </g>
              );
            })}

            {yTicks.map((tick) => {
              const y = scaleY(tick, graph);
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

            {graph.window.yMin <= 0 && graph.window.yMax >= 0 && (
              <line
                className="graph-axis"
                x1={padding.left}
                x2={viewBoxWidth - padding.right}
                y1={scaleY(0, graph)}
                y2={scaleY(0, graph)}
              />
            )}

            {graph.window.xMin <= 0 && graph.window.xMax >= 0 && (
              <line
                className="graph-axis"
                x1={scaleX(0, graph)}
                x2={scaleX(0, graph)}
                y1={padding.top}
                y2={viewBoxHeight - padding.bottom}
              />
            )}

            <path className="graph-curve" d={curve} />

            {graph.highlightedPoints.map((point) => (
              <g key={`${point.role}-${point.label}`}>
                <circle
                  className={`graph-point graph-point-${point.role}`}
                  cx={scaleX(point.x, graph)}
                  cy={scaleY(point.y, graph)}
                  r={5}
                />
                <text
                  className="graph-point-label"
                  x={scaleX(point.x, graph) + 8}
                  y={scaleY(point.y, graph) + pointLabelOffset(point)}
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="graph-sidebar">
          <dl className="graph-features">
            {graph.features.map((feature) => (
              <div className="graph-feature-row" key={feature.label}>
                <dt>{feature.label}</dt>
                <dd>{feature.value}</dd>
              </div>
            ))}
          </dl>

          <table className="graph-table">
            <thead>
              <tr>
                <th>x</th>
                <th>y</th>
              </tr>
            </thead>
            <tbody>
              {graph.table.map((row) => (
                <tr key={`${row.x}-${row.y}`}>
                  <td>{row.x}</td>
                  <td>{row.y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function buildCurvePath(graph: GraphAnalysis) {
  const samples = 160;
  const points: string[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples;
    const x = graph.window.xMin + ratio * (graph.window.xMax - graph.window.xMin);
    const y = graph.coefficients.a * x * x + graph.coefficients.b * x + graph.coefficients.c;
    const command = index === 0 ? "M" : "L";
    points.push(`${command}${scaleX(x, graph)} ${scaleY(y, graph)}`);
  }

  return points.join(" ");
}

function scaleX(value: number, graph: GraphAnalysis) {
  const drawableWidth = viewBoxWidth - padding.left - padding.right;
  return (
    padding.left +
    ((value - graph.window.xMin) / (graph.window.xMax - graph.window.xMin)) *
      drawableWidth
  );
}

function scaleY(value: number, graph: GraphAnalysis) {
  const drawableHeight = viewBoxHeight - padding.top - padding.bottom;
  return (
    viewBoxHeight -
    padding.bottom -
    ((value - graph.window.yMin) / (graph.window.yMax - graph.window.yMin)) *
      drawableHeight
  );
}

function buildTicks(min: number, max: number, step: number) {
  const ticks: number[] = [];
  const start = Math.ceil(min / step) * step;

  for (let value = start; value <= max + 1e-9; value += step) {
    ticks.push(Number(value.toFixed(6)));
  }

  return ticks;
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

function pointLabelOffset(point: GraphPoint) {
  if (point.role === "vertex") {
    return -10;
  }

  return point.y <= 0 ? -10 : 18;
}

function formatTick(value: number) {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
