# Assumptions Register — Al Waha Logistics & Cold Chain LLC

Every input used by the Ashraq model, with its source. Nothing here is invented. Where a value is a reasoned estimate rather than a published figure, that is stated explicitly rather than buried.

This document mirrors `lib/case-data.ts`, which is what the application actually reads. The in-app Assumptions Register page renders from that same array, so the code, the app and this file cannot drift apart.

**Company:** Al Waha Logistics & Cold Chain LLC — a realistic fictional mid-size third-party logistics (3PL) and cold-storage operator in Dubai Investments Park (DIP), Dubai, UAE. 15,000 sqm warehouse with continuous 24/7 refrigeration and HVAC load.

**Decision:** Should Al Waha install a 1.2 MWp rooftop solar PV system to offset grid electricity cost — and if so, under which ownership structure?

---

## System

| Input | Value | Source / rationale |
|---|---|---|
| System size | 1.2 MWp | Realistic for a 15,000 sqm industrial roof at typical 130–150 W/sqm commercial rooftop density. |
| Year-1 generation | 2,100,000 kWh | Derived from 1,750 kWh/kWp/yr specific yield — a conservative Dubai irradiance estimate after temperature and soiling derating. Cross-checked in-app against Open-Meteo measured irradiance. |
| Panel degradation | 0.5% / yr | Industry-standard linear degradation (NREL PVWatts default; IRENA lifecycle studies). |
| Evaluation horizon | 15 years | Explicit forecast window. **Limitation:** physical system life is 20–25 years, so 5–10 years of post-horizon cash flow — which accrues only to an owner — is excluded entirely. This makes the comparison conservative against ownership. |

## Capital costs

| Input | Value | Source / rationale |
|---|---|---|
| Equipment + mounting | AED 3,570,000 | Blended commercial turnkey pricing of AED 2.8–4.5/W reported for 2026 UAE commercial rooftop installs. |
| Installation & commissioning | AED 462,000 | ~11% of equipment cost — standard EPC labour allocation. |
| Transportation & logistics | AED 84,000 | ~2% of equipment cost. |
| DEWA connection / net-metering fee | AED 84,000 | Scaled from DEWA's published base connection fee structure for commercial-scale net-metering under Shams Dubai. |
| **Total CAPEX** | **AED 4,200,000** | Sum of the above. |
| Working capital (O&M spares reserve) | AED 80,000 | Standard reserve for a technical asset with no inventory cycle. Recovered in full at year 15. |
| **Total initial outflow** | **AED 4,280,000** | CAPEX + working capital. |
| O&M cost (Year 1) | AED 50,400 (1.2% of CAPEX) | Industry-standard commercial solar O&M benchmark (~1–1.5% of installed cost per year). |
| O&M escalation | 3% / yr | General UAE service-cost inflation. |

## Revenue (avoided electricity cost)

| Input | Value | Source / rationale |
|---|---|---|
| Avoided grid tariff (Year 1, blended) | AED 0.38 / kWh | DEWA commercial slab tariff blend (commercial rates reported AED 0.20–0.445/kWh across slabs and categories). 0.38 is a defensible mid-to-upper blended rate for a high-consumption industrial account. **Limitation:** a single blended rate is used rather than full slab-by-slab modelling. |
| Tariff escalation | 2% / yr | Conservative allowance for DEWA fuel-surcharge and slab drift. |
| PPA rate (Alternative B) | AED 0.30 / kWh, fixed | Represents a typical UAE solar PPA discount of ~20% below prevailing grid tariff. **Limitation:** a reasoned estimate, not a real quote. |

## Tax & depreciation

| Input | Value | Source / rationale |
|---|---|---|
| Depreciation | Straight-line, AED 280,000 / yr | CAPEX ÷ 15-year horizon; book value fully depreciated by year 15. |
| Salvage value (Year 15) | AED 630,000 (15% of CAPEX) | Residual equipment value; panels typically still operate below rated capacity beyond year 15. Since book value is nil, the entire amount is a taxable gain. |
| Corporate tax rate | 9% (standard) | UAE federal corporate tax: 0% on taxable profit up to AED 375,000, 9% above, per Federal Decree-Law No. 47 of 2022. Applied to the incremental taxable saving, assuming Al Waha is already profitable above the threshold. |

### The QFZP judgement call — disclosed, not silently defaulted

Dubai Investments Park is a UAE Free Zone, so Al Waha is *technically* eligible to test for Qualifying Free Zone Person (QFZP) status, which would carry a 0% rate on qualifying income. **Ashraq does not assume it.** Two conditions make the status genuinely doubtful:

