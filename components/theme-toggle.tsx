"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

/**
 * Segmented light/dark/system control. The active pill slides between segments
 * with a shared layoutId, so switching feels continuous rather than a hard cut.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  // Reserve the exact footprint pre-hydration so nothing shifts on mount.
  if (!mounted) {
    return <div className="h-9 w-[7.5rem] rounded-full border border-border" aria-hidden="true" />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="relative flex h-9 items-center gap-0.5 rounded-full border border-border bg-bg-subtle p-0.5"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => setTheme(value)}
            className={cn(
              "relative grid h-8 w-9 place-items-center rounded-full transition-colors duration-200",
              active ? "text-primary-fg" : "text-fg-subtle hover:text-fg"
            )}
          >
            {active && (
              <motion.span
                layoutId={reduce ? undefined : "theme-pill"}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <Icon className="relative z-10 h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          </button>
        );
      })}
      <span className="sr-only" aria-live="polite">
        {resolvedTheme === "dark" ? "Dark theme active" : "Light theme active"}
      </span>
    </div>
  );
}
