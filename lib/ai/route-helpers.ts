import { NextResponse } from "next/server";
import { computeAll, type FullResults } from "../finance-engine";
import { validateInputs } from "../schema";
import { checkGlobalRateLimit } from "./rate-limit";
import { getModel, hasApiKey, withTimeout, BASE_SYSTEM_PROMPT } from "./provider";
import { generateText } from "ai";

export interface PreparedRequest {
  results: FullResults;
  /** Why the deterministic path is being used, or null if the model is available. */
  fallbackReason: "no-key" | "rate-limited" | null;
}

/**
 * Shared front door for every AI route: validate the inputs, run the engine, and
 * decide whether a model call is even possible. Routes then either call the model or
 * render their fallback — but they always have real computed numbers either way.
 */
export async function prepare(
  body: unknown
): Promise<{ error: NextResponse } | { prepared: PreparedRequest }> {
  const payload = body as { inputs?: unknown } | undefined;
  const { success, errors, data } = validateInputs(payload?.inputs);

  if (!success || !data) {
    return {
      error: NextResponse.json(
        { ok: false, error: "Invalid inputs", fieldErrors: errors },
        { status: 400 }
      ),
    };
  }

  const results = computeAll(data);

  if (!hasApiKey()) {
    return { prepared: { results, fallbackReason: "no-key" } };
  }

  // The global budget is checked only when a model call would actually be made, so
  // the deterministic path is never throttled.
  const limit = checkGlobalRateLimit();
  if (!limit.allowed) {
    console.warn("[ashraq:ratelimit] Global budget exhausted — serving deterministic fallback", {
      resetInMs: limit.resetInMs,
    });
    return { prepared: { results, fallbackReason: "rate-limited" } };
  }

  return { prepared: { results, fallbackReason: null } };
}

/**
 * Calls the model with a hard timeout, returning null on any failure so the caller
 * falls back rather than surfacing an error. Every failure mode collapses to the same
 * safe outcome: the user sees the deterministic explanation instead of a stack trace.
 */
