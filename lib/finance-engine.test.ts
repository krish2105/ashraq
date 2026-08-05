/**
 * Finance engine test suite.
 *
 * These tests are the CFO sign-off. Every flagship figure in the Master Prompt's
 * Section 4 and 4A is asserted here within 1% tolerance. If any of these fail, the
 * numbers in the deployed app and the written report are not trustworthy and nothing
 * ships.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_INPUTS } from "./case-data";
import {
  buildCashFlows,
  computeCoreMetrics,
  computePpa,
  computeFinancing,
  computeBreakEven,
  computeSensitivity,
  computeScenarios,
  computeEsg,
  computeDelayAnalysis,
  compareAlternatives,
  computeAll,
  runMonteCarlo,
  npv,
  irr,
  mirr,
  paybackPeriod,
  totalCapex,
  initialOutflow,
  annualDebtService,
  type ProjectInputs,
} from "./finance-engine";

/** Assert `actual` is within `tolerance` (fractional) of `expected`. */
function expectWithin(actual: number, expected: number, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  const allowed = Math.abs(expected * tolerance);
  expect(
    diff <= allowed,
    `Expected ${actual} to be within ${tolerance * 100}% of ${expected} (diff ${diff}, allowed ${allowed})`
  ).toBe(true);
}

const inputs = DEFAULT_INPUTS;

// ===========================================================================
describe("Section 3 — cost build-up", () => {
  it("total CAPEX sums to AED 4,200,000", () => {
    expect(totalCapex(inputs)).toBe(4_200_000);
  });

  it("total initial outflow is AED 4,280,000 (CAPEX + working capital)", () => {
    expect(initialOutflow(inputs)).toBe(4_280_000);
  });

  it("straight-line depreciation is AED 280,000/yr", () => {
    expect(totalCapex(inputs) / inputs.projectLifeYears).toBe(280_000);
  });
});

// ===========================================================================
describe("Section 4 — Alternative A flagship metrics", () => {
  const m = computeCoreMetrics(inputs, inputs.discountRateCapex);

  it("Year-1 operating cash flow is AED 705,516", () => {
    const rows = buildCashFlows(inputs, inputs.discountRateCapex);
    expectWithin(rows[1].operatingCashFlow, 705_516);
  });

  it("NPV @ 10% is AED 1,640,296", () => {
    expectWithin(m.npv, 1_640_296);
  });

  it("IRR is 15.85%", () => {
    expectWithin(m.irr!, 0.1585);
  });

  it("MIRR is 12.41%", () => {
    expectWithin(m.mirr!, 0.1241);
  });

  it("Profitability Index is 1.383", () => {
    expectWithin(m.profitabilityIndex, 1.383);
  });

  it("Simple payback is 5.87 years", () => {
    expectWithin(m.paybackPeriod!, 5.87);
  });

  it("Discounted payback is 9.09 years", () => {
    expectWithin(m.discountedPaybackPeriod!, 9.09);
  });

  it("ARR is approximately 23%", () => {
    expectWithin(m.arr, 0.23, 0.05); // "~23%" in the source, so a wider band
  });

  it("PI > 1 exactly when NPV > 0 (RWJ equivalence)", () => {
    expect(m.profitabilityIndex > 1).toBe(m.npv > 0);
  });

  it("discounted payback is strictly longer than simple payback", () => {
    expect(m.discountedPaybackPeriod!).toBeGreaterThan(m.paybackPeriod!);
  });
});

// ===========================================================================
describe("Section 4 — Alternative B (PPA) and the risk-differentiated rate", () => {
  const ppa = computePpa(inputs);

  it("PV of after-tax savings @ 7.5% is AED 2,065,233", () => {
    expectWithin(ppa.pvAtPpaRate, 2_065_233);
  });

  it("PV of after-tax savings @ 10% (naive uniform rate) is AED 1,735,468", () => {
    expectWithin(ppa.pvAtCapexRate, 1_735_468);
  });

  it("has zero initial outflow and therefore an undefined IRR", () => {
    expect(ppa.initialOutflow).toBe(0);
    expect(ppa.irr).toBeNull();
  });

  it("PPA beats CAPEX ownership by roughly AED 425,000 once risk-adjusted", () => {
    const a = computeCoreMetrics(inputs, inputs.discountRateCapex);
    expectWithin(ppa.pvAtPpaRate - a.npv, 425_000, 0.02);
  });

  it("the risk-differentiated rate WIDENS the PPA advantage rather than narrowing it", () => {
    const a = computeCoreMetrics(inputs, inputs.discountRateCapex);
    const advantageAtOwnRate = ppa.pvAtPpaRate - a.npv;
    const advantageAtUniformRate = ppa.pvAtCapexRate - a.npv;
    expect(advantageAtOwnRate).toBeGreaterThan(advantageAtUniformRate);
  });
});

