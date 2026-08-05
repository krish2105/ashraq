import Link from "next/link";
import { Reveal } from "@/components/ui/primitives";
import {
  Calculator,
  Dices,
  Landmark,
  Leaf,
  Clock,
  MessageSquareText,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

/**
 * Bento grid — modular cards of varying size. Scans well, and lets the two features
 * that actually differentiate this build (Monte Carlo, tool-grounded chat) take the
 * space they deserve without flattening everything into equal boxes.
 */
export function CapabilityBento() {
  return (
    <section className="section-pad border-t border-border" aria-labelledby="cap-heading">
      <div className="shell">
        <Reveal className="max-w-3xl">
          <span className="text-step--2 font-medium uppercase tracking-[0.16em] text-primary-strong">
            What it computes
          </span>
          <h2
            id="cap-heading"
            className="mt-4 font-display text-step-4 font-bold leading-[1.08] tracking-tight"
          >
            Seventeen metrics. One deterministic engine. No AI arithmetic.
          </h2>
          <p className="mt-5 text-step-0 leading-relaxed text-fg-muted">
            Every number on this site is produced by a unit-tested TypeScript engine with zero
            model involvement. The AI layer explains what the engine computed — it can never
            produce a figure itself.
          </p>
        </Reveal>

        <div className="mt-12 grid auto-rows-[minmax(0,1fr)] gap-4 md:grid-cols-3">
          {/* Wide feature — the 13 core metrics */}
          <Reveal className="md:col-span-2">
            <article className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-7 shadow-soft">
              <div>
                <Calculator
                  className="h-6 w-6 text-primary-strong"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <h3 className="mt-5 font-display text-step-2 font-bold tracking-tight">
                  The thirteen required calculations
                </h3>
                <p className="mt-3 max-w-xl text-step--1 leading-relaxed text-fg-muted">
                  Initial, operating and terminal cash flows; payback and discounted payback; ARR;
                  NPV; IRR; MIRR with editable finance and reinvestment rates; profitability index;
                  break-even tariff; a four-variable tornado; and best/base/worst scenarios.
                </p>
              </div>
              <ul className="mt-6 flex flex-wrap gap-2">
                {["NPV", "IRR", "MIRR", "PI", "Payback", "Disc. Payback", "ARR", "Break-even"].map(
                  (m) => (
                    <li
                      key={m}
                      className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-step--2 font-medium text-fg-muted"
                    >
                      {m}
                    </li>
                  )
                )}
              </ul>
            </article>
          </Reveal>

          {/* Tall feature — Monte Carlo */}
          <Reveal delay={0.08}>
            <article className="flex h-full flex-col justify-between rounded-2xl border border-primary/30 bg-primary-soft/40 p-7">
              <div>
                <Dices className="h-6 w-6 text-primary-strong" strokeWidth={2} aria-hidden="true" />
                <h3 className="mt-5 font-display text-step-2 font-bold tracking-tight">
                  5,000-run Monte Carlo
                </h3>
                <p className="mt-3 text-step--1 leading-relaxed text-fg-muted">
                  Generation, CAPEX, O&amp;M and tariff escalation vary together, in a Web Worker so
                  the interface never freezes. The output is a probability distribution, not a
                  single number presented with false precision.
                </p>
              </div>
              <p className="tabular mt-6 font-display text-step-3 font-bold text-primary-strong">
                P(NPV &gt; 0)
              </p>
            </article>
          </Reveal>

          {[
            {
              Icon: Landmark,
              title: "Financing feasibility",
              body: "A live DSCR schedule against a 1.20× covenant floor, with an editable debt structure. Flags red the moment coverage breaks.",
            },
            {
              Icon: Leaf,
              title: "Avoided emissions",
              body: "≈945 tCO₂ in year one, ~13,700 across the horizon — with the grid emission factor exposed and clearly labelled as an estimate, not a certified figure.",
            },
            {
              Icon: Clock,
              title: "The option to delay",
              body: "Quantified against IRENA's finding that solar costs have stabilised — so waiting is priced honestly rather than assumed attractive.",
            },
          ].map(({ Icon, title, body }, i) => (
            <Reveal key={title} delay={0.05 * i}>
              <article className="flex h-full flex-col rounded-2xl border border-border bg-surface p-7 shadow-soft">
                <Icon className="h-6 w-6 text-accent" strokeWidth={2} aria-hidden="true" />
                <h3 className="mt-5 font-display text-step-1 font-bold tracking-tight">{title}</h3>
                <p className="mt-3 text-step--1 leading-relaxed text-fg-muted">{body}</p>
              </article>
            </Reveal>
          ))}

          {/* Wide feature — Ask Ashraq */}
          <Reveal className="md:col-span-2" delay={0.08}>
            <article className="flex h-full flex-col justify-between rounded-2xl border border-border bg-surface p-7 shadow-soft">
              <div>
                <div className="flex items-center gap-3">
                  <MessageSquareText
                    className="h-6 w-6 text-primary-strong"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <ShieldCheck className="h-5 w-5 text-success" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="mt-5 font-display text-step-2 font-bold tracking-tight">
                  Ask Ashraq — and watch it call the engine
                </h3>
                <p className="mt-3 max-w-xl text-step--1 leading-relaxed text-fg-muted">
                  Type &ldquo;what if the tariff stays flat?&rdquo; and the assistant re-runs the
                  actual model rather than generating a number in prose. Numeric claims are then
                  cross-checked against the tool result before rendering — a mechanical
                  verification, not a prompt asking the model to please be accurate.
                </p>
              </div>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex w-fit items-center gap-1.5 text-step--1 font-semibold text-primary-strong transition-colors hover:text-primary"
              >
                Open the dashboard
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
              </Link>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
