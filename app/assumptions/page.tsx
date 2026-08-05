import type { Metadata } from "next";
import { ASSUMPTIONS_REGISTER, REFERENCES } from "@/lib/case-data";
import { Reveal } from "@/components/ui/primitives";
import { SiteFooter } from "@/components/site-footer";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Assumptions register",
  description:
    "Every input in the Ashraq model with its source, and an explicit note wherever a figure is an estimate rather than a published number.",
};

const GROUPS = [
  "System",
  "Costs",
  "Revenue",
  "Tax & Depreciation",
  "Discount Rates",
  "Financing",
  "ESG",
] as const;

export default function AssumptionsPage() {
  return (
    <>
      <div className="shell py-10 md:py-14">
        <Reveal className="max-w-3xl">
          <p className="text-step--2 font-medium uppercase tracking-[0.16em] text-primary-strong">
            Data &amp; assumptions
          </p>
          <h1 className="mt-3 font-display text-step-4 font-bold tracking-tight">
            Every number, and where it came from
          </h1>
          <p className="mt-5 text-step-0 leading-relaxed text-fg-muted">
            No figure in this model is invented. Each one below carries its source, and wherever a
            value is a reasoned estimate rather than a published number, that is stated plainly
            rather than buried in a footnote. Every one of them is editable in the wizard.
          </p>
        </Reveal>

        <div className="mt-12 space-y-12">
          {GROUPS.map((group) => {
            const entries = ASSUMPTIONS_REGISTER.filter((a) => a.group === group);
            if (entries.length === 0) return null;

            return (
              <section key={group} aria-labelledby={`group-${group}`}>
                <h2
                  id={`group-${group}`}
                  className="mb-4 font-display text-step-2 font-bold tracking-tight"
                >
                  {group}
                </h2>
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <Reveal key={entry.label}>
                      <article className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                          <h3 className="font-display text-step-1 font-bold tracking-tight">
                            {entry.label}
                          </h3>
                          <p className="tabular text-step-1 font-bold text-primary-strong">
                            {entry.display}
                          </p>
                        </div>
                        <p className="mt-3 text-step--1 leading-relaxed text-fg-muted">
                          {entry.source}
                        </p>
                        {entry.caveat && (
                          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning-soft/45 p-4">
                            <AlertCircle
                              className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                              strokeWidth={2.3}
                              aria-hidden="true"
                            />
                            <p className="text-step--1 leading-relaxed text-fg-muted">
                              {entry.caveat}
                            </p>
                          </div>
                        )}
                      </article>
                    </Reveal>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section aria-labelledby="refs" className="mt-16">
          <h2 id="refs" className="mb-4 font-display text-step-2 font-bold tracking-tight">
            References
          </h2>
          <ol className="space-y-3">
            {REFERENCES.map((ref) => (
              <li
                key={ref}
                className="border-l-2 border-primary/40 pl-4 text-step--1 leading-relaxed text-fg-muted"
              >
                {ref.replace(/\*/g, "")}
              </li>
            ))}
          </ol>
        </section>
      </div>
      <SiteFooter />
    </>
  );
}
