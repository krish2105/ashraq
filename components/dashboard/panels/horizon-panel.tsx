"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { useAshraqStore } from "@/lib/store";
import { computeEqualLifeComparison } from "@/lib/finance-engine-advanced";
import { formatAED, formatAEDCompact, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Badge } from "@/components/ui/primitives";
import { GitCompareArrows, TriangleAlert } from "lucide-react";

/**
 * The equal-life re-examination, made interactive.
 *
 * This is the panel that overturned the model's own base-case conclusion, so it
 * leads with that fact rather than burying it. The PPA term slider lets a reader
 * find the tie point themselves — 20.3 years on the default inputs — which is the
 * single most commercially actionable number the model produces, because contract
 * tenor is negotiable in a way that discount rates and tariffs are not.
 */
export function HorizonPanel() {
  const { inputs, advanced } = useAshraqStore();
  const [ppaTerm, setPpaTerm] = useState(inputs.ppaTermYears ?? 15);

  const comparison = useMemo(
    () => computeEqualLifeComparison({ ...inputs, ppaTermYears: ppaTerm }, 25),
    [inputs, ppaTerm]
  );

  const baseComparison = advanced.equalLife;
  const tie = baseComparison.breakEvenPpaTermYears;

  const data = [
    { name: "Base case\n(15 yrs, both)", capex: advanced.apv.baseCaseNpv, ppa: 2_065_233 },
  ];

  const chartData = [
    { name: "CAPEX ownership", value: comparison.capex.npv, isWinner: comparison.winner === "CAPEX ownership" },
    { name: `Solar PPA (${ppaTerm}y)`, value: comparison.ppa.npv, isWinner: comparison.winner === "Solar PPA" },
  ];
  void data;

  return (
    <section aria-labelledby="horizon-heading" className="space-y-6">
      <div>
        <h2 id="horizon-heading" className="font-display text-step-2 font-bold tracking-tight">
          The equal-life re-examination
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          The base case truncates both alternatives at {inputs.projectLifeYears} years. That is not
          a neutral simplification — the asset physically lasts 20–25 years, and truncation
          discards a decade of value that accrues to whoever owns it. This panel re-runs the
          comparison over a common 25-year window with inverter replacement charged to the owner.
        </p>
      </div>

      {/* The finding, stated up front */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-start",
          baseComparison.conclusionChanged
            ? "border-warning/45 bg-warning-soft/50"
            : "border-success/35 bg-success-soft/40"
        )}
      >
        <GitCompareArrows
          className="h-5 w-5 shrink-0 text-warning"
          strokeWidth={2.2}
          aria-hidden="true"
        />
        <div>
          <p className="flex flex-wrap items-center gap-2 text-step-0 font-semibold">
            {baseComparison.conclusionChanged
              ? "The base-case conclusion did not survive"
              : "The base-case conclusion held"}
            {baseComparison.conclusionChanged && <Badge tone="warning">Reversed</Badge>}
          </p>
          <p className="mt-1.5 text-step--1 leading-relaxed text-fg-muted">
            {baseComparison.finding}
          </p>
        </div>
      </div>

      {/* The interactive term control */}
      <div className="rounded-2xl border border-primary/30 bg-primary-soft/25 p-6">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="ppa-term-slider" className="text-step--1 font-medium text-fg-muted">
            PPA contract term
          </label>
          <output htmlFor="ppa-term-slider" className="tabular font-display text-step-2 font-bold text-primary-strong">
            {ppaTerm} years
          </output>
        </div>
        <input
          id="ppa-term-slider"
          type="range"
          min={5}
          max={25}
          step={1}
          value={ppaTerm}
          onChange={(e) => setPpaTerm(Number(e.target.value))}
          aria-valuetext={`${ppaTerm} year contract. ${comparison.winner} leads by ${formatAED(
            Math.abs(comparison.gap)
          )}.`}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-[hsl(var(--primary))]"
        />
        <div className="relative mt-1.5 h-5 text-step--2 text-fg-subtle">
          <span className="absolute left-0">5 yrs</span>
          {tie !== null && (
            <span
              className="absolute -translate-x-1/2 font-semibold text-warning"
              style={{ left: `${((tie - 5) / 20) * 100}%` }}
            >
              ↑ ties at {tie.toFixed(1)} yrs
            </span>
          )}
          <span className="absolute right-0">25 yrs</span>
        </div>

        <div className="mt-6 h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={formatAEDCompact} width={78} />
              <Tooltip
                content={<ChartTooltip formatter={(v) => formatAED(Number(v))} />}
                cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--border-strong))" />
              <Bar dataKey="value" name="NPV over 25-yr window" radius={[6, 6, 0, 0]} maxBarSize={110}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.isWinner ? "hsl(var(--chart-1))" : "hsl(var(--chart-2))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div role="status" aria-live="polite" className="mt-4 rounded-xl border border-border bg-surface p-4 text-step--1 leading-relaxed">
          <strong className="font-semibold">{comparison.winner} leads by {formatAED(Math.abs(comparison.gap))}</strong>{" "}
          over the common 25-year window.{" "}
          {comparison.ppa.uncoveredYears > 0 && (
            <>
              The PPA covers only {comparison.ppa.termYears} of those years; for the remaining{" "}
              {comparison.ppa.uncoveredYears} Al Waha buys grid power at full tariff while an owner
              would still be generating.
            </>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-step-1 font-bold tracking-tight">Ownership, 25 years</h3>
          <dl className="mt-3 space-y-2 text-step--1">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">NPV over window</dt>
              <dd className="tabular font-semibold">{formatAED(comparison.capex.npv)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">Inverter replacement (yr {comparison.capex.inverterYear})</dt>
              <dd className="tabular font-semibold text-danger">−{formatAED(comparison.capex.inverterCost)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">PV of that cost</dt>
              <dd className="tabular font-semibold text-danger">−{formatAED(comparison.capex.pvOfInverterCost)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="font-display text-step-1 font-bold tracking-tight">PPA, {comparison.ppa.termYears} years</h3>
          <dl className="mt-3 space-y-2 text-step--1">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">NPV over window</dt>
              <dd className="tabular font-semibold">{formatAED(comparison.ppa.npv)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">Years uncovered</dt>
              <dd className="tabular font-semibold">{comparison.ppa.uncoveredYears}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">Capital committed</dt>
              <dd className="tabular font-semibold">{formatAED(0)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-border bg-bg-subtle/50 p-5">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" strokeWidth={2.3} aria-hidden="true" />
        <p className="text-step--2 leading-relaxed text-fg-muted">
          {baseComparison.eaaWarning}
        </p>
      </div>
    </section>
  );
}
