"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useState } from "react";
import type { FullResults } from "@/lib/finance-engine";
import { formatAED, formatAEDCompact } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Table2, ChartColumnBig } from "lucide-react";

export function CashflowPanel({ results }: { results: FullResults }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const data = results.cashFlows.map((r) => ({
    year: r.year,
    net: r.netCashFlow,
    discounted: r.discountedCashFlow,
    cumulative: r.cumulativeCashFlow,
  }));

  return (
    <section aria-labelledby="cashflow-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="cashflow-heading" className="font-display text-step-2 font-bold tracking-tight">
            Year-by-year cash flow
          </h2>
          <p className="mt-1.5 max-w-2xl text-step--1 leading-relaxed text-fg-muted">
            Year 0 is the outflow — CAPEX plus working capital. Years 1 to{" "}
            {results.inputs.projectLifeYears} are avoided electricity cost less O&amp;M, taxed, with
            depreciation added back. The final year also recovers after-tax salvage and releases
            working capital.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border bg-bg-subtle p-1">
          <Button
            variant={view === "chart" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setView("chart")}
            aria-pressed={view === "chart"}
          >
            <ChartColumnBig className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Chart
          </Button>
          <Button
            variant={view === "table" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
          >
            <Table2 className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Table
          </Button>
        </div>
      </div>

      {view === "chart" ? (
        <div className="h-[420px] w-full rounded-2xl border border-border bg-surface p-4 pr-6 shadow-soft">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="year"
                {...axisProps}
                label={{ value: "Year", position: "insideBottom", offset: -2, fontSize: 12 }}
              />
              <YAxis {...axisProps} tickFormatter={formatAEDCompact} width={78} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => formatAED(Number(v))} labelPrefix="Year " />}
                cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
              <Bar
                dataKey="net"
                name="Net cash flow"
                fill="hsl(var(--chart-1))"
                radius={[3, 3, 0, 0]}
                maxBarSize={26}
              />
              <Bar
                dataKey="discounted"
                name="Discounted"
                fill="hsl(var(--chart-2))"
                radius={[3, 3, 0, 0]}
                maxBarSize={26}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Cumulative"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[820px] text-step--1">
            <caption className="sr-only">
              Year-by-year cash flow schedule for Alternative A
            </caption>
            <thead>
              <tr className="border-b border-border bg-bg-subtle/70 text-left">
                {[
                  "Year",
                  "Generation (kWh)",
                  "Avoided cost",
                  "O&M",
                  "Depreciation",
                  "Tax",
                  "Operating CF",
                  "Terminal CF",
                  "Net CF",
                  "Discounted CF",
                ].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 font-semibold text-fg-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.cashFlows.map((r) => (
                <tr
                  key={r.year}
                  className="border-b border-border/60 transition-colors last:border-0 hover:bg-bg-subtle/50"
                >
                  <th scope="row" className="px-3 py-2.5 text-left font-semibold">
                    {r.year}
                  </th>
                  <td className="px-3 py-2.5">
                    {r.year === 0 ? "—" : Math.round(r.generationKwh).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5">{r.year === 0 ? "—" : formatAED(r.avoidedCost)}</td>
                  <td className="px-3 py-2.5">{r.year === 0 ? "—" : formatAED(r.omCost)}</td>
                  <td className="px-3 py-2.5">{r.year === 0 ? "—" : formatAED(r.depreciation)}</td>
                  <td className="px-3 py-2.5">{r.year === 0 ? "—" : formatAED(r.tax)}</td>
                  <td className="px-3 py-2.5">
                    {r.year === 0 ? "—" : formatAED(r.operatingCashFlow)}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.terminalCashFlow ? formatAED(r.terminalCashFlow) : "—"}
                  </td>
                  <td className="px-3 py-2.5 font-semibold">{formatAED(r.netCashFlow)}</td>
                  <td className="px-3 py-2.5">{formatAED(r.discountedCashFlow)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
