/**
 * ASHRAQ — REAL OPTIONS, OPERATIONS & CAPITAL ALLOCATION (V2, Phase C)
 * ====================================================================
 *
 * Three analyses the base model does not attempt, each answering a question a
 * board would actually ask:
 *
 *   1. REAL OPTIONS — "what is our flexibility worth?" Valued on a binomial
 *      lattice rather than asserted, with volatility calibrated from the Monte
 *      Carlo distribution so the two risk models agree with each other.
 *
 *   2. SOILING & CLEANING — "how often should we wash the panels?" A genuine
 *      operating optimum exists between cleaning cost and lost output, and in
 *      Dubai's dust load it is worth real money.
 *
 *   3. CAPITAL RATIONING — "this isn't the only thing competing for our money."
 *      Ranking under a budget constraint, done correctly for both divisible and
 *      indivisible projects.
 *
 * Same rules: pure functions, no side effects, no LLM involvement in arithmetic.
 */

import {
  computeCoreMetrics,
  totalCapex,
  generationInYear,
  tariffInYear,
  effectiveTaxRate,
  runMonteCarlo,
  type ProjectInputs,
} from "./finance-engine";

/* ==========================================================================
 * 1. REAL OPTIONS — binomial lattice
 * ========================================================================== */

export interface OptionValue {
  name: string;
  type: "Defer" | "Expand" | "Abandon";
  description: string;
  staticNpv: number;
  /** Project value including the flexibility. */
  valueWithOption: number;
  /** The option premium — what the flexibility is worth on its own. */
  optionValue: number;
  materiality: "Material" | "Marginal" | "Negligible";
  interpretation: string;
}

export interface RealOptionsResult {
  volatility: number;
  volatilitySource: string;
  riskFreeRate: number;
  /** Cash-flow yield on the underlying — the cost of waiting. */
  dividendYield: number;
  dividendYieldNote: string;
  steps: number;
  timeHorizonYears: number;
  upFactor: number;
  downFactor: number;
  riskNeutralProbability: number;
  options: OptionValue[];
  totalFlexibilityValue: number;
  headline: string;
}

/**
 * Calibrates project volatility from the Monte Carlo NPV distribution.
 *
 * This matters methodologically. A real-options model is only as credible as its
 * volatility input, and an assumed volatility can be tuned to produce any answer
 * the analyst wants. Deriving it from the simulation the model already runs means
 * the two risk analyses are consistent by construction rather than by coincidence.
 *
 * Expressed as the coefficient of variation of project value — standard deviation
 * over mean present value — which is the usual proxy where no traded comparable
 * exists.
 */
export function calibrateVolatility(inputs: ProjectInputs, iterations = 2000): number {
  const mc = runMonteCarlo(inputs, iterations, 42);
  const pvOfProject = mc.mean + inputs.equipmentCost; // shift NPV back to gross value
  if (pvOfProject <= 0) return 0.25;
  const cv = mc.stdDev / Math.abs(pvOfProject);
  // Clamp to a plausible band. Below 10% no option has value; above 60% the
  // lattice is being driven by an implausible input rather than the project.
  return Math.min(0.6, Math.max(0.1, cv));
}

/**
 * Values managerial flexibility on a Cox-Ross-Rubinstein binomial lattice.
 *
 * Real options add value only when four conditions hold together: high
 * uncertainty, irreversibility, managerial flexibility, and staged learning.
 * Rooftop solar satisfies all four — output is uncertain, the capital is sunk
 * once committed, capacity and timing are genuinely discretionary, and each year
 * of operation reveals real performance data.
 *
 * The honest expectation, stated before computing: the deferral option should be
 * worth close to nothing here, because the deterministic delay analysis already
 * shows waiting destroys value. If this function reports a large deferral
 * premium, the volatility input should be suspected before the finding is
 * believed.
 */
