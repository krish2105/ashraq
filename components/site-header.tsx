"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";
import { SunMedium } from "lucide-react";

const NAV = [
  { href: "/wizard", label: "Inputs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/assumptions", label: "Assumptions" },
  { href: "/methodology", label: "Methodology" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 12);
  });

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-50 w-full transition-all duration-300 ease-out-quart",
        scrolled ? "glass shadow-soft" : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="shell flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label="Ashraq home"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-fg shadow-glow">
            <SunMedium
              className="h-5 w-5 transition-transform duration-500 ease-out-quart group-hover:rotate-90"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-step-1 font-bold tracking-tight">Ashraq</span>
            <span className="mt-0.5 hidden text-[10px] uppercase tracking-[0.16em] text-fg-subtle sm:block">
              Capital Budgeting
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-lg px-3.5 py-2 text-step--1 font-medium transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/wizard"
            className="hidden h-9 shrink-0 items-center whitespace-nowrap rounded-lg bg-primary px-4 text-step--1 font-semibold text-primary-fg transition-all hover:bg-primary-strong hover:shadow-glow md:inline-flex"
          >
            Run the model
          </Link>
        </div>
      </div>

      {/* Mobile nav — the same destinations, always reachable without a menu tap */}
      <nav
        aria-label="Main mobile"
        className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 pb-2 pt-1.5 lg:hidden"
      >
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-step--2 font-medium transition-colors",
                active ? "bg-primary-soft text-primary-strong" : "text-fg-muted"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