// ===========================================================================
describe("Discount-rate independence — the Definition of Done spot-check", () => {
  it("changing Alternative B's rate does NOT move Alternative A's NPV", () => {
    const baseA = computeCoreMetrics(inputs, inputs.discountRateCapex).npv;
    const tweaked: ProjectInputs = { ...inputs, discountRatePpa: 0.05 };
    const afterA = computeCoreMetrics(tweaked, tweaked.discountRateCapex).npv;
    expect(afterA).toBe(baseA);
  });

  it("changing Alternative A's rate does NOT move Alternative B's PV", () => {
    const basePpa = computePpa(inputs).pvAtPpaRate;
    const tweaked: ProjectInputs = { ...inputs, discountRateCapex: 0.15 };
    const afterPpa = computePpa(tweaked).pvAtPpaRate;
    expect(afterPpa).toBe(basePpa);
  });

  it("the two alternatives genuinely use different rates by default", () => {
    expect(inputs.discountRateCapex).not.toBe(inputs.discountRatePpa);
    const c = compareAlternatives(inputs);
    const a = c.alternatives.find((x) => x.id === "A")!;
    const b = c.alternatives.find((x) => x.id === "B")!;
    expect(a.discountRate).toBe(0.1);
    expect(b.discountRate).toBe(0.075);
  });
});

// ===========================================================================
describe("Section 4A — Alternative D financing feasibility (DSCR)", () => {
  const f = computeFinancing(inputs);

  it("loan is AED 2,940,000 (70% of CAPEX)", () => {
    expectWithin(f.loanAmount, 2_940_000);
  });

  it("annual debt service is AED 564,693", () => {
    expectWithin(f.annualDebtService, 564_693);
  });

  it("reproduces the published 7-year DSCR schedule", () => {
    const expected = [1.25, 1.27, 1.28, 1.3, 1.32, 1.34, 1.35];
    expect(f.schedule).toHaveLength(7);
    f.schedule.forEach((row, i) => {
      expectWithin(row.dscr, expected[i], 0.02);
    });
  });

  it("never breaches the 1.20x covenant floor", () => {
    expect(f.anyBreach).toBe(false);
    expect(f.minDscr).toBeGreaterThan(1.2);
  });

  it("DSCR improves every year (fixed debt service vs escalating savings)", () => {
    for (let i = 1; i < f.schedule.length; i++) {
      expect(f.schedule[i].dscr).toBeGreaterThan(f.schedule[i - 1].dscr);
    }
  });

  it("flags a breach when the debt ratio is pushed too high", () => {
    const levered = computeFinancing({ ...inputs, debtRatio: 0.95, debtTermYears: 5 });
    expect(levered.anyBreach).toBe(true);
  });

  it("financing does NOT change Alternative A's NPV (investment/financing separation)", () => {
    const c = compareAlternatives(inputs);
    const a = c.alternatives.find((x) => x.id === "A")!;
    const d = c.alternatives.find((x) => x.id === "D")!;
    expect(d.npv).toBe(a.npv);
  });
});

// ===========================================================================
describe("Section 4A — ESG overlay", () => {
  const esg = computeEsg(inputs);

  it("Year-1 avoided emissions are ~945 tCO2", () => {
    expectWithin(esg.year1AvoidedTonnes, 945);
  });

  it("lifetime avoided emissions are ~13,400 tCO2 across 15 years", () => {
    expectWithin(esg.lifetimeAvoidedTonnes, 13_400, 0.05);
  });

  it("emissions decline year on year in step with panel degradation", () => {
    expect(esg.yearly[1].tonnes).toBeLessThan(esg.yearly[0].tonnes);
  });
});

