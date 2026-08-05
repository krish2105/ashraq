"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useAshraqStore } from "@/lib/store";
import { Button, Field, InfoTip } from "@/components/ui/primitives";
import { formatAED, formatPercent, cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Sun,
  Wallet,
  TrendingUp,
  Landmark,
  AlertTriangle,
} from "lucide-react";
import type { ProjectInputs } from "@/lib/finance-engine";

const STEPS = [
  { id: 0, title: "Project basics", Icon: Sun, blurb: "The system, how much it generates, and how long we model it for." },
  { id: 1, title: "Costs", Icon: Wallet, blurb: "What it costs to buy, install, connect and maintain." },
  { id: 2, title: "Revenue & savings", Icon: TrendingUp, blurb: "The electricity Al Waha stops buying — this project's 'revenue'." },
  { id: 3, title: "Financing & tax", Icon: Landmark, blurb: "Discount rates, corporate tax, debt structure and salvage." },
] as const;

/** Percentage-typed fields are stored as decimals but edited as percentages. */
function PercentField({
  label,
  tip,
  value,
  onChange,
  error,
  step = 0.1,
  max,
}: {
  label: string;
  tip?: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  step?: number;
  max?: number;
}) {
  return (
    <Field
      label={label}
      tip={tip}
      suffix="%"
      value={Number.isFinite(value) ? Number((value * 100).toFixed(4)) : NaN}
      onChange={(v) => onChange(v / 100)}
      error={error}
      step={step}
      min={0}
      max={max}
    />
  );
}

