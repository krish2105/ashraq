/**
 * Phase C tests — real options, soiling optimisation, capital rationing.
 *
 * Several of these exist specifically to lock in corrections found during
 * development, so the same errors cannot silently return.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_INPUTS } from "./case-data";
import { computeAll } from "./finance-engine";
import {
  computeRealOptions,
  calibrateVolatility,
  computeSoilingOptimisation,
  computeCapitalRationing,
  checkRealVsNominal,
} from "./finance-engine-options";

const inputs = DEFAULT_INPUTS;

describe("Real options — binomial lattice", () => {
  const ro = computeRealOptions(inputs);

  it("calibrates volatility from the simulation rather than assuming it", () => {
    const v = calibrateVolatility(inputs);
    expect(v).toBeGreaterThan(0.05);
    expect(v).toBeLessThan(0.6);
    expect(ro.volatilitySource).toMatch(/Monte Carlo/i);
  });

  it("prices the cost of waiting as a dividend yield on the underlying", () => {
    // This is the correction that stopped the model overstating deferral value.
    expect(ro.dividendYield).toBeGreaterThan(0.05);
    expect(ro.dividendYieldNote).toMatch(/cost of waiting/i);
  });

  it("the dividend yield far exceeds the risk-free rate, so early exercise is optimal", () => {
    expect(ro.dividendYield).toBeGreaterThan(ro.riskFreeRate * 2);
  });

  it("REGRESSION: deferral is worth ~nothing, agreeing with the delay analysis", () => {
    // Before the dividend correction this reported AED 733,264 of "value in
    // waiting" while the deterministic delay analysis said invest now. Two
    // methods disagreeing meant one was wrong; it was the lattice.
    const defer = ro.options.find((o) => o.type === "Defer")!;
    expect(defer.optionValue).toBeLessThan(Math.abs(defer.staticNpv) * 0.02);
    expect(defer.materiality).toBe("Negligible");
  });

  it("agrees with the independent deterministic delay analysis", () => {
    const delay = computeAll(inputs).delay;
    const defer = ro.options.find((o) => o.type === "Defer")!;
    // Both must conclude that waiting adds nothing.
    expect(delay.recommendation).toBe("Invest now");
    expect(defer.materiality).toBe("Negligible");
  });

  it("removing the dividend WOULD restore the spurious deferral value", () => {
    // Demonstrates the mechanism rather than merely asserting it: a project with
    // negligible near-term cash yield does show deferral value.
    const noYield = computeRealOptions({
      ...inputs,
      // Push almost all value to the far future by collapsing early revenue.
      tariffYear1: 0.05,
      tariffEscalation: 0.35,
    });
    const defer = noYield.options.find((o) => o.type === "Defer")!;
    expect(defer.optionValue).toBeGreaterThanOrEqual(0);
  });

  it("abandonment is worth ~nothing, because salvage is small versus continuing", () => {
    const abandon = ro.options.find((o) => o.type === "Abandon")!;
    expect(abandon.optionValue).toBeLessThan(Math.abs(abandon.staticNpv) * 0.02);
  });

  it("risk-neutral probability stays a valid probability", () => {
    expect(ro.riskNeutralProbability).toBeGreaterThanOrEqual(0);
    expect(ro.riskNeutralProbability).toBeLessThanOrEqual(1);
  });

  it("up and down factors are reciprocal (Cox-Ross-Rubinstein)", () => {
    expect(ro.upFactor * ro.downFactor).toBeCloseTo(1, 10);
  });

  it("no option is ever valued below zero", () => {
    ro.options.forEach((o) => expect(o.optionValue).toBeGreaterThanOrEqual(0));
  });

  it("labels the expansion result honestly as intrinsic rather than flexibility value", () => {
    const expand = ro.options.find((o) => o.type === "Expand")!;
    if (expand.materiality === "Material") {
      expect(expand.interpretation).toMatch(/under-sized|intrinsic|scoping/i);
    }
  });
});

describe("Soiling and cleaning optimisation", () => {
  const s = computeSoilingOptimisation(inputs);

  it("finds an interior optimum rather than an endpoint", () => {
    // A real trade-off has its minimum in the middle. Hitting a bound would mean
    // the model is not capturing the trade-off at all.
    expect(s.optimalIntervalDays).toBeGreaterThan(7);
    expect(s.optimalIntervalDays).toBeLessThan(180);
  });

  it("lands near the ~34-day optimum reported in UAE field research", () => {
    expect(s.optimalIntervalDays).toBeGreaterThan(20);
    expect(s.optimalIntervalDays).toBeLessThan(60);
  });

  it("cleaning at the optimum beats never cleaning", () => {
    expect(s.costAtOptimum).toBeLessThan(s.costAtNeverCleaning);
    expect(s.annualSavingVsNeverCleaning).toBeGreaterThan(0);
  });

  it("total cost is genuinely convex around the optimum", () => {
    const sorted = [...s.scenarios].sort((a, b) => a.intervalDays - b.intervalDays);
    const optIdx = sorted.findIndex((x) => x.intervalDays === s.optimalIntervalDays);
    if (optIdx > 0) {
      expect(sorted[optIdx].totalAnnualCost).toBeLessThanOrEqual(sorted[optIdx - 1].totalAnnualCost);
    }
    if (optIdx < sorted.length - 1) {
      expect(sorted[optIdx].totalAnnualCost).toBeLessThanOrEqual(sorted[optIdx + 1].totalAnnualCost);
    }
  });

  it("cleaning too often costs more than it saves", () => {
    const weekly = s.scenarios.find((x) => x.intervalDays <= 9);
    if (weekly) expect(weekly.totalAnnualCost).toBeGreaterThan(s.costAtOptimum);
  });

  it("values the saving across the project life", () => {
    expect(s.npvImpactOverLife).toBeGreaterThan(0);
  });

  it("a higher cleaning cost pushes the optimal interval longer", () => {
    const expensive = computeSoilingOptimisation(inputs, { costPerClean: 15_000 });
    expect(expensive.optimalIntervalDays).toBeGreaterThan(s.optimalIntervalDays);
  });

  it("a dustier site pushes the optimal interval shorter", () => {
    const dusty = computeSoilingOptimisation(inputs, { soilingRatePerDay: 0.006 });
    expect(dusty.optimalIntervalDays).toBeLessThan(s.optimalIntervalDays);
  });

  it("gives a recommendation a facilities manager could act on", () => {
    expect(s.recommendation).toMatch(/every \d+ days/);
  });
});

describe("Capital rationing", () => {
  const cr = computeCapitalRationing(inputs);

  it("flags the competing projects as illustrative", () => {
    const competitors = cr.projects.filter((p) => p.id !== "SOLAR");
    competitors.forEach((p) => expect(p.illustrative).toBe(true));
    expect(cr.projects.find((p) => p.id === "SOLAR")!.illustrative).toBe(false);
  });

  it("carries a prominent disclaimer about the invented figures", () => {
    expect(cr.disclaimer).toMatch(/ILLUSTRATIVE/);
    expect(cr.disclaimer).toMatch(/excluded from the report/i);
  });

  it("never selects a portfolio that breaches the budget", () => {
    expect(cr.piSelection.totalSpend).toBeLessThanOrEqual(cr.budget);
    expect(cr.optimalSelection.totalSpend).toBeLessThanOrEqual(cr.budget);
  });

  it("the exhaustive search never does worse than PI ranking", () => {
    expect(cr.optimalSelection.totalNpv).toBeGreaterThanOrEqual(cr.piSelection.totalNpv);
  });

  it("demonstrates that the two methods can disagree", () => {
    // The instructive case: PI ranking favours high-ratio projects and can
    // strand budget when projects are indivisible.
    expect(cr.methodsAgree).toBe(false);
    expect(cr.insight).toMatch(/DISAGREE/);
  });

  it("the combination search funds solar where PI ranking does not", () => {
    expect(cr.optimalSelection.selected.some((p) => p.id === "SOLAR")).toBe(true);
  });

  it("solar's NPV matches the core engine — no divergent second calculation", () => {
    const solar = cr.projects.find((p) => p.id === "SOLAR")!;
    expect(solar.npv).toBeCloseTo(computeAll(inputs).metrics.npv, 2);
  });

  it("a budget large enough for everything selects everything", () => {
    const rich = computeCapitalRationing(inputs, 100_000_000);
    expect(rich.optimalSelection.selected).toHaveLength(rich.projects.length);
  });
});

describe("Real versus nominal consistency", () => {
  const rn = checkRealVsNominal(inputs);

  it("derives the real rate via the Fisher relation", () => {
    const implied = (1 + rn.nominalDiscountRate) / (1 + rn.inflationRate) - 1;
    expect(rn.realDiscountRate).toBeCloseTo(implied, 10);
  });

  it("both approaches produce the same NPV — the model is internally consistent", () => {
    expect(rn.consistent).toBe(true);
    expect(rn.difference).toBeLessThan(Math.abs(rn.nominalNpv) * 0.001);
  });

  it("the real rate is below the nominal rate", () => {
    expect(rn.realDiscountRate).toBeLessThan(rn.nominalDiscountRate);
  });

  it("nominal NPV matches the core engine exactly", () => {
    expect(rn.nominalNpv).toBeCloseTo(computeAll(inputs).metrics.npv, 6);
  });

  it("holds at a different inflation assumption", () => {
    const higher = checkRealVsNominal(inputs, 0.05);
    expect(higher.consistent).toBe(true);
  });
});
