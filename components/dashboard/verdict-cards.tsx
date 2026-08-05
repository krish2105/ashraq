"use client";

import { motion, useReducedMotion } from "motion/react";
import { AnimatedNumber, InfoTip } from "@/components/ui/primitives";
import { formatAED, formatPercent, cn } from "@/lib/utils";
import type { FullResults } from "@/lib/finance-engine";
import { Check, Flag, X, Minus } from "lucide-react";

type Tone = "good" | "warn" | "bad" | "neutral";

/** Colour is never the only cue — every tone carries an icon and a word too. */
const TONE: Record<Tone, { cls: string; Icon: typeof Check; word: string }> = {
  good: {
    cls: "border-success/35 bg-success-soft/50",
    Icon: Check,
    word: "Favourable",
  },
  warn: { cls: "border-warning/40 bg-warning-soft/50", Icon: Flag, word: "Watch" },
  bad: { cls: "border-danger/40 bg-danger-soft/50", Icon: X, word: "Unfavourable" },
  neutral: { cls: "border-border bg-surface", Icon: Minus, word: "Reference" },
};

export function VerdictCards({ results }: { results: FullResults }) {
  const reduce = useReducedMotion();
  const { metrics, inputs } = results;

  const cards = [
    {
      label: "Net Present Value",
      abbr: "NPV",
      value: formatAED(metrics.npv),
      raw: metrics.npv,
      format: (v: number) => formatAED(v),
      tone: (metrics.npv > 0 ? "good" : "bad") as Tone,
      verdict:
        metrics.npv > 0
          ? "Creates value above the required return"
          : "Destroys value at this hurdle rate",
      tip: "The total value the project adds today, after accounting for the fact that money arriving in the future is worth less than money today. Above zero means it's worth doing.",
      emphasis: true,
    },
    {
      label: "Internal Rate of Return",
      abbr: "IRR",
      value: metrics.irr === null ? "Undefined" : formatPercent(metrics.irr),
      raw: metrics.irr ?? 0,
      format: (v: number) => (metrics.irr === null ? "Undefined" : formatPercent(v)),
      tone: (metrics.irr !== null && metrics.irr > inputs.discountRateCapex
        ? "good"
        : "bad") as Tone,
      verdict:
        metrics.irr === null
          ? "No initial outlay to solve against"
          : `Clears the ${formatPercent(inputs.discountRateCapex, 1)} hurdle by ${formatPercent(
              metrics.irr - inputs.discountRateCapex,
              2
            )}`,
      tip: "The return the project earns on the money invested. If it's higher than the hurdle rate, the project beats the minimum acceptable return.",
    },
    {
      label: "Modified IRR",
      abbr: "MIRR",
      value: metrics.mirr === null ? "—" : formatPercent(metrics.mirr),
      raw: metrics.mirr ?? 0,
      format: (v: number) => (metrics.mirr === null ? "—" : formatPercent(v)),
      tone: (metrics.mirr !== null && metrics.mirr > inputs.discountRateCapex
        ? "good"
        : "warn") as Tone,
      verdict: "IRR corrected for a realistic reinvestment assumption",
      tip: "A more conservative version of IRR. Ordinary IRR assumes you can reinvest cash at the IRR itself, which is usually unrealistic; MIRR assumes you reinvest at the cost of capital instead.",
    },
    {
      label: "Profitability Index",
      abbr: "PI",
      value: metrics.profitabilityIndex.toFixed(3),
      raw: metrics.profitabilityIndex,
      format: (v: number) => v.toFixed(3),
      tone: (metrics.profitabilityIndex > 1 ? "good" : "bad") as Tone,
      verdict: `Every AED 1 invested returns AED ${metrics.profitabilityIndex.toFixed(2)} of present value`,
      tip: "Value created per dirham committed. Above 1.0 always means the same thing as a positive NPV.",
    },
    {
      label: "Payback Period",
      abbr: "Payback",
      value: metrics.paybackPeriod === null ? "Never" : `${metrics.paybackPeriod.toFixed(2)} yrs`,
      raw: metrics.paybackPeriod ?? 0,
      format: (v: number) => (metrics.paybackPeriod === null ? "Never" : `${v.toFixed(2)} yrs`),
      tone: (metrics.paybackPeriod !== null && metrics.paybackPeriod < inputs.projectLifeYears / 2
        ? "good"
        : "warn") as Tone,
      verdict: "Lands inside the 3.5–6 year Dubai commercial solar range",
      tip: "How long until the initial cost is recovered. It ignores the time value of money, so it's a liquidity signal — useful alongside NPV, never instead of it.",
    },
    {
      label: "Discounted Payback",
      abbr: "Disc. Payback",
      value:
        metrics.discountedPaybackPeriod === null
          ? "Never"
          : `${metrics.discountedPaybackPeriod.toFixed(2)} yrs`,
      raw: metrics.discountedPaybackPeriod ?? 0,
      format: (v: number) =>
        metrics.discountedPaybackPeriod === null ? "Never" : `${v.toFixed(2)} yrs`,
      tone: (metrics.discountedPaybackPeriod !== null &&
      metrics.discountedPaybackPeriod < inputs.projectLifeYears
        ? "good"
        : "bad") as Tone,
      verdict: "Recovers within the modelled horizon, in today's money",
      tip: "The same idea as payback, but corrected for the time value of money — so it's always longer, and more honest.",
    },
    {
      label: "Accounting Rate of Return",
      abbr: "ARR",
      value: formatPercent(metrics.arr, 1),
      raw: metrics.arr,
      format: (v: number) => formatPercent(v, 1),
      tone: "neutral" as Tone,
      verdict: "Included per the brief, despite ignoring the time value of money",
      tip: "Average accounting profit divided by average book investment. It uses accounting income rather than cash and ignores timing entirely — reported here because the brief requires it.",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => {
        const tone = TONE[card.tone];
        return (
          <motion.article
            key={card.abbr}
            initial={reduce ? undefined : { opacity: 0, y: 18 }}
            animate={reduce ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
            className={cn(
              "flex flex-col rounded-2xl border p-5",
              tone.cls,
              card.emphasis && "sm:col-span-2 lg:col-span-2"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="flex items-center text-step--1 font-medium text-fg-muted">
                {card.label}
                <InfoTip label={card.label}>{card.tip}</InfoTip>
              </h3>
              <span className="flex shrink-0 items-center gap-1 text-step--2 font-semibold text-fg-muted">
                <tone.Icon className="h-3.5 w-3.5" strokeWidth={2.6} aria-hidden="true" />
                {tone.word}
              </span>
            </div>

            <p
              className={cn(
                "mt-3 font-display font-bold leading-none tracking-tight",
                card.emphasis ? "text-step-5" : "text-step-3"
              )}
            >
              <AnimatedNumber value={card.raw} format={card.format} />
            </p>

            <p className="mt-3 text-step--2 leading-relaxed text-fg-muted">{card.verdict}</p>
          </motion.article>
        );
      })}
    </div>
  );
}
