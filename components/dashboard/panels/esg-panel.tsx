"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useAshraqStore } from "@/lib/store";
import type { FullResults } from "@/lib/finance-engine";
import { formatNumber } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Field } from "@/components/ui/primitives";
import { Leaf, Info, Car, TreePine } from "lucide-react";

export function EsgPanel({ results }: { results: FullResults }) {
  const { inputs, setInput } = useAshraqStore();
  const { esg } = results;

  const data = esg.yearly.map((y) => ({ year: y.year, tonnes: y.tonnes }));

  return (
    <section aria-labelledby="esg-heading" className="space-y-6">
      <div>
        <h2 id="esg-heading" className="font-display text-step-2 font-bold tracking-tight">
          Avoided emissions
        </h2>
        <p className="mt-1.5 max-w-3xl text-step--1 leading-relaxed text-fg-muted">
          Every kilowatt-hour generated on the roof is a kilowatt-hour not drawn from the UAE grid.
          This is a genuine non-financial benefit a board would weigh alongside NPV — particularly
          given Dubai Clean Energy Strategy 2050 and UAE Net Zero 2050 policy direction.
        </p>
      </div>

      {/* The honesty note comes before the numbers, not in a footnote after them */}
      <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-soft/50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-warning" strokeWidth={2.2} aria-hidden="true" />
        <div>
          <p className="text-step--1 font-semibold">These figures are estimates, not certified.</p>
          <p className="mt-1.5 text-step--1 leading-relaxed text-fg-muted">
            DEWA does not publish a single official grid emission factor. The{" "}
            {inputs.gridEmissionFactor} tCO₂/MWh used here is an illustrative figure in the range
            reported for the UAE federal grid mix — it is a modelling assumption, editable below,
            and should not be quoted as a certified carbon accounting result.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-success/35 bg-success-soft/45 p-6">
          <Leaf className="h-6 w-6 text-success" strokeWidth={2.1} aria-hidden="true" />
          <p className="mt-4 text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
            Year 1 avoided
          </p>
          <p className="tabular mt-1 font-display text-step-3 font-bold">
            {formatNumber(esg.year1AvoidedTonnes)} <span className="text-step-1">tCO₂</span>
          </p>
        </article>

        <article className="rounded-2xl border border-success/35 bg-success-soft/45 p-6">
          <Leaf className="h-6 w-6 text-success" strokeWidth={2.1} aria-hidden="true" />
          <p className="mt-4 text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
            Across {inputs.projectLifeYears} years
          </p>
          <p className="tabular mt-1 font-display text-step-3 font-bold">
            {formatNumber(esg.lifetimeAvoidedTonnes)} <span className="text-step-1">tCO₂</span>
          </p>
        </article>

        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
            Roughly equivalent to
          </p>
          <ul className="mt-4 space-y-3 text-step--1">
            <li className="flex items-center gap-2.5">
              <Car className="h-4 w-4 shrink-0 text-fg-subtle" strokeWidth={2} aria-hidden="true" />
              <span className="tabular font-semibold">
                {formatNumber(esg.equivalentCarsOffRoad)}
              </span>
              <span className="text-fg-muted">cars off the road for a year</span>
            </li>
            <li className="flex items-center gap-2.5">
              <TreePine
                className="h-4 w-4 shrink-0 text-fg-subtle"
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="tabular font-semibold">
                {formatNumber(esg.equivalentTreesPlanted)}
              </span>
              <span className="text-fg-muted">trees growing for a year</span>
            </li>
          </ul>
          <p className="mt-4 text-step--2 leading-relaxed text-fg-subtle">
            Illustrative communication aids, not certified conversions.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="max-w-xs">
          <Field
            label="Grid emission factor"
            suffix="tCO₂/MWh"
            tip="How much CO₂ the grid emits per unit of electricity. Change it to test how sensitive the emissions claim is to this assumption."
            value={inputs.gridEmissionFactor}
            onChange={(v) => setInput("gridEmissionFactor", v)}
            step={0.01}
            min={0}
          />
        </div>
      </div>

      <div className="h-[300px] w-full rounded-2xl border border-border bg-surface p-4 pr-6 shadow-soft">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
            <defs>
              <linearGradient id="esgFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.55} />
                <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis {...axisProps} width={54} />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(v) => `${formatNumber(Number(v))} tCO₂`}
                  labelPrefix="Year "
                />
              }
            />
            <Area
              type="monotone"
              dataKey="tonnes"
              name="Avoided emissions"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2.5}
              fill="url(#esgFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="text-step--2 leading-relaxed text-fg-subtle">
        Avoided emissions decline slightly each year in step with panel degradation — the same{" "}
        {(inputs.degradationRate * 100).toFixed(1)}%/yr assumption used in the financial model, so
        the two analyses cannot drift apart.
      </p>
    </section>
  );
}
