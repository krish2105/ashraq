"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Hero3D } from "@/components/three/hero-3d";
import { ArrowRight, MapPin, Zap } from "lucide-react";

const HEADLINE = ["Should", "Al Waha", "own", "the sun?"];

/**
 * The hero's job: state the actual question the model answers, in the company's own
 * terms, before a single number appears. The 3D array behind it is the asset under
 * appraisal — the subject, not decoration.
 */
export function LandingHero() {
  const reduce = useReducedMotion();

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
  };
  const item = {
    hidden: { opacity: 0, y: 28 },
    show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] as const } },
  };

  return (
    <section className="relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden">
      {/* 3D layer — held to the right side so the headline never sits on top of it.
          Lazy-loaded, and degrades to a designed CSS composition without WebGL. */}
      <div className="absolute inset-y-0 right-0 -z-10 w-full lg:w-[56%]">
        <Hero3D />
      </div>

      {/* Wash: opaque behind the text, feathering to clear over the array. This is what
          keeps body copy above 4.5:1 contrast in both themes. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(100deg, hsl(var(--bg)) 0%, hsl(var(--bg)) 38%, hsl(var(--bg) / 0.86) 52%, hsl(var(--bg) / 0.45) 72%, hsl(var(--bg) / 0.15) 100%)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32"
        style={{ background: "linear-gradient(to top, hsl(var(--bg)), transparent)" }}
        aria-hidden="true"
      />

      <div className="shell relative flex min-h-[calc(100dvh-4rem)] flex-col justify-center py-16">
        <motion.div
          variants={reduce ? undefined : container}
          initial={reduce ? undefined : "hidden"}
          animate={reduce ? undefined : "show"}
          className="max-w-2xl lg:max-w-[46rem]"
        >
          <motion.div variants={reduce ? undefined : item}>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3.5 py-1.5 text-step--2 font-medium text-primary-strong">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              Corporate Finance · Individual Submission · SP Jain MAIB
            </span>
          </motion.div>

          <h1 className="mt-7 font-display text-hero font-bold">
            <span className="sr-only">Should Al Waha own the sun?</span>
            {HEADLINE.map((word, i) => (
              <motion.span
                key={word}
                variants={reduce ? undefined : item}
                className="mr-[0.22em] inline-block"
                aria-hidden="true"
              >
                {i === 3 ? <span className="text-gradient-solar animate-shimmer">{word}</span> : word}
              </motion.span>
            ))}
          </h1>

          <motion.p
            variants={reduce ? undefined : item}
            className="mt-7 max-w-xl text-step-1 leading-relaxed text-fg-muted"
          >
            A 1.2 MWp rooftop solar system on a Dubai cold-storage warehouse costs{" "}
            <strong className="tabular font-semibold text-fg">AED 4.28 million</strong>. Ashraq
            models whether to buy it, borrow for it, or simply buy its output — and discounts each
            alternative at a rate that matches{" "}
            <em className="not-italic text-fg">its own risk</em>, not one blended rate for all of
            them.
          </motion.p>

          <motion.div
            variants={reduce ? undefined : item}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/wizard"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-step-0 font-semibold text-primary-fg shadow-glow transition-all duration-200 hover:bg-primary-strong active:scale-[0.98]"
            >
              Load the Al Waha case
              <ArrowRight
                className="h-4 w-4 transition-transform duration-300 ease-out-quart group-hover:translate-x-1"
                strokeWidth={2.5}
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-14 items-center justify-center rounded-xl border border-border-strong bg-surface/70 px-7 text-step-0 font-semibold backdrop-blur transition-all duration-200 hover:border-primary hover:text-primary-strong"
            >
              Skip to the results
            </Link>
          </motion.div>

          <motion.dl
            variants={reduce ? undefined : item}
            className="mt-14 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4"
          >
            {[
              { label: "System", value: "1.2 MWp" },
              { label: "Horizon", value: "15 yrs" },
              { label: "Alternatives", value: "4" },
              { label: "Metrics", value: "17" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-step--2 uppercase tracking-[0.14em] text-fg-subtle">
                  {stat.label}
                </dt>
                <dd className="tabular mt-1 whitespace-nowrap font-display text-step-2 font-bold">
                  {stat.value}
                </dd>
              </div>
            ))}
          </motion.dl>

          <motion.p
            variants={reduce ? undefined : item}
            className="mt-10 inline-flex items-center gap-2 text-step--1 text-fg-subtle"
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Al Waha Logistics &amp; Cold Chain LLC · Dubai Investments Park
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
