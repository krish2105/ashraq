import { NextRequest } from "next/server";
import { prepare, tryModel, resultsDigest, aiResponse } from "@/lib/ai/route-helpers";
import { fallbackDelay } from "@/lib/ai/fallbacks";

export async function POST(request: NextRequest) {
  const outcome = await prepare(await request.json().catch(() => ({})));
  if ("error" in outcome) return outcome.error;

  const { results, fallbackReason } = outcome.prepared;

  const text =
    fallbackReason === null
      ? await tryModel(
          `${resultsDigest(results)}

DELAY SCENARIOS:
${results.delay.scenarios
  .map(
    (s) =>
      `  Wait ${s.delayYears} year(s): CAPEX saved AED ${s.capexSaving.toFixed(
        0
      )}, savings forgone AED ${s.forgoneSavings.toFixed(0)}, NPV in today's money AED ${s.npvToday.toFixed(
        0
      )}, value of waiting AED ${s.valueOfWaiting.toFixed(0)}`
  )
  .join("\n")}

TASK: Explain in three paragraphs whether waiting one or two years creates or destroys value for THIS case.

Critical grounding: the CAPEX decline assumption is ${(results.inputs.capexDeclineRate * 100).toFixed(
            1
          )}%/yr, and it is deliberately modest because IRENA's 2025 Renewable Power Generation Costs data shows global solar costs have STABILISED after a decade of steep decline. Do not suggest prices will keep falling sharply — that assumption is not supported by current evidence, and it is exactly what would make delay look artificially attractive.

Close by distinguishing between a bad reason to delay (waiting for cheaper panels) and a legitimate one (running a competitive PPA tender).`
        )
      : null;

  return aiResponse(text ?? fallbackDelay(results), fallbackReason, text !== null);
}