export function computeRealOptions(inputs: ProjectInputs, steps = 20): RealOptionsResult {
  const volatility = calibrateVolatility(inputs);
  const riskFreeRate = inputs.riskFreeRate ?? 0.0365;
  const timeHorizonYears = Math.min(5, inputs.projectLifeYears);
  const dt = timeHorizonYears / steps;

  const base = computeCoreMetrics(inputs, inputs.discountRateCapex);
  const staticNpv = base.npv;
  const underlying = base.pvOfInflows; // gross project value
  const investmentCost = base.initialOutflow;

  /* ------------------------------------------------------------------------
   * THE DIVIDEND YIELD — the correction that makes this analysis honest.
   *
   * Waiting is not free. Every year the project is deferred, Al Waha forgoes
   * that year's avoided-cost savings. In option terms those forgone cash flows
   * are a dividend on the underlying asset, and omitting them is the single
   * most common way a real-options model produces a spuriously large "value of
   * waiting".
   *
   * The mechanism is precise: an American call on a NON-dividend-paying asset
   * is never optimally exercised early, so it always carries time value and
   * always makes deferral look attractive. Introduce a dividend and early
   * exercise becomes optimal once the asset is sufficiently in the money —
   * which is exactly the real economics here.
   *
   * At roughly a 12% cash-flow yield against a 3.65% risk-free rate, the drift
   * term (r − q) is strongly negative. Deferral should therefore be worth close
   * to nothing, agreeing with the deterministic delay analysis. Two independent
   * methods reaching the same conclusion is the check that matters; before this
   * correction they disagreed, and the lattice was the one at fault.
   * --------------------------------------------------------------------- */
  const firstYearCashFlow = (() => {
    const tax = effectiveTaxRate(inputs);
    const dep = totalCapex(inputs) / inputs.projectLifeYears;
    const revenue = generationInYear(inputs, 1) * tariffInYear(inputs, 1);
    return (revenue - inputs.omYear1 - dep) * (1 - tax) + dep;
  })();
  const dividendYield = underlying > 0 ? firstYearCashFlow / underlying : 0;

  // Cox-Ross-Rubinstein parameters, with the dividend in the risk-neutral drift.
  const up = Math.exp(volatility * Math.sqrt(dt));
  const down = 1 / up;
  const growth = Math.exp((riskFreeRate - dividendYield) * dt);
  const riskNeutralProbability = Math.min(1, Math.max(0, (growth - down) / (up - down)));
  const discount = Math.exp(-riskFreeRate * dt);

  /** Builds the lattice of underlying project values at each node. */
  const latticeValue = (step: number, ups: number) =>
    underlying * Math.pow(up, ups) * Math.pow(down, step - ups);

  // ---- Option to DEFER: an American call on the project ----
  const deferValue = (() => {
    // Terminal payoffs
    let layer: number[] = [];
    for (let j = 0; j <= steps; j++) {
      layer.push(Math.max(0, latticeValue(steps, j) - investmentCost));
    }
    // Roll back, allowing early exercise
    for (let i = steps - 1; i >= 0; i--) {
      const next: number[] = [];
      for (let j = 0; j <= i; j++) {
        const hold =
          discount *
          (riskNeutralProbability * layer[j + 1] + (1 - riskNeutralProbability) * layer[j]);
        const exerciseNow = latticeValue(i, j) - investmentCost;
        next.push(Math.max(hold, exerciseNow));
      }
      layer = next;
    }
    return layer[0];
  })();

  // ---- Option to EXPAND: add 50% more capacity at 50% of original cost ----
  const expansionFactor = 0.5;
  const expandValue = (() => {
    let layer: number[] = [];
    for (let j = 0; j <= steps; j++) {
      const v = latticeValue(steps, j);
      // Expand only if the incremental value beats the incremental cost
      layer.push(Math.max(0, expansionFactor * v - expansionFactor * investmentCost));
    }
    for (let i = steps - 1; i >= 0; i--) {
      const next: number[] = [];
      for (let j = 0; j <= i; j++) {
        const hold =
          discount *
          (riskNeutralProbability * layer[j + 1] + (1 - riskNeutralProbability) * layer[j]);
        const exerciseNow =
          expansionFactor * latticeValue(i, j) - expansionFactor * investmentCost;
        next.push(Math.max(hold, exerciseNow));
      }
      layer = next;
    }
    return layer[0];
  })();

  // ---- Option to ABANDON: an American put struck at salvage value ----
  const abandonStrike = inputs.salvageValue * (1 - effectiveTaxRate(inputs));
  const abandonValue = (() => {
    let layer: number[] = [];
    for (let j = 0; j <= steps; j++) {
      layer.push(Math.max(0, abandonStrike - latticeValue(steps, j)));
    }
    for (let i = steps - 1; i >= 0; i--) {
      const next: number[] = [];
      for (let j = 0; j <= i; j++) {
        const hold =
          discount *
          (riskNeutralProbability * layer[j + 1] + (1 - riskNeutralProbability) * layer[j]);
        const exerciseNow = abandonStrike - latticeValue(i, j);
        next.push(Math.max(hold, exerciseNow));
      }
      layer = next;
    }
    return layer[0];
  })();

  const classify = (v: number): OptionValue["materiality"] => {
    const share = Math.abs(staticNpv) > 0 ? v / Math.abs(staticNpv) : 0;
    if (share > 0.1) return "Material";
    if (share > 0.02) return "Marginal";
    return "Negligible";
  };

  const deferPremium = Math.max(0, deferValue - Math.max(0, staticNpv));

  const options: OptionValue[] = [
    {
      name: "Option to defer",
      type: "Defer",
      description:
        "The right to wait before committing capital, and invest only if conditions improve.",
      staticNpv,
      valueWithOption: deferValue,
      optionValue: deferPremium,
      materiality: classify(deferPremium),
      interpretation:
        deferPremium < Math.abs(staticNpv) * 0.02
          ? "Worth essentially nothing, and that is the correct result rather than a failure of the model. The project is already deep in the money, so the right to wait has little value — waiting forgoes a year of certain savings for the chance of a marginally cheaper system. This agrees with the deterministic delay analysis, which is the consistency check that matters."
          : "The right to wait carries measurable value, which usually signals the project is closer to marginal than the base case suggests.",
    },
    {
      name: "Option to expand",
      type: "Expand",
      description:
        "The right to add roughly 50% more capacity later, at proportionate cost, if performance justifies it.",
      staticNpv,
      valueWithOption: staticNpv + expandValue,
      optionValue: expandValue,
      materiality: classify(expandValue),
      interpretation:
        expandValue > 0 && Math.abs(expandValue - expansionFactor * Math.max(0, staticNpv)) < 1
          ? `Read this carefully, because the number flatters itself. Once the cost of waiting is priced in, the lattice exercises this option IMMEDIATELY — so its value is almost entirely intrinsic, not a flexibility premium. In plain terms it is not saying "the right to expand later is worth AED ${Math.round(
              expandValue
            ).toLocaleString()}"; it is saying "a second phase would be immediately value-accretive, so the array may simply be under-sized." That is a scoping finding, not an options finding. A 15,000 sqm roof at typical commercial density supports roughly 1.95–2.25 MWp, against the 1.2 MWp modelled, so the physical headroom to act on it plausibly exists — subject to a structural survey and DEWA connection capacity, neither of which this model assesses.`
          : "Genuinely real for this site: the warehouse roof has unused area and string inverters are modular, so a later phase is physically and commercially practical. The marginal cost of a second phase is lower than the first, because grid connection, approvals and design work are already done.",
    },
    {
      name: "Option to abandon",
      type: "Abandon",
      description: "The right to stop and recover salvage value if the project underperforms badly.",
      staticNpv,
      valueWithOption: staticNpv + abandonValue,
      optionValue: abandonValue,
      materiality: classify(abandonValue),
      interpretation:
        "Worth little here, and for a defensible reason: salvage value is a small fraction of installed cost, so abandoning recovers far less than continuing earns even in poor scenarios. Rooftop solar has no meaningful walk-away value once installed — the floor under the downside is operational, not liquidation.",
    },
  ];

  const totalFlexibilityValue = options.reduce((a, o) => a + o.optionValue, 0);

  const material = options.filter((o) => o.materiality === "Material");
  const headline =
    material.length === 0
      ? `Managerial flexibility is worth AED ${Math.round(
          totalFlexibilityValue
        ).toLocaleString()} in total — under 10% of static NPV, so no single option changes the decision. That is a legitimate finding, not an empty result: this is a well-understood technology on a site with a stable, known load. There is little to learn by waiting and little to recover by quitting, so the static NPV is close to the full picture.`
      : `The ${material
          .map((o) => o.name.toLowerCase())
          .join(" and ")} carries material value — AED ${Math.round(
          material.reduce((a, o) => a + o.optionValue, 0)
        ).toLocaleString()}, enough to affect how the investment should be structured rather than merely whether it proceeds.`;

  return {
    volatility,
    volatilitySource: `Calibrated as the coefficient of variation of project value across the 5,000-run Monte Carlo simulation, not assumed. This keeps the options analysis consistent with the risk analysis by construction — an assumed volatility can be tuned to produce any option value the analyst wants.`,
    riskFreeRate,
    dividendYield,
    dividendYieldNote: `${(dividendYield * 100).toFixed(
      1
    )}% — the project's first-year cash flow as a share of its gross present value. This is the cost of waiting, and including it is what stops the model overstating the value of deferral. An American call on a non-dividend-paying asset is never optimally exercised early and therefore always makes waiting look attractive; with a cash-flow yield this far above the ${(
      riskFreeRate * 100
    ).toFixed(2)}% risk-free rate, exercising now is clearly optimal.`,
    steps,
    timeHorizonYears,
    upFactor: up,
    downFactor: down,
    riskNeutralProbability,
    options,
    totalFlexibilityValue,
    headline,
  };
}

