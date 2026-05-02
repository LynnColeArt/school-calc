import type { GeometryAnalysis, GeometryPoint } from "../lib/algebra/types";

const viewBoxWidth = 720;
const viewBoxHeight = 420;
const padding = { top: 28, right: 28, bottom: 34, left: 48 };

export function GeometryPanel({ geometry }: { geometry: GeometryAnalysis }) {
  const tickStepX = niceStep(geometry.window.xMax - geometry.window.xMin);
  const tickStepY = niceStep(geometry.window.yMax - geometry.window.yMin);
  const xTicks = buildTicks(geometry.window.xMin, geometry.window.xMax, tickStepX);
  const yTicks = buildTicks(geometry.window.yMin, geometry.window.yMax, tickStepY);
  const pointA = geometry.points[0];
  const pointB = geometry.points[1];
  const midpoint = geometry.points[2];

  if (!pointA || !pointB || !midpoint) {
    return null;
  }

  return (
    <section className="geometry-section" aria-label="Coordinate geometry">
      <div className="geometry-heading">
        <div>
          <h3>Coordinate Geometry</h3>
          <p>{geometry.summary}</p>
        </div>
        <div className="sequence-kind">points</div>
      </div>

      <div className="geometry-top">
        <div className="graph-stage">
          <svg
            aria-label="Coordinate geometry diagram"
            className="graph-canvas"
            role="img"
            viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          >
            {xTicks.map((tick) => {
              const x = scaleX(tick, geometry);
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
              const y = scaleY(tick, geometry);
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

            {geometry.window.yMin <= 0 && geometry.window.yMax >= 0 && (
              <line
                className="graph-axis"
                x1={padding.left}
                x2={viewBoxWidth - padding.right}
                y1={scaleY(0, geometry)}
                y2={scaleY(0, geometry)}
              />
            )}

            {geometry.window.xMin <= 0 && geometry.window.xMax >= 0 && (
              <line
                className="graph-axis"
                x1={scaleX(0, geometry)}
                x2={scaleX(0, geometry)}
                y1={padding.top}
                y2={viewBoxHeight - padding.bottom}
              />
            )}

            <path className="geometry-line" d={buildLinePath(geometry)} />
            <line
              className="geometry-segment"
              x1={scaleX(pointA.x, geometry)}
              x2={scaleX(pointB.x, geometry)}
              y1={scaleY(pointA.y, geometry)}
              y2={scaleY(pointB.y, geometry)}
            />

            {geometry.points.map((point) => (
              <g key={`${point.role}-${point.label}`}>
                <circle
                  className={`geometry-point geometry-point-${point.role}`}
                  cx={scaleX(point.x, geometry)}
                  cy={scaleY(point.y, geometry)}
                  r={point.role === "midpoint" ? 5 : 6}
                />
                <text
                  className="graph-point-label"
                  x={scaleX(point.x, geometry) + 8}
                  y={scaleY(point.y, geometry) + pointLabelOffset(point)}
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        </div>

        <div className="geometry-sidebar">
          <dl className="graph-features">
            {geometry.features.map((feature) => (
              <div className="graph-feature-row" key={feature.label}>
                <dt>{feature.label}</dt>
                <dd>{feature.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="geometry-steps">
        {geometry.steps.map((step, index) => (
          <div className="sequence-step" key={`${step.math}-${index}`}>
            <div className="math-line">{step.math}</div>
            <div className="reason">{step.note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildLinePath(geometry: GeometryAnalysis) {
  if (geometry.line.kind === "vertical") {
    const x = scaleX(geometry.line.x, geometry);
    return `M${x} ${padding.top} L${x} ${viewBoxHeight - padding.bottom}`;
  }

  const leftX = geometry.window.xMin;
  const rightX = geometry.window.xMax;
  const leftY = geometry.line.slope * leftX + geometry.line.intercept;
  const rightY = geometry.line.slope * rightX + geometry.line.intercept;
  return `M${scaleX(leftX, geometry)} ${scaleY(leftY, geometry)} L${scaleX(rightX, geometry)} ${scaleY(rightY, geometry)}`;
}

function scaleX(value: number, geometry: GeometryAnalysis) {
  const drawableWidth = viewBoxWidth - padding.left - padding.right;
  return (
    padding.left +
    ((value - geometry.window.xMin) /
      (geometry.window.xMax - geometry.window.xMin)) *
      drawableWidth
  );
}

function scaleY(value: number, geometry: GeometryAnalysis) {
  const drawableHeight = viewBoxHeight - padding.top - padding.bottom;
  return (
    viewBoxHeight -
    padding.bottom -
    ((value - geometry.window.yMin) /
      (geometry.window.yMax - geometry.window.yMin)) *
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

function pointLabelOffset(point: GeometryPoint) {
  return point.role === "midpoint" ? -10 : 18;
}

function formatTick(value: number) {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}
