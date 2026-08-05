/**
 * Al Waha Logistics & Cold Chain LLC — the single source of truth for case defaults.
 *
 * Every figure here traces to the Master Prompt's Section 3 Data Register. Each carries
 * its source verbatim so the Assumptions Register panel and the written report cite the
 * same words. Nothing in this file is invented; where a figure is a modelling estimate
 * rather than a published number, `caveat` says so explicitly.
 */

import type { ProjectInputs } from "./finance-engine";

export const CASE_META = {
  company: "Al Waha Logistics & Cold Chain LLC",
  sector: "Third-party logistics (3PL) & cold-chain warehousing",
  location: "Dubai Investments Park (DIP), Dubai, UAE",
  facility: "15,000 sqm warehouse, continuous (24/7) refrigeration and HVAC load",
  decision:
    "Should Al Waha install a 1.2 MWp rooftop solar PV system to offset grid electricity cost — and if so, under which ownership structure?",
  coordinates: { lat: 25.0, lon: 55.19 }, // Dubai Investments Park
} as const;

/** Pre-loaded defaults. Every one of these is user-overridable in the app. */
export const DEFAULT_INPUTS: ProjectInputs = {
  // Project basics
  systemSizeMWp: 1.2,
  year1GenerationKwh: 2_100_000,
  degradationRate: 0.005,
  projectLifeYears: 15,

  // Capital costs
  equipmentCost: 3_570_000,
  installationCost: 462_000,
  transportCost: 84_000,
  connectionFee: 84_000,
  workingCapital: 80_000,

  // Revenue (avoided electricity cost)
  tariffYear1: 0.38,
  tariffEscalation: 0.02,

  // Operating cost
  omYear1: 50_400,
  omEscalation: 0.03,

  // Tax & depreciation
  taxRate: 0.09,
  qfzpEnabled: false,
  salvageValue: 630_000,

  // Discount rates — deliberately per-alternative, never one global rate
  discountRateCapex: 0.1,
  discountRatePpa: 0.075,

  // MIRR rates (exposed as editable per Section 5, item 9)
  financeRate: 0.1,
  reinvestmentRate: 0.1,

  // Alternative B — PPA
  ppaRate: 0.3,

  // Alternative D — debt financing
  debtRatio: 0.7,
  debtInterestRate: 0.08,
  debtTermYears: 7,

  // ESG
  gridEmissionFactor: 0.45,

  // Real options / delay analysis
  capexDeclineRate: 0.01,

  /* --- V2 additions. None of these alter the registered base case. --- */

  // Site load, used only to verify which DEWA slab solar displaces.
  // ~450,000 kWh/month is realistic for a 15,000 sqm 24/7 cold store, and puts
  // 2.1 GWh/yr of solar at roughly a 39% offset of total consumption.
  monthlyConsumptionKwh: 450_000,

  // Solar output never exceeds site load for a continuous refrigeration
  // profile, so effectively everything generated is consumed on site.
  selfConsumptionRatio: 1.0,

  // Zero by default: the Section 3 data register contains no inverter
  // replacement line, so including one silently would alter a reported figure.
  // It is switched on explicitly in the equal-life comparison, where it matters.
  inverterReplacementCost: 0,
  inverterReplacementYear: 12,

  // Base case models a 15-year PPA. UAE PPAs run up to 25 years — the equal-life
  // analysis tests that longer term.
  ppaTermYears: 15,

  // Cost-of-capital build-up — derives the 10% hurdle rate from market data.
  riskFreeRate: 0.0365,
  marketRiskPremium: 0.055,
  assetBeta: 0.75,
  projectSpecificPremium: 0.029,
  costOfDebtPreTax: 0.075,
  targetDebtWeight: 0.7,
};

export interface AssumptionEntry {
  key: keyof ProjectInputs | string;
  label: string;
  display: string;
  source: string;
  caveat?: string;
  group: "System" | "Costs" | "Revenue" | "Tax & Depreciation" | "Discount Rates" | "Financing" | "ESG";
}

/**
 * The Assumptions Register — Section 3 of the Master Prompt, rendered verbatim.
 * The report's Data & Assumptions section is generated from this same array, so the
 * two can never drift apart.
 */