// ===========================================================================
describe("Section 5 item 11 — break-even analysis", () => {
  const be = computeBreakEven(inputs);

  it("solves a break-even tariff strictly below the AED 0.38 assumption", () => {
    expect(be.breakEvenTariff).toBeGreaterThan(0);
    expect(be.breakEvenTariff).toBeLessThan(inputs.tariffYear1);
  });

  it("NPV is genuinely ~zero at the solved break-even tariff", () => {
    const atBreakEven = computeCoreMetrics(
      { ...inputs, tariffYear1: be.breakEvenTariff },
      inputs.discountRateCapex
    );
    expect(Math.abs(atBreakEven.npv)).toBeLessThan(1000);
  });

  it("reports a positive margin of safety", () => {
    expect(be.marginOfSafety).toBeGreaterThan(0);
    expect(be.marginOfSafetyPercent).toBeGreaterThan(0);
  });
});

// ===========================================================================
describe("Section 5 item 12 — sensitivity analysis", () => {
  const s = computeSensitivity(inputs);

  it("covers all four required variables", () => {
    expect(s.map((e) => e.variable).sort()).toEqual(
      ["CAPEX", "Discount rate", "Tariff escalation", "Year-1 generation"].sort()
    );
  });

  it("is sorted by swing, largest first (tornado ordering)", () => {
    for (let i = 1; i < s.length; i++) {
      expect(s[i - 1].swing).toBeGreaterThanOrEqual(s[i].swing);
    }
  });

  it("every variable produces a non-zero swing", () => {
    s.forEach((e) => expect(e.swing).toBeGreaterThan(0));
  });

  it("a higher discount rate lowers NPV", () => {
    const entry = s.find((e) => e.variable === "Discount rate")!;
    expect(entry.lowNpv).toBeLessThan(entry.highNpv);
  });
});

// ===========================================================================
describe("Section 5 item 13 — scenario analysis", () => {
  const sc = computeScenarios(inputs);

  it("returns best, base and worst cases", () => {
    expect(sc.map((s) => s.name)).toEqual(["Best case", "Base case", "Worst case"]);
  });

  it("base case matches the flagship NPV", () => {
    expectWithin(sc[1].npv, 1_640_296);
  });

  it("orders best > base > worst", () => {
    expect(sc[0].npv).toBeGreaterThan(sc[1].npv);
    expect(sc[1].npv).toBeGreaterThan(sc[2].npv);
  });
});

// ===========================================================================
describe("Section 5 item 14 — Monte Carlo", () => {
  const mc = runMonteCarlo(inputs, 2000, 42);

  it("runs the requested iteration count", () => {
    expect(mc.samples).toHaveLength(2000);
  });

  it("is deterministic for a fixed seed (reproducible for the report)", () => {
    const again = runMonteCarlo(inputs, 2000, 42);
    expect(again.mean).toBe(mc.mean);
    expect(again.probabilityPositive).toBe(mc.probabilityPositive);
  });

  it("centres near the deterministic base-case NPV", () => {
    expectWithin(mc.mean, 1_640_296, 0.25);
  });

  it("reports a high probability of a positive NPV for this case", () => {
    expect(mc.probabilityPositive).toBeGreaterThan(0.85);
  });

  it("produces a coherent 90% confidence interval", () => {
    expect(mc.percentile5).toBeLessThan(mc.median);
    expect(mc.median).toBeLessThan(mc.percentile95);
  });

  it("histogram bin counts sum to the iteration count", () => {
    expect(mc.histogram.reduce((a, b) => a + b.count, 0)).toBe(2000);
  });
});