export function InputWizard() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { inputs, errors, setInput, loadAlWahaCase, resetToBlank, results, caseLoaded } =
    useAshraqStore();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const set =
    <K extends keyof ProjectInputs>(key: K) =>
    (value: ProjectInputs[K]) =>
      setInput(key, value);

  const err = (k: keyof ProjectInputs) => errors[k as string];

  const stepHasError = (s: number) => {
    const fieldsByStep: Record<number, (keyof ProjectInputs)[]> = {
      0: ["systemSizeMWp", "year1GenerationKwh", "degradationRate", "projectLifeYears"],
      1: [
        "equipmentCost",
        "installationCost",
        "transportCost",
        "connectionFee",
        "workingCapital",
        "omYear1",
        "omEscalation",
      ],
      2: ["tariffYear1", "tariffEscalation", "ppaRate"],
      3: [
        "taxRate",
        "salvageValue",
        "discountRateCapex",
        "discountRatePpa",
        "financeRate",
        "reinvestmentRate",
        "debtRatio",
        "debtInterestRate",
        "debtTermYears",
        "gridEmissionFactor",
        "capexDeclineRate",
      ],
    };
    return fieldsByStep[s]?.some((f) => errors[f as string]);
  };

  const hasAnyError = Object.keys(errors).length > 0;

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(STEPS.length - 1, next)));
  };

  const slide = {
    enter: (d: number) => ({ opacity: 0, x: d * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -28 }),
  };

  const capexTotal =
    (inputs.equipmentCost || 0) +
    (inputs.installationCost || 0) +
    (inputs.transportCost || 0) +
    (inputs.connectionFee || 0);

  return (
    <div className="shell py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-step-4 font-bold tracking-tight">Set up the model</h1>
          <p className="mt-2 max-w-2xl text-step-0 text-fg-muted">
            Every field is pre-filled with a sourced default from the Al Waha case. Change anything
            you like — the results recalculate instantly. Hover any{" "}
            <span className="inline-grid h-4 w-4 place-items-center rounded-full border border-border-strong align-middle text-[10px] font-bold text-fg-subtle">
              ?
            </span>{" "}
            for a plain-language explanation.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={loadAlWahaCase}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
            Reload Al Waha case
          </Button>
          <Button variant="ghost" size="sm" onClick={resetToBlank}>
            Start from scratch
          </Button>
        </div>
      </div>

      {!caseLoaded && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            strokeWidth={2.4}
            aria-hidden="true"
          />
          <p className="text-step--1 text-fg-muted">
            You&rsquo;re starting from a blank sheet. Fill every field to get results, or reload the
            Al Waha case to work from sourced defaults.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          {/* Step indicator */}
          <ol className="mb-8 flex items-center gap-1.5" aria-label="Progress">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              const bad = stepHasError(i);
              return (
                <li key={s.id} className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={active ? "step" : undefined}
                    className="group flex flex-1 flex-col gap-2 text-left"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-full rounded-full transition-colors duration-300",
                        bad
                          ? "bg-danger"
                          : active
                            ? "bg-primary"
                            : done
                              ? "bg-primary/45"
                              : "bg-border"
                      )}
                    />
                    <span
                      className={cn(
                        "hidden text-step--2 font-medium transition-colors sm:block",
                        active ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted"
                      )}
                    >
                      {i + 1}. {s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              {(() => {
                const { Icon } = STEPS[step];
                return (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-strong">
                    <Icon className="h-5 w-5" strokeWidth={2.2} aria-hidden="true" />
                  </span>
                );
              })()}
              <div>
                <h2 className="font-display text-step-2 font-bold tracking-tight">
                  {STEPS[step].title}
                </h2>
                <p className="text-step--1 text-fg-muted">{STEPS[step].blurb}</p>
              </div>
            </div>

            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step}
                custom={direction}
                variants={reduce ? undefined : slide}
                initial={reduce ? undefined : "enter"}
                animate={reduce ? undefined : "center"}
                exit={reduce ? undefined : "exit"}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              >
                {step === 0 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="System size"
                      suffix="MWp"
                      tip="The peak generating capacity of the array. 1.2 MWp suits a 15,000 sqm industrial roof at typical commercial panel density."
                      value={inputs.systemSizeMWp}
                      onChange={set("systemSizeMWp")}
                      error={err("systemSizeMWp")}
                      step={0.1}
                    />
                    <Field
                      label="Year-1 generation"
                      suffix="kWh"
                      tip="How much electricity the system produces in its first year. Derived from 1,750 kWh/kWp/yr — a conservative Dubai yield after heat and dust derating."
                      value={inputs.year1GenerationKwh}
                      onChange={set("year1GenerationKwh")}
                      error={err("year1GenerationKwh")}
                      step={10000}
                    />
                    <PercentField
                      label="Panel degradation"
                      tip="Solar panels lose a little output every year. 0.5% a year is the industry-standard assumption."
                      value={inputs.degradationRate}
                      onChange={set("degradationRate")}
                      error={err("degradationRate")}
                      step={0.1}
                    />
                    <Field
                      label="Evaluation horizon"
                      suffix="years"
                      tip="How many years we model. The panels physically last 20–25 years, so 15 is deliberately conservative — value beyond year 15 is excluded entirely."
                      value={inputs.projectLifeYears}
                      onChange={set("projectLifeYears")}
                      error={err("projectLifeYears")}
                      step={1}
                    />
                  </div>
                )}

                {step === 1 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Equipment & mounting"
                      prefix="AED"
                      tip="Panels, inverters and mounting hardware. Based on AED 2.8–4.5 per watt reported for 2026 UAE commercial rooftop installs."
                      value={inputs.equipmentCost}
                      onChange={set("equipmentCost")}
                      error={err("equipmentCost")}
                      step={10000}
                    />
                    <Field
                      label="Installation & commissioning"
                      prefix="AED"
                      tip="Labour to install and commission the system — around 11% of equipment cost is the standard EPC allocation."
                      value={inputs.installationCost}
                      onChange={set("installationCost")}
                      error={err("installationCost")}
                      step={1000}
                    />
                    <Field
                      label="Transportation & logistics"
                      prefix="AED"
                      tip="Getting the equipment to site — roughly 2% of equipment cost."
                      value={inputs.transportCost}
                      onChange={set("transportCost")}
                      error={err("transportCost")}
                      step={1000}
                    />
                    <Field
                      label="DEWA connection fee"
                      prefix="AED"
                      tip="The cost of connecting to the grid under DEWA's Shams Dubai net-metering programme."
                      value={inputs.connectionFee}
                      onChange={set("connectionFee")}
                      error={err("connectionFee")}
                      step={1000}
                    />
                    <Field
                      label="Working capital"
                      prefix="AED"
                      tip="Cash tied up in a spare-parts reserve. It isn't spent — it's recovered in full at the end of the project."
                      value={inputs.workingCapital}
                      onChange={set("workingCapital")}
                      error={err("workingCapital")}
                      step={5000}
                    />
                    <Field
                      label="O&M cost (Year 1)"
                      prefix="AED"
                      tip="Cleaning, monitoring and maintenance. About 1.2% of installed cost per year is the commercial-solar benchmark."
                      value={inputs.omYear1}
                      onChange={set("omYear1")}
                      error={err("omYear1")}
                      step={1000}
                    />
                    <PercentField
                      label="O&M escalation"
                      tip="How fast maintenance costs rise each year, tracking UAE service-cost inflation."
                      value={inputs.omEscalation}
                      onChange={set("omEscalation")}
                      error={err("omEscalation")}
                    />
                    <div className="flex items-end">
                      <div className="w-full rounded-lg border border-primary/30 bg-primary-soft/50 px-4 py-3">
                        <p className="text-step--2 uppercase tracking-wider text-fg-subtle">
                          Total CAPEX
                        </p>
                        <p className="tabular font-display text-step-1 font-bold text-primary-strong">
                          {formatAED(capexTotal)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field
                      label="Avoided grid tariff (Year 1)"
                      prefix="AED"
                      suffix="/kWh"
                      tip="What Al Waha currently pays DEWA per unit. Every unit the solar system generates is a unit not bought at this price — that's the project's 'revenue'."
                      value={inputs.tariffYear1}
                      onChange={set("tariffYear1")}
                      error={err("tariffYear1")}
                      step={0.01}
                    />
                    <PercentField
                      label="Tariff escalation"
                      tip="How fast the DEWA tariff rises each year. A higher rate makes the solar system more valuable, because it's avoiding a more expensive bill."
                      value={inputs.tariffEscalation}
                      onChange={set("tariffEscalation")}
                      error={err("tariffEscalation")}
                    />
                    <Field
                      label="PPA rate (Alternative B)"
                      prefix="AED"
                      suffix="/kWh"
                      tip="Under a Power Purchase Agreement, a developer owns the system and Al Waha buys the output at this fixed rate — typically ~20% below the grid tariff."
                      value={inputs.ppaRate}
                      onChange={set("ppaRate")}
                      error={err("ppaRate")}
                      step={0.01}
                    />
                    <div className="sm:col-span-2 rounded-xl border border-border bg-bg-subtle/60 p-4">
                      <p className="text-step--1 leading-relaxed text-fg-muted">
                        <strong className="font-semibold text-fg">Year-1 avoided cost:</strong>{" "}
                        <span className="tabular">
                          {formatAED((inputs.year1GenerationKwh || 0) * (inputs.tariffYear1 || 0))}
                        </span>{" "}
                        — the electricity Al Waha stops buying in the first year.
                      </p>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-7">
                    {/* Discount rates — the methodological centrepiece, surfaced inline */}
                    <div className="rounded-xl border border-primary/30 bg-primary-soft/30 p-5">
                      <h3 className="flex items-center font-display text-step-1 font-bold tracking-tight">
                        Discount rates — one per alternative
                        <InfoTip label="per-alternative discount rates">
                          A cash flow&rsquo;s risk should set its discount rate. Owning equipment
                          exposes you to performance risk; a PPA only exposes you to the
                          developer&rsquo;s credit risk. Discounting both at the same rate is the
                          most common error in this kind of comparison.
                        </InfoTip>
                      </h3>
                      <p className="mt-2 text-step--1 leading-relaxed text-fg-muted">
                        These two rates are applied independently. Changing one will not move the
                        other&rsquo;s result — that is deliberate, and it is what makes the
                        comparison honest.
                      </p>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <PercentField
                          label="Hurdle rate — Alternatives A & D"
                          tip="The minimum return the owned solar project must clear. Reflects Al Waha's blended cost of capital and the project's equipment/performance risk."
                          value={inputs.discountRateCapex}
                          onChange={set("discountRateCapex")}
                          error={err("discountRateCapex")}
                        />
                        <PercentField
                          label="Discount rate — Alternative B (PPA)"
                          tip="Lower, because a contracted PPA's dominant risk is the developer defaulting, not the panels underperforming. That risk profile sits closer to secured debt."
                          value={inputs.discountRatePpa}
                          onChange={set("discountRatePpa")}
                          error={err("discountRatePpa")}
                        />
                      </div>
                    </div>

                    {/* Tax */}
                    <div>
                      <h3 className="mb-4 font-display text-step-1 font-bold tracking-tight">
                        Tax &amp; salvage
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <PercentField
                          label="Corporate tax rate"
                          tip="UAE federal corporate tax is 9% on taxable profit above AED 375,000, per Federal Decree-Law No. 47 of 2022."
                          value={inputs.taxRate}
                          onChange={set("taxRate")}
                          error={err("taxRate")}
                        />
                        <Field
                          label="Salvage value (final year)"
                          prefix="AED"
                          tip="What the equipment is worth at the end of the modelled horizon. Since it's fully depreciated by then, the whole amount is a taxable gain."
                          value={inputs.salvageValue}
                          onChange={set("salvageValue")}
                          error={err("salvageValue")}
                          step={10000}
                        />
                      </div>

                      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-subtle/60 p-4">
                        <input
                          type="checkbox"
                          checked={inputs.qfzpEnabled}
                          onChange={(e) => setInput("qfzpEnabled", e.target.checked)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                        />
                        <span>
                          <span className="flex items-center text-step--1 font-semibold">
                            Model as a 0% Qualifying Free Zone Person (QFZP)
                            <InfoTip label="QFZP status">
                              Dubai Investments Park is a Free Zone, so Al Waha could test for QFZP
                              status. Ashraq does not assume it: property-linked activity is
                              excluded, and mostly-mainland customers risk breaching the de-minimis
                              threshold. Switching this on shows the upside — it does not establish
                              eligibility.
                            </InfoTip>
                          </span>
                          <span className="mt-1 block text-step--2 leading-relaxed text-fg-muted">
                            Off by default. The conservative, defensible choice is the standard 9%
                            rate; QFZP treatment would need a professional tax ruling, not a
                            modelling assumption.
                          </span>
                        </span>
                      </label>
                    </div>

                    {/* Financing */}
                    <div>
                      <h3 className="mb-4 font-display text-step-1 font-bold tracking-tight">
                        Debt structure (Alternative D)
                      </h3>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <PercentField
                          label="Debt ratio"
                          tip="How much of the CAPEX is borrowed rather than funded with equity."
                          value={inputs.debtRatio}
                          onChange={set("debtRatio")}
                          error={err("debtRatio")}
                          max={100}
                        />
                        <PercentField
                          label="Interest rate"
                          tip="Priced off EIBOR plus a margin for secured equipment finance."
                          value={inputs.debtInterestRate}
                          onChange={set("debtInterestRate")}
                          error={err("debtInterestRate")}
                        />
                        <Field
                          label="Loan term"
                          suffix="years"
                          tip="How long the loan amortises over. A shorter term means higher annual payments and thinner debt service coverage."
                          value={inputs.debtTermYears}
                          onChange={set("debtTermYears")}
                          error={err("debtTermYears")}
                          step={1}
                        />
                      </div>
                    </div>

                    {/* Advanced */}
                    <details className="group rounded-xl border border-border bg-bg-subtle/40 p-5">
                      <summary className="cursor-pointer list-none text-step--1 font-semibold text-fg-muted transition-colors hover:text-fg">
                        Advanced settings — MIRR rates, emissions factor, delay assumption
                        <span className="ml-2 inline-block transition-transform group-open:rotate-90">
                          ›
                        </span>
                      </summary>
                      <div className="mt-5 grid gap-5 sm:grid-cols-2">
                        <PercentField
                          label="MIRR finance rate"
                          tip="The rate at which the initial outflow is financed, used in the Modified IRR calculation."
                          value={inputs.financeRate}
                          onChange={set("financeRate")}
                          error={err("financeRate")}
                        />
                        <PercentField
                          label="MIRR reinvestment rate"
                          tip="The rate at which interim cash flows are assumed to be reinvested. Correcting this assumption is exactly why MIRR exists."
                          value={inputs.reinvestmentRate}
                          onChange={set("reinvestmentRate")}
                          error={err("reinvestmentRate")}
                        />
                        <Field
                          label="Grid emission factor"
                          suffix="tCO₂/MWh"
                          tip="An approximate figure for the UAE grid mix. DEWA does not publish a single official factor, so this is a modelling estimate, not a certified number."
                          value={inputs.gridEmissionFactor}
                          onChange={set("gridEmissionFactor")}
                          error={err("gridEmissionFactor")}
                          step={0.01}
                        />
                        <PercentField
                          label="Annual CAPEX decline (delay analysis)"
                          tip="How much cheaper the system might get if you wait. IRENA's 2025 data shows solar costs have stabilised, so this defaults to a modest 1%."
                          value={inputs.capexDeclineRate}
                          onChange={set("capexDeclineRate")}
                          error={err("capexDeclineRate")}
                        />
                      </div>
                    </details>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-6">
              <Button
                variant="ghost"
                onClick={() => go(step - 1)}
                disabled={step === 0}
                aria-label="Previous step"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                Back
              </Button>

              {step < STEPS.length - 1 ? (
                <Button onClick={() => go(step + 1)}>
                  Continue
                  <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                </Button>
              ) : (
                <Button onClick={() => router.push("/dashboard")} disabled={hasAnyError}>
                  <Check className="h-4 w-4" strokeWidth={2.6} aria-hidden="true" />
                  See the results
                </Button>
              )}
            </div>

            {hasAnyError && (
              <p role="alert" className="mt-4 text-step--1 font-medium text-danger">
                Fix {Object.keys(errors).length} invalid field
                {Object.keys(errors).length === 1 ? "" : "s"} before continuing to the results.
              </p>
            )}
          </div>
        </div>

        {/* Live preview — the model recalculates as you type */}
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
            <h2 className="text-step--2 font-semibold uppercase tracking-[0.14em] text-fg-subtle">
              Live result
            </h2>
            <p className="mt-4 text-step--1 text-fg-muted">NPV (Alternative A)</p>
            <p
              className={cn(
                "tabular font-display text-step-3 font-bold leading-none",
                results.metrics.npv > 0 ? "text-success" : "text-danger"
              )}
            >
              {formatAED(results.metrics.npv)}
            </p>

            <dl className="mt-6 space-y-3 border-t border-border pt-5 text-step--1">
              {[
                { k: "IRR", v: results.metrics.irr === null ? "—" : formatPercent(results.metrics.irr) },
                { k: "MIRR", v: results.metrics.mirr === null ? "—" : formatPercent(results.metrics.mirr) },
                { k: "PI", v: results.metrics.profitabilityIndex.toFixed(3) },
                {
                  k: "Payback",
                  v: results.metrics.paybackPeriod === null ? "Never" : `${results.metrics.paybackPeriod.toFixed(2)} yrs`,
                },
                { k: "PPA PV (Alt. B)", v: formatAED(results.ppa.pvAtPpaRate) },
                { k: "Min DSCR (Alt. D)", v: `${results.financing.minDscr.toFixed(2)}×` },
              ].map((row) => (
                <div key={row.k} className="flex items-baseline justify-between gap-3">
                  <dt className="text-fg-muted">{row.k}</dt>
                  <dd className="tabular font-semibold">{row.v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-5 border-t border-border pt-4 text-step--2 leading-relaxed text-fg-subtle">
              Recomputed on every keystroke by the deterministic engine — no AI involved in any of
              these figures.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
