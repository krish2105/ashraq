"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { useAshraqStore } from "@/lib/store";
import type { FullResults } from "@/lib/finance-engine";
import { formatAED, formatAEDCompact, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Field } from "@/components/ui/primitives";
import { Clock, TrendingDown } from "lucide-react";

export function DelayPanel({ results }: { results: FullResults }) {
  const { inputs, setInput } = useAshraqStore();
  const { delay } = results;

  const data = [
    { name: "Invest now", npv: delay.baseNpv },
    ...delay.scenarios.map((s) => ({
      name: `Wait ${s.delayYears} yr${s.delayYears > 1 ? "s" : ""}`,
      npv: s.npvToday,
    })),
  ];

  const waitingWins = delay.recommendation === "Waiting creates value";

  return (
    <section aria-labelledby="delay-heading" className="space-y-6">
      <div>
        <h2 id="delay-heading" className="font-display text-step-2 font-bold tracking-tight">
          The option to delay
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          Managerial flexibility has value — but it has to be quantified, not asserted. Waiting
          buys a possibly cheaper system at the cost of a year of foregone savings. This panel
          prices that trade honestly.
        </p>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-start",
          waitingWins ? "border-warning/40 bg-warning-soft/50" : "border-success/35 bg-success-soft/45"
        )}
      >
        {waitingWins ? (
          <Clock className="h-5 w-5 shrink-0 text-warning" strokeWidth={2.2} aria-hidden="true" />
        ) : (
          <TrendingDown
            className="h-5 w-5 shrink-0 text-success"
            strokeWidth={2.2}
            aria-hidden="true"
          />
        )}
        <div>
          <p className="text-step-0 font-semibold">
            {waitingWins ? "Waiting creates value under these assumptions" : "Delay destroys value"}
          </p>
          <p className="mt-1.5 text-step--1 leading-relaxed text-fg-muted">{delay.narrative}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="max-w-xs">
          <Field
            label="Annual CAPEX decline"
            suffix="%"
            tip="How much cheaper the system might get each year you wait. IRENA's 2025 data shows global solar costs have stabilised, so 0–2% is the evidence-based range — not the double-digit falls of the pre-2023 decade."
            value={Number((inputs.capexDeclineRate * 100).toFixed(2))}
            onChange={(v) => setInput("capexDeclineRate", v / 100)}
            step={0.5}
            min={0}
          />
        </div>
        <p className="mt-4 max-w-2xl text-step--2 leading-relaxed text-fg-subtle">
          Push this above roughly 30%/yr and the model will start recommending delay. That is
          precisely the point: an optimistic cost-decline assumption is what makes &ldquo;wait and
          see&rdquo; look attractive, and there is no 2026 evidence supporting one.
        </p>
      </div>

      <div className="h-[300px] w-full rounded-2xl border border-border bg-surface p-4 pr-6 shadow-soft">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="name" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={formatAEDCompact} width={78} />
            <Tooltip
              content={<ChartTooltip formatter={(v) => formatAED(Number(v))} />}
              cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
            <Bar dataKey="npv" name="NPV in today's money" radius={[6, 6, 0, 0]} maxBarSize={100}>
              {data.map((d, i) => (
                <Cell key={d.name} fill={i === 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
        <table className="w-full min-w-[680px] text-step--1">
          <caption className="sr-only">Value of delaying the investment by one or two years</caption>
          <thead>
            <tr className="border-b border-border bg-bg-subtle/70 text-left">
              {[
                "Delay",
                "CAPEX if delayed",
                "CAPEX saved",
                "Savings forgone",
                "NPV today",
                "Value of waiting",
              ].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold text-fg-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border/60 bg-primary-soft/20">
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                Invest now
              </th>
              <td className="tabular px-4 py-3">{formatAED(results.metrics.totalCapex)}</td>
              <td className="px-4 py-3 text-fg-subtle">—</td>
              <td className="px-4 py-3 text-fg-subtle">—</td>
              <td className="tabular px-4 py-3 font-semibold">{formatAED(delay.baseNpv)}</td>
              <td className="px-4 py-3 text-fg-subtle">Baseline</td>
            </tr>
            {delay.scenarios.map((s) => (
              <tr key={s.delayYears} className="border-b border-border/60 last:border-0">
                <th scope="row" className="px-4 py-3 text-left font-semibold">
                  Wait {s.delayYears} year{s.delayYears > 1 ? "s" : ""}
                </th>
                <td className="tabular px-4 py-3">{formatAED(s.capexIfDelayed)}</td>
                <td className="tabular px-4 py-3 text-success">{formatAED(s.capexSaving)}</td>
                <td className="tabular px-4 py-3 text-danger">{formatAED(s.forgoneSavings)}</td>
                <td className="tabular px-4 py-3 font-semibold">{formatAED(s.npvToday)}</td>
                <td
                  className={cn(
                    "tabular px-4 py-3 font-semibold",
                    s.valueOfWaiting > 0 ? "text-success" : "text-danger"
                  )}
                >
                  {formatAED(s.valueOfWaiting)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
