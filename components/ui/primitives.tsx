"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "motion/react";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 ease-out-quart disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring whitespace-nowrap",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-fg hover:bg-primary-strong hover:shadow-glow active:scale-[0.985]",
        secondary:
          "bg-surface text-fg border border-border-strong hover:border-primary hover:bg-surface-raised active:scale-[0.985]",
        ghost: "text-fg-muted hover:text-fg hover:bg-bg-subtle",
        outline:
          "border border-border-strong text-fg hover:border-primary hover:text-primary-strong",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 px-3.5 text-step--1",
        md: "h-11 px-5 text-step-0",
        lg: "h-14 px-7 text-step-1",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface-card shadow-soft", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 p-5 pb-0", className)}>
      <div className="min-w-0">
        <h3 className="font-display text-step-1 font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="mt-1 text-step--1 leading-relaxed text-fg-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-step--2 font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-bg-subtle text-fg-muted border border-border",
        primary: "bg-primary-soft text-primary-strong border border-primary/30",
        success: "bg-success-soft text-success border border-success/30",
        warning: "bg-warning-soft text-warning border border-warning/30",
        danger: "bg-danger-soft text-danger border border-danger/30",
        accent: "bg-accent-soft text-accent border border-accent/30",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export function Badge({
  className,
  tone,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Tooltip — plain-language definitions, keyboard + touch accessible           */
/* -------------------------------------------------------------------------- */

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="ml-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-border-strong text-[10px] font-bold leading-none text-fg-subtle transition-colors hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg border border-border bg-surface-raised p-3 text-step--2 font-normal leading-relaxed text-fg-muted shadow-raised"
        >
          {children}
        </span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Reveal — the reusable scroll-entrance wrapper                               */
/* -------------------------------------------------------------------------- */

export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* AnimatedNumber — count-up on reveal, information-bearing not decorative     */
/* -------------------------------------------------------------------------- */

export function AnimatedNumber({
  value,
  format,
  className,
  duration = 1.1,
}: {
  value: number;
  format: (v: number) => string;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(reduce ? value : 0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (reduce || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;

        const start = performance.now();
        const from = 0;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / (duration * 1000));
          // easeOutExpo
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          setDisplay(from + (value - from) * eased);
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration, reduce]);

  // If the underlying value changes after the initial count-up, track it directly.
  React.useEffect(() => {
    if (started.current) setDisplay(value);
  }, [value]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {format(display)}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton                                                                    */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden="true" />;
}

/* -------------------------------------------------------------------------- */
/* Field — a labelled numeric input with inline validation                     */
/* -------------------------------------------------------------------------- */

export function Field({
  label,
  tip,
  suffix,
  prefix,
  error,
  value,
  onChange,
  step = "any",
  min,
  max,
  id,
}: {
  label: string;
  tip?: string;
  suffix?: string;
  prefix?: string;
  error?: string;
  value: number;
  onChange: (v: number) => void;
  step?: string | number;
  min?: number;
  max?: number;
  id?: string;
}) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="min-w-0">
      <label
        htmlFor={inputId}
        className="flex items-center text-step--1 font-medium text-fg-muted"
      >
        {label}
        {tip && <InfoTip label={label}>{tip}</InfoTip>}
      </label>
      <div
        className={cn(
          "mt-1.5 flex items-center rounded-lg border bg-surface transition-colors focus-within:border-primary",
          error ? "border-danger" : "border-border-strong"
        )}
      >
        {prefix && (
          <span className="pl-3 text-step--1 text-fg-subtle" aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="tabular w-full bg-transparent px-3 py-2.5 text-step-0 outline-none placeholder:text-fg-subtle"
        />
        {suffix && (
          <span className="whitespace-nowrap pr-3 text-step--1 text-fg-subtle" aria-hidden="true">
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-step--2 font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
