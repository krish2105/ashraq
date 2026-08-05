"use client";

import { motion, useReducedMotion } from "motion/react";
import { Reveal } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const ALTERNATIVES = [
  {
    id: "A",
    name: "CAPEX-owned solar",
    summary: "Al Waha buys and owns the system outright.",
    detail:
      "Captures 100% of the avoided electricity cost and all post-horizon value; bears O&M and performance risk.",
    rate: "Discounted at 10%",
    tone: "primary" as const,
  },
  {
    id: "B",
    name: "Solar PPA",
    summary: "A developer owns the asset on Al Waha's roof.",
    detail:
      "Zero capex. Al Waha buys the output at a fixed rate below the DEWA tariff. Risk is counterparty credit, not equipment performance.",
    rate: "Discounted at 7.5%",
    tone: "accent" as const,
  },
  {
    id: "C",
    name: "Status quo",
    summary: "Keep buying 100% of electricity from DEWA.",
    detail:
      "The do-nothing baseline every other alternative is measured against — this is the opportunity cost.",
    rate: "Baseline, NPV = 0",
    tone: "neutral" as const,
  },
  {
    id: "D",
    name: "Debt-financed CAPEX",
    summary: "Alternative A with a 70/30 debt structure.",
    detail:
      "Same asset, same NPV — financing does not change what an investment is worth. Judged on debt service coverage instead.",
    rate: "Assessed on DSCR",
    tone: "success" as const,
  },
];

const TONE_STYLES = {
  primary: "border-primary/40 bg-primary-soft/40",
  accent: "border-accent/40 bg-accent-soft/40",
  neutral: "border-border bg-bg-subtle/60",
  success: "border-success/40 bg-success-soft/40",
};

const BADGE_STYLES = {
  primary: "bg-primary text-primary-fg",
  accent: "bg-accent text-white",
  neutral: "bg-fg-subtle text-bg",
  success: "bg-success text-white",
};

export function AlternativesGrid() {
  const reduce = useReducedMotion();

  return (
    <section className="section-pad border-t border-border" aria-labelledby="alts-heading">
      <div className="shell">
        <Reveal className="max-w-3xl">
          <span className="text-step--2 font-medium uppercase tracking-[0.16em] text-primary-strong">
            Four alternatives
          </span>
          <h2
            id="alts-heading"
            className="mt-4 font-display text-step-4 font-bold leading-[1.08] tracking-tight"
          >
            The decision isn&rsquo;t whether to go solar. It&rsquo;s who should own it.
          </h2>
          <p className="mt-5 text-step-0 leading-relaxed text-fg-muted">
            Two of these alternatives carry genuinely different risk, so Ashraq discounts them at
            genuinely different rates. Applying one uniform rate across differently-risked cash
            flows is the most common conceptual error in a comparison exercise — and it changes
            which alternative wins, not just by how much.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ALTERNATIVES.map((alt, i) => (
            <motion.article
              key={alt.id}
              initial={reduce ? undefined : { opacity: 0, y: 26 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-8% 0px" }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
              whileHover={reduce ? undefined : { y: -5 }}
              className={cn(
                "flex flex-col rounded-2xl border p-6 transition-shadow duration-300 hover:shadow-raised",
                TONE_STYLES[alt.tone]
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl font-display text-step-0 font-bold",
                  BADGE_STYLES[alt.tone]
                )}
                aria-hidden="true"
              >
                {alt.id}
              </span>
              <h3 className="mt-5 font-display text-step-1 font-bold tracking-tight">
                <span className="sr-only">Alternative {alt.id}: </span>
                {alt.name}
              </h3>
              <p className="mt-2 text-step--1 font-medium leading-snug">{alt.summary}</p>
              <p className="mt-3 flex-1 text-step--1 leading-relaxed text-fg-muted">
                {alt.detail}
              </p>
              <p className="tabular mt-5 border-t border-border/70 pt-4 text-step--2 font-semibold uppercase tracking-wider text-fg-subtle">
                {alt.rate}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