export const ASSUMPTIONS_REGISTER: AssumptionEntry[] = [
  {
    key: "systemSizeMWp",
    label: "System size",
    display: "1.2 MWp",
    source:
      "Realistic for a 15,000 sqm industrial roof (typical 130–150 W/sqm commercial rooftop density).",
    group: "System",
  },
  {
    key: "year1GenerationKwh",
    label: "Year-1 generation",
    display: "2,100,000 kWh",
    source:
      "Derived from 1,750 kWh/kWp/yr specific yield — a conservative Dubai irradiance estimate after temperature and soiling derating.",
    group: "System",
  },
  {
    key: "degradationRate",
    label: "Panel degradation",
    display: "0.5% / yr",
    source: "Industry-standard linear degradation assumption (NREL PVWatts default; IRENA lifecycle studies).",
    group: "System",
  },
  {
    key: "projectLifeYears",
    label: "Evaluation horizon",
    display: "15 years",
    source:
      "Explicit forecast window. Physical system life is 20–25 years; the shorter horizon is a modelling simplification.",
    caveat:
      "Disclosed as a limitation: 5–10 years of post-horizon cash flow accrue only to an owner, and are excluded here.",
    group: "System",
  },
  {
    key: "equipmentCost",
    label: "Equipment + mounting",
    display: "AED 3,570,000",
    source:
      "Blended commercial turnkey pricing of AED 2.8–4.5/W reported for 2026 UAE commercial rooftop installs (Watts & Ergon EPC pricing guides).",
    group: "Costs",
  },
  {
    key: "installationCost",
    label: "Installation & commissioning",
    display: "AED 462,000",
    source: "~11% of equipment cost, standard EPC labour allocation.",
    group: "Costs",
  },
  {
    key: "transportCost",
    label: "Transportation & logistics",
    display: "AED 84,000",
    source: "~2% of equipment cost.",
    group: "Costs",
  },
  {
    key: "connectionFee",
    label: "DEWA connection / net-metering fee",
    display: "AED 84,000",
    source:
      "Scaled from DEWA's published base connection fee structure for commercial-scale net-metering applications under Shams Dubai.",
    group: "Costs",
  },
  {
    key: "workingCapital",
    label: "Working capital (O&M spares reserve)",
    display: "AED 80,000",
    source: "Standard reserve for a technical asset with no inventory cycle. Recovered in full at year 15.",
    group: "Costs",
  },
  {
    key: "omYear1",
    label: "O&M cost (Year 1)",
    display: "AED 50,400 (1.2% of CAPEX)",
    source: "Industry-standard O&M benchmark for commercial solar (~1–1.5% of installed cost per year).",
    group: "Costs",
  },
  {
    key: "omEscalation",
    label: "O&M escalation",
    display: "3% / yr",
    source: "General UAE service-cost inflation.",
    group: "Costs",
  },
  {
    key: "tariffYear1",
    label: "Avoided grid tariff (Year 1, blended)",
    display: "AED 0.38 / kWh",
    source:
      "DEWA commercial slab tariff blend (commercial rates reported AED 0.20–0.445/kWh across slabs and categories); 0.38 is a defensible mid-to-upper blended rate for a high-consumption industrial account.",
    caveat: "A single blended rate is used instead of full slab-by-slab modelling — disclosed as a limitation.",
    group: "Revenue",
  },
  {
    key: "tariffEscalation",
    label: "Tariff escalation",
    display: "2% / yr",
    source: "Conservative allowance for DEWA fuel-surcharge and slab drift over time.",
    group: "Revenue",
  },
  {
    key: "ppaRate",
    label: "PPA rate (Alternative B)",
    display: "AED 0.30 / kWh, fixed",
    source: "Represents a typical UAE solar PPA discount of ~20% below the prevailing grid tariff.",
    caveat: "A reasoned estimate, not a real quote. Solicit actual bids before committing to a structure.",
    group: "Revenue",
  },
  {
    key: "salvageValue",
    label: "Salvage value (Year 15)",
    display: "AED 630,000 (15% of CAPEX)",
    source: "Residual equipment value; panels typically still operate below rated capacity beyond year 15.",
    group: "Tax & Depreciation",
  },
  {
    key: "depreciation",
    label: "Depreciation",
    display: "Straight-line, AED 280,000 / yr",
    source: "CAPEX ÷ 15-year evaluation horizon; book value fully depreciated by year 15.",
    group: "Tax & Depreciation",
  },
  {
    key: "taxRate",
    label: "Corporate tax rate",
    display: "9% (standard)",
    source:
      "UAE federal corporate tax: 0% on taxable profit up to AED 375,000, 9% above, per Federal Decree-Law No. 47 of 2022. Applied to the incremental taxable saving, assuming Al Waha is already profitable above the threshold.",
    group: "Tax & Depreciation",
  },
  {
    key: "qfzpEnabled",
    label: "Free Zone tax status (QFZP)",
    display: "Not claimed — standard 9% modelled",
    source:
      "Dubai Investments Park is a UAE Free Zone, so Al Waha is technically eligible to test for Qualifying Free Zone Person status under Federal Decree-Law No. 47 of 2022.",
    caveat:
      "QFZP is NOT assumed, for two reasons: (1) 'ownership or exploitation of immovable property' is an excluded activity unless the counterparty is itself a Free Zone person, and a warehousing/cold-storage operator's core activity is property-linked; (2) most of a UAE cold-chain 3PL's customers are non-Free-Zone counterparties, risking the de-minimis non-qualifying-revenue threshold and forfeiting QFZP status entity-wide. The conservative, defensible choice is standard 9% CT. Toggle it on to see the upside — but that requires a professional tax ruling, not a modelling assumption.",
    group: "Tax & Depreciation",
  },
  {
    key: "discountRateCapex",
    label: "Hurdle rate — Alternatives A & D",
    display: "10%",
    source:
      "Informed by 2026 UAE SME lending benchmarks (EIBOR ~3.5–5.2% plus a 3–6pp margin puts secured commercial term debt around 7–11%); 10% is a defensible blended hurdle rate for a UAE logistics SME capital project.",
    caveat:
      "Applies to the owned, performance-risk-exposed alternatives only. It is deliberately NOT applied to the PPA.",
    group: "Discount Rates",
  },
  {
    key: "discountRatePpa",
    label: "Discount rate — Alternative B (PPA)",
    display: "7.5%",
    source:
      "PPA cash flows are a contracted, fixed-price savings stream whose dominant risk is counterparty credit risk, not equipment or performance risk. That profile sits closer to secured debt than to an equity-funded operating asset, so it is discounted near the lower end of the 2026 UAE secured-lending band (~7–11%).",
    caveat:
      "This is a deliberate methodological correction. Discounting A and B at the same rate is the single most common conceptual error in a capital-budgeting comparison — this model is built specifically to avoid it.",
    group: "Discount Rates",
  },
  {
    key: "debtRatio",
    label: "Debt financing (Alternative D)",
    display: "70% of CAPEX @ 8%, 7-yr amortizing",
    source:
      "Blended from 2026 UAE SME term-loan benchmarks: EIBOR (~3.5–5.2%) plus a 2.5–4.5pp margin for secured equipment finance.",
    caveat:
      "Alternative D does not change Alternative A's NPV — it answers a separate question (can operating cash flow service the loan?). Conflating investment and financing decisions is a common error this model keeps separate.",
    group: "Financing",
  },
  {
    key: "gridEmissionFactor",
    label: "UAE grid emission factor",
    display: "~0.45 tCO₂ / MWh",
    source: "Illustrative estimate in the range reported for the UAE federal grid mix.",
    caveat:
      "Approximate, not certified. DEWA does not publish a single official factor; this is a modelling estimate and is labelled as such wherever it appears.",
    group: "ESG",
  },
  {
    key: "capexDeclineRate",
    label: "Future CAPEX decline (delay analysis)",
    display: "1% / yr",
    source:
      "IRENA's 2025 Renewable Power Generation Costs data shows global solar costs have stabilised rather than continuing their prior decade of sharp declines.",
    caveat:
      "Defaulted to 0–2%/yr, not the double-digit annual drops that were realistic pre-2023. Optimistic decline assumptions are what make 'wait and see' look artificially attractive.",
    group: "Financing",
  },
];

export const REFERENCES = [
  "International Renewable Energy Agency (IRENA). (2025). *Renewable power generation costs in 2024*. IRENA.",
  "Dubai Electricity and Water Authority (DEWA). (2026). *Shams Dubai net metering programme — connection guidelines and commercial tariff schedule*. DEWA.",
  "United Arab Emirates. (2022). *Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations and Businesses*. UAE Ministry of Finance.",
  "UAE Ministry of Finance. (2023). *Ministerial Decision No. 139 of 2023 on Qualifying Activities and Excluded Activities for Qualifying Free Zone Persons*.",
  "National Renewable Energy Laboratory (NREL). (2024). *PVWatts calculator technical reference — system degradation defaults*. NREL.",
  "Ross, S. A., Westerfield, R. W., & Jordan, B. D. (2022). *Essentials of corporate finance* (11th ed.). McGraw-Hill Education.",
  "Central Bank of the UAE. (2026). *EIBOR benchmark rates and SME lending statistics*. CBUAE.",
  "Open-Meteo. (2026). *Historical weather API — global horizontal irradiance archive*. Open-Meteo.",
];
