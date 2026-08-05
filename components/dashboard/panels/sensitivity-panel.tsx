"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { FullResults } from "@/lib/finance-engine";
import { formatAED, formatAEDCompact, formatPercent } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";

export function SensitivityPanel({ results }: { results: FullResults }) {
  const base = results.metrics.npv;

  // Tornado: each bar spans from the low-case NPV to the high-case NPV, measured
  // as a deviation from base so the chart reads as "how far can this one
  // assumption move the answer".
  const data = [...results.sensitivity].reverse().map((s) => ({
    variable: s.variable,
    low: s.lowNpv - base,
    high: s.highNpv - base,
    lowNpv: s.lowNpv,
    highNpv: s.highNpv,
    swing: s.swing,
    description: s.description,
  }));

  const mostSensitive = results.sensitivity[0];

  return (
    <section aria-labelledby="sensitivity-heading" className="space-y-6">
      <div>
        <h2 id="sensitivity-heading" className="font-display text-step-2 font-bold tracking-tight">
          Sensitivity analysis
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          One assumption moves at a time while everything else is held at base. The longest bar is
          the assumption the decision is most exposed to — the one worth spending real diligence on
          before committing capital.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-5">
        <p className="text-step-0">
          <strong className="font-semibold">{mostSensitive.variable}</strong> is the dominant
          exposure: moving it across {mostSensitive.description.toLowerCase()} swings NPV by{" "}
          <strong className="tabular">{formatAED(mostSensitive.swing)}</strong>.
        </p>
      </div>

      <div className="h-[340px] w-full rounded-2xl border border-border bg-surface p-4 pr-6 shadow-soft">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 10, right: 20, bottom: 4, left: 12 }}
            stackOffset="sign"
          >
            <CartesianGrid {...gridProps} vertical horizontal={false} />
            <XAxis
              type="number"
              {...axisProps}
              tickFormatter={(v) => formatAEDCompact(Number(v) + base)}
            />
            <YAxis type="category" dataKey="variable" {...axisProps} width={116} />
            <Tooltip
              content={
                <ChartTooltip formatter={(v) => formatAED(Number(v) + base)} />
              }
              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
            />
            <ReferenceLine x={0} stroke="hsl(var(--fg-subtle))" strokeWidth={1.5} />
            <Bar dataKey="low" name="Downside" radius={[3, 3, 3, 3]} maxBarSize={26}>
              {data.map((_, i) => (
                <Cell key={i} fill="hsl(var(--chart-5))" />
              ))}
            </Bar>
            <Bar dataKey="high" name="Upside" radius={[3, 3, 3, 3]} maxBarSize={26}>
              {data.map((_, i) => (
                <Cell key={i} fill="hsl(var(--chart-3))" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[640px] text-step--1">
          <caption className="sr-only">Sensitivity of NPV to each input assumption</caption>
          <thead>
            <tr className="border-b border-border bg-bg-subtle/70 text-left">
              {["Variable", "Range tested", "Downside NPV", "Upside NPV", "Swing"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-semibold text-fg-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.sensitivity.map((s) => (
              <tr key={s.variable} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  {s.variable}
                </th>
                <td className="px-4 py-3 text-fg-muted">{s.description}</td>
                <td className="tabular px-4 py-3">{formatAED(s.lowNpv)}</td>
                <td className="tabular px-4 py-3">{formatAED(s.highNpv)}</td>
                <td className="tabular px-4 py-3 font-semibold">{formatAED(s.swing)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Break-even */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <h3 className="font-display text-step-1 font-bold tracking-tight">
          Break-even tariff — the margin of safety
        </h3>
        <p className="mt-2 text-step--1 leading-relaxed text-fg-muted">
          The blended avoided-cost tariff would have to fall to{" "}
          <strong className="tabular text-fg">
            AED {results.breakEven.breakEvenTariff.toFixed(4)}/kWh
          </strong>{" "}
          before this project stops creating value — against an assumed{" "}
          <strong className="tabular text-fg">
            AED {results.breakEven.currentTariff.toFixed(2)}/kWh
          </strong>
          . That is a cushion of {formatPercent(results.breakEven.marginOfSafetyPercent, 1)}.
        </p>

        <div className="mt-6">
          <div
            className="relative h-11 w-full overflow-hidden rounded-lg bg-bg-subtle"
            role="img"
            aria-label={`Break-even tariff is AED ${results.breakEven.breakEvenTariff.toFixed(
              4
            )} per kWh against a current assumption of AED ${results.breakEven.currentTariff.toFixed(
              2
            )} per kWh`}
          >
            <div
              className="h-full rounded-lg bg-danger/25"
              style={{
                width: `${Math.min(
                  100,
                  (results.breakEven.breakEvenTariff / results.breakEven.currentTariff) * 100
                )}%`,
              }}
            />
            <div
              className="absolute inset-y-0 w-0.5 bg-danger"
              style={{
                left: `${Math.min(
                  100,
                  (results.breakEven.breakEvenTariff / results.breakEven.currentTariff) * 100
                )}%`,
              }}
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-step--2 font-semibold">
              Current: AED {results.breakEven.currentTariff.toFixed(2)}
            </span>
            <span className="absolute inset-y-0 left-3 flex items-center text-step--2 font-medium text-fg-muted">
              Break-even: AED {results.breakEven.breakEvenTariff.toFixed(3)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