export async function tryModel(prompt: string, system = BASE_SYSTEM_PROMPT): Promise<string | null> {
  const model = getModel();
  if (!model) return null;

  try {
    const result = await withTimeout(
      generateText({
        model,
        system,
        prompt,
        temperature: 0.3,
      })
    );
    const text = result.text?.trim();
    return text && text.length > 40 ? text : null;
  } catch (error) {
    console.error("[ashraq:ai] Model call failed — falling back", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Compact, model-readable digest of everything the engine computed. */
export function resultsDigest(r: FullResults): string {
  const n = (v: number | null) => (v === null ? "undefined" : v.toFixed(4));
  return `COMPUTED RESULTS (authoritative — quote these exactly, never recalculate):

ALTERNATIVE A — CAPEX-owned solar, discounted at ${(r.inputs.discountRateCapex * 100).toFixed(2)}%
  Initial outflow: AED ${r.metrics.initialOutflow.toFixed(0)} (CAPEX AED ${r.metrics.totalCapex.toFixed(0)} + working capital AED ${r.inputs.workingCapital.toFixed(0)})
  NPV: AED ${r.metrics.npv.toFixed(0)}
  IRR: ${n(r.metrics.irr)} (as a decimal)
  MIRR: ${n(r.metrics.mirr)}
  Profitability Index: ${r.metrics.profitabilityIndex.toFixed(4)}
  Payback: ${n(r.metrics.paybackPeriod)} years
  Discounted payback: ${n(r.metrics.discountedPaybackPeriod)} years
  ARR: ${r.metrics.arr.toFixed(4)}
  Year-1 operating cash flow: AED ${(r.cashFlows[1]?.operatingCashFlow ?? 0).toFixed(0)}

ALTERNATIVE B — Solar PPA, discounted at ${(r.inputs.discountRatePpa * 100).toFixed(2)}%
  PV of after-tax savings at its own rate: AED ${r.ppa.pvAtPpaRate.toFixed(0)}
  Same stream discounted naively at the CAPEX rate: AED ${r.ppa.pvAtCapexRate.toFixed(0)}
  Initial outflow: AED 0. IRR: undefined (no outlay to solve against).

ALTERNATIVE C — Status quo: NPV 0 by definition (the baseline).

ALTERNATIVE D — Debt-financed CAPEX (${(r.inputs.debtRatio * 100).toFixed(0)}% debt)
  NPV identical to Alternative A by construction.
  Loan: AED ${r.financing.loanAmount.toFixed(0)}; annual debt service AED ${r.financing.annualDebtService.toFixed(0)}
  Minimum DSCR: ${r.financing.minDscr.toFixed(2)}x against a ${r.financing.covenantFloor.toFixed(2)}x floor. Breach: ${r.financing.anyBreach}

RANKING: winner is Alternative ${r.comparison.winner.id}; gap to runner-up AED ${Math.abs(r.comparison.gap).toFixed(0)} (${(r.comparison.gapPercent * 100).toFixed(1)}%). Tension flag: ${r.comparison.tensionFlag}

BREAK-EVEN: tariff AED ${r.breakEven.breakEvenTariff.toFixed(4)}/kWh vs assumed AED ${r.breakEven.currentTariff.toFixed(2)}/kWh (margin of safety ${(r.breakEven.marginOfSafetyPercent * 100).toFixed(1)}%)

SENSITIVITY (largest swing first):
${r.sensitivity.map((s) => `  ${s.variable} (${s.description}): NPV ${s.lowNpv.toFixed(0)} to ${s.highNpv.toFixed(0)}, swing AED ${s.swing.toFixed(0)}`).join("\n")}

SCENARIOS:
${r.scenarios.map((s) => `  ${s.name} (${s.description}): NPV AED ${s.npv.toFixed(0)}`).join("\n")}

ESG: year-1 avoided ${r.esg.year1AvoidedTonnes.toFixed(0)} tCO2; lifetime ${r.esg.lifetimeAvoidedTonnes.toFixed(0)} tCO2 (emission factor ${r.esg.emissionFactor} tCO2/MWh — an ESTIMATE, not certified)

DELAY: recommendation "${r.delay.recommendation}". ${r.delay.narrative}

ENGINE RECOMMENDATION: ${r.recommendation.verdict} — ${r.recommendation.headline}

KEY INPUTS: tariff AED ${r.inputs.tariffYear1}/kWh escalating ${(r.inputs.tariffEscalation * 100).toFixed(1)}%/yr; generation ${r.inputs.year1GenerationKwh.toFixed(0)} kWh yr-1 degrading ${(r.inputs.degradationRate * 100).toFixed(1)}%/yr; O&M AED ${r.inputs.omYear1.toFixed(0)} escalating ${(r.inputs.omEscalation * 100).toFixed(1)}%/yr; tax ${(r.effectiveTaxRate * 100).toFixed(0)}%${r.inputs.qfzpEnabled ? " (QFZP 0% scenario ENABLED by the user)" : " (standard rate — QFZP not claimed)"}; horizon ${r.inputs.projectLifeYears} years; salvage AED ${r.inputs.salvageValue.toFixed(0)}; PPA rate AED ${r.inputs.ppaRate}/kWh`;
}

/** Uniform shape for every AI response, so the client always knows which path ran. */
export function aiResponse(
  content: unknown,
  fallbackReason: PreparedRequest["fallbackReason"],
  usedModel: boolean
) {
  return NextResponse.json({
    ok: true,
    content,
    source: usedModel ? "model" : "deterministic",
    fallbackReason,
    notice:
      usedModel || fallbackReason === null
        ? undefined
        : fallbackReason === "no-key"
          ? "Showing the computed explanation — no language model is configured for this deployment."
          : "Showing the computed explanation while the AI catches up.",
  });
}