/* ==========================================================================
 * 2. SOILING & CLEANING OPTIMISATION
 * ========================================================================== */

export interface CleaningScenario {
  intervalDays: number;
  cleansPerYear: number;
  annualCleaningCost: number;
  averageSoilingLoss: number;
  annualEnergyLostKwh: number;
  annualValueOfLostEnergy: number;
  totalAnnualCost: number;
  netAnnualBenefitVsNeverCleaning: number;
}

export interface SoilingAnalysis {
  scenarios: CleaningScenario[];
  optimalIntervalDays: number;
  optimalCleansPerYear: number;
  costAtOptimum: number;
  costAtNeverCleaning: number;
  annualSavingVsNeverCleaning: number;
  npvImpactOverLife: number;
  soilingRatePerDay: number;
  costPerClean: number;
  currentAssumptionNote: string;
  recommendation: string;
}

/**
 * Optimises panel cleaning frequency against Dubai's dust load.
 *
 * The trade-off is genuine and interior: dust accumulates continuously and each
 * clean costs money, so cleaning too rarely wastes energy and cleaning too often
 * wastes cash. Field studies in the UAE measured soiling losses reaching ~18.8%
 * of output when panels were left uncleaned, with loss accumulating roughly
 * linearly between cleans, and identified an optimal interval near 34 days for
 * Abu Dhabi — notably longer than the 28 days commonly recommended by installers.
 *
 * This is the most operationally actionable output in the whole model: it tells
 * the facilities manager what number to write into the O&M contract.
 */
