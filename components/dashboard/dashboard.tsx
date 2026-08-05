"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useAshraqStore } from "@/lib/store";
import { VerdictCards } from "./verdict-cards";
import { ExplainPanel, RisksPanel, RecommendationPanel, ComparePanel, DelayNarrative } from "./ai-panels";
import { AskAshraq } from "./ask-ashraq";
import { ExportToolbar } from "./export-toolbar";
import { PanelErrorBoundary } from "@/components/ui/error-boundary";
import { CashflowPanel } from "./panels/cashflow-panel";
import { ComparisonPanel } from "./panels/comparison-panel";
import { SensitivityPanel } from "./panels/sensitivity-panel";
import { ScenariosPanel } from "./panels/scenarios-panel";
import { MonteCarloPanel } from "./panels/monte-carlo-panel";
import { FinancingPanel } from "./panels/financing-panel";
import { EsgPanel } from "./panels/esg-panel";
import { DelayPanel } from "./panels/delay-panel";
import { SolarCalibration } from "./solar-calibration";
import { RigourPanel } from "./panels/rigour-panel";
import { HorizonPanel } from "./panels/horizon-panel";
import { OperationsPanel } from "./panels/operations-panel";
import { RateCrossover } from "./panels/rate-crossover";
import { cn, formatAED, formatPercent } from "@/lib/utils";
import { SlidersHorizontal, AlertTriangle } from "lucide-react";