1. **Excluded activity.** "Ownership or exploitation of immovable property" is an excluded activity under the Ministerial Decision guidance unless the counterparty is itself a Free Zone person — and a warehousing / cold-storage operator's core activity is property-linked.
2. **De-minimis risk.** Most of a UAE cold-chain 3PL's customers (retailers, F&B producers, mainland distributors) are *non*-Free-Zone counterparties. Breaching the de-minimis non-qualifying-revenue threshold forfeits QFZP status for the whole entity, not merely the affected income.

**The conservative, defensible modelling choice is the standard 9% rate.** A toggle in the app shows the QFZP upside as a sensitivity — but confirming eligibility requires a professional tax ruling, not a modelling assumption.

## Discount rates — applied per alternative, never one global rate

| Input | Value | Source / rationale |
|---|---|---|
| Hurdle rate — Alternatives A & D | 10% | Informed by 2026 UAE SME lending benchmarks: EIBOR (~3.5–5.2%) plus a 3–6pp margin puts secured commercial term debt around 7–11%. 10% is a defensible blended hurdle rate for a UAE logistics SME capital project. |
| Discount rate — Alternative B (PPA) | 7.5% | PPA cash flows are a contracted, fixed-price savings stream whose dominant risk is counterparty credit risk, not equipment or performance risk. That profile sits closer to secured debt than to an equity-funded operating asset, so it is discounted near the lower end of the 2026 UAE secured-lending band. |

**This is a deliberate methodological correction.** Discounting A and B at the same rate is the single most common conceptual error in a capital-budgeting comparison. It is not cosmetic: correcting it here *widens* the PPA's advantage (AED 2.07M vs AED 1.64M) and therefore changes which alternative wins, not merely by how much. The engine enforces the separation structurally, and a unit test asserts that changing one rate cannot move the other's result.

## Financing (Alternative D)

| Input | Value | Source / rationale |
|---|---|---|
| Debt financing | 70% of CAPEX at 8%/yr, 7-yr amortizing | Blended from 2026 UAE SME term-loan benchmarks: EIBOR (~3.5–5.2%) plus a 2.5–4.5pp margin for secured equipment finance. |

**Alternative D does not produce a different NPV from Alternative A.** Financing does not change what an investment is worth — it changes who funds it and how returns are split. D answers a separate question (can operating cash flow service the loan?) and is judged on DSCR against a 1.20× covenant floor. Conflating investment and financing decisions is a common error this model keeps structurally separate.

## ESG

| Input | Value | Source / rationale |
|---|---|---|
| UAE grid emission factor | ~0.45 tCO₂ / MWh | Illustrative estimate in the range reported for the UAE federal grid mix. **Approximate, not certified** — DEWA does not publish a single official factor. Labelled as an estimate wherever it appears in the app. |

Year-1 avoided emissions ≈ **945 tCO₂**; approximately **13,700 tCO₂** across the 15-year horizon.

## Real options

| Input | Value | Source / rationale |
|---|---|---|
| Annual CAPEX decline (delay analysis) | 1% / yr | IRENA's 2025 *Renewable Power Generation Costs* data shows global solar costs have **stabilised** rather than continuing their prior decade of sharp decline. Defaulted to the 0–2%/yr range, not the double-digit annual drops realistic pre-2023. |

An optimistic decline assumption is precisely what would make "wait and see" look artificially attractive. On the evidence-based rate, delay destroys value: waiting one year forgoes materially more in discounted avoided-cost savings than it recovers in equipment cost.

---

## References

1. International Renewable Energy Agency (IRENA). (2025). *Renewable power generation costs in 2024*. IRENA.
2. Dubai Electricity and Water Authority (DEWA). (2026). *Shams Dubai net metering programme — connection guidelines and commercial tariff schedule*. DEWA.
3. United Arab Emirates. (2022). *Federal Decree-Law No. 47 of 2022 on the Taxation of Corporations and Businesses*. UAE Ministry of Finance.
4. UAE Ministry of Finance. (2023). *Ministerial Decision No. 139 of 2023 on Qualifying Activities and Excluded Activities for Qualifying Free Zone Persons*.
5. National Renewable Energy Laboratory (NREL). (2024). *PVWatts calculator technical reference — system degradation defaults*. NREL.
6. Ross, S. A., Westerfield, R. W., & Jordan, B. D. (2022). *Essentials of corporate finance* (11th ed.). McGraw-Hill Education.
7. Central Bank of the UAE. (2026). *EIBOR benchmark rates and SME lending statistics*. CBUAE.
8. Open-Meteo. (2026). *Historical weather API — global horizontal irradiance archive*. Open-Meteo.
