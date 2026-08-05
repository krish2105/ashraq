/**
 * ASHRAQ — DETERMINISTIC FINANCE ENGINE
 * =====================================
 *
 * Pure functions. No side effects. No network. No LLM involvement in any arithmetic,
 * ever. The AI layer may only read what this file produces; it can never produce a
 * number itself. That separation is the app's core integrity guarantee.
 *
 * Formula definitions follow Ross, Westerfield & Jordan, *Essentials of Corporate
 * Finance* — the course's prescribed text — so the app's arithmetic matches what is
 * being graded against.
 *
 * TWO NON-NEGOTIABLE MODELLING RULES ENCODED HERE:
 *
 *   1. Per-alternative discount rates. Alternatives A and D (owned, exposed to
 *      equipment and performance risk) discount at the hurdle rate. Alternative B
 *      (a contracted PPA whose dominant risk is counterparty credit) discounts at its
 *      own, lower rate. Applying one uniform rate across differently-risked cash flow
 *      streams is the most common conceptual error in a comparison exercise; the
 *      engine makes it structurally impossible to make here.
 *
 *   2. Investment/financing separation. Alternative D overlays a capital structure on
 *      Alternative A's asset. It does NOT change Alternative A's NPV — it answers a
 *      different question (can operating cash flow service the debt?). D is therefore
 *      evaluated on DSCR, not on a re-levered NPV.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectInputs {
  // System
  systemSizeMWp: number;
  year1GenerationKwh: number;
  degradationRate: number;
  projectLifeYears: number;

  // Capital costs
  equipmentCost: number;
  installationCost: number;
  transportCost: number;
  connectionFee: number;
  workingCapital: number;

  // Revenue — here, avoided electricity cost
  tariffYear1: number;
  tariffEscalation: number;

  // Operating cost
  omYear1: number;
  omEscalation: number;

  // Tax & depreciation
  taxRate: number;
  qfzpEnabled: boolean;
  salvageValue: number;

  // Discount rates — deliberately separate per alternative
  discountRateCapex: number;
  discountRatePpa: number;

  // MIRR rates
  financeRate: number;
  reinvestmentRate: number;

  // Alternative B
  ppaRate: number;

  // Alternative D
  debtRatio: number;
  debtInterestRate: number;
  debtTermYears: number;

  // ESG
  gridEmissionFactor: number;

  // Real options
  capexDeclineRate: number;
}

export interface CashFlowRow {
  year: number;
  generationKwh: number;
  tariff: number;
  avoidedCost: number;
  omCost: number;
  depreciation: number;
  ebt: number;
  tax: number;
  netIncome: number;
  operatingCashFlow: number;
  terminalCashFlow: number;
  netCashFlow: number;
  discountedCashFlow: number;
  cumulativeCashFlow: number;
  cumulativeDiscountedCashFlow: number;
}

export interface CoreMetrics {
  initialOutflow: number;
  totalCapex: number;
  npv: number;
  irr: number | null;
  mirr: number | null;
  profitabilityIndex: number;
  paybackPeriod: number | null;
  discountedPaybackPeriod: number | null;
  arr: number;
  totalUndiscountedInflow: number;
  pvOfInflows: number;
  discountRateUsed: number;
}

export type Verdict = "Accept" | "Reject" | "Delay" | "Review Further";

// ---------------------------------------------------------------------------
// Small numeric helpers
// ---------------------------------------------------------------------------

/** Effective tax rate — the QFZP toggle is the only thing that can zero it. */
export function effectiveTaxRate(inputs: ProjectInputs): number {
  return inputs.qfzpEnabled ? 0 : inputs.taxRate;
}

export function totalCapex(inputs: ProjectInputs): number {
  return (
    inputs.equipmentCost + inputs.installationCost + inputs.transportCost + inputs.connectionFee
  );
}

export function initialOutflow(inputs: ProjectInputs): number {
  return totalCapex(inputs) + inputs.workingCapital;
}

export function annualDepreciation(inputs: ProjectInputs): number {
  if (inputs.projectLifeYears <= 0) return 0;
  return totalCapex(inputs) / inputs.projectLifeYears;
}

/** Generation in year t (1-indexed), after linear panel degradation. */
export function generationInYear(inputs: ProjectInputs, year: number): number {
  return inputs.year1GenerationKwh * Math.pow(1 - inputs.degradationRate, year - 1);
}

/** Blended avoided grid tariff in year t (1-indexed), after escalation. */
export function tariffInYear(inputs: ProjectInputs, year: number): number {
  return inputs.tariffYear1 * Math.pow(1 + inputs.tariffEscalation, year - 1);
}

/** O&M cost in year t (1-indexed), after escalation. */
export function omInYear(inputs: ProjectInputs, year: number): number {
  return inputs.omYear1 * Math.pow(1 + inputs.omEscalation, year - 1);
}

// ---------------------------------------------------------------------------
// Cash flow construction — Alternative A (CAPEX-owned)
// ---------------------------------------------------------------------------

/**
 * Builds the full year-by-year schedule for Alternative A.
 *
 * OCF_t = (avoided cost − O&M − depreciation) × (1 − tax) + depreciation
 *
 * The depreciation add-back is the tax shield: depreciation is subtracted to compute
 * taxable income, then added back because it is a non-cash charge.
 *
 * Terminal year additionally recovers after-tax salvage and releases working capital.
 * Because the asset is fully depreciated by year 15, its book value is zero, so the
 * entire salvage proceeds are a taxable gain.
 */
