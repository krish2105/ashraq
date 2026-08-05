"use client";

/**
 * Recharts injects these at runtime; typing them locally keeps the component stable
 * across Recharts' own TooltipProps churn between major versions.
 */
interface TooltipPayloadEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  formatter?: (value: number | string) => string;
  labelPrefix?: string;
}

/** Shared axis styling so every chart in the app reads as one system. */
export const axisProps = {
  stroke: "hsl(var(--fg-subtle))",
  fontSize: 11.5,
  tickLine: false,
  axisLine: { stroke: "hsl(var(--border))" },
} as const;

export const gridProps = {
  strokeDasharray: "2 6",
  stroke: "hsl(var(--border))",
  vertical: false,
} as const;

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

/**
 * A themed tooltip. Recharts' default is a white box with a hard border that looks
 * broken in dark mode — this one uses the same tokens as every other surface.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelPrefix = "",
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2.5 shadow-raised">
      {label !== undefined && (
        <p className="mb-1.5 text-step--2 font-semibold text-fg">
          {labelPrefix}
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2 text-step--2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-fg-muted">{entry.name}</span>
            <span className="tabular ml-auto pl-3 font-semibold text-fg">
              {formatter ? formatter(entry.value ?? 0) : entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
