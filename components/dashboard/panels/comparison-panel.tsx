"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { FullResults } from "@/lib/finance-engine";
import { formatAED, formatAEDCompact, formatPercent, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Badge } from "@/components/ui/primitives";
import { Scale, Trophy } from "lucide-react";

export function ComparisonPanel({ results }: { results: FullResults }) {
  const { comparison, inputs } = results;

  const chartData = comparison.alternatives.map((a) => ({
    name: `${a.id} — ${a.name}`,
    short: a.id,
    npv: a.npv,
  }));

  const colorFor = (id: string) =>
    id === comparison.winner.id ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))";

  return (
    <section aria-labelledby="comparison-heading" className="space-y-6">
      <div>
        <h2 id="comparison-heading" className="font-display text-step-2 font-bold tracking-tight">
          Alternative comparison
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          Each alternative is discounted at a rate matched to its own risk. The rate used is shown
          in every row — a single blended table that hid which rate applied to which column would
          make this comparison meaningless.
        </p>
      </div>

      {/* The headline finding */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-start",
          comparison.tensionFlag
            ? "border-warning/40 bg-warning-soft/50"
            : "border-primary/35 bg-primary-soft/40"
        )}
      >
        {comparison.tensionFlag ? (
          <Scale className="h-5 w-5 shrink-0 text-warning" strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <Trophy
            className="h-5 w-5 shrink-0 text-primary-strong"
            strokeWidth={2.2}
            aria-hidden="true"
          />
        )}
        <div>
          <p className="text-step-0 font-semibold">
            {comparison.tensionFlag
              ? "Too close to call on NPV alone"
              : `Alternative ${comparison.winner.id} leads on risk-adjusted NPV`}
          </p>
          <p className="mt-1.5 text-step--1 leading-relaxed text-fg-muted">
            {comparison.tensionNote}
          </p>
        </div>
      </div>

      <div className="h-[300px] w-full rounded-2xl border border-border bg-surface p-4 pr-6 shadow-soft">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="short" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={formatAEDCompact} width={78} />
            <Tooltip
              content={<ChartTooltip formatter={(v) => formatAED(Number(v))} />}
              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
            />
            <Bar dataKey="npv" name="NPV / PV" radius={[6, 6, 0, 0]} maxBarSize={90}>
              {chartData.map((d) => (
                <Cell key={d.short} fill={colorFor(d.short)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[760px] text-step--1">
          <caption className="sr-only">Comparison of investment alternatives A, B, C and D</caption>
          <thead>
            <tr className="border-b border-border bg-bg-subtle/70 text-left">
              {["", "Alternative", "Initial outflow", "NPV / PV", "Discount rate", "IRR", "Payback"].map(
                (h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {comparison.alternatives.map((a) => (
              <tr
                key={a.id}
                className={cn(
                  "border-b border-border/60 align-top last:border-0",
                  a.id === comparison.winner.id && "bg-primary-soft/25"
                )}
              >
                <th scope="row" className="px-4 py-4 text-left">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-bg-subtle font-display font-bold">
                    {a.id}
                  </span>
                </th>
                <td className="px-4 py-4">
                  <p className="font-semibold">{a.name}</p>
                  <p className="mt-1 max-w-sm text-step--2 leading-relaxed text-fg-muted">
                    {a.note}
                  </p>
                </td>
                <td className="tabular px-4 py-4">{formatAED(a.initialOutflow)}</td>
                <td className="tabular px-4 py-4 font-semibold">{formatAED(a.npv)}</td>
                <td className="px-4 py-4">
                  <Badge tone={a.id === "B" ? "accent" : "neutral"}>
                    {formatPercent(a.discountRate, 1)}
                  </Badge>
                </td>
                <td className="tabular px-4 py-4">
                  {a.irr === null ? (
                    <span className="text-fg-subtle">Undefined</span>
                  ) : (
                    formatPercent(a.irr)
                  )}
                </td>
                <td className="tabular px-4 py-4">
                  {a.paybackPeriod === null ? "—" : `${a.paybackPeriod.toFixed(2)} yrs`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-border bg-bg-subtle/50 p-5">
        <h3 className="font-display text-step-1 font-bold tracking-tight">
          Why the naive comparison gets this wrong
        </h3>
        <p className="mt-2.5 text-step--1 leading-relaxed text-fg-muted">
          Discounted at a single uniform {formatPercent(inputs.discountRateCapex, 1)}, the PPA is
          worth <strong className="tabular text-fg">{formatAED(results.ppa.pvAtCapexRate)}</strong>.
          Discounted at its own {formatPercent(inputs.discountRatePpa, 1)} counterparty-risk rate, it
          is worth <strong className="tabular text-fg">{formatAED(results.ppa.pvAtPpaRate)}</strong>.
          The correction <em className="not-italic font-semibold text-fg">widens</em> the PPA&rsquo;s
          advantage over ownership rather than narrowing it — which is why the choice of discount
          rate here changes which alternative wins, not merely by how much.
        </p>
      </div>
    </section>
  );
}
