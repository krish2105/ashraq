"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import type { FullResults } from "@/lib/finance-engine";
import { formatAED, formatAEDCompact, formatPercent, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";

const TONES = {
  "Best case": { bar: "hsl(var(--chart-3))", card: "border-success/35 bg-success-soft/40" },
  "Base case": { bar: "hsl(var(--chart-1))", card: "border-primary/35 bg-primary-soft/40" },
  "Worst case": { bar: "hsl(var(--chart-5))", card: "border-danger/35 bg-danger-soft/40" },
} as const;

export function ScenariosPanel({ results }: { results: FullResults }) {
  const data = results.scenarios.map((s) => ({ name: s.name, npv: s.npv }));
  const worst = results.scenarios.find((s) => s.name === "Worst case")!;

  return (
    <section aria-labelledby="scenarios-heading" className="space-y-6">
      <div>
        <h2 id="scenarios-heading" className="font-display text-step-2 font-bold tracking-tight">
          Scenario analysis
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          Unlike sensitivity analysis, these move several assumptions together in coherent bundles —
          which is how risk actually arrives. Cost overruns and disappointing output tend to happen
          in the same year, not in isolation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {results.scenarios.map((s) => (
          <article
            key={s.name}
            className={cn("rounded-2xl border p-5", TONES[s.name].card)}
          >
            <h3 className="font-display text-step-1 font-bold tracking-tight">{s.name}</h3>
            <p className="mt-1.5 text-step--2 leading-relaxed text-fg-muted">{s.description}</p>
            <p className="tabular mt-4 font-display text-step-2 font-bold">{formatAED(s.npv)}</p>
            <dl className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-step--2">
              <div className="flex justify-between gap-2">
                <dt className="text-fg-muted">IRR</dt>
                <dd className="tabular font-semibold">
                  {s.irr === null ? "—" : formatPercent(s.irr)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-muted">Payback</dt>
                <dd className="tabular font-semibold">
                  {s.paybackPeriod === null ? "Never" : `${s.paybackPeriod.toFixed(2)} yrs`}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-muted">PI</dt>
                <dd className="tabular font-semibold">{s.profitabilityIndex.toFixed(3)}</dd>
              </div>
            </dl>
          </article>
        ))}
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
            <Bar dataKey="npv" name="NPV" radius={[6, 6, 0, 0]} maxBarSize={110}>
              {data.map((d) => (
                <Cell key={d.name} fill={TONES[d.name as keyof typeof TONES].bar} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div
        className={cn(
          "rounded-2xl border p-5",
          worst.npv > 0 ? "border-success/35 bg-success-soft/40" : "border-danger/35 bg-danger-soft/40"
        )}
      >
        <p className="text-step-0 leading-relaxed">
          {worst.npv > 0 ? (
            <>
              <strong className="font-semibold">The project survives its own worst case.</strong>{" "}
              Even with a 15% cost overrun, no tariff relief at all, 20% higher maintenance and 10%
              less generation, NPV stays positive at{" "}
              <strong className="tabular">{formatAED(worst.npv)}</strong>. That is the strongest
              single argument for the investment — it does not depend on things going well.
            </>
          ) : (
            <>
              <strong className="font-semibold">The worst case breaks the project.</strong> NPV
              falls to <strong className="tabular">{formatAED(worst.npv)}</strong>, so the downside
              bundle is genuinely capable of destroying value and needs mitigation before
              committing.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