const TABS = [
  { id: "cashflow", label: "Cash flows" },
  { id: "comparison", label: "Comparison" },
  { id: "horizon", label: "Equal-life" },
  { id: "rigour", label: "Verifications" },
  { id: "sensitivity", label: "Sensitivity" },
  { id: "scenarios", label: "Scenarios" },
  { id: "montecarlo", label: "Monte Carlo" },
  { id: "operations", label: "Operations" },
  { id: "financing", label: "Financing" },
  { id: "esg", label: "ESG" },
  { id: "delay", label: "Delay" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Dashboard() {
  const { results, inputs, errors } = useAshraqStore();
  const [tab, setTab] = useState<TabId>("cashflow");
  const reduce = useReducedMotion();

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="shell py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-step--2 font-medium uppercase tracking-[0.16em] text-primary-strong">
            Al Waha Logistics &amp; Cold Chain LLC
          </p>
          <h1 className="mt-2 font-display text-step-4 font-bold tracking-tight">
            Results dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-step-0 text-fg-muted">
            A {inputs.systemSizeMWp} MWp rooftop solar investment over{" "}
            {inputs.projectLifeYears} years, evaluated across four ownership structures. Every
            figure below comes from a unit-tested deterministic engine.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Link
            href="/wizard"
            className="no-print inline-flex h-10 items-center gap-2 rounded-lg border border-border-strong px-4 text-step--1 font-medium transition-colors hover:border-primary hover:text-primary-strong"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Adjust inputs
          </Link>
          <ExportToolbar />
        </div>
      </div>

      {hasErrors && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft p-4"
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-danger"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          <p className="text-step--1 text-fg-muted">
            Some inputs are invalid, so these results reflect the last valid set.{" "}
            <Link href="/wizard" className="font-semibold text-danger underline">
              Fix them in the wizard
            </Link>
            .
          </p>
        </div>
      )}

      {/* Discount-rate banner — the methodological point, stated up front */}
      <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-primary/30 bg-primary-soft/35 p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-step--1 leading-relaxed text-fg-muted">
          <strong className="font-semibold text-fg">Two discount rates, applied separately.</strong>{" "}
          Alternatives A and D are discounted at{" "}
          <strong className="tabular text-fg">{formatPercent(inputs.discountRateCapex, 1)}</strong>{" "}
          for equipment and performance risk; the PPA at{" "}
          <strong className="tabular text-fg">{formatPercent(inputs.discountRatePpa, 1)}</strong> for
          counterparty credit risk alone.
        </p>
        <Link
          href="/methodology"
          className="no-print shrink-0 text-step--1 font-semibold text-primary-strong underline underline-offset-4"
        >
          Why this matters
        </Link>
      </div>

      {/* Verdict cards */}
      <PanelErrorBoundary panelName="headline metrics">
        <VerdictCards results={results} />
      </PanelErrorBoundary>

      {/* AI summary + recommendation */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PanelErrorBoundary panelName="plain-language summary">
          <ExplainPanel />
        </PanelErrorBoundary>
        <PanelErrorBoundary panelName="recommendation">
          <RecommendationPanel />
        </PanelErrorBoundary>
      </div>

      {/* Deep analysis tabs */}
      <div className="mt-10">
        <div
          role="tablist"
          aria-label="Deep analysis"
          className="no-print -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active}
                aria-controls={`panel-${t.id}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setTab(t.id)}
                onKeyDown={(e) => {
                  const i = TABS.findIndex((x) => x.id === tab);
                  if (e.key === "ArrowRight") setTab(TABS[(i + 1) % TABS.length].id);
                  if (e.key === "ArrowLeft") setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
                }}
                className={cn(
                  "relative shrink-0 whitespace-nowrap px-4 py-3 text-step--1 font-medium transition-colors",
                  active ? "text-fg" : "text-fg-muted hover:text-fg"
                )}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId={reduce ? undefined : "tab-indicator"}
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="pt-8"
          tabIndex={0}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={reduce ? undefined : { opacity: 0, y: 10 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "cashflow" && (
                <PanelErrorBoundary panelName="cash flow">
                  <CashflowPanel results={results} />
                </PanelErrorBoundary>
              )}
              {tab === "comparison" && (
                <PanelErrorBoundary panelName="comparison">
                  <div className="space-y-8">
                    <ComparisonPanel results={results} />
                    <RateCrossover />
                    <ComparePanel />
                  </div>
                </PanelErrorBoundary>
              )}
              {tab === "horizon" && (
                <PanelErrorBoundary panelName="equal-life comparison">
                  <HorizonPanel />
                </PanelErrorBoundary>
              )}
              {tab === "rigour" && (
                <PanelErrorBoundary panelName="verifications">
                  <RigourPanel />
                </PanelErrorBoundary>
              )}
              {tab === "operations" && (
                <PanelErrorBoundary panelName="operations">
                  <OperationsPanel />
                </PanelErrorBoundary>
              )}
              {tab === "sensitivity" && (
                <PanelErrorBoundary panelName="sensitivity">
                  <SensitivityPanel results={results} />
                </PanelErrorBoundary>
              )}
              {tab === "scenarios" && (
                <PanelErrorBoundary panelName="scenarios">
                  <ScenariosPanel results={results} />
                </PanelErrorBoundary>
              )}
              {tab === "montecarlo" && (
                <PanelErrorBoundary panelName="Monte Carlo">
                  <MonteCarloPanel />
                </PanelErrorBoundary>
              )}
              {tab === "financing" && (
                <PanelErrorBoundary panelName="financing feasibility">
                  <FinancingPanel results={results} />
                </PanelErrorBoundary>
              )}
              {tab === "esg" && (
                <PanelErrorBoundary panelName="ESG">
                  <div className="space-y-8">
                    <EsgPanel results={results} />
                    <SolarCalibration />
                  </div>
                </PanelErrorBoundary>
              )}
              {tab === "delay" && (
                <PanelErrorBoundary panelName="delay analysis">
                  <div className="space-y-8">
                    <DelayPanel results={results} />
                    <DelayNarrative />
                  </div>
                </PanelErrorBoundary>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Risks */}
      <div className="mt-10">
        <PanelErrorBoundary panelName="risk analysis">
          <RisksPanel />
        </PanelErrorBoundary>
      </div>

      {/* Print-only footer so an exported PDF is self-describing */}
      <div className="mt-10 hidden border-t border-border pt-6 text-step--2 text-fg-subtle print:block">
        <p>
          Ashraq — Al Waha Logistics &amp; Cold Chain LLC, {inputs.systemSizeMWp} MWp rooftop solar.
          NPV {formatAED(results.metrics.npv)} at {formatPercent(inputs.discountRateCapex, 1)}; PPA
          PV {formatAED(results.ppa.pvAtPpaRate)} at {formatPercent(inputs.discountRatePpa, 1)}.
          Recommendation: {results.recommendation.verdict}.
        </p>
        <p className="mt-1">
          Krishna Mathur · AS25DXB018 · SP Jain School of Global Management · Generated{" "}
          {new Date().toLocaleDateString("en-GB")}
        </p>
      </div>

      <AskAshraq />
    </div>
  );
}
