"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { useMonteCarlo } from "@/lib/use-monte-carlo";
import { Button, Skeleton } from "@/components/ui/primitives";
import { formatAED, formatAEDCompact, formatPercent, formatNumber, cn } from "@/lib/utils";
import { ChartTooltip, axisProps, gridProps } from "../chart-kit";
import { Dices, Play, Boxes, ChartColumnBig } from "lucide-react";

const McDistribution3D = dynamic(() => import("@/components/three/mc-distribution-3d"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

export function MonteCarloPanel() {
  const { run, result, running } = useMonteCarlo();
  const reduce = useReducedMotion();
  const [view, setView] = useState<"2d" | "3d">("3d");
  const [webglOk, setWebglOk] = useState(false);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const ok = !!(c.getContext("webgl2") || c.getContext("webgl"));
      setWebglOk(ok && !reduce);
      if (!ok || reduce) setView("2d");
    } catch {
      setWebglOk(false);
      setView("2d");
    }
  }, [reduce]);

  const histogram =
    result?.histogram.map((h) => ({
      midpoint: h.midpoint,
      count: h.count,
      label: formatAEDCompact(h.midpoint),
    })) ?? [];

  return (
    <section aria-labelledby="mc-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="mc-heading" className="font-display text-step-2 font-bold tracking-tight">
            Monte Carlo simulation
          </h2>
          <p className="mt-1.5 max-w-2xl text-step--1 leading-relaxed text-fg-muted">
            Five thousand simulated futures, varying generation, CAPEX, O&amp;M and tariff
            escalation simultaneously. The output is a distribution of outcomes, not a single number
            presented with false precision.
          </p>
        </div>
        <div className="flex gap-2">
          {result && webglOk && (
            <div className="flex gap-1 rounded-lg border border-border bg-bg-subtle p-1">
              <Button
                variant={view === "3d" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setView("3d")}
                aria-pressed={view === "3d"}
              >
                <Boxes className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                3D
              </Button>
              <Button
                variant={view === "2d" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setView("2d")}
                aria-pressed={view === "2d"}
              >
                <ChartColumnBig className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                2D
              </Button>
            </div>
          )}
          <Button onClick={() => run(5000, 42)} disabled={running}>
            {running ? (
              <>
                <Dices className="h-4 w-4 animate-spin" strokeWidth={2.4} aria-hidden="true" />
                Simulating…
              </>
            ) : (
              <>
                <Play className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                {result ? "Re-run 5,000 trials" : "Run 5,000 trials"}
              </>
            )}
          </Button>
        </div>
      </div>

      {!result && !running && (
        <div className="rounded-2xl border border-dashed border-border-strong bg-bg-subtle/40 p-12 text-center">
          <Dices
            className="mx-auto h-10 w-10 text-fg-subtle"
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <p className="mt-4 text-step-0 font-semibold">The simulation hasn&rsquo;t been run yet</p>
          <p className="mx-auto mt-2 max-w-md text-step--1 leading-relaxed text-fg-muted">
            It runs in a background thread, so the interface stays responsive throughout. Results
            are seeded, which means the same inputs always produce the same distribution — the
            figures quoted in the report are reproducible.
          </p>
        </div>
      )}

      {running && (
        <div className="space-y-4" aria-live="polite">
          <p className="text-step--1 text-fg-muted">Running 5,000 trials in a background thread…</p>
          <Skeleton className="h-[360px] w-full" />
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      )}

      {result && !running && (
        <>
          <div
            className={cn(
              "rounded-2xl border p-5",
              result.probabilityPositive > 0.85
                ? "border-success/35 bg-success-soft/45"
                : result.probabilityPositive > 0.6
                  ? "border-warning/40 bg-warning-soft/45"
                  : "border-danger/40 bg-danger-soft/45"
            )}
          >
            <p className="text-step-1 leading-relaxed">
              <strong className="tabular font-display text-step-3 font-bold">
                {formatPercent(result.probabilityPositive, 1)}
              </strong>{" "}
              of simulated futures produce a positive NPV.
            </p>
            <p className="mt-2 text-step--1 leading-relaxed text-fg-muted">
              The 90% confidence interval runs from{" "}
              <strong className="tabular text-fg">{formatAED(result.percentile5)}</strong> to{" "}
              <strong className="tabular text-fg">{formatAED(result.percentile95)}</strong>. That
              spread — not the single base-case figure — is the honest picture of what this
              investment might return.
            </p>
          </div>

          <div className="h-[380px] w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            {view === "3d" && webglOk ? (
              <div className="relative h-full w-full">
                <McDistribution3D result={result} />
                <p className="pointer-events-none absolute bottom-3 left-4 text-step--2 text-fg-subtle">
                  Amber = positive NPV · red = negative · drag to rotate
                </p>
              </div>
            ) : (
              <div className="h-full w-full p-4 pr-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={histogram} margin={{ top: 10, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis
                      dataKey="midpoint"
                      {...axisProps}
                      tickFormatter={(v) => formatAEDCompact(Number(v))}
                      minTickGap={28}
                    />
                    <YAxis {...axisProps} width={44} />
                    <Tooltip
                      content={
                        <ChartTooltip
                          formatter={(v) => `${formatNumber(Number(v))} trials`}
                          labelPrefix="NPV ≈ "
                        />
                      }
                      cursor={{ fill: "hsl(var(--primary) / 0.06)" }}
                    />
                    <ReferenceLine
                      x={0}
                      stroke="hsl(var(--danger))"
                      strokeDasharray="4 4"
                      label={{ value: "NPV = 0", fontSize: 10, fill: "hsl(var(--danger))" }}
                    />
                    <Bar dataKey="count" name="Trials" maxBarSize={20}>
                      {histogram.map((h, i) => (
                        <Cell
                          key={i}
                          fill={h.midpoint > 0 ? "hsl(var(--chart-1))" : "hsl(var(--chart-5))"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Mean NPV", value: formatAED(result.mean) },
              { label: "Median NPV", value: formatAED(result.median) },
              { label: "Standard deviation", value: formatAED(result.stdDev) },
              { label: "Trials", value: formatNumber(result.iterations) },
              { label: "5th percentile", value: formatAED(result.percentile5) },
              { label: "95th percentile", value: formatAED(result.percentile95) },
              { label: "Worst trial", value: formatAED(result.min) },
              { label: "Best trial", value: formatAED(result.max) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface p-4">
                <dt className="text-step--2 uppercase tracking-[0.12em] text-fg-subtle">
                  {s.label}
                </dt>
                <dd className="tabular mt-1.5 font-display text-step-1 font-bold">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div className="rounded-2xl border border-border bg-bg-subtle/50 p-5">
            <h3 className="font-display text-step-1 font-bold tracking-tight">
              What was varied, and how
            </h3>
            <ul className="mt-3 space-y-2 text-step--1 leading-relaxed text-fg-muted">
              <li>
                <strong className="text-fg">Year-1 generation</strong> — normal distribution, 8%
                standard deviation. Captures irradiance variance, soiling and derating uncertainty.
              </li>
              <li>
                <strong className="text-fg">CAPEX</strong> — normal, 10% standard deviation. Reflects
                EPC quote dispersion in the UAE market.
              </li>
              <li>
                <strong className="text-fg">O&amp;M cost</strong> — normal, 15% standard deviation.
                Maintenance is the least predictable line in the model.
              </li>
              <li>
                <strong className="text-fg">Tariff escalation</strong> — triangular between 0% and
                3%, peaking at 2%. Bounded rather than normal, because DEWA tariff drift has real
                floors and ceilings.
              </li>
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
