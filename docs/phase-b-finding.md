# Phase B — The Equal-Life Re-examination

**Status: complete. The base-case conclusion did not survive unchanged.**

This document records the outcome of deliberately testing the model's own headline conclusion. It is written before the report so the finding cannot be quietly reshaped to fit a narrative already committed to.

Reproduce with:

```bash
npx tsx scripts/phase-b-reexamination.ts
```

---

## 1. What was tested

The base case ranked the **Solar PPA** ahead of **CAPEX ownership** by AED 424,937 on risk-adjusted NPV. Three things about that comparison deserved scrutiny:

1. **Both alternatives were truncated at 15 years.** The solar asset physically lasts 20–25 years. Truncation is not neutral — it discards value that accrues to whoever owns the asset.
2. **Ownership was never charged for inverter replacement.** Inverters do not last 25 years. The owner replaces them; the PPA customer does not.
3. **UAE PPAs run up to 25 years**, so ownership's "we capture the free tail" counter-argument may be far weaker than assumed.

Each of these was expected to cut *against* ownership. Two of them do. The first does not — and that is the finding.

---

## 2. The methodological trap, and why the obvious fix is wrong

The textbook remedy for unequal lives is **Equivalent Annual Annuity**. Applying it here produces:

| | NPV over 25 yrs | EAA |
|---|---|---|
| CAPEX ownership @ 10.0% | AED 2,648,456 | AED 291,775/yr |
| Solar PPA (25-yr term) @ 7.5% | AED 3,085,584 | AED 276,810/yr |

**EAA ranks ownership first. NPV ranks the PPA first. They cannot both be right.**

NPV is right, and EAA is wrong, for a specific reason: **EAA is only valid across unequal lives at the *same* discount rate.** These two streams are discounted at different rates by design — 10% for owned, performance-exposed cash flows and 7.5% for contracted, counterparty-risk-only cash flows. Dividing each NPV by its own annuity factor mechanically favours the higher-rate stream, because a higher rate produces a smaller annuity factor.

The arithmetic proof, which is asserted as a unit test:

> Two projects, both 25 years, both with an NPV of exactly AED 3,000,000.
> At 7.5%: EAA = AED 269,132/yr.
> At 10.0%: EAA = AED 330,504/yr.
>
> Same value, same life — self-evidently equally good. EAA ranks one 23% ahead of the other purely because of its discount rate.

**Conclusion: EAA is computed and displayed for completeness, but it is not the comparator.** The comparator is NPV over a common evaluation window, which requires no annuity algebra and is immune to this distortion.

---

## 3. The correct comparison

Both alternatives evaluated over a **common 25-year window**. The PPA delivers no benefit after its contract expires — Al Waha reverts to buying grid power at full tariff — so those years contribute zero.

| PPA contract term | PPA NPV | CAPEX NPV | Winner | Margin |
|---|---|---|---|---|
| 15 years | AED 2,065,233 | AED 2,648,456 | **CAPEX ownership** | AED 583,223 |
| 20 years | AED 2,619,177 | AED 2,648,456 | **CAPEX ownership** | AED 29,279 |
| 25 years | AED 3,085,584 | AED 2,648,456 | **Solar PPA** | AED 437,128 |

CAPEX NPV includes an inverter replacement of AED 420,000 in year 12 (PV: AED 133,825).

**The two alternatives tie at a PPA contract term of 20.3 years.**

---

## 4. The finding

**The base-case conclusion was an artefact of the evaluation window, not a result.**

Truncating both alternatives at 15 years made the PPA look better than it is, because it discarded a decade during which the owner continues to generate free electricity and the 15-year PPA customer does not. Correcting the window reverses the ranking at the base-case PPA term.

But the reversal is conditional, and the condition is the thing worth acting on:

> **The decision turns on the PPA contract term, and the break-even is 20.3 years.** Secure a PPA of 21 years or longer and it beats ownership. Accept 15 years and ownership is worth AED 583,223 more.

This matters because contract tenor is a **negotiable commercial term**, not a modelling assumption. Of everything in this analysis, it is the variable most directly within Al Waha's control — and the base case happened to assume a value on the losing side of the threshold.

### Supporting thresholds

| Variable | Current | Ties at | Reading |
|---|---|---|---|
| PPA contract term | 15 yrs | **20.3 yrs** | The decisive term |
| PPA rate | AED 0.30/kWh | AED 0.326/kWh | Above this, ownership wins |
| PPA discount rate | 7.5% | 10.85% | The assumption that carries the base-case ranking |
| Avoided tariff | AED 0.38/kWh | AED 0.219/kWh | 27% of headroom before the project itself fails |

---

## 5. What this does to the recommendation

The original recommendation — *accept the investment in principle; review the ownership structure before committing* — **survives, and is strengthened.** But its reasoning changes materially.

**Before:** "The PPA looks better on risk-adjusted NPV, so benchmark real PPA bids before defaulting to ownership."

**After:** "Whether the PPA beats ownership depends almost entirely on contract tenor, and the threshold is 20.3 years. Go to market with that number. A 15-year offer at AED 0.30/kWh is worth AED 583,223 *less* than owning the asset; a 25-year offer at the same rate is worth AED 437,128 *more*. Tenor, not headline rate, is the term to negotiate hardest."

That is a materially more useful instruction to give a board, and it is only visible because the original conclusion was tested rather than defended.

---

## 6. Supporting verifications completed in Phase A

| Check | Result |
|---|---|
| **DEWA slab ladder** | **Verified.** At ~450,000 kWh/month the site sits entirely inside the top commercial slab; post-solar consumption is ~275,000 kWh/month, still far above the 6,000 kWh threshold. Every displaced unit is avoided at exactly AED 0.380. The blended rate is the correct marginal rate, not a simplification. Solar offsets 38.9% of site load and never exceeds it, so export credits are immaterial. |
| **Cost of capital** | **Consistent.** Ke 7.78% · after-tax Kd 6.83% · WACC 7.11% · + 2.90% project premium = **10.01% derived** against 10.00% applied. |
| **APV (Alternative D)** | Unlevered NPV AED 1,640,296 + PV of interest tax shields AED 72,396 = **APV AED 1,712,691**. The shield is only **4.41%** of NPV. The same structure at a 30% tax rate would be worth AED 241,319 — **3.3× more**. At UAE tax rates, debt is a liquidity tool, not a value-creation tool. |

---

## 7. Limitations retired, and new ones acknowledged

**Retired:**
- ~~"A single blended tariff is used instead of full slab modelling."~~ The slab ladder now proves the blended rate is the correct marginal rate.
- ~~"The 15-year horizon understates a 20–25 year asset."~~ Now computed over a 25-year window, with the effect quantified.
- ~~"The hurdle rate is a reasoned judgement."~~ Now derived from CBUAE and EIBOR data.

**New, and honestly stated:**
- The inverter replacement cost (10% of CAPEX at year 12) is an industry benchmark, not a quote.
- Extending to 25 years requires assuming the tariff escalation, degradation and O&M trends hold for a further decade — a longer extrapolation than the base case, and correspondingly less certain.
- The "revert to grid at contract end" assumption for a 15-year PPA is one of several possible end-of-term treatments. Asset transfer or renewal at a renegotiated rate would change the result, and which applies is a contract term rather than a modelling choice.
- Depreciation over 25 years (AED 168,000/yr) differs from the base case's 15-year schedule (AED 280,000/yr), which shifts the timing of the tax shield.