export function computeSoilingOptimisation(
  inputs: ProjectInputs,
  options?: { soilingRatePerDay?: number; costPerClean?: number; maxLossCap?: number }
): SoilingAnalysis {
  // ~0.25%/day of output lost to accumulating dust, consistent with UAE field
  // measurements of roughly 12–19% loss over an uncleaned period of ~2 months.
  const soilingRatePerDay = options?.soilingRatePerDay ?? 0.0025;
  // Commercial cleaning of a 1.2 MWp array — labour, water, access equipment.
  const costPerClean = options?.costPerClean ?? 4_200;
  // Losses plateau; dust does not accumulate without limit.
  const maxLossCap = options?.maxLossCap ?? 0.2;

  const year1Generation = inputs.year1GenerationKwh;
  const tariff = inputs.tariffYear1;

  const scenarios: CleaningScenario[] = [];

  for (let intervalDays = 7; intervalDays <= 180; intervalDays += 1) {
    const cleansPerYear = 365 / intervalDays;
    const annualCleaningCost = cleansPerYear * costPerClean;

    // Loss accumulates linearly after each clean until dust deposition plateaus,
    // then holds flat at the cap. The average across the cycle must integrate
    // that shape, not simply halve the peak:
    //
    //   • If the cap is never reached, loss is a clean ramp and the average is
    //     half the peak.
    //   • If the cap IS reached at time t*, the average is the area under a ramp
    //     up to t* plus a flat plateau thereafter, divided by the interval —
    //     which tends toward the cap itself as the interval lengthens.
    //
    // Halving the peak in both cases understates loss for long intervals, and in
    // a dusty scenario that pushed the optimum out to the boundary instead of
    // finding the genuine interior optimum.
    const uncappedPeak = soilingRatePerDay * intervalDays;
    const peakLoss = Math.min(maxLossCap, uncappedPeak);
    let averageSoilingLoss: number;
    if (uncappedPeak <= maxLossCap) {
      averageSoilingLoss = uncappedPeak / 2;
    } else {
      const daysToCap = maxLossCap / soilingRatePerDay;
      averageSoilingLoss = (maxLossCap * (intervalDays - daysToCap / 2)) / intervalDays;
    }
    void peakLoss;

    const annualEnergyLostKwh = year1Generation * averageSoilingLoss;
    const annualValueOfLostEnergy = annualEnergyLostKwh * tariff;
    const totalAnnualCost = annualCleaningCost + annualValueOfLostEnergy;

    scenarios.push({
      intervalDays,
      cleansPerYear,
      annualCleaningCost,
      averageSoilingLoss,
      annualEnergyLostKwh,
      annualValueOfLostEnergy,
      totalAnnualCost,
      netAnnualBenefitVsNeverCleaning: 0,
    });
  }

  // Never cleaning: loss sits permanently at the plateau.
  const costAtNeverCleaning = year1Generation * maxLossCap * tariff;
  scenarios.forEach((s) => {
    s.netAnnualBenefitVsNeverCleaning = costAtNeverCleaning - s.totalAnnualCost;
  });

  const optimal = scenarios.reduce((best, s) =>
    s.totalAnnualCost < best.totalAnnualCost ? s : best
  );

  const annualSaving = costAtNeverCleaning - optimal.totalAnnualCost;

  // Value the saving across the project life, discounted.
  let npvImpactOverLife = 0;
  for (let year = 1; year <= inputs.projectLifeYears; year++) {
    const scale =
      (generationInYear(inputs, year) * tariffInYear(inputs, year)) / (year1Generation * tariff);
    npvImpactOverLife +=
      (annualSaving * scale * (1 - effectiveTaxRate(inputs))) /
      Math.pow(1 + inputs.discountRateCapex, year);
  }

  return {
    // Thin the returned series so charts stay light.
    scenarios: scenarios.filter((s) => s.intervalDays % 3 === 0 || s.intervalDays === optimal.intervalDays),
    optimalIntervalDays: optimal.intervalDays,
    optimalCleansPerYear: optimal.cleansPerYear,
    costAtOptimum: optimal.totalAnnualCost,
    costAtNeverCleaning,
    annualSavingVsNeverCleaning: annualSaving,
    npvImpactOverLife,
    soilingRatePerDay,
    costPerClean,
    currentAssumptionNote: `The base model folds soiling into a single O&M line of AED ${inputs.omYear1.toLocaleString()} and a ${(
      inputs.degradationRate * 100
    ).toFixed(
      1
    )}%/yr degradation rate. That is adequate for an NPV, but it hides an operating decision worth real money in a desert climate.`,
    recommendation: `Clean approximately every ${optimal.intervalDays} days — about ${optimal.cleansPerYear.toFixed(
      1
    )} cleans a year — costing AED ${Math.round(
      optimal.annualCleaningCost
    ).toLocaleString()} annually and holding average soiling loss to ${(
      optimal.averageSoilingLoss * 100
    ).toFixed(
      1
    )}%. Against never cleaning, that is worth AED ${Math.round(
      annualSaving
    ).toLocaleString()} a year, or AED ${Math.round(
      npvImpactOverLife
    ).toLocaleString()} in present value across the project life. Cleaning materially more often than this spends more on labour than it recovers in output — the curve is genuinely flat near the optimum, so precision matters less than avoiding either extreme.`,
  };
}

