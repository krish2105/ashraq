"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { computeCoreMetrics, computePpa } from "@/lib/finance-engine";
import { useAshraqStore } from "@/lib/store";
import { formatAED, formatPercent, cn } from "@/lib/utils";
import { Badge } from "@/components/ui/primitives";
import { Crosshair, RotateCcw } from "lucide-react";

/**
 * THE SIGNATURE INTERACTION.
 *
 * The model's central methodological claim is that the choice of discount rate
 * changes WHICH alternative wins, not merely by how much. Everywhere else that
 * claim is prose. Here it is a control: drag the PPA's discount rate and watch the
 * ranking actually cross over.
 *
 * The point is not decoration. A sceptical reader can test the sensitivity of the
 * conclusion themselves rather than taking the analysis on trust — and can find
 * the exact rate at which the two alternatives tie.
 */
export function RateCrossover() {
  const { inputs, advanced } = useAshraqStore();
  const reduce = useReducedMotion();
  const [rate, setRate] = useState(inputs.discountRatePpa);

  const capexNpv = useMemo(
    () => computeCoreMetrics(inputs, inputs.discountRateCapex).npv,
    [inputs]
  );

  const ppaNpv = useMemo(
    () => computePpa({ ...inputs, discountRatePpa: rate }).pvAtPpaRate,
    [inputs, rate]
  );

  const tiePoint =
    advanced.decisionFlips.find((f) => f.variable === "PPA discount rate")?.rankingFlipsAt ?? null;

  const ppaLeads = ppaNpv > capexNpv;
  const gap = ppaNpv - capexNpv;

  // Bars are scaled against the larger of the two so the crossover reads clearly.
  const maxValue = Math.max(capexNpv, ppaNpv, 1);
  const capexWidth = (capexNpv / maxValue) * 100;
  const ppaWidth = (ppaNpv / maxValue) * 100;

  const atDefault = Math.abs(rate - inputs.discountRatePpa) < 0.0005;

  return (
    <section
      aria-labelledby="crossover-heading"
      className="rounded-2xl border border-primary/30 bg-primary-soft/25 p-6 shadow-soft"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <h3
            id="crossover-heading"
            className="flex items-center gap-2 font-display text-step-2 font-bold tracking-tight"
          >
            <Crosshair className="h-5 w-5 text-primary-strong" strokeWidth={2.2} aria-hidden="true" />
            Find the rate where the answer changes
          </h3>
          <p className="mt-2 text-step--1 leading-relaxed text-fg-muted">
            The PPA leads because its contracted cash flows are discounted at a lower rate than
            owned, performance-exposed ones. Drag the rate and watch the ranking cross over. This is
            the whole argument, and you can test it rather than take it on trust.
          </p>
        </div>
        {!atDefault && (
          <button
            type="button"
            onClick={() => setRate(inputs.discountRatePpa)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-step--2 font-medium transition-colors hover:border-primary hover:text-primary-strong"
          >
            <RotateCcw className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
            Reset to {formatPercent(inputs.discountRatePpa, 1)}
          </button>
        )}
      </div>

      {/* The control */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor="ppa-rate-slider" className="text-step--1 font-medium text-fg-muted">
            PPA discount rate
          </label>
          <output
            htmlFor="ppa-rate-slider"
            className="tabular font-display text-step-2 font-bold text-primary-strong"
          >
            {formatPercent(rate, 2)}
          </output>
        </div>

        <input
          id="ppa-rate-slider"
          type="range"
          min={4}
          max={16}
          step={0.05}
          value={rate * 100}
          onChange={(e) => setRate(Number(e.target.value) / 100)}
          aria-valuetext={`${(rate * 100).toFixed(2)} percent. ${
            ppaLeads ? "PPA leads" : "CAPEX ownership leads"
          } by ${formatAED(Math.abs(gap))}.`}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-[hsl(var(--primary))]"
        />

        <div className="relative mt-1.5 h-5 text-step--2 text-fg-subtle">
          <span className="absolute left-0">4%</span>
          {tiePoint !== null && tiePoint >= 0.04 && tiePoint <= 0.16 && (
            <span
              className="absolute -translate-x-1/2 font-semibold text-warning"
              style={{ left: `${((tiePoint - 0.04) / 0.12) * 100}%` }}
            >
              ↑ ties at {formatPercent(tiePoint, 2)}
            </span>
          )}
          <span className="absolute right-0">16%</span>
        </div>
      </div>

      {/* The crossover */}
      <div className="mt-8 space-y-4">
        {[
          {
            id: "A",
            label: "CAPEX ownership",
            sub: `discounted at ${formatPercent(inputs.discountRateCapex, 1)} — fixed`,
            value: capexNpv,
            width: capexWidth,
            leads: !ppaLeads,
            colour: "bg-chart-1",
          },
          {
            id: "B",
            label: "Solar PPA",
            sub: `discounted at ${formatPercent(rate, 2)} — you are controlling this`,
            value: ppaNpv,
            width: ppaWidth,
            leads: ppaLeads,
            colour: "bg-chart-2",
          },
        ].map((bar) => (
          <div key={bar.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-step--1 font-semibold">
                <span className="grid h-6 w-6 place-items-center rounded-md bg-bg-subtle font-display text-step--2 font-bold">
                  {bar.id}
                </span>
                {bar.label}
                {bar.leads && <Badge tone="success">Leads</Badge>}
              </span>
              <span className="tabular text-step-0 font-bold">{formatAED(bar.value)}</span>
            </div>
            <div className="mt-2 h-8 w-full overflow-hidden rounded-lg bg-bg-subtle">
              <motion.div
                className={cn("h-full rounded-lg", bar.colour)}
                animate={{ width: `${Math.max(0, bar.width)}%` }}
                transition={
                  reduce ? { duration: 0 } : { type: "spring", stiffness: 240, damping: 30 }
                }
              />
            </div>
            <p className="mt-1 text-step--2 text-fg-subtle">{bar.sub}</p>
          </div>
        ))}
      </div>

      {/* Live verdict */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "mt-6 rounded-xl border p-4 text-step--1 leading-relaxed",
          ppaLeads
            ? "border-accent/40 bg-accent-soft/40"
            : "border-primary/40 bg-primary-soft/50"
        )}
      >
        <strong className="font-semibold">
          {ppaLeads ? "The PPA leads" : "CAPEX ownership leads"} by {formatAED(Math.abs(gap))}.
        </strong>{" "}
        {tiePoint !== null ? (
          <>
            The two tie at <strong className="tabular">{formatPercent(tiePoint, 2)}</strong>
            {rate < tiePoint
              ? " — below that the PPA wins, above it ownership does."
              : " — you are now above the tie point, so ownership wins."}{" "}
            That single assumption decides the ranking, which is precisely why it is stated on the
            front of the analysis rather than buried in an appendix.
          </>
        ) : (
          "The ranking holds across the tested range."
        )}
      </div>
    </section>
  );
}
