import type { OutputMode, RenderedTrace, SolveTrace } from "./types";

export function renderTrace(trace: SolveTrace, mode: OutputMode): RenderedTrace {
  if (trace.result.kind === "unsupported") {
    return {
      lines: [
        {
          math: trace.input,
          note: trace.result.explanation ?? "Unsupported problem type.",
        },
      ],
    };
  }

  if (mode === "hint") {
    const next = trace.steps[0];
    return {
      lines: [
        {
          math: next?.after.text ?? trace.input,
          note: next
            ? `${next.operation}. ${next.reason}`
            : "No next step is needed.",
        },
      ],
    };
  }

  const lines = [
    {
      math: trace.steps[0]?.before.text ?? trace.input,
      note: mode === "annotated" ? "Start with the given problem." : "",
    },
    ...trace.steps.map((step) => ({
      math: step.after.text,
      note:
        mode === "annotated"
          ? `${step.operation}. ${step.reason}`
          : step.operation,
    })),
  ];

  return { lines };
}