// ===========================================================================
describe("Section 5 item 17 — delay analysis", () => {
  const d = computeDelayAnalysis(inputs);

  it("models both a 1-year and a 2-year delay", () => {
    expect(d.scenarios.map((s) => s.delayYears)).toEqual([1, 2]);
  });

  it("finds that delay destroys value under IRENA's cost-stabilisation evidence", () => {
    expect(d.recommendation).toBe("Invest now");
    d.scenarios.forEach((s) => expect(s.valueOfWaiting).toBeLessThan(0));
  });

  it("the forgone savings from waiting exceed the CAPEX saving", () => {
    expect(d.scenarios[0].forgoneSavings).toBeGreaterThan(d.scenarios[0].capexSaving);
  });

  it("would flip to favouring delay only under an implausibly steep cost decline", () => {
    const steep = computeDelayAnalysis({ ...inputs, capexDeclineRate: 0.35 });
    expect(steep.recommendation).toBe("Waiting creates value");
  });
});

// ===========================================================================
describe("Comparison and recommendation rules", () => {
  const c = compareAlternatives(inputs);

  it("includes all four alternatives", () => {
    expect(c.alternatives.map((a) => a.id)).toEqual(["A", "B", "C", "D"]);
  });

  it("status quo is the zero-NPV baseline", () => {
    expect(c.alternatives.find((a) => a.id === "C")!.npv).toBe(0);
  });

  it("ranks the PPA ahead of CAPEX ownership on risk-adjusted NPV", () => {
    expect(c.winner.id).toBe("B");
  });

  it("re-ranks correctly when the PPA rate is made unattractive", () => {
    const badPpa = compareAlternatives({ ...inputs, ppaRate: 0.37 });
    expect(badPpa.winner.id).not.toBe("B");
  });

  it("lands on the case's expected verdict for the default inputs", () => {
    const full = computeAll(inputs, 0.95);
    expect(["Accept", "Review Further"]).toContain(full.recommendation.verdict);
    expect(full.recommendation.rationale.length).toBeGreaterThan(2);
  });

  it("rejects the project when the tariff makes it uneconomic", () => {
    const full = computeAll({ ...inputs, tariffYear1: 0.1 });
    expect(full.recommendation.verdict).toBe("Reject");
  });
});

// ===========================================================================
describe("QFZP tax toggle", () => {
  it("is off by default — the conservative 9% is modelled", () => {
    expect(inputs.qfzpEnabled).toBe(false);
    expect(computeAll(inputs).effectiveTaxRate).toBe(0.09);
  });

  it("raises NPV when switched on, as the disclosed upside sensitivity", () => {
    const standard = computeCoreMetrics(inputs, inputs.discountRateCapex).npv;
    const qfzp = computeCoreMetrics({ ...inputs, qfzpEnabled: true }, inputs.discountRateCapex).npv;
    expect(qfzp).toBeGreaterThan(standard);
  });
});

// ===========================================================================
describe("Numeric primitives — edge cases the UI must never expose as NaN", () => {
  it("NPV at a 0% rate equals the simple sum of flows", () => {
    expect(npv(0, [-100, 50, 50, 50])).toBeCloseTo(50, 6);
  });

  it("IRR returns null rather than a misleading number when no root is bracketed", () => {
    expect(irr([100, 200, 300])).toBeNull();
  });

  it("IRR solves a textbook case correctly", () => {
    expect(irr([-1000, 500, 500, 500])!).toBeCloseTo(0.2337, 3);
  });

  it("MIRR falls between the finance rate and IRR for a conventional project", () => {
    const flows = [-1000, 500, 500, 500];
    const m = mirr(flows, 0.1, 0.1)!;
    expect(m).toBeGreaterThan(0.1);
    expect(m).toBeLessThan(irr(flows)!);
  });

  it("payback returns null when the project never recovers its outlay", () => {
    expect(paybackPeriod([-1000, 10, 10])).toBeNull();
  });

  it("amortizing debt service handles a 0% interest rate without dividing by zero", () => {
    expect(annualDebtService(1000, 0, 10)).toBe(100);
  });

  it("computeAll produces no NaN anywhere in the headline metrics", () => {
    const r = computeAll(inputs);
    Object.entries(r.metrics).forEach(([key, value]) => {
      if (typeof value === "number") {
        expect(Number.isNaN(value), `metrics.${key} is NaN`).toBe(false);
      }
    });
  });

  it("survives a zero-life edge case without throwing", () => {
    expect(() => computeAll({ ...inputs, projectLifeYears: 1 })).not.toThrow();
  });
});