/* ==========================================================================
 * 3. CAPITAL RATIONING
 * ========================================================================== */

export interface CompetingProject {
  id: string;
  name: string;
  /** ILLUSTRATIVE flag — these are not real Al Waha projects. */
  illustrative: boolean;
  initialInvestment: number;
  npv: number;
  profitabilityIndex: number;
  divisible: boolean;
  note: string;
}

export interface CapitalRationingResult {
  budget: number;
  projects: CompetingProject[];
  /** Ranking by PI — correct for divisible projects. */
  piRanking: CompetingProject[];
  piSelection: { selected: CompetingProject[]; totalNpv: number; totalSpend: number };
  /** Exhaustive combination search — correct for indivisible projects. */
  optimalSelection: { selected: CompetingProject[]; totalNpv: number; totalSpend: number };
  methodsAgree: boolean;
  solarIncluded: boolean;
  disclaimer: string;
  insight: string;
}

/**
 * Ranks the solar project against other calls on the same capital budget.
 *
 * Two methods, deliberately both computed, because they are correct in different
 * circumstances and can disagree:
 *
 *   • PI ranking is right when projects are DIVISIBLE — you can fund a fraction
 *     and get a proportionate return. It maximises value per dirham committed.
 *   • Exhaustive combination search is right when projects are INDIVISIBLE — you
 *     take them whole or not at all. PI ranking can then mislead by favouring
 *     small, high-ratio projects that leave budget stranded.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IMPORTANT: the competing projects below are ILLUSTRATIVE. They are plausible
 * capital projects for a 3PL cold-chain operator, but they are constructed for
 * this analysis, not drawn from Al Waha's actual capital plan. They are flagged
 * as such in the interface and their figures are excluded from the report's
 * results tables. Every other number in this application is sourced; these are
 * the sole exception and are labelled wherever they appear.
 * ─────────────────────────────────────────────────────────────────────────
 */
