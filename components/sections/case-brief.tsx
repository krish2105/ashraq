import { Reveal } from "@/components/ui/primitives";
import { CASE_META } from "@/lib/case-data";
import { Building2, Snowflake, Ruler, Sun } from "lucide-react";

const FACTS = [
  { Icon: Building2, label: "Company", value: "Al Waha Logistics & Cold Chain LLC" },
  { Icon: Ruler, label: "Facility", value: "15,000 sqm warehouse, Dubai Investments Park" },
  { Icon: Snowflake, label: "Load profile", value: "24/7 refrigeration and HVAC base load" },
  { Icon: Sun, label: "Proposal", value: "1.2 MWp rooftop photovoltaic array" },
];

export function CaseBrief() {
  return (
    <section className="section-pad border-t border-border" aria-labelledby="case-heading">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
          <Reveal>
            <span className="text-step--2 font-medium uppercase tracking-[0.16em] text-primary-strong">
              The case
            </span>
            <h2
              id="case-heading"
              className="mt-4 font-display text-step-4 font-bold leading-[1.08] tracking-tight"
            >
              A cold-storage operator with a very large roof and a very large electricity bill.
            </h2>
            <p className="mt-6 text-step-0 leading-relaxed text-fg-muted">
              {CASE_META.decision}
            </p>
            <p className="mt-4 text-step-0 leading-relaxed text-fg-muted">
              This is a <strong className="font-semibold text-fg">cost-avoidance</strong>{" "}
              investment, not a revenue-generating one. Every dirham in the &ldquo;revenue&rdquo;
              line is electricity Al Waha no longer buys from DEWA — which is why it flows straight
              into pre-tax profit and is taxed like any other cost saving.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
              {FACTS.map(({ Icon, label, value }) => (
                <div key={label} className="bg-surface p-6">
                  <Icon
                    className="h-5 w-5 text-primary-strong"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <dt className="mt-4 text-step--2 uppercase tracking-[0.14em] text-fg-subtle">
                    {label}
                  </dt>
                  <dd className="mt-1.5 text-step-0 font-medium leading-snug">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 rounded-2xl border border-primary/25 bg-primary-soft/50 p-6">
              <p className="text-step--1 leading-relaxed text-fg-muted">
                <strong className="font-semibold text-fg">Why this profile fits solar.</strong>{" "}
                Large roof, high daytime consumption, and a continuous base load that sits in
                DEWA&rsquo;s upper commercial tariff slab — the exact customer Dubai solar case
                studies flag as best-fit for rooftop generation.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
