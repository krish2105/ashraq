import { NextRequest } from "next/server";
import { prepare, tryModel, resultsDigest, aiResponse } from "@/lib/ai/route-helpers";
import { fallbackRecommend } from "@/lib/ai/fallbacks";

/**
 * The verdict itself is produced by decision RULES in the engine, not by the model —
 * so it is explainable and reproducible. The model may only phrase the justification
 * around a verdict it cannot overturn.
 */
export async function POST(request: NextRequest) {
  const outcome = await prepare(await request.json().catch(() => ({})));
  if ("error" in outcome) return outcome.error;

  const { results, fallbackReason } = outcome.prepared;
  const deterministic = fallbackRecommend(results);

  const text =
    fallbackReason === null
      ? await tryModel(
          `${resultsDigest(results)}

The engine's rule-based verdict is: ${results.recommendation.verdict}.
Its reasoning points are:
${results.recommendation.rationale.map((r) => `- ${r}`).join("\n")}
Structure note: ${results.recommendation.structureNote}

TASK: Write a two-paragraph justification for this verdict, addressed to Al Waha's board.

You may NOT change the verdict — it is produced by decision rules, not by you. Your job is to make the reasoning readable and to state honestly what would have to be true for the recommendation to change. Be specific about which assumptions are estimates rather than quoted terms.`
        )
      : null;

  return aiResponse(
    { ...deterministic, body: text ?? deterministic.body },
    fallbackReason,
    text !== null
  );
}
