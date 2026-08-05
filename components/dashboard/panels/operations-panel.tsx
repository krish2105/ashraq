"use client";

import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { useAshraqStore } from "@/lib/store";
import {
  computeRealOptions,
  computeSoilingOptimisation,
  computeCapitalRationing,
} from "@/lib/finance-engine-options";
import { formatAED, formatAEDCompact, formatPercent, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Badge, InfoTip } from "@/components/ui/primitives";
import { Droplets, GitBranch, Wallet, TriangleAlert, Info } from "lucide-react";

/**
 * Operations & allocation — the three analyses that answer questions a board asks
 * but a standard NPV model does not: what is our flexibility worth, how often
 * should we clean the panels, and does this beat the other calls on our capital?
 */
export function OperationsPanel() {
  const { inputs } = useAshraqStore();

  const options = useMemo(() => computeRealOptions(inputs), [inputs]);
  const soiling = useMemo(() => computeSoilingOptimisation(inputs), [inputs]);
  const rationing = useMemo(() => computeCapitalRationing(inputs), [inputs]);

  const soilingChart = soiling.scenarios.map((s) => ({
    interval: s.intervalDays,
    cleaning: s.annualCleaningCost,
    lostEnergy: s.annualValueOfLostEnergy,
    total: s.totalAnnualCost,
  }));

  return (
    <section aria-labelledby="ops-heading" className="space-y-8">
      <div>
        <h2 id="ops-heading" className="font-display text-step-2 font-bold tracking-tight">
          Operations &amp; capital allocation
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          Three questions a standard NPV model does not answer: what managerial flexibility is
          worth, how often the panels should actually be cleaned, and whether this project survives
          competition for a finite capital budget.
        </p>
      </div>

      {/* ------------------- Real options ------------------- */}
      <article className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <GitBranch className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" strokeWidth={2.1} aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="flex items-center font-display text-step-1 font-bold tracking-tight">
              Real options — what is our flexibility worth?
              <InfoTip label="real options">
                Valued on a Cox-Ross-Rubinstein binomial lattice. Volatility is calibrated from the
                Monte Carlo distribution rather than assumed, so the two risk analyses agree by
                construction.
              </InfoTip>
            </h3>
            <p className="mt-2 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
              {options.headline}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { k: "Volatility (calibrated)", v: formatPercent(options.volatility, 1) },
            { k: "Cash-flow yield", v: formatPercent(options.dividendYield, 1) },
            { k: "Risk-neutral probability", v: options.riskNeutralProbability.toFixed(3) },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-border bg-bg-subtle/50 p-4">
              <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">{s.k}</dt>
              <dd className="tabular mt-1 font-display text-step-1 font-bold">{s.v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 space-y-3">
          {options.options.map((o) => (
            <div key={o.name} className="rounded-xl border border-border bg-bg-subtle/40 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="flex items-center gap-2 text-step--1 font-semibold">
                  {o.name}
                  <Badge
                    tone={
                      o.materiality === "Material"
                        ? "primary"
                        : o.materiality === "Marginal"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {o.materiality}
                  </Badge>
                </span>
                <span className="tabular text-step-0 font-bold">{formatAED(o.optionValue)}</span>
              </div>
              <p className="mt-1.5 text-step--2 leading-relaxed text-fg-muted">{o.description}</p>
              <p className="mt-2 text-step--2 leading-relaxed text-fg-muted">{o.interpretation}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent-soft/30 p-4 text-step--2 leading-relaxed text-fg-muted">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.4} aria-hidden="true" />
          <span>
            <strong className="text-fg">Cost of waiting: {options.dividendYieldNote}</strong>
          </span>
        </p>
      </article>

      {/* ------------------- Soiling ------------------- */}
      <article className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={2.1} aria-hidden="true" />
          <div>
            <h3 className="font-display text-step-1 font-bold tracking-tight">
              How often should the panels be cleaned?
            </h3>
            <p className="mt-2 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
              Dubai&rsquo;s dust load makes this a real optimisation, not a housekeeping detail.
              Clean too rarely and output is lost; clean too often and the labour costs more than it
              recovers. The optimum is interior, and it is worth real money.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            { k: "Optimal interval", v: `${soiling.optimalIntervalDays} days`, highlight: true },
            { k: "Cleans per year", v: soiling.optimalCleansPerYear.toFixed(1) },
            { k: "PV of getting this right", v: formatAED(soiling.npvImpactOverLife), highlight: true },
          ].map((s) => (
            <div
              key={s.k}
              className={cn(
                "rounded-xl border p-4",
                s.highlight ? "border-primary/40 bg-primary-soft/45" : "border-border bg-bg-subtle/50"
              )}
            >
              <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">{s.k}</dt>
              <dd className="tabular mt-1 font-display text-step-1 font-bold">{s.v}</dd>
            </div>
          ))}
        </div>

        <div className="mt-5 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={soilingChart} margin={{ top: 10, right: 8, bottom: 16, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis
                dataKey="interval"
                {...axisProps}
                label={{ value: "Days between cleans", position: "insideBottom", offset: -8, fontSize: 11 }}
              />
              <YAxis {...axisProps} tickFormatter={formatAEDCompact} width={72} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => formatAED(Number(v))} labelPrefix="Every " />}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
              <ReferenceLine
                x={soiling.optimalIntervalDays}
                stroke="hsl(var(--primary))"
                strokeDasharray="5 4"
                label={{ value: "optimum", fontSize: 10, fill: "hsl(var(--primary-strong))", position: "top" }}
              />
              <Line type="monotone" dataKey="cleaning" name="Cleaning cost" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="lostEnergy" name="Value of lost output" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="total" name="Total annual cost" stroke="hsl(var(--chart-1))" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 rounded-xl border border-border bg-bg-subtle/50 p-4 text-step--1 leading-relaxed text-fg-muted">
          {soiling.recommendation}
        </p>
        <p className="mt-2 text-step--2 leading-relaxed text-fg-subtle">
          {soiling.currentAssumptionNote}
        </p>
      </article>

      {/* ------------------- Capital rationing ------------------- */}
      <article className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-primary-strong" strokeWidth={2.1} aria-hidden="true" />
          <div>
            <h3 className="font-display text-step-1 font-bold tracking-tight">
              Does this survive competition for capital?
            </h3>
            <p className="mt-2 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
              Solar is not competing against nothing — it competes against every other call on the
              same budget. Two ranking methods are shown, because they are correct in different
              circumstances and here they disagree.
            </p>
          </div>
        </div>

        {/* The disclaimer sits ABOVE the data, not below it */}
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-warning/45 bg-warning-soft/50 p-4">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2.4} aria-hidden="true" />
          <p className="text-step--2 leading-relaxed text-fg-muted">{rationing.disclaimer}</p>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[620px] text-step--1">
            <caption className="sr-only">Competing capital projects</caption>
            <thead>
              <tr className="border-b border-border bg-bg-subtle/70 text-left">
                {["Project", "Investment", "NPV", "PI", "Divisible"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-semibold text-fg-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rationing.projects.map((p) => (
                <tr
                  key={p.id}
                  className={cn(
                    "border-b border-border/50 align-top last:border-0",
                    p.id === "SOLAR" && "bg-primary-soft/30"
                  )}
                >
                  <th scope="row" className="px-3 py-3 text-left">
                    <span className="font-semibold">{p.name}</span>
                    {p.illustrative && (
                      <Badge tone="warning" className="ml-2">Illustrative</Badge>
                    )}
                    <span className="mt-1 block text-step--2 font-normal text-fg-muted">{p.note}</span>
                  </th>
                  <td className="tabular px-3 py-3">{formatAED(p.initialInvestment)}</td>
                  <td className="tabular px-3 py-3 font-semibold">{formatAED(p.npv)}</td>
                  <td className="tabular px-3 py-3">{p.profitabilityIndex.toFixed(3)}</td>
                  <td className="px-3 py-3">{p.divisible ? "Yes" : "No"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-bg-subtle/50 p-4">
            <p className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
              Ranked by profitability index
            </p>
            <p className="mt-2 text-step--1 font-semibold">
              {rationing.piSelection.selected.map((p) => p.name).join(" + ") || "None affordable"}
            </p>
            <p className="tabular mt-1 text-step-1 font-bold">{formatAED(rationing.piSelection.totalNpv)}</p>
            <p className="mt-1 text-step--2 text-fg-subtle">
              Spends {formatAED(rationing.piSelection.totalSpend)} of {formatAED(rationing.budget)}
            </p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary-soft/45 p-4">
            <p className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
              Best feasible combination
            </p>
            <p className="mt-2 text-step--1 font-semibold">
              {rationing.optimalSelection.selected.map((p) => p.name).join(" + ") || "None affordable"}
            </p>
            <p className="tabular mt-1 text-step-1 font-bold">{formatAED(rationing.optimalSelection.totalNpv)}</p>
            <p className="mt-1 text-step--2 text-fg-subtle">
              Spends {formatAED(rationing.optimalSelection.totalSpend)} of {formatAED(rationing.budget)}
            </p>
          </div>
        </div>

        <p
          className={cn(
            "mt-4 rounded-xl border p-4 text-step--1 leading-relaxed",
            rationing.methodsAgree
              ? "border-border bg-bg-subtle/50 text-fg-muted"
              : "border-accent/40 bg-accent-soft/40 text-fg-muted"
          )}
        >
          {rationing.insight}
        </p>
      </article>
    </section>
  );
}
