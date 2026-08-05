/**
 * PHASE B — THE EQUAL-LIFE RE-EXAMINATION
 *
 * Run with: npx tsx scripts/phase-b-reexamination.ts
 *
 * This script exists to test whether the model's own headline conclusion survives
 * being examined properly. It was written to be capable of overturning it, and the
 * result is reported either way.
 */

import { DEFAULT_INPUTS } from "../lib/case-data";
import { computeCoreMetrics, computePpa, type ProjectInputs } from "../lib/finance-engine";
import {
  computeEqualLifeComparison,
  computeAPV,
  computeCostOfCapital,
  verifyTariffAgainstSlabs,
  equivalentAnnualAnnuity,
  computeDecisionFlips,
} from "../lib/finance-engine-advanced";

const aed = (v: number) =>
  `AED ${Math.round(v).toLocaleString("en-AE").padStart(12)}`;
const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
const rule = (t = "") =>
  console.log(`\n${"─".repeat(78)}${t ? `\n${t}\n` : ""}${t ? "─".repeat(78) : ""}`);

const inputs = DEFAULT_INPUTS;

console.log("\n\n═══ PHASE B — EQUAL-LIFE RE-EXAMINATION ═══════════════════════════════════════");

// ---------------------------------------------------------------------------
rule("1. THE BASE CASE (15-year horizon, no inverter replacement)");

const baseCapex = computeCoreMetrics(inputs, inputs.discountRateCapex);
const basePpa = computePpa(inputs);

console.log(`CAPEX ownership NPV @ ${pct(inputs.discountRateCapex)}   ${aed(baseCapex.npv)}`);
console.log(`Solar PPA PV     @ ${pct(inputs.discountRatePpa)}   ${aed(basePpa.pvAtPpaRate)}`);
console.log(`Gap (PPA − CAPEX)                    ${aed(basePpa.pvAtPpaRate - baseCapex.npv)}`);
console.log(
  `\nBase-case winner: ${basePpa.pvAtPpaRate > baseCapex.npv ? "Solar PPA" : "CAPEX ownership"}`
);

// ---------------------------------------------------------------------------
rule("2. EQUIVALENT ANNUAL ANNUITY on the base case (unequal lives corrected)");

const eaaCapex15 = equivalentAnnualAnnuity(baseCapex.npv, inputs.discountRateCapex, 15);
const eaaPpa15 = equivalentAnnualAnnuity(basePpa.pvAtPpaRate, inputs.discountRatePpa, 15);
console.log(`CAPEX EAA (15 yrs @ 10.0%)            ${aed(eaaCapex15)} per year`);
console.log(`PPA   EAA (15 yrs @  7.5%)            ${aed(eaaPpa15)} per year`);
console.log(`EAA winner: ${eaaPpa15 > eaaCapex15 ? "Solar PPA" : "CAPEX ownership"}`);

// ---------------------------------------------------------------------------
rule("3. THE RE-EXAMINATION — 25-year horizon, inverter replacement charged");

const scenarios: { label: string; inputs: ProjectInputs }[] = [
  { label: "PPA runs 15 yrs (contract ends, ownership continues)", inputs: { ...inputs, ppaTermYears: 15 } },
  { label: "PPA runs 25 yrs (full asset life, per UAE market)", inputs: { ...inputs, ppaTermYears: 25 } },
];

for (const s of scenarios) {
  const eq = computeEqualLifeComparison(s.inputs, 25);
  console.log(`\n▸ ${s.label}`);
  console.log(`  CAPEX NPV over 25 yrs              ${aed(eq.capex.npv)}`);
  console.log(`    of which inverter replacement    ${aed(-eq.capex.pvOfInverterCost)}  (yr ${eq.capex.inverterYear}, ${aed(eq.capex.inverterCost)} nominal)`);
  console.log(`  PPA   NPV over ${String(eq.ppa.termYears).padStart(2)} yrs              ${aed(eq.ppa.npv)}`);
  console.log(`  ── COMPARATOR: NPV over the common ${eq.horizonYears}-year window ──`);
  console.log(`  Gap (PPA − CAPEX)                  ${aed(eq.gap)}`);
  console.log(`  → WINNER: ${eq.winner}`);
  console.log(`  → Conclusion changed vs base case: ${eq.conclusionChanged ? "YES ***" : "no"}`);
  console.log(`  ── EAA shown for completeness only, NOT used to rank ──`);
  console.log(`  CAPEX EAA ${aed(eq.capex.eaa)}/yr @ ${pct(inputs.discountRateCapex)}   PPA EAA ${aed(eq.ppa.eaa)}/yr @ ${pct(inputs.discountRatePpa)}`);
  if (eq.breakEvenPpaTermYears !== null) {
    console.log(`  → Alternatives tie at a PPA term of ${eq.breakEvenPpaTermYears.toFixed(1)} years`);
  }
}

// ---------------------------------------------------------------------------
rule("4. WHAT WOULD HAVE TO BE TRUE FOR OWNERSHIP TO WIN");

const flips = computeDecisionFlips(inputs);
for (const f of flips.filter((x) => x.rankingFlipsAt !== null)) {
  console.log(`${f.variable.padEnd(22)} currently ${String(f.currentValue).padStart(8)} ${f.unit}`);
  console.log(`  ties at ${f.rankingFlipsAt!.toFixed(4)} ${f.unit}`);
  console.log(`  ${f.comment}\n`);
}

// ---------------------------------------------------------------------------
rule("5. SUPPORTING VERIFICATIONS");

const slab = verifyTariffAgainstSlabs(inputs);
console.log(`DEWA slab check   : marginal rate ${slab.marginalDisplacementRate.toFixed(4)} vs assumed ${slab.assumedRate.toFixed(2)} → ${slab.assumptionJustified ? "VERIFIED" : "MISMATCH"}`);
console.log(`                    solar offsets ${(slab.offsetShare * 100).toFixed(1)}% of site load; post-solar ${Math.round(slab.postSolarConsumptionKwh).toLocaleString()} kWh/mo (top slab starts 6,000)`);

const coc = computeCostOfCapital(inputs);
console.log(`\nCost of capital   : Ke ${pct(coc.costOfEquity)} · Kd(after-tax) ${pct(coc.costOfDebtAfterTax)} · WACC ${pct(coc.wacc)}`);
console.log(`                    + project premium ${pct(coc.projectSpecificPremium)} = ${pct(coc.derivedHurdleRate)} derived vs ${pct(coc.appliedHurdleRate)} applied → ${coc.withinRange ? "CONSISTENT" : "INCONSISTENT"}`);

const apv = computeAPV(inputs);
console.log(`\nAPV (Alt D)       : unlevered NPV ${aed(apv.baseCaseNpv)}`);
console.log(`                    + PV tax shields ${aed(apv.pvOfTaxShields)}  (${(apv.shieldAsShareOfNpv * 100).toFixed(2)}% of NPV)`);
console.log(`                    = APV ${aed(apv.apv)}`);

const apv30 = computeAPV({ ...inputs, taxRate: 0.3 });
console.log(`                    same structure at a 30% tax rate → shields worth ${aed(apv30.pvOfTaxShields)} (${(apv30.pvOfTaxShields / apv.pvOfTaxShields).toFixed(1)}× more)`);

rule("6. VERDICT");
const final = computeEqualLifeComparison({ ...inputs, ppaTermYears: 25 }, 25);
console.log(final.finding);
console.log("");
