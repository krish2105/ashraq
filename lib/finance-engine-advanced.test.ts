/**
 * Advanced engine tests.
 *
 * Two jobs. First, assert the new analytics are arithmetically right. Second — and
 * more importantly — assert that NONE of them have disturbed the registered base
 * case. Every V1 flagship figure is re-checked here after the V2 inputs were added,
 * because the fastest way to invalidate a written report is to quietly change a
 * number it cites.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_INPUTS } from "./case-data";
import {
  computeCoreMetrics,
  computePpa,
  computeFinancing,
  computeAll,
  totalCapex,
  initialOutflow,
  runMonteCarlo,
  type ProjectInputs,
} from "./finance-engine";
import {
  verifyTariffAgainstSlabs,
  computeCostOfCapital,
  computeAPV,
  equivalentAnnualAnnuity,
  annuityFactor,
  computeEqualLifeComparison,
  computeTailRisk,
  computeDecisionFlips,
  computeAdvanced,
  DEWA_COMMERCIAL_SLABS,
} from "./finance-engine-advanced";

const inputs = DEFAULT_INPUTS;

function expectWithin(actual: number, expected: number, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  expect(
    diff <= Math.abs(expected * tolerance),
    `Expected ${actual} within ${tolerance * 100}% of ${expected}`
  ).toBe(true);
}

// ===========================================================================
// THE REGRESSION GUARD — this suite exists to protect the reported figures
// ===========================================================================
describe("V2 additions have NOT disturbed the registered base case", () => {
  const m = computeCoreMetrics(inputs, inputs.discountRateCapex);

  it("total CAPEX is still AED 4,200,000", () => {
    expect(totalCapex(inputs)).toBe(4_200_000);
  });

  it("initial outflow is still AED 4,280,000", () => {
    expect(initialOutflow(inputs)).toBe(4_280_000);
  });

  it("NPV is still AED 1,640,296", () => expectWithin(m.npv, 1_640_296));
  it("IRR is still 15.85%", () => expectWithin(m.irr!, 0.1585));
  it("MIRR is still 12.41%", () => expectWithin(m.mirr!, 0.1241));
  it("PI is still 1.383", () => expectWithin(m.profitabilityIndex, 1.383));
  it("payback is still 5.87 years", () => expectWithin(m.paybackPeriod!, 5.87));
  it("discounted payback is still 9.09 years", () => expectWithin(m.discountedPaybackPeriod!, 9.09));

  it("PPA PV at 7.5% is still AED 2,065,233", () => {
    expectWithin(computePpa(inputs).pvAtPpaRate, 2_065_233);
  });

  it("minimum DSCR is still 1.25x", () => {
    expectWithin(computeFinancing(inputs).minDscr, 1.25, 0.02);
  });

  it("the inverter replacement default is zero, so it cannot silently alter the base case", () => {
    expect(inputs.inverterReplacementCost).toBe(0);
  });
});

// ===========================================================================
describe("DEWA slab ladder — verifying the AED 0.38 assumption", () => {
  const v = verifyTariffAgainstSlabs(inputs);

  it("uses DEWA's published 2026 commercial slabs", () => {
    expect(DEWA_COMMERCIAL_SLABS[0].rate).toBe(0.23);
    expect(DEWA_COMMERCIAL_SLABS[1].rate).toBe(0.28);
    expect(DEWA_COMMERCIAL_SLABS[2].rate).toBe(0.32);
    expect(DEWA_COMMERCIAL_SLABS[3].rate).toBe(0.38);
  });

  it("finds the site sits entirely in the top slab, so displacement occurs at AED 0.380", () => {
    expect(v.marginalDisplacementRate).toBeCloseTo(0.38, 4);
  });

  it("CONFIRMS the blended-tariff assumption rather than merely asserting it", () => {
    expect(v.assumptionJustified).toBe(true);
  });

  it("post-solar consumption still exceeds the 6,000 kWh top-slab threshold", () => {
    // This is what makes the marginal rate constant: even after solar, the site
    // never drops into a lower slab.
    expect(v.postSolarConsumptionKwh).toBeGreaterThan(6000);
  });

  it("solar offsets a credible share of total site consumption", () => {
    expect(v.offsetShare).toBeGreaterThan(0.25);
    expect(v.offsetShare).toBeLessThan(0.6);
  });

  it("output never exceeds site load, so export credits are immaterial here", () => {
    expect(v.fullySelfConsumed).toBe(true);
  });

  it("would flag a MISMATCH for a small site that drops through the slabs", () => {
    // A small commercial site consuming 7,000 kWh/month with the same array
    // would displace across several slabs, so a flat 0.38 would be wrong.
    const small = verifyTariffAgainstSlabs({ ...inputs, monthlyConsumptionKwh: 7_000 });
    expect(small.assumptionJustified).toBe(false);
    expect(small.marginalDisplacementRate).toBeLessThan(0.38);
  });
});

// ===========================================================================
describe("Cost of capital build-up", () => {
  const c = computeCostOfCapital(inputs);

  it("derives a hurdle rate consistent with the 10% applied", () => {
    expect(c.withinRange).toBe(true);
    expectWithin(c.derivedHurdleRate, 0.1, 0.12);
  });

  it("produces a cost of equity above the risk-free rate", () => {
    expect(c.costOfEquity).toBeGreaterThan(c.riskFreeRate);
  });

  it("after-tax cost of debt is below pre-tax, by exactly the tax rate", () => {
    expectWithin(c.costOfDebtAfterTax, c.costOfDebtPreTax * (1 - 0.09), 0.001);
  });

  it("weights sum to one", () => {
    expect(c.debtWeight + c.equityWeight).toBeCloseTo(1, 10);
  });

  it("every component carries a stated source", () => {
    expect(c.components.length).toBeGreaterThanOrEqual(5);
    c.components.forEach((comp) => expect(comp.source.length).toBeGreaterThan(30));
  });

  it("the hurdle rate exceeds the WACC, reflecting single-project concentration", () => {
    expect(c.derivedHurdleRate).toBeGreaterThan(c.wacc);
  });
});

// ===========================================================================
describe("Adjusted Present Value — Alternative D", () => {
  const apv = computeAPV(inputs);

  it("base case equals the unlevered NPV — financing does not change project value", () => {
    expectWithin(apv.baseCaseNpv, 1_640_296);
  });

  it("amortises the loan fully over the term", () => {
    expect(apv.interestSchedule).toHaveLength(inputs.debtTermYears);
    expect(apv.interestSchedule[apv.interestSchedule.length - 1].closingBalance).toBeCloseTo(0, 2);
  });

  it("interest declines every year as principal is repaid", () => {
    for (let i = 1; i < apv.interestSchedule.length; i++) {
      expect(apv.interestSchedule[i].interest).toBeLessThan(
        apv.interestSchedule[i - 1].interest
      );
    }
  });

  it("APV exceeds the unlevered NPV by exactly the PV of tax shields", () => {
    expect(apv.apv - apv.baseCaseNpv).toBeCloseTo(apv.pvOfTaxShields, 6);
  });

  it("finds the tax shield is SMALL — the actual finding at a 9% tax rate", () => {
    // The point of this test is the magnitude. A shield worth under 5% of NPV is
    // the locally-specific insight: UAE tax rates make leverage a liquidity tool,
    // not a value-creation tool.
    expect(apv.pvOfTaxShields).toBeGreaterThan(0);
    expect(apv.shieldAsShareOfNpv).toBeLessThan(0.05);
  });

  it("scales the shield with the tax rate, confirming the causal link", () => {
    const highTax = computeAPV({ ...inputs, taxRate: 0.3 });
    expect(highTax.pvOfTaxShields).toBeGreaterThan(apv.pvOfTaxShields * 3);
  });

  it("produces no shield at all when QFZP 0% is elected", () => {
    const qfzp = computeAPV({ ...inputs, qfzpEnabled: true });
    expect(qfzp.pvOfTaxShields).toBeCloseTo(0, 6);
  });
});

// ===========================================================================
describe("Equivalent Annual Annuity", () => {
  it("annuity factor matches the closed form", () => {
    expectWithin(annuityFactor(0.1, 15), 7.6061, 0.001);
  });

  it("handles a zero rate without dividing by zero", () => {
    expect(annuityFactor(0, 10)).toBe(10);
  });

  it("converts NPV into a constant annual equivalent", () => {
    const eaa = equivalentAnnualAnnuity(1_640_296, 0.1, 15);
    expectWithin(eaa, 1_640_296 / 7.6061, 0.001);
  });

  it("round-trips: discounting the EAA back reproduces the NPV", () => {
    const eaa = equivalentAnnualAnnuity(1_640_296, 0.1, 15);
    expectWithin(eaa * annuityFactor(0.1, 15), 1_640_296, 0.0001);
  });

  it("penalises a shorter life for the same NPV, which is the whole point", () => {
    // The same NPV earned over fewer years is a better annual rate of value creation.
    expect(equivalentAnnualAnnuity(1_000_000, 0.1, 10)).toBeGreaterThan(
      equivalentAnnualAnnuity(1_000_000, 0.1, 25)
    );
  });
});

// ===========================================================================
// THE RE-EXAMINATION — this is the test that could overturn the conclusion
// ===========================================================================
describe("Equal-life re-examination (Phase B)", () => {
  const eq = computeEqualLifeComparison(inputs, 25);

  it("extends both alternatives to a common 25-year horizon", () => {
    expect(eq.horizonYears).toBe(25);
  });

  it("charges ownership for inverter replacement, which the base case omits", () => {
    expect(eq.capex.inverterReplacementIncluded).toBe(true);
    expect(eq.capex.inverterCost).toBeGreaterThan(0);
    expect(eq.capex.pvOfInverterCost).toBeGreaterThan(0);
  });

  it("compares on EAA, the valid comparator across unequal lives", () => {
    expect(Number.isFinite(eq.capex.eaa)).toBe(true);
    expect(Number.isFinite(eq.ppa.eaa)).toBe(true);
  });

  it("records whether the base-case conclusion survived", () => {
    // Deliberately does NOT assert a winner. This test documents the finding
    // rather than enforcing a preferred answer — the whole purpose of Phase B is
    // to let the arithmetic decide.
    expect(["CAPEX ownership", "Solar PPA"]).toContain(eq.winner);
    expect(typeof eq.conclusionChanged).toBe("boolean");
    expect(eq.finding.length).toBeGreaterThan(80);
  });

  it("a 25-year PPA term materially improves the PPA's standing", () => {
    const short = computeEqualLifeComparison({ ...inputs, ppaTermYears: 15 }, 25);
    const long = computeEqualLifeComparison({ ...inputs, ppaTermYears: 25 }, 25);
    expect(long.ppa.npv).toBeGreaterThan(short.ppa.npv);
  });

  it("a larger inverter cost moves the comparison against ownership", () => {
    const cheap = computeEqualLifeComparison({ ...inputs, inverterReplacementCost: 100_000 }, 25);
    const dear = computeEqualLifeComparison({ ...inputs, inverterReplacementCost: 900_000 }, 25);
    expect(dear.capex.eaa).toBeLessThan(cheap.capex.eaa);
  });

  // -------------------------------------------------------------------------
  // The methodological trap this analysis exists to avoid
  // -------------------------------------------------------------------------

  it("compares on NPV over a common window, NOT on EAA", () => {
    // The gap must reconcile against the NPVs, not the EAAs. If someone later
    // "simplifies" this back to an EAA comparison, this test fails.
    expect(eq.gap).toBeCloseTo(eq.ppa.npv - eq.capex.npv, 6);
  });

  it("carries an explicit warning about cross-rate EAA being invalid", () => {
    expect(eq.eaaWarning).toMatch(/NOT the comparator/i);
    expect(eq.eaaWarning).toMatch(/same discount rate/i);
  });

  it("DEMONSTRATES the trap: identical NPV and life give different EAAs at different rates", () => {
    // This is the arithmetic proof behind the warning above. Two projects that
    // are self-evidently equally valuable produce different EAAs purely because
    // of their discount rates — which is why EAA cannot rank them.
    const sameNpv = 3_000_000;
    const eaaAtLowRate = equivalentAnnualAnnuity(sameNpv, 0.075, 25);
    const eaaAtHighRate = equivalentAnnualAnnuity(sameNpv, 0.1, 25);
    expect(eaaAtHighRate).toBeGreaterThan(eaaAtLowRate);
    // Materially different — over 20% apart — so the distortion is not marginal.
    expect(eaaAtHighRate / eaaAtLowRate).toBeGreaterThan(1.2);
  });

  it("the PPA's uncovered years are counted when its term is shorter than the window", () => {
    const short = computeEqualLifeComparison({ ...inputs, ppaTermYears: 15 }, 25);
    expect(short.ppa.uncoveredYears).toBe(10);
    const full = computeEqualLifeComparison({ ...inputs, ppaTermYears: 25 }, 25);
    expect(full.ppa.uncoveredYears).toBe(0);
  });

  it("solves the PPA contract term at which the two alternatives tie", () => {
    expect(eq.breakEvenPpaTermYears).not.toBeNull();
    expect(eq.breakEvenPpaTermYears!).toBeGreaterThan(10);
    expect(eq.breakEvenPpaTermYears!).toBeLessThan(25);
  });

  it("the solved tie-point genuinely flips the winner when crossed", () => {
    const tie = eq.breakEvenPpaTermYears!;
    const below = computeEqualLifeComparison({ ...inputs, ppaTermYears: tie - 1.5 }, 25);
    const above = computeEqualLifeComparison({ ...inputs, ppaTermYears: tie + 1.5 }, 25);
    expect(below.winner).toBe("CAPEX ownership");
    expect(above.winner).toBe("Solar PPA");
  });

  it("at the base-case 15-year PPA term, ownership leads over the common window", () => {
    // This is the reversal, asserted explicitly so it cannot regress silently.
    const base = computeEqualLifeComparison({ ...inputs, ppaTermYears: 15 }, 25);
    expect(base.winner).toBe("CAPEX ownership");
    expect(base.conclusionChanged).toBe(true);
    expectWithin(Math.abs(base.gap), 583_223, 0.02);
  });

  it("at a full 25-year PPA term, the PPA leads again", () => {
    const full = computeEqualLifeComparison({ ...inputs, ppaTermYears: 25 }, 25);
    expect(full.winner).toBe("Solar PPA");
    expectWithin(Math.abs(full.gap), 437_128, 0.02);
  });
});

// ===========================================================================
describe("Tail risk — VaR and CVaR", () => {
  const mc = runMonteCarlo(inputs, 2000, 42);
  const tail = computeTailRisk(mc.samples, 0.95);

  it("CVaR is never better than VaR — it is the mean beyond the threshold", () => {
    expect(tail.conditionalValueAtRisk).toBeLessThanOrEqual(tail.valueAtRisk);
  });

  it("VaR sits below the expected value", () => {
    expect(tail.valueAtRisk).toBeLessThan(tail.expectedValue);
  });

  it("worst case is at or below CVaR", () => {
    expect(tail.worstCase).toBeLessThanOrEqual(tail.conditionalValueAtRisk);
  });

  it("reports a low probability of loss for this case", () => {
    expect(tail.probabilityOfLoss).toBeLessThan(0.15);
  });

  it("handles an empty sample set without throwing", () => {
    expect(() => computeTailRisk([], 0.95)).not.toThrow();
  });

  it("a stricter confidence level produces a worse VaR", () => {
    const strict = computeTailRisk(mc.samples, 0.99);
    expect(strict.valueAtRisk).toBeLessThanOrEqual(tail.valueAtRisk);
  });
});

// ===========================================================================
describe("Decision-flip thresholds", () => {
  const flips = computeDecisionFlips(inputs);

  it("covers the inputs a board would actually monitor", () => {
    const names = flips.map((f) => f.variable);
    expect(names).toContain("Avoided tariff");
    expect(names).toContain("Year-1 generation");
    expect(names).toContain("Total CAPEX");
    expect(names).toContain("PPA discount rate");
  });

  it("the tariff break-even matches the core engine's own solver", () => {
    const tariffFlip = flips.find((f) => f.variable === "Avoided tariff")!;
    const engineBreakEven = computeAll(inputs).breakEven.breakEvenTariff;
    expectWithin(tariffFlip.npvZeroAt!, engineBreakEven, 0.02);
  });

  it("finds the PPA discount rate at which the two alternatives tie", () => {
    const rateFlip = flips.find((f) => f.variable === "PPA discount rate")!;
    expect(rateFlip.rankingFlipsAt).not.toBeNull();
    expect(rateFlip.rankingFlipsAt!).toBeGreaterThan(inputs.discountRatePpa);
  });

  it("the tie point genuinely flips the ranking when crossed", () => {
    const rateFlip = flips.find((f) => f.variable === "PPA discount rate")!;
    const justBelow = { ...inputs, discountRatePpa: rateFlip.rankingFlipsAt! - 0.005 };
    const justAbove = { ...inputs, discountRatePpa: rateFlip.rankingFlipsAt! + 0.005 };

    const ppaWinsBelow =
      computePpa(justBelow).pvAtPpaRate >
      computeCoreMetrics(justBelow, justBelow.discountRateCapex).npv;
    const ppaWinsAbove =
      computePpa(justAbove).pvAtPpaRate >
      computeCoreMetrics(justAbove, justAbove.discountRateCapex).npv;

    expect(ppaWinsBelow).not.toBe(ppaWinsAbove);
  });

  it("every threshold carries a plain-language comment a manager could act on", () => {
    flips.forEach((f) => expect(f.comment.length).toBeGreaterThan(30));
  });

  it("CAPEX overrun tolerance is positive and material", () => {
    const capexFlip = flips.find((f) => f.variable === "Total CAPEX")!;
    expect(capexFlip.headroomPercent!).toBeGreaterThan(0.2);
  });
});

// ===========================================================================
describe("Advanced results orchestration", () => {
  const adv = computeAdvanced(inputs);

  it("returns every advanced analysis", () => {
    expect(adv.slabVerification).toBeTruthy();
    expect(adv.costOfCapital).toBeTruthy();
    expect(adv.apv).toBeTruthy();
    expect(adv.equalLife).toBeTruthy();
    expect(adv.decisionFlips.length).toBeGreaterThan(4);
    expect(adv.eaa).toBeTruthy();
  });

  it("produces no NaN anywhere a user could see one", () => {
    const walk = (obj: unknown, path = ""): void => {
      if (typeof obj === "number") {
        expect(Number.isNaN(obj), `NaN at ${path}`).toBe(false);
      } else if (Array.isArray(obj)) {
        obj.forEach((v, i) => walk(v, `${path}[${i}]`));
      } else if (obj && typeof obj === "object") {
        Object.entries(obj).forEach(([k, v]) => walk(v, `${path}.${k}`));
      }
    };
    walk(adv);
  });

  it("survives the QFZP 0% election without throwing", () => {
    expect(() => computeAdvanced({ ...inputs, qfzpEnabled: true })).not.toThrow();
  });

  it("survives a hostile input set without throwing", () => {
    const hostile: ProjectInputs = {
      ...inputs,
      projectLifeYears: 1,
      debtTermYears: 1,
      monthlyConsumptionKwh: 1,
      tariffYear1: 0.01,
    };
    expect(() => computeAdvanced(hostile)).not.toThrow();
  });
});
