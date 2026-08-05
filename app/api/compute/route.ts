import { NextRequest, NextResponse } from "next/server";
import { computeAll } from "@/lib/finance-engine";
import { validateInputs } from "@/lib/schema";

/**
 * /api/compute — the deterministic engine, exposed.
 *
 * No AI involvement whatsoever. This route cannot "fail" in the way the AI routes can:
 * either the input set is valid and it returns all 17 metrics, or it is not and it
 * returns field-level errors with a 400. There is nothing to fall back to because
 * there is no external dependency.
 *
 * This is also the route the Ask Ashraq assistant calls as its tool — which is what
 * makes the assistant's numbers real rather than generated.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { success, errors, data } = validateInputs(body?.inputs ?? body);

    if (!success || !data) {
      return NextResponse.json(
        { ok: false, error: "Invalid inputs", fieldErrors: errors },
        { status: 400 }
      );
    }

    const results = computeAll(data);

    return NextResponse.json({
      ok: true,
      results: {
        metrics: results.metrics,
        ppa: results.ppa,
        financing: results.financing,
        breakEven: results.breakEven,
        sensitivity: results.sensitivity,
        scenarios: results.scenarios,
        esg: results.esg,
        delay: results.delay,
        comparison: results.comparison,
        recommendation: results.recommendation,
        cashFlows: results.cashFlows,
        effectiveTaxRate: results.effectiveTaxRate,
      },
    });
  } catch (error) {
    console.error("[ashraq:compute] Unexpected failure", error);
    return NextResponse.json(
      { ok: false, error: "Could not parse the request body as JSON." },
      { status: 400 }
    );
  }
}