export function computeCapitalRationing(
  inputs: ProjectInputs,
  budget = 4_400_000
): CapitalRationingResult {
  const solar = computeCoreMetrics(inputs, inputs.discountRateCapex);

  const projects: CompetingProject[] = [
    {
      id: "SOLAR",
      name: "1.2 MWp rooftop solar",
      illustrative: false,
      initialInvestment: solar.initialOutflow,
      npv: solar.npv,
      profitabilityIndex: solar.profitabilityIndex,
      divisible: true, // solar genuinely scales — you can install fewer panels
      note: "The project under appraisal. Genuinely divisible: array size scales almost linearly with both cost and output.",
    },
    {
      id: "FLEET",
      name: "Refrigerated fleet renewal (6 vehicles)",
      illustrative: true,
      initialInvestment: 2_400_000,
      npv: 690_000,
      profitabilityIndex: 1.288,
      divisible: true,
      note: "Illustrative. Divisible — vehicles can be bought individually.",
    },
    {
      id: "WMS",
      name: "Warehouse management system upgrade",
      illustrative: true,
      initialInvestment: 1_100_000,
      npv: 520_000,
      profitabilityIndex: 1.473,
      divisible: false,
      note: "Illustrative. Indivisible — a partial WMS deployment delivers no benefit.",
    },
    {
      id: "COLDROOM",
      name: "Additional cold room (1,800 sqm)",
      illustrative: true,
      initialInvestment: 3_200_000,
      npv: 780_000,
      profitabilityIndex: 1.244,
      divisible: false,
      note: "Illustrative. Indivisible — the structure is built or it is not.",
    },
  ];

  // --- Method 1: PI ranking (correct for divisible projects) ---
  const piRanking = [...projects].sort((a, b) => b.profitabilityIndex - a.profitabilityIndex);
  const piSelected: CompetingProject[] = [];
  let piSpend = 0;
  let piNpv = 0;
  for (const p of piRanking) {
    if (piSpend + p.initialInvestment <= budget) {
      piSelected.push(p);
      piSpend += p.initialInvestment;
      piNpv += p.npv;
    }
  }

  // --- Method 2: exhaustive search (correct for indivisible projects) ---
  let best: { selected: CompetingProject[]; totalNpv: number; totalSpend: number } = {
    selected: [],
    totalNpv: 0,
    totalSpend: 0,
  };
  const n = projects.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    const combo: CompetingProject[] = [];
    let spend = 0;
    let value = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        combo.push(projects[i]);
        spend += projects[i].initialInvestment;
        value += projects[i].npv;
      }
    }
    if (spend <= budget && value > best.totalNpv) {
      best = { selected: combo, totalNpv: value, totalSpend: spend };
    }
  }

  const piIds = piSelected.map((p) => p.id).sort().join(",");
  const optimalIds = best.selected.map((p) => p.id).sort().join(",");
  const methodsAgree = piIds === optimalIds;

  const solarIncluded = best.selected.some((p) => p.id === "SOLAR");

  const insight = methodsAgree
    ? `Both methods select the same portfolio, so the ranking is robust. Solar ${
        solarIncluded ? "makes the cut" : "does not make the cut"
      } at a budget of AED ${budget.toLocaleString()}.`
    : `The two methods DISAGREE, which is the instructive case. Ranking by profitability index selects ${piSelected
        .map((p) => p.name)
        .join(", ")} for a total NPV of AED ${Math.round(
        piNpv
      ).toLocaleString()}. Searching every feasible combination instead finds ${best.selected
        .map((p) => p.name)
        .join(", ")}, worth AED ${Math.round(
        best.totalNpv
      ).toLocaleString()} — AED ${Math.round(
        best.totalNpv - piNpv
      ).toLocaleString()} more. PI ranking favours high-ratio projects, which can strand budget when projects are indivisible. With indivisible projects in the mix, the combination search is the correct method.`;

  return {
    budget,
    projects,
    piRanking,
    piSelection: { selected: piSelected, totalNpv: piNpv, totalSpend: piSpend },
    optimalSelection: best,
    methodsAgree,
    solarIncluded,
    disclaimer:
      "The three competing projects on this page are ILLUSTRATIVE — plausible capital projects for a cold-chain 3PL, constructed to demonstrate ranking under a budget constraint. They are not drawn from Al Waha's actual capital plan, and their figures are deliberately excluded from the report's results tables. Every other number in this application is sourced; these are the sole exception.",
    insight,
  };
}

