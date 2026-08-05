import { NextRequest } from "next/server";
import { prepare, tryModel, resultsDigest, aiResponse } from "@/lib/ai/route-helpers";
import { fallbackExplain } from "@/lib/ai/fallbacks";

export async function POST(request: NextRequest) {
  const outcome = await prepare(await request.json().catch(() => ({})));
  if ("error" in outcome) return outcome.error;

  const { results, fallbackReason } = outcome.prepared;

  const text =
    fallbackReason === null
      ? await tryModel(
          `${resultsDigest(results)}

TASK: Write a three-to-four paragraph plain-language explanation of these results for a non-finance stakeholder — think of an operations director who runs the warehouse but has never heard the term "discount rate".

Cover, in this order: what the investment is and what it costs; what NPV means here and what this one says; what the supporting measures (IRR, payback, PI) add; and finally why the PPA and the owned system are discounted at different rates and what that does to the comparison.

Define every finance term in a short clause the first time you use it. No bullet points. No headings.`
        )
      : null;

  return aiResponse(text ?? fallbackExplain(results), fallbackReason, text !== null);
}
