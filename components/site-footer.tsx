import Link from "next/link";
import { SunMedium } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-border bg-bg-subtle/50">
      <div className="shell py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg">
                <SunMedium className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span className="font-display text-step-1 font-bold tracking-tight">Ashraq</span>
            </div>
            <p className="mt-4 text-step--1 leading-relaxed text-fg-muted">
              أشرق — &ldquo;it dawned.&rdquo; A capital budgeting decision-support platform built
              for a single real investment question, with every assumption sourced and every
              calculation independently unit-tested.
            </p>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-2 text-step--1">
            {[
              { href: "/wizard", label: "Input wizard" },
              { href: "/dashboard", label: "Results dashboard" },
              { href: "/assumptions", label: "Assumptions register" },
              { href: "/methodology", label: "Methodology" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-fg-muted transition-colors hover:text-primary-strong"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-step--2 text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            Krishna Mathur · AS25DXB018 · MAIB Term 3 · SP Jain School of Global Management, Dubai
          </p>
          <p>
            Al Waha Logistics &amp; Cold Chain LLC is a realistic fictional company created for this
            academic case.
          </p>
        </div>
      </div>
    </footer>
  );
}