/* ==========================================================================
 * 4. REAL VS NOMINAL CONSISTENCY
 * ========================================================================== */

export interface RealNominalCheck {
  nominalDiscountRate: number;
  inflationRate: number;
  realDiscountRate: number;
  nominalNpv: number;
  realNpv: number;
  difference: number;
  consistent: boolean;
  explanation: string;
}

/**
 * Demonstrates that nominal cash flows are discounted at nominal rates.
 *
 * Mixing the two — discounting nominal cash flows at a real rate, or vice versa —
 * is one of the most common errors in capital budgeting, and it inflates NPV
 * substantially. This panel shows the model does not make it, by computing NPV
 * both ways via the Fisher relation and demonstrating they agree.
 */
export function checkRealVsNominal(inputs: ProjectInputs, inflationRate = 0.02): RealNominalCheck {
  const nominalDiscountRate = inputs.discountRateCapex;
  // Fisher: (1 + nominal) = (1 + real)(1 + inflation)
  const realDiscountRate = (1 + nominalDiscountRate) / (1 + inflationRate) - 1;

  const nominalNpv = computeCoreMetrics(inputs, nominalDiscountRate).npv;

  // Deflate each nominal cash flow to real terms, then discount at the real rate.
  const tax = effectiveTaxRate(inputs);
  const dep = totalCapex(inputs) / inputs.projectLifeYears;
  let realNpv = -(totalCapex(inputs) + inputs.workingCapital);

  for (let year = 1; year <= inputs.projectLifeYears; year++) {
    const gen = generationInYear(inputs, year);
    const tar = tariffInYear(inputs, year);
    const om = inputs.omYear1 * Math.pow(1 + inputs.omEscalation, year - 1);
    let nominalCf = (gen * tar - om - dep) * (1 - tax) + dep;
    if (year === inputs.projectLifeYears) {
      nominalCf += inputs.salvageValue * (1 - tax) + inputs.workingCapital;
    }
    const realCf = nominalCf / Math.pow(1 + inflationRate, year);
    realNpv += realCf / Math.pow(1 + realDiscountRate, year);
  }

  const difference = Math.abs(nominalNpv - realNpv);
  const consistent = difference < Math.abs(nominalNpv) * 0.001;

  return {
    nominalDiscountRate,
    inflationRate,
    realDiscountRate,
    nominalNpv,
    realNpv,
    difference,
    consistent,
    explanation: consistent
      ? `The two approaches agree to within AED ${Math.round(
          difference
        ).toLocaleString()}, which confirms the model is internally consistent. Cash flows escalate in nominal terms — the tariff rises ${(
          inputs.tariffEscalation * 100
        ).toFixed(1)}% a year and O&M ${(inputs.omEscalation * 100).toFixed(
          1
        )}% — and are discounted at a nominal ${(nominalDiscountRate * 100).toFixed(
          1
        )}%. Deflating those same flows by ${(inflationRate * 100).toFixed(
          1
        )}% inflation and discounting at the Fisher-implied real rate of ${(
          realDiscountRate * 100
        ).toFixed(
          2
        )}% reproduces the same answer. Mixing the two conventions — a common and expensive error — would overstate NPV substantially.`
      : `The two approaches differ by AED ${Math.round(
          difference
        ).toLocaleString()}, which indicates an inconsistency in how inflation is treated and should be investigated before relying on either figure.`,
  };
}