export function buildCashFlows(inputs: ProjectInputs, discountRate: number): CashFlowRow[] {
  const tax = effectiveTaxRate(inputs);
  const dep = annualDepreciation(inputs);
  const life = Math.max(1, Math.round(inputs.projectLifeYears));
  const outflow = initialOutflow(inputs);

  const rows: CashFlowRow[] = [];

  // Year 0
  rows.push({
    year: 0,
    generationKwh: 0,
    tariff: 0,
    avoidedCost: 0,
    omCost: 0,
    depreciation: 0,
    ebt: 0,
    tax: 0,
    netIncome: 0,
    operatingCashFlow: 0,
    terminalCashFlow: 0,
    netCashFlow: -outflow,
    discountedCashFlow: -outflow,
    cumulativeCashFlow: -outflow,
    cumulativeDiscountedCashFlow: -outflow,
  });

  let cum = -outflow;
  let cumDisc = -outflow;

  for (let year = 1; year <= life; year++) {
    const generationKwh = generationInYear(inputs, year);
    const tariff = tariffInYear(inputs, year);
    const avoidedCost = generationKwh * tariff;
    const omCost = omInYear(inputs, year);
    const ebt = avoidedCost - omCost - dep;
    const taxPaid = ebt * tax;
    const netIncome = ebt - taxPaid;
    const operatingCashFlow = netIncome + dep;

    // Terminal year: after-tax salvage (book value is nil) + working capital release
    const isTerminal = year === life;
    const terminalCashFlow = isTerminal
      ? inputs.salvageValue * (1 - tax) + inputs.workingCapital
      : 0;

    const netCashFlow = operatingCashFlow + terminalCashFlow;
    const discountedCashFlow = netCashFlow / Math.pow(1 + discountRate, year);

    cum += netCashFlow;
    cumDisc += discountedCashFlow;

    rows.push({
      year,
      generationKwh,
      tariff,
      avoidedCost,
      omCost,
      depreciation: dep,
      ebt,
      tax: taxPaid,
      netIncome,
      operatingCashFlow,
      terminalCashFlow,
      netCashFlow,
      discountedCashFlow,
      cumulativeCashFlow: cum,
      cumulativeDiscountedCashFlow: cumDisc,
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Core metric primitives
// ---------------------------------------------------------------------------

/** NPV of a flow series where index 0 is time 0. */
export function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

/**
 * IRR by bisection — deliberately not Newton-Raphson, which can diverge on
 * awkward flow shapes. Bisection is slower and completely reliable.
 * Returns null when no sign change exists in the bracket (e.g. an all-positive
 * or all-negative series), rather than returning a misleading number.
 */
export function irr(flows: number[], lowerBound = -0.9999, upperBound = 10): number | null {
  const f = (r: number) => npv(r, flows);
  let lo = lowerBound;
  let hi = upperBound;
  const fLo = f(lo);
  const fHi = f(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi)) return null;
  if (fLo * fHi > 0) return null; // no root bracketed

  for (let i = 0; i < 500; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (Math.abs(fMid) < 1e-9) return mid;
    if (fLo * fMid < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/**
 * MIRR — corrects IRR's reinvestment-rate assumption (RWJ's critique).
 * Outflows are discounted to time 0 at the finance rate; inflows are compounded to
 * the terminal year at the reinvestment rate.
 */
export function mirr(
  flows: number[],
  financeRate: number,
  reinvestmentRate: number
): number | null {
  const n = flows.length - 1;
  if (n <= 0) return null;

  let pvOutflows = 0;
  let fvInflows = 0;

  flows.forEach((cf, t) => {
    if (cf < 0) pvOutflows += Math.abs(cf) / Math.pow(1 + financeRate, t);
    else if (cf > 0) fvInflows += cf * Math.pow(1 + reinvestmentRate, n - t);
  });

  if (pvOutflows === 0 || fvInflows <= 0) return null;
  return Math.pow(fvInflows / pvOutflows, 1 / n) - 1;
}

/**
 * Simple payback — years to recover the initial outflow, ignoring time value.
 * RWJ treats this as a liquidity/risk signal, never as a value measure.
 */
export function paybackPeriod(flows: number[]): number | null {
  let cumulative = flows[0];
  if (cumulative >= 0) return 0;

  for (let t = 1; t < flows.length; t++) {
    const next = cumulative + flows[t];
    if (next >= 0) {
      const fraction = flows[t] !== 0 ? -cumulative / flows[t] : 0;
      return t - 1 + fraction;
    }
    cumulative = next;
  }
  return null; // never pays back inside the horizon
}

/** Discounted payback — the same idea, corrected for the time value of money. */
export function discountedPaybackPeriod(flows: number[], rate: number): number | null {
  const discounted = flows.map((cf, t) => cf / Math.pow(1 + rate, t));
  return paybackPeriod(discounted);
}

/**
 * Accounting Rate of Return — average accounting net income ÷ average book investment.
 * Included because the brief requires it, despite RWJ's own critique that it ignores
 * the time value of money and uses accounting rather than cash income.
 */
export function accountingRateOfReturn(inputs: ProjectInputs, rows: CashFlowRow[]): number {
  const operating = rows.filter((r) => r.year > 0);
  if (operating.length === 0) return 0;
  const avgNetIncome = operating.reduce((a, r) => a + r.netIncome, 0) / operating.length;
  // Average book investment: (initial book value + final book value) / 2, and the
  // asset is fully depreciated at horizon, so final book value is zero.
  const avgInvestment = totalCapex(inputs) / 2;
  if (avgInvestment === 0) return 0;
  return avgNetIncome / avgInvestment;
}

// ---------------------------------------------------------------------------
// Alternative A — full metric set
// ---------------------------------------------------------------------------

export function computeCoreMetrics(inputs: ProjectInputs, discountRate: number): CoreMetrics {
  const rows = buildCashFlows(inputs, discountRate);
  const flows = rows.map((r) => r.netCashFlow);
  const outflow = initialOutflow(inputs);

  const pvOfInflows = rows
    .filter((r) => r.year > 0)
    .reduce((acc, r) => acc + r.netCashFlow / Math.pow(1 + discountRate, r.year), 0);

  return {
    initialOutflow: outflow,
    totalCapex: totalCapex(inputs),
    npv: npv(discountRate, flows),
    irr: irr(flows),
    mirr: mirr(flows, inputs.financeRate, inputs.reinvestmentRate),
    profitabilityIndex: outflow === 0 ? Infinity : pvOfInflows / outflow,
    paybackPeriod: paybackPeriod(flows),
    discountedPaybackPeriod: discountedPaybackPeriod(flows, discountRate),
    arr: accountingRateOfReturn(inputs, rows),
    totalUndiscountedInflow: flows.slice(1).reduce((a, b) => a + b, 0),
    pvOfInflows,
    discountRateUsed: discountRate,
  };
}

// ---------------------------------------------------------------------------
// Alternative B — Solar PPA
// ---------------------------------------------------------------------------

export interface PpaResult {
  /** PV at the risk-differentiated PPA rate — the headline, methodologically correct figure. */
  pvAtPpaRate: number;
  /** PV at the CAPEX hurdle rate — shown for contrast only, to expose the naive approach. */
  pvAtCapexRate: number;
  discountRateUsed: number;
  initialOutflow: 0;
  irr: null;
  annualSavings: { year: number; savings: number; discounted: number }[];
  totalUndiscountedSavings: number;
}

/**
 * Alternative B — the developer owns the asset; Al Waha simply buys the output at a
 * fixed discounted rate. The benefit each year is the spread between what DEWA would
 * have charged and what the PPA charges, taxed as an ordinary cost saving.
 *
 * There is no initial outflow, which makes IRR undefined for this alternative — a
 * genuine limitation of IRR for zero-capital decisions, surfaced rather than hidden.
 */
export function computePpa(inputs: ProjectInputs): PpaResult {
  const tax = effectiveTaxRate(inputs);
  const life = Math.max(1, Math.round(inputs.projectLifeYears));
  const annualSavings: PpaResult["annualSavings"] = [];

  let pvAtPpaRate = 0;
  let pvAtCapexRate = 0;
  let totalUndiscountedSavings = 0;

  for (let year = 1; year <= life; year++) {
    const generation = generationInYear(inputs, year);
    const gridTariff = tariffInYear(inputs, year);
    const spread = gridTariff - inputs.ppaRate;
    const savings = generation * spread * (1 - tax);

    const discounted = savings / Math.pow(1 + inputs.discountRatePpa, year);
    pvAtPpaRate += discounted;
    pvAtCapexRate += savings / Math.pow(1 + inputs.discountRateCapex, year);
    totalUndiscountedSavings += savings;

    annualSavings.push({ year, savings, discounted });
  }

  return {
    pvAtPpaRate,
    pvAtCapexRate,
    discountRateUsed: inputs.discountRatePpa,
    initialOutflow: 0,
    irr: null,
    annualSavings,
    totalUndiscountedSavings,
  };
}

// ---------------------------------------------------------------------------
// Alternative D — debt financing feasibility (DSCR)
// ---------------------------------------------------------------------------

export interface DscrRow {
  year: number;
  operatingCashFlow: number;
  debtService: number;
  dscr: number;
  breach: boolean;
}

export interface FinancingResult {
  loanAmount: number;
  equityAmount: number;
  annualDebtService: number;
  schedule: DscrRow[];
  minDscr: number;
  anyBreach: boolean;
  covenantFloor: number;
}

/** Standard amortizing loan payment: P·i / (1 − (1+i)^−n). */
export function annualDebtService(principal: number, rate: number, termYears: number): number {
  if (termYears <= 0) return 0;
  if (rate === 0) return principal / termYears;
  return (principal * rate) / (1 - Math.pow(1 + rate, -termYears));
}

/**
 * Financing feasibility for Alternative D.
 *
 * Note what this deliberately does NOT do: it does not recompute NPV on levered cash
 * flows. The investment decision (Alternative A's NPV) and the financing decision are
 * kept analytically separate, per standard corporate finance doctrine.
 */
export function computeFinancing(inputs: ProjectInputs, covenantFloor = 1.2): FinancingResult {
  const capex = totalCapex(inputs);
  const loanAmount = capex * inputs.debtRatio;
  const equityAmount = capex - loanAmount;
  const term = Math.max(1, Math.round(inputs.debtTermYears));
  const service = annualDebtService(loanAmount, inputs.debtInterestRate, term);

  const rows = buildCashFlows(inputs, inputs.discountRateCapex).filter((r) => r.year > 0);
  const schedule: DscrRow[] = [];

  for (let year = 1; year <= Math.min(term, rows.length); year++) {
    const ocf = rows[year - 1].operatingCashFlow;
    const dscr = service === 0 ? Infinity : ocf / service;
    schedule.push({
      year,
      operatingCashFlow: ocf,
      debtService: service,
      dscr,
      breach: dscr < covenantFloor,
    });
  }

  const minDscr = schedule.length ? Math.min(...schedule.map((r) => r.dscr)) : Infinity;

  return {
    loanAmount,
    equityAmount,
    annualDebtService: service,
    schedule,
    minDscr,
    anyBreach: schedule.some((r) => r.breach),
    covenantFloor,
  };
}

// ---------------------------------------------------------------------------
// Break-even analysis
// ---------------------------------------------------------------------------

export interface BreakEvenResult {
  breakEvenTariff: number;
  currentTariff: number;
  marginOfSafety: number;
  marginOfSafetyPercent: number;
}

/**
 * Solves for the Year-1 blended tariff at which NPV = 0, holding everything else
 * constant. Bisection over a generous bracket — NPV is monotonic in the tariff, so
 * this always converges.
 */
export function computeBreakEven(inputs: ProjectInputs): BreakEvenResult {
  const npvAtTariff = (tariff: number) => {
    const modified = { ...inputs, tariffYear1: tariff };
    const rows = buildCashFlows(modified, inputs.discountRateCapex);
    return npv(inputs.discountRateCapex, rows.map((r) => r.netCashFlow));
  };

  let lo = 0;
  let hi = Math.max(2, inputs.tariffYear1 * 5);

  // Guard: if even the upper bound cannot clear zero, report it honestly.
  if (npvAtTariff(hi) < 0) {
    return {
      breakEvenTariff: NaN,
      currentTariff: inputs.tariffYear1,
      marginOfSafety: NaN,
      marginOfSafetyPercent: NaN,
    };
  }

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (npvAtTariff(mid) < 0) lo = mid;
    else hi = mid;
  }

  const breakEvenTariff = (lo + hi) / 2;
  const marginOfSafety = inputs.tariffYear1 - breakEvenTariff;

  return {
    breakEvenTariff,
    currentTariff: inputs.tariffYear1,
    marginOfSafety,
    marginOfSafetyPercent: inputs.tariffYear1 === 0 ? 0 : marginOfSafety / inputs.tariffYear1,
  };
}

// ---------------------------------------------------------------------------
// Sensitivity analysis (tornado)
// ---------------------------------------------------------------------------

export interface SensitivityEntry {
  variable: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  lowNpv: number;
  highNpv: number;
  baseNpv: number;
  swing: number;
}

/**
 * One-at-a-time sensitivity. Each variable moves through its stated range while every
 * other input is held at base. Sorted by swing so the tornado chart reads correctly:
 * the assumption the decision is most exposed to sits at the top.
 */
export function computeSensitivity(inputs: ProjectInputs): SensitivityEntry[] {
  const baseNpv = computeCoreMetrics(inputs, inputs.discountRateCapex).npv;

  const npvWith = (overrides: Partial<ProjectInputs>, rate?: number) => {
    const modified = { ...inputs, ...overrides };
    return computeCoreMetrics(modified, rate ?? modified.discountRateCapex).npv;
  };

  const entries: SensitivityEntry[] = [
    {
      variable: "Discount rate",
      description: "±2 percentage points on the hurdle rate",
      lowLabel: `${((inputs.discountRateCapex - 0.02) * 100).toFixed(1)}%`,
      highLabel: `${((inputs.discountRateCapex + 0.02) * 100).toFixed(1)}%`,
      lowNpv: npvWith({ discountRateCapex: inputs.discountRateCapex + 0.02 }),
      highNpv: npvWith({ discountRateCapex: inputs.discountRateCapex - 0.02 }),
      baseNpv,
      swing: 0,
    },
    {
      variable: "Tariff escalation",
      description: "±1 percentage point on annual DEWA tariff drift",
      lowLabel: `${((inputs.tariffEscalation - 0.01) * 100).toFixed(1)}%`,
      highLabel: `${((inputs.tariffEscalation + 0.01) * 100).toFixed(1)}%`,
      lowNpv: npvWith({ tariffEscalation: inputs.tariffEscalation - 0.01 }),
      highNpv: npvWith({ tariffEscalation: inputs.tariffEscalation + 0.01 }),
      baseNpv,
      swing: 0,
    },
    {
      variable: "CAPEX",
      description: "±10% on total installed cost",
      lowLabel: "+10%",
      highLabel: "−10%",
      lowNpv: npvWith({
        equipmentCost: inputs.equipmentCost * 1.1,
        installationCost: inputs.installationCost * 1.1,
        transportCost: inputs.transportCost * 1.1,
        connectionFee: inputs.connectionFee * 1.1,
      }),
      highNpv: npvWith({
        equipmentCost: inputs.equipmentCost * 0.9,
        installationCost: inputs.installationCost * 0.9,
        transportCost: inputs.transportCost * 0.9,
        connectionFee: inputs.connectionFee * 0.9,
      }),
      baseNpv,
      swing: 0,
    },
    {
      variable: "Year-1 generation",
      description: "±10% on specific yield",
      lowLabel: "−10%",
      highLabel: "+10%",
      lowNpv: npvWith({ year1GenerationKwh: inputs.year1GenerationKwh * 0.9 }),
      highNpv: npvWith({ year1GenerationKwh: inputs.year1GenerationKwh * 1.1 }),
      baseNpv,
      swing: 0,
    },
  ];

  return entries
    .map((e) => ({ ...e, swing: Math.abs(e.highNpv - e.lowNpv) }))
    .sort((a, b) => b.swing - a.swing);
}

// ---------------------------------------------------------------------------
// Scenario analysis
// ---------------------------------------------------------------------------

export interface ScenarioResult {
  name: "Best case" | "Base case" | "Worst case";
  description: string;
  npv: number;
  irr: number | null;
  paybackPeriod: number | null;
  profitabilityIndex: number;
}

/**
 * Scenario analysis bundles correlated moves, unlike sensitivity's one-at-a-time.
 * The worst case is deliberately harsh: cost overrun, zero tariff relief, higher O&M,
 * and a soiling/derating hit to generation, all at once.
 */
export function computeScenarios(inputs: ProjectInputs): ScenarioResult[] {
  const scale = (factor: number): Partial<ProjectInputs> => ({
    equipmentCost: inputs.equipmentCost * factor,
    installationCost: inputs.installationCost * factor,
    transportCost: inputs.transportCost * factor,
    connectionFee: inputs.connectionFee * factor,
  });

  const build = (
    name: ScenarioResult["name"],
    description: string,
    overrides: Partial<ProjectInputs>
  ): ScenarioResult => {
    const modified = { ...inputs, ...overrides };
    const m = computeCoreMetrics(modified, modified.discountRateCapex);
    return {
      name,
      description,
      npv: m.npv,
      irr: m.irr,
      paybackPeriod: m.paybackPeriod,
      profitabilityIndex: m.profitabilityIndex,
    };
  };

  return [
    build("Best case", "CAPEX −10%, tariff escalation +1pp, O&M −10%", {
      ...scale(0.9),
      tariffEscalation: inputs.tariffEscalation + 0.01,
      omYear1: inputs.omYear1 * 0.9,
    }),
    build("Base case", "Section 3 assumptions as registered", {}),
    build("Worst case", "CAPEX +15%, tariff escalation 0%, O&M +20%, generation −10%", {
      ...scale(1.15),
      tariffEscalation: 0,
      omYear1: inputs.omYear1 * 1.2,
      year1GenerationKwh: inputs.year1GenerationKwh * 0.9,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Monte Carlo simulation
// ---------------------------------------------------------------------------

export interface MonteCarloResult {
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  probabilityPositive: number;
  percentile5: number;
  percentile95: number;
  histogram: { binStart: number; binEnd: number; count: number; midpoint: number }[];
  samples: number[];
}

/** Mulberry32 — a small, fast, seedable PRNG so simulation runs are reproducible. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller transform for normal draws. */
function normalDraw(rand: () => number, mean: number, stdDev: number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
}

/** Triangular draw — used for tariff escalation, which is bounded, not unbounded. */
function triangularDraw(rand: () => number, min: number, mode: number, max: number): number {
  const u = rand();
  const c = (mode - min) / (max - min);
  if (u < c) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

/**
 * 5,000-iteration Monte Carlo varying four inputs simultaneously.
 *
 * This is the difference between a spreadsheet and a risk-quantification tool: rather
 * than a single point estimate, it returns the probability distribution of NPV, so the
 * board can see P(NPV > 0) rather than one number presented with false precision.
 *
 * Runs inside a Web Worker in the app so the UI thread never blocks.
 */
export function runMonteCarlo(
  inputs: ProjectInputs,
  iterations = 5000,
  seed = 42
): MonteCarloResult {
  const rand = mulberry32(seed);
  const samples: number[] = new Array(iterations);

  for (let i = 0; i < iterations; i++) {
    const generationFactor = normalDraw(rand, 1, 0.08);
    const capexFactor = normalDraw(rand, 1, 0.1);
    const omFactor = normalDraw(rand, 1, 0.15);
    const escalation = triangularDraw(rand, 0, 0.02, 0.03);

    const trial: ProjectInputs = {
      ...inputs,
      year1GenerationKwh: inputs.year1GenerationKwh * Math.max(0.3, generationFactor),
      equipmentCost: inputs.equipmentCost * Math.max(0.3, capexFactor),
      installationCost: inputs.installationCost * Math.max(0.3, capexFactor),
      transportCost: inputs.transportCost * Math.max(0.3, capexFactor),
      connectionFee: inputs.connectionFee * Math.max(0.3, capexFactor),
      omYear1: inputs.omYear1 * Math.max(0.2, omFactor),
      tariffEscalation: escalation,
    };

    const rows = buildCashFlows(trial, trial.discountRateCapex);
    samples[i] = npv(trial.discountRateCapex, rows.map((r) => r.netCashFlow));
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((a, b) => a + b, 0) / iterations;
  const variance = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / iterations;
  const percentileAt = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

  // Histogram
  const binCount = 40;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const binWidth = (max - min) / binCount || 1;
  const histogram = Array.from({ length: binCount }, (_, b) => ({
    binStart: min + b * binWidth,
    binEnd: min + (b + 1) * binWidth,
    midpoint: min + (b + 0.5) * binWidth,
    count: 0,
  }));
  for (const s of samples) {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((s - min) / binWidth)));
    histogram[idx].count++;
  }

  return {
    iterations,
    mean,
    median: percentileAt(0.5),
    stdDev: Math.sqrt(variance),
    min,
    max,
    probabilityPositive: samples.filter((s) => s > 0).length / iterations,
    percentile5: percentileAt(0.05),
    percentile95: percentileAt(0.95),
    histogram,
    samples,
  };
}

// ---------------------------------------------------------------------------
// ESG / avoided emissions
// ---------------------------------------------------------------------------

export interface EsgResult {
  year1AvoidedTonnes: number;
  lifetimeAvoidedTonnes: number;
  emissionFactor: number;
  yearly: { year: number; tonnes: number }[];
  /** Equivalences are illustrative communication aids, not certified conversions. */
  equivalentCarsOffRoad: number;
  equivalentTreesPlanted: number;
}

export function computeEsg(inputs: ProjectInputs): EsgResult {
  const life = Math.max(1, Math.round(inputs.projectLifeYears));
  const yearly: EsgResult["yearly"] = [];
  let lifetime = 0;

  for (let year = 1; year <= life; year++) {
    const mwh = generationInYear(inputs, year) / 1000;
    const tonnes = mwh * inputs.gridEmissionFactor;
    lifetime += tonnes;
    yearly.push({ year, tonnes });
  }

  const year1 = yearly[0]?.tonnes ?? 0;

  return {
    year1AvoidedTonnes: year1,
    lifetimeAvoidedTonnes: lifetime,
    emissionFactor: inputs.gridEmissionFactor,
    yearly,
    equivalentCarsOffRoad: year1 / 4.6, // ~4.6 tCO2 per passenger vehicle per year
    equivalentTreesPlanted: year1 / 0.021, // ~21 kg CO2 sequestered per tree per year
  };
}

// ---------------------------------------------------------------------------
// Real options — delay analysis
// ---------------------------------------------------------------------------

export interface DelayScenario {
  delayYears: number;
  capexIfDelayed: number;
  capexSaving: number;
  forgoneSavings: number;
  npvIfDelayed: number;
  npvToday: number;
  valueOfWaiting: number;
}

export interface DelayResult {
  scenarios: DelayScenario[];
  baseNpv: number;
  recommendation: "Invest now" | "Waiting creates value";
  narrative: string;
}

/**
 * Quantifies the option to delay rather than asserting it.
 *
 * The honest framing matters here: IRENA's 2025 data shows global solar costs have
 * *stabilised* rather than continuing their prior decade of sharp decline, so the
 * default CAPEX decline is 0–2%/yr. An optimistic decline assumption is precisely what
 * would make "wait and see" look artificially attractive, so it is not used.
 */
export function computeDelayAnalysis(inputs: ProjectInputs, maxDelay = 2): DelayResult {
  const baseNpv = computeCoreMetrics(inputs, inputs.discountRateCapex).npv;
  const rate = inputs.discountRateCapex;
  const scenarios: DelayScenario[] = [];

  for (let d = 1; d <= maxDelay; d++) {
    const decline = Math.pow(1 - inputs.capexDeclineRate, d);
    const delayedInputs: ProjectInputs = {
      ...inputs,
      equipmentCost: inputs.equipmentCost * decline,
      installationCost: inputs.installationCost * decline,
      transportCost: inputs.transportCost * decline,
      connectionFee: inputs.connectionFee * decline,
    };

    // NPV measured at the (future) investment date, then discounted back to today.
    const npvAtStart = computeCoreMetrics(delayedInputs, rate).npv;
    const npvToday = npvAtStart / Math.pow(1 + rate, d);

    // Savings given up during the waiting period — the real cost of delay.
    let forgone = 0;
    for (let y = 1; y <= d; y++) {
      const rows = buildCashFlows(inputs, rate);
      const row = rows.find((r) => r.year === y);
      if (row) forgone += row.operatingCashFlow / Math.pow(1 + rate, y);
    }

    scenarios.push({
      delayYears: d,
      capexIfDelayed: totalCapex(delayedInputs),
      capexSaving: totalCapex(inputs) - totalCapex(delayedInputs),
      forgoneSavings: forgone,
      npvIfDelayed: npvAtStart,
      npvToday,
      valueOfWaiting: npvToday - baseNpv,
    });
  }

  const bestDelay = scenarios.reduce(
    (best, s) => (s.valueOfWaiting > best.valueOfWaiting ? s : best),
    scenarios[0]
  );
  const waitingWins = bestDelay && bestDelay.valueOfWaiting > 0;

  return {
    scenarios,
    baseNpv,
    recommendation: waitingWins ? "Waiting creates value" : "Invest now",
    narrative: waitingWins
      ? `Delaying ${bestDelay.delayYears} year(s) adds roughly AED ${Math.round(
          bestDelay.valueOfWaiting
        ).toLocaleString()} in present-value terms under the current assumptions.`
      : `Every year of delay destroys value. Waiting one year forgoes AED ${Math.round(
          scenarios[0]?.forgoneSavings ?? 0
        ).toLocaleString()} of discounted avoided-cost savings, while an equipment cost decline of only ${(
          inputs.capexDeclineRate * 100
        ).toFixed(
          1
        )}%/yr recovers AED ${Math.round(scenarios[0]?.capexSaving ?? 0).toLocaleString()}. IRENA's 2025 cost data shows solar pricing has stabilised, so waiting for a materially cheaper system is not supported by the evidence.`,
  };
}

// ---------------------------------------------------------------------------
// Alternative comparison + rules-based recommendation
// ---------------------------------------------------------------------------

export interface AlternativeSummary {
  id: "A" | "B" | "C" | "D";
  name: string;
  structure: string;
  initialOutflow: number;
  npv: number;
  irr: number | null;
  discountRate: number;
  paybackPeriod: number | null;
  profitabilityIndex: number | null;
  note: string;
}

export interface ComparisonResult {
  alternatives: AlternativeSummary[];
  ranked: AlternativeSummary[];
  winner: AlternativeSummary;
  runnerUp: AlternativeSummary;
  gap: number;
  gapPercent: number;
  /** True when the top two are close enough that the choice is not clear-cut. */
  tensionFlag: boolean;
  tensionNote: string;
}

/**
 * Builds the A/B/C/D comparison.
 *
 * The tension flag is threshold-driven rather than hardcoded to this one case: if the
 * user edits inputs enough to change the ranking, the flag follows the numbers instead
 * of restating a conclusion baked in at build time.
 */
export function compareAlternatives(inputs: ProjectInputs, tensionThreshold = 0.1): ComparisonResult {
  const a = computeCoreMetrics(inputs, inputs.discountRateCapex);
  const ppa = computePpa(inputs);
  const financing = computeFinancing(inputs);

  const alternatives: AlternativeSummary[] = [
    {
      id: "A",
      name: "CAPEX-owned solar",
      structure: "Al Waha buys and owns the system outright",
      initialOutflow: a.initialOutflow,
      npv: a.npv,
      irr: a.irr,
      discountRate: inputs.discountRateCapex,
      paybackPeriod: a.paybackPeriod,
      profitabilityIndex: a.profitabilityIndex,
      note: "Captures 100% of avoided cost and all post-horizon value; bears O&M and performance risk.",
    },
    {
      id: "B",
      name: "Solar PPA",
      structure: "Third-party owns and maintains; Al Waha buys output at a fixed rate",
      initialOutflow: 0,
      npv: ppa.pvAtPpaRate,
      irr: null,
      discountRate: inputs.discountRatePpa,
      paybackPeriod: 0,
      profitabilityIndex: null,
      note: "Zero capex. IRR is undefined with no outlay — a real limitation of IRR for zero-capital decisions. Discounted at its own counterparty-risk rate.",
    },
    {
      id: "C",
      name: "Status quo — no investment",
      structure: "Continue buying 100% of electricity from DEWA",
      initialOutflow: 0,
      npv: 0,
      irr: null,
      discountRate: inputs.discountRateCapex,
      paybackPeriod: null,
      profitabilityIndex: null,
      note: "The do-nothing baseline every other alternative is measured against — this is the opportunity cost.",
    },
    {
      id: "D",
      name: "CAPEX solar, debt-financed (70/30)",
      structure: "Alternative A's asset with a 70% debt / 30% equity structure",
      initialOutflow: financing.equityAmount + inputs.workingCapital,
      npv: a.npv,
      irr: a.irr,
      discountRate: inputs.discountRateCapex,
      paybackPeriod: a.paybackPeriod,
      profitabilityIndex: a.profitabilityIndex,
      note: `Same project NPV as A by construction — financing does not change the investment's value. Judged on DSCR instead: minimum ${financing.minDscr.toFixed(
        2
      )}x against a ${financing.covenantFloor.toFixed(2)}x covenant floor.`,
    },
  ];

  const ranked = [...alternatives].sort((x, y) => y.npv - x.npv);
  const winner = ranked[0];
  const runnerUp = ranked.find((r) => r.id !== winner.id && r.npv > 0) ?? ranked[1];

  const gap = winner.npv - runnerUp.npv;
  const denominator = Math.abs(winner.npv) || 1;
  const gapPercent = gap / denominator;
  const tensionFlag = Math.abs(gapPercent) < tensionThreshold;

  const tensionNote = tensionFlag
    ? `Alternatives ${winner.id} and ${runnerUp.id} are within ${(Math.abs(gapPercent) * 100).toFixed(
        1
      )}% of each other — too close to call on NPV alone. The choice should turn on qualitative factors (balance-sheet ownership, post-horizon value, counterparty risk) rather than a difference this small.`
    : `Alternative ${winner.id} leads Alternative ${runnerUp.id} by AED ${Math.round(
        Math.abs(gap)
      ).toLocaleString()} (${(Math.abs(gapPercent) * 100).toFixed(
        1
      )}%). Note that these are discounted at different rates by design — ${(
        winner.discountRate * 100
      ).toFixed(1)}% and ${(runnerUp.discountRate * 100).toFixed(
        1
      )}% respectively — because the two cash flow streams carry genuinely different risk.`;

  return { alternatives, ranked, winner, runnerUp, gap, gapPercent, tensionFlag, tensionNote };
}

// ---------------------------------------------------------------------------
// Rules-based recommendation
// ---------------------------------------------------------------------------

export interface RecommendationResult {
  verdict: Verdict;
  headline: string;
  rationale: string[];
  structureNote: string;
  confidence: "High" | "Moderate" | "Low";
}

/**
 * Decision rules, not free-form generation — so the verdict is explainable and
 * reproducible. The AI layer may rephrase this, but it cannot overturn it.
 */
export function buildRecommendation(
  inputs: ProjectInputs,
  metrics: CoreMetrics,
  comparison: ComparisonResult,
  financing: FinancingResult,
  monteCarloProbability?: number,
  delay?: DelayResult
): RecommendationResult {
  const rationale: string[] = [];
  const clearsHurdle = metrics.npv > 0 && (metrics.irr ?? 0) > inputs.discountRateCapex;
  // Delay is only a live verdict when the option analysis actually says waiting pays.
  const delayFavoured = delay?.recommendation === "Waiting creates value";

  let verdict: Verdict;

  if (metrics.npv <= 0) {
    verdict = "Reject";
    rationale.push(
      `NPV is negative at the ${(inputs.discountRateCapex * 100).toFixed(
        1
      )}% hurdle rate, so the project destroys value against the status-quo baseline.`
    );
  } else if (delayFavoured) {
    verdict = "Delay";
    rationale.push(
      `The project is value-creating, but the option analysis shows waiting is worth more than investing today: ${delay?.narrative}`
    );
  } else if (clearsHurdle) {
    verdict = comparison.tensionFlag ? "Review Further" : "Accept";
    rationale.push(
      `NPV of AED ${Math.round(metrics.npv).toLocaleString()} is positive and IRR of ${(
        (metrics.irr ?? 0) * 100
      ).toFixed(2)}% exceeds the ${(inputs.discountRateCapex * 100).toFixed(
        1
      )}% hurdle rate, so the investment creates value against the do-nothing baseline.`
    );
    rationale.push(
      `Profitability Index of ${metrics.profitabilityIndex.toFixed(
        3
      )} confirms the same conclusion: every dirham committed returns more than a dirham of present value.`
    );
  } else {
    verdict = "Review Further";
    rationale.push("NPV is positive but IRR does not clear the hurdle rate — the signals conflict.");
  }

  if (comparison.tensionFlag) {
    rationale.push(comparison.tensionNote);
  } else {
    rationale.push(comparison.tensionNote);
  }

  if (financing.anyBreach) {
    rationale.push(
      `Financing feasibility is a constraint: DSCR falls to ${financing.minDscr.toFixed(
        2
      )}x, below the ${financing.covenantFloor.toFixed(
        2
      )}x floor most UAE commercial lenders underwrite to. The equity contribution would need to rise.`
    );
  } else {
    rationale.push(
      `The 70/30 debt structure is bankable: DSCR never drops below ${financing.minDscr.toFixed(
        2
      )}x against a ${financing.covenantFloor.toFixed(
        2
      )}x covenant floor, and it improves every year because avoided-cost savings escalate while debt service is fixed.`
    );
  }

  if (monteCarloProbability !== undefined) {
    rationale.push(
      `Across 5,000 simulated futures varying generation, CAPEX, O&M and tariff escalation together, NPV is positive in ${(
        monteCarloProbability * 100
      ).toFixed(1)}% of outcomes.`
    );
  }

  const structureNote =
    comparison.winner.id === "B"
      ? `On a risk-adjusted basis the PPA leads, because its contracted cash flows are discounted at ${(
          inputs.discountRatePpa * 100
        ).toFixed(1)}% rather than the ${(inputs.discountRateCapex * 100).toFixed(
          1
        )}% applied to owned, performance-exposed cash flows. That advantage rests entirely on the AED ${inputs.ppaRate.toFixed(
          2
        )}/kWh PPA rate and the ${(inputs.discountRatePpa * 100).toFixed(
          1
        )}% counterparty-risk rate — neither of which is a real quote. Solicit competitive bids from two or three UAE providers and re-run both alternatives on actual terms before committing to a structure.`
      : `Ownership currently leads on the modelled inputs. Before committing, benchmark it against live PPA bids — the comparison is only as good as the assumed PPA rate.`;

  const headline =
    verdict === "Accept"
      ? "Accept the solar investment — it clears the hurdle rate decisively."
      : verdict === "Review Further"
        ? "Accept the solar investment in principle; review the ownership structure before committing."
        : verdict === "Delay"
          ? "Delay the investment pending better information."
          : "Reject the investment on the current assumptions.";

  const confidence: RecommendationResult["confidence"] =
    monteCarloProbability === undefined
      ? "Moderate"
      : monteCarloProbability > 0.9
        ? "High"
        : monteCarloProbability > 0.7
          ? "Moderate"
          : "Low";

  return { verdict, headline, rationale, structureNote, confidence };
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

export interface FullResults {
  inputs: ProjectInputs;
  cashFlows: CashFlowRow[];
  metrics: CoreMetrics;
  ppa: PpaResult;
  financing: FinancingResult;
  breakEven: BreakEvenResult;
  sensitivity: SensitivityEntry[];
  scenarios: ScenarioResult[];
  esg: EsgResult;
  delay: DelayResult;
  comparison: ComparisonResult;
  recommendation: RecommendationResult;
  effectiveTaxRate: number;
  computedAt: string;
}

/**
 * Computes everything except Monte Carlo, which runs separately in a Web Worker so a
 * 5,000-iteration simulation never blocks the UI thread.
 */
export function computeAll(inputs: ProjectInputs, monteCarloProbability?: number): FullResults {
  const cashFlows = buildCashFlows(inputs, inputs.discountRateCapex);
  const metrics = computeCoreMetrics(inputs, inputs.discountRateCapex);
  const ppa = computePpa(inputs);
  const financing = computeFinancing(inputs);
  const comparison = compareAlternatives(inputs);
  const delay = computeDelayAnalysis(inputs);
  const recommendation = buildRecommendation(
    inputs,
    metrics,
    comparison,
    financing,
    monteCarloProbability,
    delay
  );

  return {
    inputs,
    cashFlows,
    metrics,
    ppa,
    financing,
    breakEven: computeBreakEven(inputs),
    sensitivity: computeSensitivity(inputs),
    scenarios: computeScenarios(inputs),
    esg: computeEsg(inputs),
    delay,
    comparison,
    recommendation,
    effectiveTaxRate: effectiveTaxRate(inputs),
    computedAt: new Date().toISOString(),
  };
}
